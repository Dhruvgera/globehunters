type GeoPoint = { latitude: number; longitude: number };

const memCache = new Map<string, { at: number; point: GeoPoint }>();
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

export async function geocodeLocationToPoint(location: string): Promise<GeoPoint> {
  const q = String(location || '').trim();
  if (!q) throw new Error('Missing location');

  const key = q.toLowerCase();
  const cached = memCache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.point;

  // Lightweight, no-key geocoding via OSM Nominatim.
  // Note: Production usage should comply with Nominatim usage policy and/or use a paid provider.
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('accept-language', 'en');

  const resp = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      // Nominatim requires a valid User-Agent identifying the application.
      'User-Agent': 'globehunters/ghfe (hotel search geocode)',
    },
  });

  if (!resp.ok) {
    throw new Error(`Geocode failed with HTTP ${resp.status}`);
  }

  const data = (await resp.json().catch(() => null)) as any;
  const first = Array.isArray(data) ? data[0] : null;
  const lat = first?.lat != null ? Number(first.lat) : NaN;
  const lon = first?.lon != null ? Number(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Geocode returned no results');
  }

  const point = { latitude: lat, longitude: lon };
  memCache.set(key, { at: Date.now(), point });
  return point;
}
