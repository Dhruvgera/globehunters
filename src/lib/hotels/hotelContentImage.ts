export function isRealHotelImageUrl(value: string | undefined | null): value is string {
  const text = String(value || "").trim();
  if (!text) return false;
  if (text.includes("/hotel-placeholder")) return false;
  if (text.includes("/figma/")) return false;
  return /^https?:\/\//i.test(text) || text.startsWith("/");
}

type ContentHotel = { id?: string; imageSrc?: string; rawSearchResult?: unknown };

/**
 * Hotelbeds hotel code for the content API. Hotelbeds-direct results carry it as their id. Vyspa ids live in a
 * different number space (looking them up returns an unrelated hotel), but Vyspa hotels supplied by Hotelbeds use
 * Hotelbeds photos whose path holds the code, e.g. photos.hotelbeds.com/giata/original/14/141604/141604a_hb_ro_063.jpg.
 */
function hotelContentCode(hotel: ContentHotel) {
  const raw =
    hotel.rawSearchResult && typeof hotel.rawSearchResult === "object" && !Array.isArray(hotel.rawSearchResult)
      ? (hotel.rawSearchResult as Record<string, unknown>)
      : null;
  const fromId =
    String(raw?.provider || "").toLowerCase() === "hotelbeds"
      ? Number(raw?.providerHotelCode ?? raw?.hotel_id ?? raw?.hotelId ?? hotel.id)
      : NaN;
  const imageCode = String(hotel.imageSrc || "").match(/photos\.hotelbeds\.com\/giata\/(?:[a-z]+\/)?\d{2}\/(\d+)\//i)?.[1];
  const code = Number.isFinite(fromId) && fromId > 0 ? fromId : Number(imageCode);
  return Number.isFinite(code) && code > 0 ? code : null;
}

export type HotelContent = { images: string[]; address?: string };

/** Photos (main image first) and street address from the hotel content API (Hotelbeds). Fast compared to supplier detail calls. */
export async function fetchHotelContent(hotel: ContentHotel): Promise<HotelContent | null> {
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
export async function fetchHotelContentImages(hotel: ContentHotel): Promise<string[]> {
  return (await fetchHotelContent(hotel))?.images || [];
}
