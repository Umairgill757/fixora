/**
 * Payment provider abstraction.
 *
 * JazzCash is the first implementation (Pakistani methods: JazzCash mobile
 * account, cards via the hosted checkout). EasyPaisa / PayPro / Stripe can be
 * added later behind this same interface without touching the booking flow.
 */
export interface CheckoutRequest {
  /** Our unique transaction reference (sent as pp_TxnRefNo). */
  txnRefNo: string;
  /** Amount in paisa (Rs * 100), as JazzCash expects. */
  amountPaisa: number;
  /** Merchant's bill reference — we use the booking id. */
  billReference: string;
  description: string;
  /** Where the gateway POSTs the result. */
  returnUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  /** URL of the gateway's hosted checkout page. */
  gatewayUrl(): string;
  /** Signed form fields the browser auto-submits to the gateway. */
  buildCheckoutFields(req: CheckoutRequest): Record<string, string>;
  /** True when the callback payload's integrity hash is valid. */
  verifyCallback(payload: Record<string, string>): boolean;
  /** True when the callback payload means money actually moved. */
  isSuccess(payload: Record<string, string>): boolean;
  /** Gateway's transaction id from a callback payload, if present. */
  gatewayTxnId(payload: Record<string, string>): string | null;
  /** Amount in paisa from a callback payload, if present. */
  callbackAmountPaisa(payload: Record<string, string>): number | null;
  /** Our transaction reference from a callback payload, if present. */
  callbackTxnRef(payload: Record<string, string>): string | null;
}
