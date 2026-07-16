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
 * EasyPaisa (Telenor Microfinance) "Easypay" hosted-checkout integration.
 *
 * Going live needs only real EASYPAISA_STORE_ID / HASH_KEY / ACCOUNT_NUM in env.
 * The merchant request is signed with HMAC-SHA256 (base64) over the sorted
 * `key=value&` parameter string, keyed by the account's hash key — the same
 * signature Easypay expects and returns on its callback.
 */
@Injectable()
export class EasypaisaProvider implements PaymentProvider {
  readonly name = 'easypaisa' as const;
  private readonly logger = new Logger(EasypaisaProvider.name);

  constructor(private readonly cfg: PaymentConfigService) {}

  isConfigured(): boolean {
    return this.cfg.isLive('easypaisa');
  }

  /** yyyyMMdd HHmmss expiry stamp Easypay expects. */
  private expiry(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  /** HMAC-SHA256 (base64) over sorted `key=value&…` (trailing '&' included). */
  private requestHash(params: Record<string, string>, hashKey: string): string {
    const message = Object.keys(params)
      .filter((k) => params[k] !== '' && params[k] != null)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&') + '&';
    return crypto.createHmac('sha256', hashKey).update(message).digest('base64');
  }

  buildRequest(input: BuildRequestInput): GatewayRequest {
    const { storeId, hashKey, returnUrl } = this.cfg.easypaisa;
    const params: Record<string, string> = {
      storeId,
      amount: input.amount.toFixed(2),
      postBackURL: returnUrl,
      orderRefNum: input.txnRefNo,
      expiryDate: this.expiry(new Date(Date.now() + 30 * 60_000)),
      autoRedirect: '0',
      paymentMethod: '', // let the user pick (Mobile Account / Card / OTC)
    };
    const merchantHashedReq = this.requestHash(params, hashKey);

    return {
      provider: this.name,
      paymentId: input.paymentId,
      txnRefNo: input.txnRefNo,
      redirect: 'form-post',
      postUrl: this.cfg.easypaisa.postUrl,
      fields: { ...params, merchantHashedReq },
    };
  }

  verifyCallback(payload: Record<string, any>): CallbackResult {
    const success = payload?.responseCode === '0000' || payload?.status === 'PAID';
    const result: CallbackResult = {
      txnRefNo: payload?.orderRefNum ?? payload?.orderRefNumber,
      success,
      code: payload?.responseCode,
      message: payload?.responseDesc,
    };
    if (!this.isConfigured()) return result;

    const received = (payload?.merchantHashedReq || payload?.hashKey || '').toString();
    if (received) {
      const fields: Record<string, string> = {};
      for (const k of Object.keys(payload)) {
        if (k === 'merchantHashedReq' || k === 'hashKey') continue;
        fields[k] = String(payload[k]);
      }
      const computed = this.requestHash(fields, this.cfg.easypaisa.hashKey);
      if (computed !== received) {
        this.logger.warn(`EasyPaisa callback hash mismatch for ${result.txnRefNo}`);
        return { ...result, success: false, message: 'Invalid signature' };
      }
    }
    return result;
  }

  async queryStatus(txnRefNo: string): Promise<CallbackResult> {
    if (!this.isConfigured()) return { txnRefNo, success: false, message: 'EasyPaisa not configured' };
    const { storeId, hashKey, accountNum, inquiryUrl } = this.cfg.easypaisa;
    const params: Record<string, string> = { storeId, accountNum, orderRefNum: txnRefNo };
    params.merchantHashedReq = this.requestHash(params, hashKey);
    try {
      const { data } = await axios.post(inquiryUrl, params, { timeout: 15_000 });
      return {
        txnRefNo,
        success: data?.responseCode === '0000' || data?.transactionStatus === 'PAID',
        code: data?.responseCode,
        message: data?.responseDesc,
      };
    } catch (e: any) {
      this.logger.error(`EasyPaisa inquiry failed for ${txnRefNo}: ${e.message}`);
      return { txnRefNo, success: false, message: e.message };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.isConfigured()) return { success: false, message: 'EasyPaisa not configured' };
    const { storeId, hashKey, accountNum, inquiryUrl } = this.cfg.easypaisa;
    const params: Record<string, string> = {
      storeId,
      accountNum,
      orderRefNum: input.txnRefNo,
      transactionAmount: input.amount.toFixed(2),
      refundReason: input.reason || 'Booking cancelled',
    };
    params.merchantHashedReq = this.requestHash(params, hashKey);
    const refundUrl = inquiryUrl.replace('/Confirm.jsf', '/Refund.jsf');
    try {
      const { data } = await axios.post(refundUrl, params, { timeout: 15_000 });
      const ok = data?.responseCode === '0000';
      return { success: ok, ref: data?.transactionId, message: data?.responseDesc };
    } catch (e: any) {
      this.logger.error(`EasyPaisa refund failed for ${input.txnRefNo}: ${e.message}`);
      return { success: false, message: e.message };
    }
  }
}
