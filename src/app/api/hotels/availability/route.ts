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
import { fetchVyspaLiveProperties } from '@/lib/vyspa/liveProperties';
import { buildHotelbedsToVyspaIdMap, dedupeVyspaWithHotelbedsByLiveProperties } from '@/lib/hotels/dedupe';
import { normalizeVyspaAvailabilityPayload } from '@/lib/vyspa/hotelsAvailability';

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

type HotelbedsSearchSuccess = {
  ok: true;
  status: 200;
  location: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  radiusKm: number;
  point: { latitude: number; longitude: number };
  hotels: any[];
  results: any[];
  token: string;
  debugInfo?: Record<string, unknown>;
};

type HotelbedsSearchFailure = {
  ok: false;
  status: number;
  error: unknown;
};

type HotelbedsSearchResult = HotelbedsSearchSuccess | HotelbedsSearchFailure;

const hbContentCache = new Map<string, { at: number; data: HotelbedsEnrichment }>();
const HB_CONTENT_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function toInt(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toDateString(v: unknown): string {
  return String(v || '').slice(0, 10);
}

function toOptionalPositiveInt(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.trunc(n);
}

function shouldHideNoImageResults(): boolean {
  const value = String(process.env.VYSPA_HIDE_NO_IMAGE || process.env.HOTELBEDS_HIDE_NO_IMAGE || '')
    .trim()
    .toLowerCase();
  return value === 'true';
}

function filterResultsWithImage(results: unknown[]): unknown[] {
  if (!shouldHideNoImageResults()) return results;
  return results.filter((r: any) => typeof r?.image_name === 'string' && r.image_name.trim());
}

async function runHotelbedsSearch(first: any, debug: boolean, debugSample: number): Promise<HotelbedsSearchResult> {
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
    return {
      ok: false,
      status: 400,
      error: { error: 'INVALID_REQUEST', message: 'location, arrivalDate and departureDate are required' },
    };
  }

  let point: { latitude: number; longitude: number };
  try {
    point = await geocodeLocationToPoint(location);
  } catch (error: any) {
    return {
      ok: false,
      status: 400,
      error: { error: 'GEOCODE_ERROR', message: error?.message || 'Unable to geocode location' },
    };
  }

  const hbPayload = {
    stay: { checkIn, checkOut },
    occupancies: [buildHotelbedsOccupancy({ rooms, adults, children })],
    geolocation: { latitude: point.latitude, longitude: point.longitude, radius: radiusKm, unit: 'km' as const },
  };

  let hbRes: { ok: boolean; status: number; data: any };
  try {
    hbRes = await hotelbedsBookingPost<any>('/hotels', hbPayload);
  } catch (e: any) {
    return {
      ok: false,
      status: 500,
      error: { error: 'CONFIG_ERROR', message: e?.message || 'HotelBeds request failed' },
    };
  }
  if (!hbRes.ok) {
    return { ok: false as const, status: hbRes.status, error: hbRes.data };
  }

  const hotels = Array.isArray(hbRes.data?.hotels?.hotels) ? hbRes.data.hotels.hotels : [];
  const enrichMap = new Map<string, HotelbedsEnrichment>();

  const hideNoImage = shouldHideNoImageResults();

  const maxEnrich = (() => {
    const raw = (process.env.HOTELBEDS_ENRICH_LIMIT || '').trim();
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 0) return Math.min(200, Math.trunc(n));
    // Default: keep enrichment bounded to avoid slow first-load searches.
    return hideNoImage ? 48 : 12;
  })();
  const enrichBudgetMs = (() => {
    const raw = (process.env.HOTELBEDS_ENRICH_TIMEOUT_MS || '').trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 5000;
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
  const enrichStartedAt = Date.now();
  for (let i = 0; i < codesToEnrich.length; i += concurrency) {
    if (Date.now() - enrichStartedAt >= enrichBudgetMs) break;
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
        const timeoutId = setTimeout(() => controller.abort(), hideNoImage ? 1400 : 1200);
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
    const mapped = hotelbedsHotelToVyspaResult(h, enrich);
    return {
      ...mapped,
      searchCriteriaId: token,
      _hotelbeds: {
        ...(mapped?._hotelbeds || {}),
        searchToken: token,
      },
    };
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
      enrichBudgetMs,
      sampleHotels,
      sampleEnrichment: sampleEnrich,
    };
  })();

  return {
    ok: true as const,
    status: 200,
    location,
    checkIn,
    checkOut,
    rooms,
    adults,
    children,
    radiusKm,
    point,
    hotels,
    results: filteredResults,
    token,
    debugInfo,
  };
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
  const vyspaPayload = normalizeVyspaAvailabilityPayload(payload);
  const vyspaAvailabilityTimeoutMs = (() => {
    const raw = (process.env.VYSPA_HOTELS_AVAILABILITY_TIMEOUT_MS || '').trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 25000;
  })();

  if (provider === 'vyspa') {
    const result = await vyspaRestFetch('/rest/v4/accommodationAvailabilityV3/', vyspaPayload, {
      timeoutMs: vyspaAvailabilityTimeoutMs,
    });
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
    const vyspaResults = Array.isArray((result.data as any)?.Results) ? (result.data as any).Results : [];
    const filteredVyspaResults = filterResultsWithImage(vyspaResults);
    return NextResponse.json(
      {
        ...(result.data as any),
        Results: filteredVyspaResults,
      },
      { status: 200 }
    );
  }

  if (provider === 'hotelbeds') {
    const hb = await runHotelbedsSearch((payload[0] as any), debug, debugSample);
    if (!hb.ok) {
      return NextResponse.json(
        { error: 'API_ERROR', message: `HotelBeds /hotels failed with HTTP ${hb.status}`, details: hb.error },
        { status: hb.status }
      );
    }
    return NextResponse.json(
      {
        Results: hb.results,
        Criteria: { searchCriteriaId: hb.token, provider: 'hotelbeds' },
        ...(hb.debugInfo ? { debug: hb.debugInfo } : {}),
      },
      { status: 200 }
    );
  }

  // Hybrid mode (safe for current booking flow):
  // - Vyspa availability remains the canonical result set (IDs stay Vyspa-compatible)
  // - HotelBeds + liveProperties enrich/dedupe those results
  const [vyspaRes, hb] = await Promise.all([
    vyspaRestFetch('/rest/v4/accommodationAvailabilityV3/', vyspaPayload, {
      timeoutMs: vyspaAvailabilityTimeoutMs,
    }),
    runHotelbedsSearch(payload[0] as any, debug, debugSample),
  ]);
  if (!vyspaRes.ok) {
    if (hb.ok) {
      return NextResponse.json(
        {
          Results: hb.results,
          Criteria: {
            provider: 'hybrid',
            searchCriteriaId: hb.token,
          },
          ...(debug
            ? {
                debug: {
                  provider: 'hybrid',
                  fallback: 'hotelbeds_only',
                  vyspaErrorStatus: vyspaRes.status,
                  vyspaError: vyspaRes.data,
                  hotelbedsCount: hb.results.length,
                  hotelbedsDebug: hb.debugInfo,
                },
              }
            : {}),
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `accommodationAvailabilityV3 failed with HTTP ${vyspaRes.status}`,
        details: typeof vyspaRes.data === 'string' ? vyspaRes.data.slice(0, 500) : vyspaRes.data,
      },
      { status: vyspaRes.status }
    );
  }

  const vyspaResultsRaw = Array.isArray((vyspaRes.data as any)?.Results) ? (vyspaRes.data as any).Results : [];
  const vyspaResults = filterResultsWithImage(vyspaResultsRaw);
  if (!hb.ok) {
    // Fallback to plain Vyspa if HB fails.
    return NextResponse.json(
      {
        ...(vyspaRes.data as any),
        Results: vyspaResults,
        Criteria: {
          ...((vyspaRes.data as any)?.Criteria || {}),
          provider: 'hybrid',
        },
        ...(debug
          ? {
              debug: {
                provider: 'hybrid',
                hotelbedsErrorStatus: hb.status,
                hotelbedsError: hb.error,
                vyspaCount: vyspaResults.length,
                outputCount: vyspaResults.length,
              },
            }
          : {}),
      },
      { status: 200 }
    );
  }

  const liveProperties = await fetchVyspaLiveProperties({
    cityName: String((payload[0] as any)?.location || '').trim(),
    limit: Number(process.env.VYSPA_LIVEPROPERTIES_LIMIT || '500'),
    maxPages: toOptionalPositiveInt(process.env.VYSPA_LIVEPROPERTIES_MAX_PAGES),
    maxDurationMs: Number(process.env.VYSPA_LIVEPROPERTIES_TIMEOUT_MS || '8000'),
    pageTimeoutMs: Number(process.env.VYSPA_LIVEPROPERTIES_PAGE_TIMEOUT_MS || '4500'),
  }).catch(() => []);
  const idMap = buildHotelbedsToVyspaIdMap(liveProperties);
  const includeUnmappedHotelbeds =
    String(process.env.HYBRID_INCLUDE_UNMAPPED_HOTELBEDS ?? 'true')
      .trim()
      .toLowerCase() !== 'false';

  const dedupe = dedupeVyspaWithHotelbedsByLiveProperties({
    vyspaResults,
    hotelbedsResults: hb.results,
    hotelbedsToVyspaId: idMap,
    includeUnmappedHotelbeds,
  });

  return NextResponse.json(
    {
      ...(vyspaRes.data as any),
      Results: dedupe.results,
      Criteria: {
        ...((vyspaRes.data as any)?.Criteria || {}),
        provider: 'hybrid',
      },
      ...(debug
        ? {
            debug: {
              provider: 'hybrid',
              vyspaCount: vyspaResults.length,
              hotelbedsCount: hb.results.length,
              livePropertiesCount: liveProperties.length,
              livePropertiesMapSize: idMap.size,
              includeUnmappedHotelbeds,
              dedupe: dedupe.stats,
              hotelbedsDebug: hb.debugInfo,
            },
          }
        : {}),
    },
    { status: 200 }
  );
}
