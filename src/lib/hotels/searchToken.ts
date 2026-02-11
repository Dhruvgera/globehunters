export interface HotelSearchTokenPayload {
  provider: 'hotelbeds';
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  rooms: number;
  adults: number;
  children: number;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(input: string): string {
  const padLen = (4 - (input.length % 4)) % 4;
  const padded = input.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat(padLen);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function encodeHotelSearchToken(payload: HotelSearchTokenPayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

export function decodeHotelSearchToken(token: string): HotelSearchTokenPayload | null {
  try {
    const raw = base64UrlDecode(token);
    const parsed = JSON.parse(raw) as Partial<HotelSearchTokenPayload>;
    if (parsed?.provider !== 'hotelbeds') return null;
    if (typeof parsed.checkIn !== 'string' || typeof parsed.checkOut !== 'string') return null;
    if (typeof parsed.rooms !== 'number' || typeof parsed.adults !== 'number' || typeof parsed.children !== 'number') return null;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number' || typeof parsed.radiusKm !== 'number') return null;
    return parsed as HotelSearchTokenPayload;
  } catch {
    return null;
  }
}

