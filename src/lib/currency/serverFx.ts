import 'server-only';

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const STATIC_USD_BASE_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  INR: 83.12,
  AED: 3.67,
  SAR: 3.75,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.5,
  CNY: 7.24,
};

const SYMBOL_TO_CODE: Record<string, string> = {
  "£": "GBP",
  "$": "USD",
  "€": "EUR",
  "₹": "INR",
};

type RateCacheEntry = {
  rates: Record<string, number>;
  fetchedAt: number;
};

const ratesCache = new Map<string, RateCacheEntry>();

export type LocalPayableTaxItem = {
  amount: number;
  currency: string;
  label?: string;
};

function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function normalizeCurrencyCode(value: string | undefined | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (SYMBOL_TO_CODE[raw]) return SYMBOL_TO_CODE[raw];
  return raw.toUpperCase();
}

function convertViaStaticUsd(amount: number, from: string, to: string): number {
  const fromRate = STATIC_USD_BASE_RATES[from];
  const toRate = STATIC_USD_BASE_RATES[to];
  if (!fromRate || !toRate) {
    return round2(amount);
  }
  const amountInUsd = amount / fromRate;
  return round2(amountInUsd * toRate);
}

async function getRatesForBase(base: string): Promise<Record<string, number> | null> {
  const cached = ratesCache.get(base);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  try {
    // Free exchange-rates list API; returns all rates for the requested base.
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { rates?: Record<string, number> };
    if (!data?.rates || typeof data.rates !== "object") return null;

    ratesCache.set(base, { rates: data.rates, fetchedAt: Date.now() });
    return data.rates;
  } catch {
    return null;
  }
}

export async function convertCurrencyServer(amount: number, fromInput: string, toInput: string): Promise<number> {
  const from = normalizeCurrencyCode(fromInput);
  const to = normalizeCurrencyCode(toInput);
  const numericAmount = Number(amount || 0);

  if (!from || !to || !Number.isFinite(numericAmount)) return 0;
  if (from === to) return round2(numericAmount);

  const rates = await getRatesForBase(from);
  const directRate = rates?.[to];
  if (rates && Number.isFinite(directRate) && Number(directRate) > 0) {
    return round2(numericAmount * Number(directRate));
  }

  return convertViaStaticUsd(numericAmount, from, to);
}

export async function convertLocalTaxesToCurrency(
  taxes: LocalPayableTaxItem[] | undefined,
  targetCurrencyInput: string
): Promise<number> {
  if (!Array.isArray(taxes) || taxes.length === 0) return 0;

  const targetCurrency = normalizeCurrencyCode(targetCurrencyInput);
  if (!targetCurrency) return 0;

  let total = 0;
  for (const row of taxes) {
    const amount = Number(row?.amount || 0);
    const fromCurrency = normalizeCurrencyCode(row?.currency);
    if (!Number.isFinite(amount) || amount <= 0 || !fromCurrency) continue;
    total += await convertCurrencyServer(amount, fromCurrency, targetCurrency);
  }

  return round2(total);
}
