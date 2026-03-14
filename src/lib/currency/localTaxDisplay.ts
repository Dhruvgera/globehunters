import { convertCurrency, getCurrencySymbol } from "@/lib/currency/converter";
import type { HotelBedsTaxItem } from "@/types/hotel";

const SYMBOL_TO_CODE: Record<string, string> = {
  "£": "GBP",
  "$": "USD",
  "€": "EUR",
  "₹": "INR",
};

export function normalizeCurrencyCode(value: string | undefined | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return SYMBOL_TO_CODE[raw] || raw.toUpperCase();
}

export function formatMoneyFromCode(currencyCode: string, amount: number): string {
  const normalized = normalizeCurrencyCode(currencyCode);
  const symbol = getCurrencySymbol(normalized);
  if (symbol === "£" || symbol === "$" || symbol === "€" || symbol === "₹") {
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${normalized} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function convertHotelLocalTaxRows(
  taxes: HotelBedsTaxItem[] | undefined,
  targetCurrencyInput: string | undefined | null
): Promise<Array<{ label: string; amount: number; currencyCode: string }>> {
  const rows = Array.isArray(taxes) ? taxes.filter((tax) => !tax?.included) : [];
  if (rows.length === 0) return [];

  const targetCurrency = normalizeCurrencyCode(targetCurrencyInput);
  if (!targetCurrency) return [];

  const convertedRows = await Promise.all(
    rows.map(async (tax) => {
      const amount = Number(tax?.clientAmount || tax?.amount || 0);
      const sourceCurrency = normalizeCurrencyCode(tax?.clientCurrency || tax?.currency);
      if (!Number.isFinite(amount) || amount <= 0 || !sourceCurrency) return null;
      const convertedAmount = await convertCurrency(amount, sourceCurrency, targetCurrency);
      return {
        label: String(tax?.subType || tax?.type || "Taxes & fees"),
        amount: convertedAmount,
        currencyCode: targetCurrency,
      };
    })
  );

  return convertedRows.filter((row): row is { label: string; amount: number; currencyCode: string } => !!row);
}

export async function convertHotelLocalTaxTotal(
  taxes: HotelBedsTaxItem[] | undefined,
  targetCurrencyInput: string | undefined | null
): Promise<{ amount: number; currencyCode: string } | null> {
  const rows = Array.isArray(taxes) ? taxes.filter((tax) => !tax?.included) : [];
  if (rows.length === 0) return null;

  const targetCurrency = normalizeCurrencyCode(targetCurrencyInput);
  if (!targetCurrency) return null;

  let total = 0;
  for (const tax of rows) {
    const amount = Number(tax?.clientAmount || tax?.amount || 0);
    const sourceCurrency = normalizeCurrencyCode(tax?.clientCurrency || tax?.currency);
    if (!Number.isFinite(amount) || amount <= 0 || !sourceCurrency) continue;
    total += await convertCurrency(amount, sourceCurrency, targetCurrency);
  }

  const rounded = Math.round((total + Number.EPSILON) * 100) / 100;
  if (!(rounded > 0)) return null;
  return { amount: rounded, currencyCode: targetCurrency };
}
