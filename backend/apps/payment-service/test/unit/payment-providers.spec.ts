/// <reference types="jest" />
import * as crypto from 'crypto';
import { PaymentConfigService } from '../../src/config/payment.config';
import { JazzCashProvider } from '../../src/providers/jazzcash.provider';
import { EasypaisaProvider } from '../../src/providers/easypaisa.provider';

/**
 * Payment-gateway logic proven WITHOUT real merchant credentials, so it runs in
 * CI on every commit. Covers the two things that must be exactly right before
 * going live: the request field set + secure hash, and callback signature
 * verification (a forged "success" must be rejected once real creds are set).
 */

// A stub of PaymentConfigService's shape — the providers only read these.
function fakeCfg(opts: { jazzLive?: boolean; easyLive?: boolean; mode?: 'sandbox' | 'production' } = {}): any {
  const mode = opts.mode || 'sandbox';
  return {
    mode,
    jazzcash: {
      merchantId: 'MC12345', password: 'pass123', integritySalt: 'SALT_ABC_123',
      returnUrl: 'https://app.test/api/v1/payments/jazzcash/callback',
      postUrl: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
      inquiryUrl: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire',
      configured: !!opts.jazzLive,
    },
    easypaisa: {
      storeId: 'STORE1', hashKey: 'HASHKEY_XYZ', accountNum: 'ACC999',
      returnUrl: 'https://app.test/api/v1/payments/easypaisa/callback',
      postUrl: 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf',
      inquiryUrl: 'https://easypaystg.easypaisa.com.pk/easypay/Confirm.jsf',
      configured: !!opts.easyLive,
    },
    isLive(p: string) { return p === 'jazzcash' ? this.jazzcash.configured : this.easypaisa.configured; },
  };
}

const input = { paymentId: 'pay-1', txnRefNo: 'TOS100', amount: 4500, bookingRef: 'PNRAB12' };

describe('JazzCashProvider', () => {
  it('builds a request with the required pp_ fields, amount in paisa, and a secure hash', () => {
    const p = new JazzCashProvider(fakeCfg());
    const req = p.buildRequest(input);
    expect(req.postUrl).toContain('jazzcash.com.pk');
    expect(req.fields.pp_MerchantID).toBe('MC12345');
    expect(req.fields.pp_TxnRefNo).toBe('TOS100');
    expect(req.fields.pp_Amount).toBe('450000'); // 4500 rupees -> paisa
    expect(req.fields.pp_TxnCurrency).toBe('PKR');
    expect(req.fields.pp_ReturnURL).toContain('/payments/jazzcash/callback');
    expect(req.fields.pp_SecureHash).toMatch(/^[0-9A-F]{64}$/); // HMAC-SHA256 hex
  });

  // Recompute the hash exactly as the provider does, to prove verification.
  const jazzHash = (fields: Record<string, string>, salt: string) => {
    const values = Object.keys(fields)
      .filter((k) => k !== 'pp_SecureHash' && fields[k] !== '' && fields[k] != null)
      .sort().map((k) => fields[k]);
    return crypto.createHmac('sha256', salt).update(`${salt}&${values.join('&')}`).digest('hex').toUpperCase();
  };

  it('accepts a correctly-signed callback and rejects a forged one (live mode)', () => {
    const p = new JazzCashProvider(fakeCfg({ jazzLive: true }));
    const payload: Record<string, string> = { pp_TxnRefNo: 'TOS100', pp_ResponseCode: '000', pp_Amount: '450000' };
    payload.pp_SecureHash = jazzHash(payload, 'SALT_ABC_123');

    const good = p.verifyCallback(payload);
    expect(good.success).toBe(true);
    expect(good.txnRefNo).toBe('TOS100');

    // Tamper with the amount but keep the old hash -> must be rejected.
    const forged = p.verifyCallback({ ...payload, pp_Amount: '1' });
    expect(forged.success).toBe(false);
    expect(forged.message).toBe('Invalid signature');
  });

  it('in sandbox (not configured) trusts the response code so the flow is testable', () => {
    const p = new JazzCashProvider(fakeCfg({ jazzLive: false }));
    expect(p.verifyCallback({ pp_TxnRefNo: 'X', pp_ResponseCode: '000' }).success).toBe(true);
    expect(p.verifyCallback({ pp_TxnRefNo: 'X', pp_ResponseCode: '999' }).success).toBe(false);
  });
});

describe('EasypaisaProvider', () => {
  it('builds a hosted-checkout request with storeId, amount and a signed request hash', () => {
    const p = new EasypaisaProvider(fakeCfg());
    const req = p.buildRequest(input);
    expect(req.postUrl).toContain('easypaisa.com.pk');
    expect(req.fields.storeId).toBe('STORE1');
    expect(req.fields.amount).toBe('4500.00');
    expect(req.fields.orderRefNum).toBe('TOS100');
    expect(req.fields.merchantHashedReq).toBeTruthy();
  });

  it('rejects a callback whose signature does not match (live mode)', () => {
    const p = new EasypaisaProvider(fakeCfg({ easyLive: true }));
    const forged = p.verifyCallback({ orderRefNum: 'TOS100', responseCode: '0000', merchantHashedReq: 'not-a-real-hash' });
    expect(forged.success).toBe(false);
    expect(forged.message).toBe('Invalid signature');
  });
});

describe('PaymentConfigService', () => {
  const cfgWith = (env: Record<string, string>) =>
    new PaymentConfigService({ get: (k: string, d?: any) => (k in env ? env[k] : d) } as any);

  it('treats "your-..." placeholders as NOT configured (stays in mock mode)', () => {
    const c = cfgWith({ JAZZCASH_MERCHANT_ID: 'your-merchant-id', JAZZCASH_INTEGRITY_SALT: 'your-integrity-salt' });
    expect(c.isLive('jazzcash')).toBe(false);
  });

  it('is live once real credentials are present', () => {
    const c = cfgWith({ JAZZCASH_MERCHANT_ID: 'MC777', JAZZCASH_INTEGRITY_SALT: 'realsalt' });
    expect(c.isLive('jazzcash')).toBe(true);
  });

  it('resolves production endpoints when PAYMENT_MODE=production', () => {
    const c = cfgWith({ PAYMENT_MODE: 'production' });
    expect(c.mode).toBe('production');
    expect(c.jazzcash.postUrl).toContain('payments.jazzcash.com.pk');
    expect(c.easypaisa.postUrl).toContain('easypay.easypaisa.com.pk');
  });
});
