import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  async initiate(bookingId: string, method: 'jazzcash' | 'easypaisa', amount: number) {
    const txnRefNo = `TOS${Date.now()}`;
    if (method === 'jazzcash') {
      return this.buildJazzCashRequest(bookingId, txnRefNo, amount);
    }
    return this.buildEasypaisaRequest(bookingId, txnRefNo, amount);
  }

  private buildJazzCashRequest(bookingId: string, txnRefNo: string, amount: number) {
    const merchantId = process.env.JAZZCASH_MERCHANT_ID || '';
    const password = process.env.JAZZCASH_PASSWORD || '';
    const salt = process.env.JAZZCASH_INTEGRITY_SALT || '';
    const dateTime = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const expiry = new Date(Date.now() + 30 * 60000).toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const amountPaisa = (amount * 100).toFixed(0);

    const hashStr = `${salt}&${amountPaisa}&&&${dateTime}&${expiry}&${merchantId}&${txnRefNo}&PKR&MWALLET`;
    const hash = crypto.createHmac('sha256', salt).update(hashStr).digest('hex');

    return {
      method: 'jazzcash',
      txnRefNo,
      postUrl: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
      fields: { pp_Amount: amountPaisa, pp_TxnRefNo: txnRefNo, pp_MerchantID: merchantId, pp_SecureHash: hash },
    };
  }

  private buildEasypaisaRequest(bookingId: string, txnRefNo: string, amount: number) {
    return {
      method: 'easypaisa',
      txnRefNo,
      postUrl: 'https://easypaisa.com.pk/easypay/',
      fields: { orderRefNum: txnRefNo, amount: amount.toFixed(2), storeId: process.env.EASYPAISA_STORE_ID },
    };
  }

  async handleJazzCashCallback(payload: any) {
    // Verify hash and confirm booking — full impl needs booking-service call
    return { success: payload.pp_ResponseCode === '000', txnRefNo: payload.pp_TxnRefNo };
  }

  async handleEasypaisaCallback(payload: any) {
    return { success: payload.responseCode === '0000', txnRefNo: payload.orderRefNum };
  }

  async getStatus(paymentId: string) {
    return { paymentId, status: 'PENDING' };
  }
}
