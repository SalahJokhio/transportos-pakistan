import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { PaymentStatus } from '@app/common';
import { Payment } from './entities/payment.entity';
import { PaymentConfigService } from './config/payment.config';
import { JazzCashProvider } from './providers/jazzcash.provider';
import { EasypaisaProvider } from './providers/easypaisa.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import { BookingService } from '../../booking-service/src/services/booking.service';
import { WalletService } from '../../user-service/src/services/wallet.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly providers: Record<string, PaymentProvider>;

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly cfg: PaymentConfigService,
    private readonly jazzcash: JazzCashProvider,
    private readonly easypaisa: EasypaisaProvider,
    private readonly bookingService: BookingService,
    private readonly walletService: WalletService,
  ) {
    this.providers = { jazzcash: this.jazzcash, easypaisa: this.easypaisa };
  }

  private provider(method: string): PaymentProvider {
    const p = this.providers[method];
    if (!p) throw new BadRequestException(`Unsupported payment method: ${method}`);
    return p;
  }

  /**
   * Pay for a booking from the passenger's wallet: debit the balance (throws if
   * insufficient), record the payment, and confirm the booking. Idempotent —
   * an already-confirmed booking is not charged again.
   */
  async payWithWallet(bookingId: string, userId: string) {
    const booking = await this.bookingService.findById(bookingId);
    if (booking.status === 'CONFIRMED') return { success: true, alreadyPaid: true };

    await this.walletService.debit(userId, Number(booking.finalAmount), {
      description: `Ticket ${booking.pnr}`,
      bookingId,
    });

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        bookingId,
        provider: 'wallet',
        amount: booking.finalAmount,
        status: PaymentStatus.COMPLETED,
        idempotencyKey: `wallet-${bookingId}`,
        providerRef: `WALLET${Date.now()}`,
      }),
    );
    await this.bookingService.confirm(bookingId, payment.id);
    return { success: true, paymentId: payment.id, method: 'wallet' };
  }

  /**
   * Start a gateway payment for a booking. Idempotent on `idempotencyKey`
   * (defaults to bookingId): retrying never creates a second charge — it returns
   * the existing payment's gateway request. The amount comes from the booking,
   * not the client, so it can't be tampered with.
   */
  async initiate(bookingId: string, method: 'jazzcash' | 'easypaisa', idempotencyKey?: string) {
    const provider = this.provider(method);
    const key = idempotencyKey || bookingId;

    const existing = await this.paymentRepo.findOne({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.status === PaymentStatus.COMPLETED) {
        return { reused: true, paymentId: existing.id, status: existing.status, bookingId };
      }
      return this.buildRequest(provider, existing, bookingId);
    }

    const booking = await this.bookingService.findById(bookingId); // 404 if missing
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        bookingId,
        provider: method,
        amount: booking.finalAmount,
        // In-flight at the gateway. Settles to COMPLETED/FAILED via callback or reconcile.
        status: PaymentStatus.PROCESSING,
        idempotencyKey: key,
        providerRef: `TOS${Date.now()}`,
      }),
    );
    return this.buildRequest(provider, payment, bookingId);
  }

  private async buildRequest(provider: PaymentProvider, payment: Payment, bookingId: string) {
    const booking = await this.bookingService.findById(bookingId);
    const req = provider.buildRequest({
      paymentId: payment.id,
      txnRefNo: payment.providerRef,
      amount: Number(payment.amount),
      bookingRef: booking.pnr,
      description: `TransportOS ticket ${booking.pnr}`,
    });
    // Tell the client whether this is a real gateway redirect or the sandbox
    // (mock) path, so checkout knows to POST to the gateway or call mock-confirm.
    return { ...req, live: provider.isConfigured(), mode: this.cfg.mode };
  }

  /**
   * DEV / sandbox: simulate a successful gateway payment so the full UI flow
   * (no real merchant account) can complete. Idempotent.
   */
  async mockConfirm(bookingId: string) {
    const key = bookingId;
    let payment = await this.paymentRepo.findOne({ where: { idempotencyKey: key } });
    if (!payment) {
      const booking = await this.bookingService.findById(bookingId);
      payment = await this.paymentRepo.save(
        this.paymentRepo.create({
          bookingId,
          provider: 'mock',
          amount: booking.finalAmount,
          status: PaymentStatus.PENDING,
          idempotencyKey: key,
          providerRef: `MOCK${Date.now()}`,
        }),
      );
    }
    return this.settle(payment.providerRef, true);
  }

  async handleJazzCashCallback(payload: any) {
    return this.handleCallback(this.jazzcash, payload);
  }

  async handleEasypaisaCallback(payload: any) {
    return this.handleCallback(this.easypaisa, payload);
  }

  /**
   * Shared gateway-callback path: verify the signature, then settle. A callback
   * that fails signature verification is rejected outright (never allowed to
   * mark a legitimate payment FAILED), guarding against forged POSTs.
   */
  private async handleCallback(provider: PaymentProvider, payload: any) {
    const result = provider.verifyCallback(payload);
    if (result.message === 'Invalid signature') {
      this.logger.warn(`Rejected ${provider.name} callback: invalid signature`);
      return { success: false, message: 'Invalid signature' };
    }
    return this.settle(result.txnRefNo, result.success);
  }

  /**
   * Single settlement path for every provider. Looks the payment up by its
   * gateway reference, and on success marks it COMPLETED and confirms the
   * booking (which flips seats to CONFIRMED through the DB unique constraint).
   * Idempotent: a duplicate callback for an already-completed payment is a no-op.
   */
  private async settle(providerRef: string | undefined, success: boolean) {
    if (!providerRef) return { success: false, message: 'Missing transaction reference' };

    const payment = await this.paymentRepo.findOne({ where: { providerRef } });
    if (!payment) return { success: false, message: 'Unknown payment reference' };

    if (payment.status === PaymentStatus.COMPLETED) {
      return { success: true, paymentId: payment.id, status: payment.status, idempotent: true };
    }

    if (!success) {
      await this.paymentRepo.update(payment.id, { status: PaymentStatus.FAILED });
      return { success: false, paymentId: payment.id, status: PaymentStatus.FAILED };
    }

    await this.paymentRepo.update(payment.id, { status: PaymentStatus.COMPLETED });
    try {
      await this.bookingService.confirm(payment.bookingId, payment.id);
    } catch (err: any) {
      // Seat was taken between booking and payment: the charge went through but
      // we can't seat the passenger. Reverse the money so nobody is charged for
      // a seat they didn't get.
      this.logger.warn(`Confirm failed after payment ${payment.id}: ${err.message} — reversing charge`);
      await this.executeRefund(payment, Number(payment.amount), 'Seat no longer available');
      return { success: false, paymentId: payment.id, status: PaymentStatus.REFUNDED, message: err.message };
    }
    return { success: true, paymentId: payment.id, status: PaymentStatus.COMPLETED };
  }

  async getStatus(paymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      amount: payment.amount,
      refundedAmount: payment.refundedAmount,
    };
  }

  // ---- refunds -----------------------------------------------------------

  /**
   * Refund a payment (full by default, or a partial `amount`). Wallet payments
   * are credited back instantly; gateway payments go through the provider's
   * refund API. Idempotent — a fully-refunded payment is not refunded again.
   */
  async refund(paymentId: string, amount?: number, reason?: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.REFUNDED) {
      throw new BadRequestException(`Cannot refund a ${payment.status} payment`);
    }
    const remaining = Number(payment.amount) - Number(payment.refundedAmount);
    const toRefund = amount != null ? Number(amount) : remaining;
    if (toRefund <= 0 || toRefund > remaining) {
      throw new BadRequestException(`Refundable amount is ${remaining}`);
    }
    return this.executeRefund(payment, toRefund, reason || 'Booking cancelled');
  }

  /** Moves the money back (wallet or gateway) and records the refund. */
  private async executeRefund(payment: Payment, amount: number, reason: string) {
    let ref: string | undefined;
    if (payment.provider === 'wallet' || payment.provider === 'mock') {
      const booking = await this.bookingService.findById(payment.bookingId);
      await this.walletService.credit(booking.passengerId, amount, {
        description: `Refund — ${booking.pnr} (${reason})`,
        bookingId: payment.bookingId,
      });
      ref = `WREFUND${Date.now()}`;
    } else {
      const provider = this.provider(payment.provider);
      const res = await provider.refund({ txnRefNo: payment.providerRef, amount, reason });
      if (!res.success) {
        this.logger.error(`Gateway refund failed for ${payment.id}: ${res.message}`);
        return { success: false, paymentId: payment.id, message: res.message };
      }
      ref = res.ref;
    }

    const refundedTotal = Number(payment.refundedAmount) + amount;
    await this.paymentRepo.update(payment.id, {
      refundedAmount: refundedTotal,
      status: refundedTotal >= Number(payment.amount) ? PaymentStatus.REFUNDED : payment.status,
    });
    return { success: true, paymentId: payment.id, refundedAmount: refundedTotal, ref };
  }

  /**
   * Browser-return handler: the gateway redirects the passenger's browser here
   * (POST/GET) after payment. Verify + settle, then resolve the booking PNR so
   * the caller can send the user to their e-ticket (or a retry page).
   */
  async gatewayReturn(providerName: string, payload: any) {
    const provider = this.providers[providerName];
    if (!provider) return { status: 'failed' as const };
    const verified = provider.verifyCallback(payload);
    if (verified.message === 'Invalid signature') return { status: 'failed' as const };

    const settleRes = await this.settle(verified.txnRefNo, verified.success);
    const payment = await this.paymentRepo.findOne({ where: { providerRef: verified.txnRefNo } });
    let pnr: string | undefined;
    if (payment) {
      try { pnr = (await this.bookingService.findById(payment.bookingId)).pnr; } catch { /* gone */ }
    }
    return { status: settleRes.success ? ('success' as const) : ('failed' as const), pnr, bookingId: payment?.bookingId };
  }

  // ---- reconciliation ----------------------------------------------------

  /**
   * Reconcile stuck payments: for every PENDING/PROCESSING payment older than
   * `olderThanMinutes`, ask the gateway for the real status and settle. A
   * Pakistani rail can drop a callback — this is how we never leave a paid
   * booking unconfirmed (or an abandoned one blocking a seat). Run on a cron.
   */
  async reconcile(olderThanMinutes = 5) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const stuck = await this.paymentRepo.find({
      where: {
        status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
        createdAt: LessThan(cutoff),
      },
      take: 200,
    });

    let settled = 0;
    let failed = 0;
    let skipped = 0;
    for (const payment of stuck) {
      const provider = this.providers[payment.provider];
      if (!provider || !provider.isConfigured()) { skipped++; continue; }
      const status = await provider.queryStatus(payment.providerRef);
      if (status.success) { await this.settle(payment.providerRef, true); settled++; }
      else if (status.code) { await this.settle(payment.providerRef, false); failed++; }
      else { skipped++; }
    }
    this.logger.log(`Reconcile: ${stuck.length} stuck, ${settled} settled, ${failed} failed, ${skipped} skipped`);
    return { checked: stuck.length, settled, failed, skipped };
  }
}
