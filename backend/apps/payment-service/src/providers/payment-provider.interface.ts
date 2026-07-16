/**
 * Contract every payment gateway implements (JazzCash in Step 2, EasyPaisa in
 * Step 3). The PaymentService talks only to this interface, so adding a rail
 * (HBL, Alfalah, Raast, …) later is just another class — no changes to the
 * booking/settlement logic.
 */

/** A ready-to-submit gateway request. The frontend auto-POSTs `fields` to `postUrl`. */
export interface GatewayRequest {
  provider: string;
  paymentId: string;
  txnRefNo: string;
  redirect: 'form-post';
  postUrl: string;
  fields: Record<string, string>;
}

/** Normalized result of verifying a gateway callback or a status inquiry. */
export interface CallbackResult {
  txnRefNo?: string;
  success: boolean;
  /** Raw provider response code (e.g. JazzCash pp_ResponseCode "000"). */
  code?: string;
  message?: string;
}

export interface RefundResult {
  success: boolean;
  ref?: string;
  message?: string;
}

export interface BuildRequestInput {
  paymentId: string;
  txnRefNo: string;
  amount: number; // in rupees; the provider converts to paisa where required
  bookingRef: string;
  description?: string;
}

export interface RefundInput {
  txnRefNo: string;
  amount: number; // rupees
  reason?: string;
}

export interface PaymentProvider {
  readonly name: 'jazzcash' | 'easypaisa';

  /** Whether real credentials are present (drives live vs. sandbox behavior). */
  isConfigured(): boolean;

  /** Build the redirect/form request that sends the user to the gateway. */
  buildRequest(input: BuildRequestInput): GatewayRequest;

  /** Verify a callback payload's signature and map it to success/failure. */
  verifyCallback(payload: Record<string, any>): CallbackResult;

  /** Server-to-server status inquiry (source of truth for reconciliation). */
  queryStatus(txnRefNo: string): Promise<CallbackResult>;

  /** Execute a refund against the gateway. */
  refund(input: RefundInput): Promise<RefundResult>;
}
