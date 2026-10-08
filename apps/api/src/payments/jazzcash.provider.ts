import { createHmac } from 'crypto';
import {
  CheckoutRequest,
  PaymentProvider,
} from './payment-provider.interface.js';

function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/**
 * JazzCash hosted-checkout provider (page-redirect flow).
 *
 * Integrity rule per JazzCash docs: take every field whose name starts with
 * "pp" (except pp_SecureHash itself), skip empty values, sort keys by ASCII
 * ascending, join the VALUES with "&", prepend "<integritySalt>&", then
 * HMAC-SHA256 with the integrity salt as key. Hex digest, uppercase.
 *
 * All credentials and URLs come from env — nothing is hardcoded:
 *   JAZZCASH_MERCHANT_ID / JAZZCASH_PASSWORD / JAZZCASH_INTEGRITY_SALT
 *   JAZZCASH_GATEWAY_URL (defaults to the sandbox merchant form)
 *   JAZZCASH_RETURN_URL  (where JazzCash POSTs the result)
 */
export class JazzCashProvider implements PaymentProvider {
  readonly name = 'jazzcash';

  private get merchantId() {
    return process.env.JAZZCASH_MERCHANT_ID ?? '';
  }
  private get password() {
    return process.env.JAZZCASH_PASSWORD ?? '';
  }
  private get integritySalt() {
    return process.env.JAZZCASH_INTEGRITY_SALT ?? '';
  }

  gatewayUrl(): string {
    return (
      process.env.JAZZCASH_GATEWAY_URL ??
      'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
    );
  }

  returnUrl(): string {
    return (
      process.env.JAZZCASH_RETURN_URL ??
      'http://localhost:3001/v1/payments/callback/jazzcash'
    );
  }

  get configured(): boolean {
    return Boolean(this.merchantId && this.password && this.integritySalt);
  }

  buildCheckoutFields(req: CheckoutRequest): Record<string, string> {
    const now = new Date();
    const expiry = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const fields: Record<string, string> = {
      pp_Version: '2.0',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: this.merchantId,
      pp_SubMerchantID: '',
      pp_Password: this.password,
      pp_BankID: '',
      pp_ProductID: '',
      pp_TxnRefNo: req.txnRefNo,
      pp_Amount: String(req.amountPaisa),
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: fmtDateTime(now),
      pp_TxnExpiryDateTime: fmtDateTime(expiry),
      pp_BillReference: req.billReference,
      pp_Description: req.description.slice(0, 100),
      pp_ReturnURL: req.returnUrl,
      ppmpf_1: '',
      ppmpf_2: '',
      ppmpf_3: '',
      ppmpf_4: '',
      ppmpf_5: '',
    };
    fields.pp_SecureHash = this.sign(fields);
    return fields;
  }

  /** Sign a field map (used for checkout; also used in tests). */
  sign(fields: Record<string, string>): string {
    const salt = this.integritySalt;
    const keys = Object.keys(fields)
      .filter((k) => k.toLowerCase().startsWith('pp') && k !== 'pp_SecureHash')
      .filter((k) => fields[k] !== '')
      .sort();
    const joined = keys.map((k) => fields[k]).join('&');
    const payload = `${salt}&${joined}`;
    return createHmac('sha256', salt).update(payload).digest('hex').toUpperCase();
  }

  verifyCallback(payload: Record<string, string>): boolean {
    const received = payload.pp_SecureHash;
    if (!received) return false;
    return this.sign(payload) === received.toUpperCase();
  }

  isSuccess(payload: Record<string, string>): boolean {
    return payload.pp_ResponseCode === '000';
  }

  gatewayTxnId(payload: Record<string, string>): string | null {
    return payload.pp_RetreivalReferenceNo || null;
  }

  callbackAmountPaisa(payload: Record<string, string>): number | null {
    const n = Number(payload.pp_Amount);
    return Number.isFinite(n) ? n : null;
  }

  callbackTxnRef(payload: Record<string, string>): string | null {
    return payload.pp_TxnRefNo || null;
  }
}
