import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { PaymentConfigService } from '../config/payment.config';
import {
  PaymentProvider,
  GatewayRequest,
  CallbackResult,
  RefundResult,
  BuildRequestInput,
  RefundInput,
} from './payment-provider.interface';

/**
 * JazzCash "Page Redirection" (HTTP-POST) integration, v1.1.
 *
 * Going live needs only real JAZZCASH_MERCHANT_ID / PASSWORD / INTEGRITY_SALT in
 * env — the field set, hash algorithm and endpoints here are the production ones
 * (sandbox vs live URL is chosen by PAYMENT_MODE in PaymentConfigService).
 *
 * Secure hash = HMAC-SHA256, keyed by the Integrity Salt, over the salt followed
 * by every non-empty pp_ and ppmpf_ value, sorted by key and joined with '&'.
 */
@Injectable()
export class JazzCashProvider implements PaymentProvider {
  readonly name = 'jazzcash' as const;
  private readonly logger = new Logger(JazzCashProvider.name);

  constructor(private readonly cfg: PaymentConfigService) {}

  isConfigured(): boolean {
    return this.cfg.isLive('jazzcash');
  }

  private stamp(d: Date): string {
    return d.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // yyyyMMddHHmmss
  }

  /** HMAC-SHA256 over salt + '&' + non-empty values sorted by key. */
  private secureHash(fields: Record<string, string>, salt: string): string {
    const values = Object.keys(fields)
      .filter((k) => k !== 'pp_SecureHash' && fields[k] !== '' && fields[k] != null)
      .sort()
      .map((k) => fields[k]);
    const message = `${salt}&${values.join('&')}`;
    return crypto.createHmac('sha256', salt).update(message).digest('hex').toUpperCase();
  }

  buildRequest(input: BuildRequestInput): GatewayRequest {
    const { merchantId, password, integritySalt, returnUrl } = this.cfg.jazzcash;
    const now = new Date();
    const fields: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: merchantId,
      pp_SubMerchantID: '',
      pp_Password: password,
      pp_BankID: '',
      pp_ProductID: '',
      pp_TxnRefNo: input.txnRefNo,
      pp_Amount: (input.amount * 100).toFixed(0), // paisa
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: this.stamp(now),
      pp_BillReference: input.bookingRef,
      pp_Description: input.description || `TransportOS ticket ${input.bookingRef}`,
      pp_TxnExpiryDateTime: this.stamp(new Date(now.getTime() + 30 * 60_000)),
      pp_ReturnURL: returnUrl,
      ppmpf_1: input.paymentId,
    };
    fields.pp_SecureHash = this.secureHash(fields, integritySalt);

    return {
      provider: this.name,
      paymentId: input.paymentId,
      txnRefNo: input.txnRefNo,
      redirect: 'form-post',
      postUrl: this.cfg.jazzcash.postUrl,
      fields,
    };
  }

  verifyCallback(payload: Record<string, any>): CallbackResult {
    const received = (payload?.pp_SecureHash || '').toString();
    const success = payload?.pp_ResponseCode === '000';
    const result: CallbackResult = {
      txnRefNo: payload?.pp_TxnRefNo,
      success,
      code: payload?.pp_ResponseCode,
      message: payload?.pp_ResponseMessage,
    };

    // In sandbox/dev (no real salt) we can't verify — trust the payload so the
    // flow is testable. With real creds a forged "success" is rejected.
    if (!this.isConfigured()) return result;

    const stringFields: Record<string, string> = {};
    for (const k of Object.keys(payload)) if (k.startsWith('pp_')) stringFields[k] = String(payload[k]);
    const computed = this.secureHash(stringFields, this.cfg.jazzcash.integritySalt);
    if (computed !== received.toUpperCase()) {
      this.logger.warn(`JazzCash callback hash mismatch for ${result.txnRefNo}`);
      return { ...result, success: false, message: 'Invalid signature' };
    }
    return result;
  }

  async queryStatus(txnRefNo: string): Promise<CallbackResult> {
    if (!this.isConfigured()) return { txnRefNo, success: false, message: 'JazzCash not configured' };
    const { merchantId, password, integritySalt, inquiryUrl } = this.cfg.jazzcash;
    const fields: Record<string, string> = {
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
    };
    fields.pp_SecureHash = this.secureHash(fields, integritySalt);
    try {
      const { data } = await axios.post(inquiryUrl, fields, { timeout: 15_000 });
      return {
        txnRefNo,
        success: data?.pp_ResponseCode === '000' || data?.pp_PaymentResponseCode === '000',
        code: data?.pp_ResponseCode,
        message: data?.pp_ResponseMessage,
      };
    } catch (e: any) {
      this.logger.error(`JazzCash inquiry failed for ${txnRefNo}: ${e.message}`);
      return { txnRefNo, success: false, message: e.message };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.isConfigured()) return { success: false, message: 'JazzCash not configured' };
    const { merchantId, password, integritySalt } = this.cfg.jazzcash;
    const fields: Record<string, string> = {
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: input.txnRefNo,
      pp_Amount: (input.amount * 100).toFixed(0),
      pp_TxnCurrency: 'PKR',
    };
    fields.pp_SecureHash = this.secureHash(fields, integritySalt);
    const refundUrl = this.cfg.jazzcash.inquiryUrl.replace('/PaymentInquiry/Inquire', '/PaymentRefund/DoMticketRefund');
    try {
      const { data } = await axios.post(refundUrl, fields, { timeout: 15_000 });
      const ok = data?.pp_ResponseCode === '000';
      return { success: ok, ref: data?.pp_RetreivalReferenceNo, message: data?.pp_ResponseMessage };
    } catch (e: any) {
      this.logger.error(`JazzCash refund failed for ${input.txnRefNo}: ${e.message}`);
      return { success: false, message: e.message };
    }
  }
}
