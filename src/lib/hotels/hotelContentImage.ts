export function isRealHotelImageUrl(value: string | undefined | null): value is string {
  const text = String(value || "").trim();
  if (!text) return false;
  if (text.includes("/hotel-placeholder")) return false;
  if (text.includes("/figma/")) return false;
  return /^https?:\/\//i.test(text) || text.startsWith("/");
}

function hotelContentCode(hotel: { id?: string; rawSearchResult?: unknown }) {
  const raw =
    hotel.rawSearchResult && typeof hotel.rawSearchResult === "object" && !Array.isArray(hotel.rawSearchResult)
      ? (hotel.rawSearchResult as Record<string, unknown>)
      : null;
  const code = Number(raw?.hotel_id ?? raw?.hotelId ?? hotel.id);
  return Number.isFinite(code) && code > 0 ? code : null;
}

/** Real photos from the hotel content API (Hotelbeds), main image first. Fast compared to supplier detail calls. */
export async function fetchHotelContentImages(hotel: { id?: string; rawSearchResult?: unknown }): Promise<string[]> {
  const code = hotelContentCode(hotel);
  if (!code) return [];
  const response = await fetch(`/api/hotels/content?code=${encodeURIComponent(String(code))}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) return [];
  const images: unknown[] = [data.imageUrl, ...(Array.isArray(data.hotelImages) ? data.hotelImages : [])];
  return images.filter((image): image is string => typeof image === "string" && isRealHotelImageUrl(image));
}
