export type HotelProvider = 'vyspa' | 'hotelbeds' | 'hybrid';

export function getHotelProvider(): HotelProvider {
  const raw = (process.env.HOTELS_PROVIDER || process.env.HOTEL_PROVIDER || '').trim().toLowerCase();
  if (raw === 'hotelbeds' || raw === 'hb') return 'hotelbeds';
  if (raw === 'hybrid' || raw === 'merge' || raw === 'merged') return 'hybrid';
  return 'vyspa';
}
