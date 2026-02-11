import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';
import { getHotelProvider } from '@/lib/hotels/provider';
import { geocodeLocationToPoint } from '@/lib/hotels/geocode';
import { encodeHotelSearchToken } from '@/lib/hotels/searchToken';
import { hotelbedsBookingPost } from '@/lib/hotelbeds/client';
import { hotelbedsContentGet } from '@/lib/hotelbeds/client';
import { buildHotelbedsImageUrl, hotelbedsHotelToVyspaResult } from '@/lib/hotelbeds/mappers';
import { extractHotelbedsContentEnrichment } from '@/lib/hotelbeds/contentExtract';
import { buildHotelbedsOccupancy } from '@/lib/hotelbeds/occupancy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AvailabilityBody = unknown[] | Record<string, unknown>;

type HotelbedsEnrichment = {
  imageUrl?: string;
  address1?: string;
  address2?: string;
  cityName?: string;
  countryName?: string;
};

const hbContentCache = new Map<string, { at: number; data: HotelbedsEnrichment }>();
const HB_CONTENT_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function toInt(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toDateString(v: unknown): string {
  return String(v || '').slice(0, 10);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';
  const debugSample = Math.max(0, Math.min(5, Number(url.searchParams.get('debugSample') || '2') || 2));

  const body = (await req.json().catch(() => null)) as AvailabilityBody | null;

  if (!body) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Missing request body' }, { status: 400 });
  }

  const provider = getHotelProvider();
  const payload = Array.isArray(body) ? body : [body];
  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Payload must be a non-empty array' }, { status: 400 });
  }

  if (provider === 'vyspa') {
    const result = await vyspaRestFetch('/rest/v4/accommodationAvailabilityV3/', payload);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `accommodationAvailabilityV3 failed with HTTP ${result.status}`,
          details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
        },
        { status: result.status }
      );
    }
    return NextResponse.json(result.data, { status: 200 });
  }

  // HotelBeds mode: convert Vyspa-style criteria into HotelBeds /hotels geolocation search.
  const first = payload[0] as any;
  const location = String(first?.location || '').trim();
  const checkIn = toDateString(first?.arrivalDate || first?.arrival || first?.checkIn);
  const checkOut = toDateString(first?.departureDate || first?.departure || first?.checkOut);
  const rooms = toInt(first?.rooms, 1);
  const adults = toInt(first?.adults, 2);
  const children = toInt(first?.children, 0);
  const radiusKm = (() => {
    const raw = (process.env.HOTELBEDS_SEARCH_RADIUS_KM || '').trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 20;
  })();

  if (!location || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'location, arrivalDate and departureDate are required' },
      { status: 400 }
    );
  }

  const point = await geocodeLocationToPoint(location);

  const hbPayload = {
    stay: { checkIn, checkOut },
    occupancies: [buildHotelbedsOccupancy({ rooms, adults, children })],
    geolocation: { latitude: point.latitude, longitude: point.longitude, radius: radiusKm, unit: 'km' as const },
  };

  let hbRes: { ok: boolean; status: number; data: any };
  try {
    hbRes = await hotelbedsBookingPost<any>('/hotels', hbPayload);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'CONFIG_ERROR', message: e?.message || 'HotelBeds request failed' },
      { status: 500 }
    );
  }
  if (!hbRes.ok) {
    return NextResponse.json(
      { error: 'API_ERROR', message: `HotelBeds /hotels failed with HTTP ${hbRes.status}`, details: hbRes.data },
      { status: hbRes.status }
    );
  }

  const hotels = Array.isArray(hbRes.data?.hotels?.hotels) ? hbRes.data.hotels.hotels : [];
  const enrichMap = new Map<string, HotelbedsEnrichment>();

  const hideNoImage =
    String(process.env.HOTELBEDS_HIDE_NO_IMAGE || '')
      .trim()
      .toLowerCase() === 'true';

  const maxEnrich = (() => {
    const raw = (process.env.HOTELBEDS_ENRICH_LIMIT || '').trim();
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 0) return Math.min(200, Math.trunc(n));
    // Default: keep server-side enrichment small for latency.
    // If we must hide hotels without images, we need to enrich (nearly) everything to decide.
    return hideNoImage ? 200 : 12;
  })();

  // Enrich the hotels most likely to be visible first (cheapest first),
  // since the UI defaults to sorting by price low->high.
  const hotelsForEnrich = [...hotels].sort((a: any, b: any) => {
    const am = Number(a?.minRate);
    const bm = Number(b?.minRate);
    const aa = Number.isFinite(am) ? am : Number.POSITIVE_INFINITY;
    const bb = Number.isFinite(bm) ? bm : Number.POSITIVE_INFINITY;
    return aa - bb;
  });

  const codesToEnrich = hotelsForEnrich
    .map((h: any) => (h?.code != null ? String(h.code) : ''))
    .filter((c: string) => c && /^\d+$/.test(c))
    .slice(0, maxEnrich);

  const concurrency = hideNoImage ? 16 : 8;
  for (let i = 0; i < codesToEnrich.length; i += concurrency) {
    const batch = codesToEnrich.slice(i, i + concurrency);
    await Promise.allSettled(
      batch.map(async (code: string) => {
        const cached = hbContentCache.get(code);
        if (cached && Date.now() - cached.at < HB_CONTENT_TTL_MS) {
          enrichMap.set(code, cached.data);
          return;
        }

        const path = `/hotels/${encodeURIComponent(code)}/details?language=ENG`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), hideNoImage ? 2500 : 1800);
        try {
          const res = await hotelbedsContentGet<any>(path, { signal: controller.signal });
          if (!res.ok) return;
          const extracted = extractHotelbedsContentEnrichment(res.data as any);
          const imagePath = extracted.imagePath ? String(extracted.imagePath) : '';
          const address1 = extracted.address1 || '';
          const cityName = extracted.cityName || '';
          const countryName = extracted.countryName || '';

          const data: HotelbedsEnrichment = {
            imageUrl: imagePath ? buildHotelbedsImageUrl(imagePath, 'bigger') : undefined,
            address1: address1 || undefined,
            cityName: cityName || undefined,
            countryName: countryName || undefined,
          };
          hbContentCache.set(code, { at: Date.now(), data });
          enrichMap.set(code, data);
        } catch {
          // ignore enrichment errors
        } finally {
          clearTimeout(timeoutId);
        }
      })
    );
  }

  const token = encodeHotelSearchToken({
    provider: 'hotelbeds',
    checkIn,
    checkOut,
    rooms,
    adults,
    children,
    latitude: point.latitude,
    longitude: point.longitude,
    radiusKm,
  });

  const results = hotels.map((h: any) => {
    const code = h?.code != null ? String(h.code) : '';
    const enrich = code ? enrichMap.get(code) : undefined;
    return hotelbedsHotelToVyspaResult(h, enrich);
  });

  const filteredResults = hideNoImage
    ? results.filter((r: any) => typeof r?.image_name === 'string' && r.image_name.trim())
    : results;

  const debugInfo = (() => {
    if (!debug) return undefined;
    const sampleHotels = hotels.slice(0, debugSample).map((h: any) => ({
      code: h?.code,
      name: h?.name,
      categoryName: h?.categoryName,
      minRate: h?.minRate,
      maxRate: h?.maxRate,
      currency: h?.currency,
      lat: h?.latitude,
      lng: h?.longitude,
      hasRooms: Array.isArray(h?.rooms) && h.rooms.length > 0,
    }));
    const sampleEnrich = sampleHotels.map((s: any) => ({
      code: String(s.code ?? ''),
      enrich: enrichMap.get(String(s.code ?? '')),
    }));
    return {
      provider: 'hotelbeds',
      hotelsCount: hotels.length,
      enrichedCount: enrichMap.size,
      enrichLimit: maxEnrich,
      sampleHotels,
      sampleEnrichment: sampleEnrich,
    };
  })();

  return NextResponse.json(
    {
      Results: filteredResults,
      Criteria: { searchCriteriaId: token, provider: 'hotelbeds' },
      ...(debugInfo ? { debug: debugInfo } : {}),
    },
    { status: 200 }
  );
}
