import { formatPrice } from "./converter";

const SYMBOL_TO_CODE: Record<string, string> = { "£": "GBP", "$": "USD", "€": "EUR" };

export function formatMoneyFromSymbol(
  currency: string | undefined,
  amount: number | undefined,
  fallbackCurrency = "GBP",
  fallbackSymbol = "£",
): string {
  const a = typeof amount === "number" ? amount : undefined;
  if (a == null || Number.isNaN(a)) return "—";
  const normalized = String(currency || fallbackCurrency).trim().toUpperCase();
  const currencyCode = SYMBOL_TO_CODE[normalized] || normalized;
  if (/^[A-Z]{3}$/.test(currencyCode) || SYMBOL_TO_CODE[normalized]) {
    return formatPrice(a, currencyCode);
  }
  return `${String(currency || fallbackSymbol).trim()}${a.toFixed(2)}`;
}
