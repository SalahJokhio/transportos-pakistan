/**
 * Response shape from POST /payments/initiate.
 * `live` = real gateway (redirect); otherwise the caller uses the sandbox path.
 */
export interface GatewayInitiateResponse {
  provider: string;
  paymentId: string;
  txnRefNo: string;
  postUrl: string;
  fields: Record<string, string>;
  live?: boolean;
  mode?: 'sandbox' | 'production';
  reused?: boolean;
  status?: string;
}

/**
 * Redirect the browser to a payment gateway by auto-submitting a hidden form
 * POST — the standard JazzCash/EasyPaisa "page redirection" hand-off. The user
 * leaves our site, pays, and the gateway sends them back to the return URL
 * (which settles the booking and bounces them to their e-ticket).
 */
export function redirectToGateway(res: GatewayInitiateResponse): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = res.postUrl;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(res.fields || {})) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value ?? '';
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
