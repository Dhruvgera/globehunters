export function isRealHotelImageUrl(value: string | undefined | null): value is string {
  const text = String(value || "").trim();
  if (!text) return false;
  if (text.includes("/hotel-placeholder")) return false;
  if (text.includes("/figma/")) return false;
  return /^https?:\/\//i.test(text) || text.startsWith("/");
}

/**
 * Hotelbeds hotel code, only for hotels that came from the Hotelbeds search. Vyspa ids live in a
 * different number space, so looking them up in the content API would return an unrelated hotel.
 */
function hotelContentCode(hotel: { id?: string; rawSearchResult?: unknown }) {
  const raw =
    hotel.rawSearchResult && typeof hotel.rawSearchResult === "object" && !Array.isArray(hotel.rawSearchResult)
      ? (hotel.rawSearchResult as Record<string, unknown>)
      : null;
  if (String(raw?.provider || "").toLowerCase() !== "hotelbeds") return null;
  const code = Number(raw?.providerHotelCode ?? raw?.hotel_id ?? raw?.hotelId ?? hotel.id);
  return Number.isFinite(code) && code > 0 ? code : null;
}

export type HotelContent = { images: string[]; address?: string };

/** Photos (main image first) and street address from the hotel content API (Hotelbeds). Fast compared to supplier detail calls. */
export async function fetchHotelContent(hotel: { id?: string; rawSearchResult?: unknown }): Promise<HotelContent | null> {
  const code = hotelContentCode(hotel);
  if (!code) return null;
  const response = await fetch(`/api/hotels/content?code=${encodeURIComponent(String(code))}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) return null;
  const images: unknown[] = [data.imageUrl, ...(Array.isArray(data.hotelImages) ? data.hotelImages : [])];
  const address = typeof data.address1 === "string" ? data.address1.trim() : "";
  return {
    images: images.filter((image): image is string => typeof image === "string" && isRealHotelImageUrl(image)),
    address: address || undefined,
  };
}

/** Real photos from the hotel content API, main image first. */
export async function fetchHotelContentImages(hotel: { id?: string; rawSearchResult?: unknown }): Promise<string[]> {
  return (await fetchHotelContent(hotel))?.images || [];
}
