import { getCurrencySymbol } from "./converter";

const CURRENCY_CODE_RE =
  /\b(GBP|USD|EUR|INR|AED|SAR|CAD|AUD|JPY|CNY)\b\s*([0-9]+(?:[.,][0-9]{1,2})?)|([0-9]+(?:[.,][0-9]{1,2})?)\s*\b(GBP|USD|EUR|INR|AED|SAR|CAD|AUD|JPY|CNY)\b/gi;

export function normalizePolicyCurrencyText(value?: string | null): string {
  return String(value || "").replace(
    CURRENCY_CODE_RE,
    (_, leadingCode, leadingAmount, trailingAmount, trailingCode) => {
      const currencyCode = String(leadingCode || trailingCode || "").toUpperCase();
      const amount = String(leadingAmount || trailingAmount || "");
      return `${getCurrencySymbol(currencyCode)}${amount}`;
    },
  );
}
