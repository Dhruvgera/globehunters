"use client";

import { useEffect, useMemo, useState } from "react";
import type { HotelBedsTaxItem } from "@/types/hotel";
import { convertHotelLocalTaxTotal, normalizeCurrencyCode } from "@/lib/currency/localTaxDisplay";

export type PayAtPropertyTotal = { amount: number; currencyCode: string };

/** Converts pay-at-property tax rows into the display currency. Null while converting or when there are none. */
export function usePayAtPropertyTotal(taxes: HotelBedsTaxItem[], currency: string | undefined | null): PayAtPropertyTotal | null {
  const targetCurrency = normalizeCurrencyCode(currency) || "GBP";
  const key = useMemo(() => (taxes.length > 0 ? `${targetCurrency}|${JSON.stringify(taxes)}` : ""), [targetCurrency, taxes]);
  const [result, setResult] = useState<{ key: string; total: PayAtPropertyTotal | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    convertHotelLocalTaxTotal(taxes, targetCurrency)
      .then((total) => {
        if (!cancelled) setResult({ key, total });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, total: null });
      });
    return () => {
      cancelled = true;
    };
    // `key` already encodes `taxes` and `targetCurrency`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return key && result?.key === key ? result.total : null;
}
