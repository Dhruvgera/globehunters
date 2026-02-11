import { decodeHotelSearchToken, encodeHotelSearchToken } from '@/lib/hotels/searchToken';

describe('hotel search token', () => {
  it('round-trips a HotelBeds payload', () => {
    const token = encodeHotelSearchToken({
      provider: 'hotelbeds',
      checkIn: '2026-02-22',
      checkOut: '2026-02-24',
      rooms: 1,
      adults: 2,
      children: 0,
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 20,
    });

    const decoded = decodeHotelSearchToken(token);
    expect(decoded).toEqual({
      provider: 'hotelbeds',
      checkIn: '2026-02-22',
      checkOut: '2026-02-24',
      rooms: 1,
      adults: 2,
      children: 0,
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 20,
    });
  });

  it('returns null for invalid tokens', () => {
    expect(decodeHotelSearchToken('not-a-token')).toBeNull();
  });
});

