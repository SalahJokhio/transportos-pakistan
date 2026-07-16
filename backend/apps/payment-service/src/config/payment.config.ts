import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PaymentMode = 'sandbox' | 'production';

export interface JazzCashSettings {
  merchantId: string;
  password: string;
  integritySalt: string;
  returnUrl: string;
  postUrl: string; // page-redirection form endpoint (resolved by mode)
  inquiryUrl: string; // status-inquiry API endpoint (resolved by mode)
  configured: boolean; // true only when real (non-placeholder) creds are set
}

export interface EasypaisaSettings {
  storeId: string;
  hashKey: string;
  accountNum: string;
  returnUrl: string;
  postUrl: string;
  inquiryUrl: string;
  configured: boolean;
}

// Official gateway endpoints. Switching sandbox <-> production is ONE env flag
// (PAYMENT_MODE); no code change is needed when the merchant account goes live.
const JAZZCASH_ENDPOINTS = {
  sandbox: {
    post: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
    inquiry: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire',
  },
  production: {
    post: 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
    inquiry: 'https://payments.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire',
  },
} as const;

const EASYPAISA_ENDPOINTS = {
  sandbox: {
    post: 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf',
    inquiry: 'https://easypaystg.easypaisa.com.pk/easypay/Confirm.jsf',
  },
  production: {
    post: 'https://easypay.easypaisa.com.pk/easypay/Index.jsf',
    inquiry: 'https://easypay.easypaisa.com.pk/easypay/Confirm.jsf',
  },
} as const;

/** Placeholders from .env.example ("your-...") count as "not configured". */
const isPlaceholder = (v?: string): boolean => !v || v.trim() === '' || v.startsWith('your-');

/**
 * Single source of truth for all payment-gateway settings. Reads env once,
 * resolves the right endpoints for the current PAYMENT_MODE, and reports whether
 * each provider has real credentials. The rest of the payment code depends on
 * this — never on process.env directly — so going live is a config change only.
 */
@Injectable()
export class PaymentConfigService {
  readonly mode: PaymentMode;
  readonly jazzcash: JazzCashSettings;
  readonly easypaisa: EasypaisaSettings;

  constructor(private readonly config: ConfigService) {
    this.mode = this.config.get<string>('PAYMENT_MODE', 'sandbox') === 'production' ? 'production' : 'sandbox';

    const jcMerchant = this.config.get<string>('JAZZCASH_MERCHANT_ID', '');
    const jcSalt = this.config.get<string>('JAZZCASH_INTEGRITY_SALT', '');
    this.jazzcash = {
      merchantId: jcMerchant,
      password: this.config.get<string>('JAZZCASH_PASSWORD', ''),
      integritySalt: jcSalt,
      returnUrl: this.config.get<string>('JAZZCASH_RETURN_URL', ''),
      postUrl: JAZZCASH_ENDPOINTS[this.mode].post,
      inquiryUrl: JAZZCASH_ENDPOINTS[this.mode].inquiry,
      configured: !isPlaceholder(jcMerchant) && !isPlaceholder(jcSalt),
    };

    const epStore = this.config.get<string>('EASYPAISA_STORE_ID', '');
    const epHash = this.config.get<string>('EASYPAISA_HASH_KEY', '');
    this.easypaisa = {
      storeId: epStore,
      hashKey: epHash,
      accountNum: this.config.get<string>('EASYPAISA_ACCOUNT_NUM', ''),
      returnUrl: this.config.get<string>('EASYPAISA_RETURN_URL', ''),
      postUrl: EASYPAISA_ENDPOINTS[this.mode].post,
      inquiryUrl: EASYPAISA_ENDPOINTS[this.mode].inquiry,
      configured: !isPlaceholder(epStore) && !isPlaceholder(epHash),
    };
  }

  /** True only when a provider holds real, non-placeholder credentials. */
  isLive(provider: 'jazzcash' | 'easypaisa'): boolean {
    return provider === 'jazzcash' ? this.jazzcash.configured : this.easypaisa.configured;
  }
}
