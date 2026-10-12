import type { HotelBedsTaxItem } from "@/types/hotel";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function positiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

type HotelLike = { rawSearchResult?: unknown; price?: { currency?: string } } | null | undefined;

/**
 * Vyspa room-level `locally_payable_fees` ({ billable, request, breakdown }) as pay-at-property rows.
 * `request` is already in the selling currency. Returns [] when the room states no fees and
 * undefined when the room carries no fee information at all.
 */
export function vyspaRoomLocalFees(value: unknown): HotelBedsTaxItem[] | undefined {
  if (value === undefined || value === null) return undefined;
  const fees = record(value);
  if (!fees) return [];
  const request = record(fees.request);
  const billable = record(fees.billable);
  const source = request && positiveNumber(request.value) ? request : billable;
  const amount = positiveNumber(source?.value);
  const currency = String(source?.currency || "").trim();
  if (!amount || !currency) return [];
  const breakdown = Array.isArray(fees.breakdown) ? fees.breakdown.map(record) : [];
  const label = breakdown.map((item) => String(item?.description || "").trim()).find(Boolean) || "Local fees";
  return [{ included: false, amount: amount.toFixed(2), currency, type: label }];
}

/**
 * Supplier taxes that are not included in the hotel price and are paid to the property
 * on arrival (e.g. city/tourism tax). In order of precedence:
 * 1. fees of the room the customer picked (kept as `selectedLocalFees`),
 * 2. the Hotelbeds rate kept on the hotel's raw search result,
 * 3. the Vyspa search result's fee for its cheapest room-only / B&B rate.
 */
export function hotelPayAtPropertyTaxes(hotel: HotelLike): HotelBedsTaxItem[] {
  const raw = record(hotel?.rawSearchResult);
  if (!raw) return [];
  if (Array.isArray(raw.selectedLocalFees)) return raw.selectedLocalFees as HotelBedsTaxItem[];

  const cheapest = record(record(raw._hotelbeds)?.cheapest);
  const rows = record(cheapest?.taxes)?.taxes;
  const hotelbedsTaxes = (Array.isArray(rows) ? rows : [])
    .map((row) => record(row))
    .filter((row): row is Record<string, unknown> => !!row && !row.included)
    .map((row) => ({
      included: false,
      amount: String(row.amount ?? "0"),
      currency: String(row.currency || hotel?.price?.currency || ""),
      type: String(row.type ?? ""),
      subType: row.subType ? String(row.subType) : undefined,
      clientAmount: row.clientAmount ? String(row.clientAmount) : undefined,
      clientCurrency: row.clientCurrency ? String(row.clientCurrency) : undefined,
    }))
    .filter((row) => Number(row.clientAmount || row.amount) > 0 && Boolean(row.clientCurrency || row.currency));
  if (hotelbedsTaxes.length > 0) return hotelbedsTaxes;

  const vyspaFee = positiveNumber(raw.MinLocallyPayableFeeRO) || positiveNumber(raw.MinLocallyPayableFeeBB);
  const vyspaCurrency = String(raw.SellCur || hotel?.price?.currency || "").trim();
  if (vyspaFee && vyspaCurrency) {
    return [{ included: false, amount: vyspaFee.toFixed(2), currency: vyspaCurrency, type: "Local fees" }];
  }
  return [];
}

export function payAtPropertyTaxesForHotels(hotels: HotelLike[]): HotelBedsTaxItem[] {
  return hotels.flatMap((hotel) => hotelPayAtPropertyTaxes(hotel));
}
