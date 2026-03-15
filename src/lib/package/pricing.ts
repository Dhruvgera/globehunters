interface ResolvePackagePricingInput {
  packagePriceAmount?: number;
  packagePriceCurrency?: string;
  hotelRoomTotals?: Array<number | undefined>;
  flightTotal?: number;
  flightCurrency?: string;
  selectedRoomPackageTotal?: number;
  selectedRoomCurrency?: string;
  selectedFlightDelta?: number;
  fallbackStartingPrice?: number;
  fallbackCurrency?: string;
  selectedFlightCurrency?: string;
}

function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return undefined;
}

function isFiniteAmount(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundCurrencyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumPositiveAmounts(values: Array<number | undefined> | undefined): number | undefined {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const filtered = values.filter((value): value is number => isFiniteAmount(value) && value > 0);
  if (filtered.length === 0) return undefined;
  return roundCurrencyAmount(filtered.reduce((sum, value) => sum + value, 0));
}

export function resolvePackagePricing(input: ResolvePackagePricingInput): {
  amount?: number;
  currency?: string;
} {
  const packagePriceAmount = isFiniteAmount(input.packagePriceAmount) ? input.packagePriceAmount : undefined;
  const hotelRoomTotal = sumPositiveAmounts(input.hotelRoomTotals);
  const flightTotal = isFiniteAmount(input.flightTotal) && input.flightTotal >= 0 ? input.flightTotal : undefined;
  const selectedRoomPackageTotal =
    isFiniteAmount(input.selectedRoomPackageTotal) && input.selectedRoomPackageTotal > 0
      ? input.selectedRoomPackageTotal
      : undefined;
  const selectedFlightDelta =
    isFiniteAmount(input.selectedFlightDelta) && Math.abs(input.selectedFlightDelta) >= 0.01
      ? input.selectedFlightDelta
      : 0;
  const fallbackStartingPrice =
    isFiniteAmount(input.fallbackStartingPrice) && input.fallbackStartingPrice > 0
      ? input.fallbackStartingPrice
      : undefined;

  let amount: number | undefined;

  if (packagePriceAmount !== undefined && packagePriceAmount > 0) {
    amount = roundCurrencyAmount(packagePriceAmount);
  } else if (selectedRoomPackageTotal !== undefined) {
    amount = roundCurrencyAmount(selectedRoomPackageTotal + selectedFlightDelta);
  } else if (hotelRoomTotal !== undefined && flightTotal !== undefined) {
    amount = roundCurrencyAmount(hotelRoomTotal + flightTotal);
  } else if (fallbackStartingPrice !== undefined) {
    amount = roundCurrencyAmount(fallbackStartingPrice + selectedFlightDelta);
  }

  const currency = firstNonEmpty([
    input.flightCurrency,
    input.packagePriceCurrency,
    input.selectedRoomCurrency,
    input.fallbackCurrency,
    input.selectedFlightCurrency,
    "GBP",
  ]);

  return { amount, currency };
}
