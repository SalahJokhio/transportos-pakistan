import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { PaymentStatus } from '@app/common';
import { Payment } from './entities/payment.entity';
import { BookingService } from '../../booking-service/src/services/booking.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * Start a payment for a booking. Idempotent on `idempotencyKey` (defaults to
   * bookingId): retrying never creates a second charge — it returns the existing
   * payment's gateway request. The amount is taken from the booking itself, not
   * the client, so it can't be tampered with.
   */
  async initiate(
    bookingId: string,
    method: 'jazzcash' | 'easypaisa',
    idempotencyKey?: string,
  ) {
    const key = idempotencyKey || bookingId;

    const existing = await this.paymentRepo.findOne({ where: { idempotencyKey: key } });
    if (existing) {
      // Already settled → hand back the result, do not re-charge.
      if (existing.status === PaymentStatus.COMPLETED) {
        return { reused: true, paymentId: existing.id, status: existing.status, bookingId };
      }
      // In-flight → re-issue the same gateway request (same txn ref).
      return this.buildGatewayRequest(method, existing);
    }

    const booking = await this.bookingService.findById(bookingId); // 404 if missing
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        bookingId,
        provider: method,
        amount: booking.finalAmount,
        status: PaymentStatus.PENDING,
        idempotencyKey: key,
        providerRef: `TOS${Date.now()}`,
      }),
    );
    return this.buildGatewayRequest(method, payment);
  }

  /**
   * DEV / sandbox: simulate a successful gateway payment so the full UI flow
   * (no real JazzCash account) can complete. Idempotent — calling twice confirms
   * the booking only once.
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
    // TODO: verify pp_SecureHash against integrity salt before trusting.
    return this.settle(payload?.pp_TxnRefNo, payload?.pp_ResponseCode === '000');
  }

  async handleEasypaisaCallback(payload: any) {
    return this.settle(payload?.orderRefNum, payload?.responseCode === '0000');
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
      // Seat was taken between booking and payment — refund path (booking stays
      // unconfirmed). Surface so the caller can trigger a reversal.
      this.logger.warn(`Confirm failed after payment ${payment.id}: ${err.message}`);
      await this.paymentRepo.update(payment.id, { status: PaymentStatus.REFUNDED });
      return { success: false, paymentId: payment.id, status: PaymentStatus.REFUNDED, message: err.message };
    }
    return { success: true, paymentId: payment.id, status: PaymentStatus.COMPLETED };
  }

  async getStatus(paymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return { paymentId: payment.id, bookingId: payment.bookingId, status: payment.status, amount: payment.amount };
  }

  // ---- gateway request builders (sandbox) --------------------------------

  private buildGatewayRequest(method: 'jazzcash' | 'easypaisa', payment: Payment) {
    return method === 'jazzcash'
      ? this.buildJazzCashRequest(payment)
      : this.buildEasypaisaRequest(payment);
  }

  private buildJazzCashRequest(payment: Payment) {
    const merchantId = process.env.JAZZCASH_MERCHANT_ID || '';
    const salt = process.env.JAZZCASH_INTEGRITY_SALT || '';
    const dateTime = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const expiry = new Date(Date.now() + 30 * 60000).toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const amountPaisa = (Number(payment.amount) * 100).toFixed(0);
    const txnRefNo = payment.providerRef;

    const hashStr = `${salt}&${amountPaisa}&&&${dateTime}&${expiry}&${merchantId}&${txnRefNo}&PKR&MWALLET`;
    const hash = crypto.createHmac('sha256', salt).update(hashStr).digest('hex');

    return {
      method: 'jazzcash',
      paymentId: payment.id,
      txnRefNo,
      postUrl: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
      fields: { pp_Amount: amountPaisa, pp_TxnRefNo: txnRefNo, pp_MerchantID: merchantId, pp_SecureHash: hash },
    };
  }

  private buildEasypaisaRequest(payment: Payment) {
    return {
      method: 'easypaisa',
      paymentId: payment.id,
      txnRefNo: payment.providerRef,
      postUrl: 'https://easypaisa.com.pk/easypay/',
      fields: {
        orderRefNum: payment.providerRef,
        amount: Number(payment.amount).toFixed(2),
        storeId: process.env.EASYPAISA_STORE_ID,
      },
    };
  }
}
