export type HotelProvider = 'vyspa' | 'hotelbeds';

export function getHotelProvider(): HotelProvider {
  const raw = (process.env.HOTELS_PROVIDER || process.env.HOTEL_PROVIDER || '').trim().toLowerCase();
  if (raw === 'hotelbeds' || raw === 'hb') return 'hotelbeds';
  return 'vyspa';
}

