export type HotelProvider = 'vyspa' | 'hotelbeds' | 'hybrid';

export function parseHotelProvider(value: unknown): HotelProvider | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'hotelbeds' || raw === 'hb') return 'hotelbeds';
  if (raw === 'hybrid' || raw === 'merge' || raw === 'merged') return 'hybrid';
  if (raw === 'vyspa') return 'vyspa';
  return null;
}

export function getHotelProvider(override?: unknown): HotelProvider {
  const parsedOverride = parseHotelProvider(override);
  if (parsedOverride) return parsedOverride;
  return parseHotelProvider(process.env.HOTELS_PROVIDER || process.env.HOTEL_PROVIDER) || 'vyspa';
}
