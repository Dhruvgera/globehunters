import type { HotelBedsTaxItem } from "@/types/hotel";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * Supplier taxes that are not included in the hotel price and are paid to the property
 * on arrival (e.g. city/tourism tax). Read from the Hotelbeds rate kept on the hotel's
 * raw search result.
 */
export function hotelPayAtPropertyTaxes(hotel: { rawSearchResult?: unknown; price?: { currency?: string } } | null | undefined): HotelBedsTaxItem[] {
  const raw = record(hotel?.rawSearchResult);
  const cheapest = record(record(raw?._hotelbeds)?.cheapest);
  const rows = record(cheapest?.taxes)?.taxes;
  if (!Array.isArray(rows)) return [];
  return rows
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
}

export function payAtPropertyTaxesForHotels(hotels: Array<Parameters<typeof hotelPayAtPropertyTaxes>[0]>): HotelBedsTaxItem[] {
  return hotels.flatMap((hotel) => hotelPayAtPropertyTaxes(hotel));
}
