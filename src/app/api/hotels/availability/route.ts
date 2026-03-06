import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';
import { getHotelProvider } from '@/lib/hotels/provider';
import { geocodeLocationToPoint } from '@/lib/hotels/geocode';
import { encodeHotelSearchToken } from '@/lib/hotels/searchToken';
import { hotelbedsBookingPost } from '@/lib/hotelbeds/client';
import { hotelbedsContentGet } from '@/lib/hotelbeds/client';
import { buildHotelbedsImageUrl, hotelbedsHotelToVyspaResult } from '@/lib/hotelbeds/mappers';
import { extractHotelbedsContentDetails, extractHotelbedsContentEnrichment } from '@/lib/hotelbeds/contentExtract';
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
  amenities?: string[];
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
const hybridHbCacheByCriteriaId = new Map<string, { at: number; data: HotelbedsSearchSuccess }>();
const hybridHbCacheByFingerprint = new Map<string, { at: number; data: HotelbedsSearchSuccess }>();
const HYBRID_HB_CACHE_TTL_MS = 1000 * 60 * 20; // 20m

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

function normalizeSearchCriteriaId(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s;
}

function toBooleanOrNull(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const normalized = v.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

function extractSearchTimeoutSec(firstCriteria: any): number {
  const requested = toOptionalPositiveInt(firstCriteria?.timeout);
  const defaultTimeout = Math.max(5, toInt(process.env.VYSPA_HOTELS_SEARCH_TIMEOUT_SEC || '5', 5));
  return Math.max(5, requested ?? defaultTimeout);
}

function extractSearchTimeoutBufferSec(): number {
  const configured = toOptionalPositiveInt(process.env.VYSPA_HOTELS_TIMEOUT_BUFFER_SEC);
  const raw = configured ?? 5;
  return Math.min(10, Math.max(5, raw));
}

function resolveVyspaAvailabilityTimeoutMs(searchTimeoutSec: number, timeoutBufferSec: number): number {
  const configured = toOptionalPositiveInt(process.env.VYSPA_HOTELS_AVAILABILITY_TIMEOUT_MS);
  if (configured) return configured;
  return Math.max(1000, (searchTimeoutSec + timeoutBufferSec) * 1000);
}

function buildHybridRequestFingerprint(firstCriteria: any): string {
  const stable = {
    location: String(firstCriteria?.location || '').trim().toLowerCase(),
    hidden_id: String(firstCriteria?.hidden_id || '').trim(),
    hidden_key: String(firstCriteria?.hidden_key || '').trim().toLowerCase(),
    arrivalDate: toDateString(firstCriteria?.arrivalDate || firstCriteria?.arrival || firstCriteria?.checkIn),
    departureDate: toDateString(firstCriteria?.departureDate || firstCriteria?.departure || firstCriteria?.checkOut),
    nights: String(firstCriteria?.nights ?? '').trim(),
    rooms: String(firstCriteria?.rooms ?? '').trim(),
    adults: String(firstCriteria?.adults ?? '').trim(),
    children: String(firstCriteria?.children ?? '').trim(),
    adult_room: Array.isArray(firstCriteria?.adult_room) ? firstCriteria.adult_room : [],
    children_room: Array.isArray(firstCriteria?.children_room) ? firstCriteria.children_room : [],
    child_age: Array.isArray(firstCriteria?.child_age) ? firstCriteria.child_age : [],
  };
  return JSON.stringify(stable);
}

function cleanupHybridHbCache(now = Date.now()): void {
  for (const [key, value] of hybridHbCacheByCriteriaId.entries()) {
    if (now - value.at > HYBRID_HB_CACHE_TTL_MS) hybridHbCacheByCriteriaId.delete(key);
  }
  for (const [key, value] of hybridHbCacheByFingerprint.entries()) {
    if (now - value.at > HYBRID_HB_CACHE_TTL_MS) hybridHbCacheByFingerprint.delete(key);
  }
}

function getHybridHbFromCache(input: { searchCriteriaId?: string | null; fingerprint?: string | null }): HotelbedsSearchSuccess | null {
  cleanupHybridHbCache();
  if (input.searchCriteriaId) {
    const cached = hybridHbCacheByCriteriaId.get(input.searchCriteriaId);
    if (cached) return cached.data;
  }
  if (input.fingerprint) {
    const cached = hybridHbCacheByFingerprint.get(input.fingerprint);
    if (cached) return cached.data;
  }
  return null;
}

function putHybridHbIntoCache(input: {
  searchCriteriaId?: string | null;
  fingerprint?: string | null;
  data: HotelbedsSearchSuccess;
}): void {
  cleanupHybridHbCache();
  const entry = { at: Date.now(), data: input.data };
  if (input.searchCriteriaId) {
    hybridHbCacheByCriteriaId.set(input.searchCriteriaId, entry);
  }
  if (input.fingerprint) {
    hybridHbCacheByFingerprint.set(input.fingerprint, entry);
  }
}

function normalizeForPartialDedupe(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function partialDedupeKey(row: any): string | null {
  const name = normalizeForPartialDedupe(row?.hotel_name || row?.hotelName);
  if (!name) return null;
  const address = normalizeForPartialDedupe(
    [row?.address1, row?.address2, row?.cityName || row?.city_name, row?.countryName || row?.country_name]
      .filter(Boolean)
      .join(' ')
  );
  if (address) return `${name}|${address}`;
  return name;
}

function mergeUniqueStringsLocal(a: unknown[], b: unknown[]): string[] {
  const out = new Set<string>();
  for (const entry of [...(a || []), ...(b || [])]) {
    const s = String(entry || '').trim();
    if (s) out.add(s);
  }
  return Array.from(out);
}

function minPositiveLocal(a: unknown, b: unknown): number | undefined {
  const na = Number(a);
  const nb = Number(b);
  const va = Number.isFinite(na) && na > 0 ? na : Number.POSITIVE_INFINITY;
  const vb = Number.isFinite(nb) && nb > 0 ? nb : Number.POSITIVE_INFINITY;
  const v = Math.min(va, vb);
  return Number.isFinite(v) ? v : undefined;
}

function asRecordLocal(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

function dedupeHybridPartialByNameAddress(input: {
  vyspaResults: any[];
  hotelbedsResults: any[];
  includeUnmappedHotelbeds: boolean;
}): { results: any[]; stats: Record<string, number> } {
  const vyspaResults = Array.isArray(input.vyspaResults) ? input.vyspaResults : [];
  const hotelbedsResults = Array.isArray(input.hotelbedsResults) ? input.hotelbedsResults : [];
  const includeUnmappedHotelbeds = !!input.includeUnmappedHotelbeds;

  const output: any[] = [];
  const keyToIndex = new Map<string, number>();
  const seenHotelbedsKeys = new Set<string>();
  let matchedByNameAddress = 0;
  let hbAdded = 0;
  let hbSkippedAsDuplicate = 0;

  for (const v of vyspaResults) {
    const index = output.push({
      ...v,
      suppliers: mergeUniqueStringsLocal(v?.suppliers || [], ['vyspa']),
    }) - 1;
    const key = partialDedupeKey(v);
    if (key && !keyToIndex.has(key)) keyToIndex.set(key, index);
  }

  for (const hb of hotelbedsResults) {
    const hbKey = partialDedupeKey(hb);
    if (hbKey && seenHotelbedsKeys.has(hbKey)) {
      hbSkippedAsDuplicate += 1;
      continue;
    }
    if (hbKey) seenHotelbedsKeys.add(hbKey);

    const mappedIndex = hbKey ? keyToIndex.get(hbKey) : undefined;
    if (mappedIndex != null) {
      matchedByNameAddress += 1;
      const existing = output[mappedIndex];
      const existingHb = asRecordLocal(existing?._hotelbeds);
      const hbMeta = asRecordLocal(hb?._hotelbeds);
      output[mappedIndex] = {
        ...existing,
        image_name: existing?.image_name || hb?.image_name,
        address1: existing?.address1 || hb?.address1,
        address2: existing?.address2 || hb?.address2,
        cityName: existing?.cityName || hb?.cityName,
        countryName: existing?.countryName || hb?.countryName,
        minPrice: minPositiveLocal(existing?.minPrice, hb?.minPrice) ?? existing?.minPrice ?? hb?.minPrice,
        maxPrice: minPositiveLocal(existing?.maxPrice, hb?.maxPrice) ?? existing?.maxPrice ?? hb?.maxPrice,
        MealPlans: mergeUniqueStringsLocal(existing?.MealPlans || [], hb?.MealPlans || []),
        suppliers: mergeUniqueStringsLocal(existing?.suppliers || [], hb?.suppliers || ['hotelbeds']),
        _dedupe: {
          matchedBy: 'partial_name_address',
          nameAddressKey: hbKey,
        },
        _hotelbeds: {
          ...existingHb,
          ...hbMeta,
        },
      };
      continue;
    }

    if (!includeUnmappedHotelbeds) continue;
    hbAdded += 1;
    output.push({
      ...hb,
      suppliers: mergeUniqueStringsLocal(hb?.suppliers || [], ['hotelbeds']),
      _dedupe: {
        ...(asRecordLocal(hb?._dedupe) || {}),
        matchedBy: 'none',
      },
    });
  }

  return {
    results: output,
    stats: {
      vyspaInput: vyspaResults.length,
      hotelbedsInput: hotelbedsResults.length,
      matchedByNameAddress,
      hotelbedsAdded: hbAdded,
      hotelbedsSkippedAsDuplicate: hbSkippedAsDuplicate,
      output: output.length,
    },
  };
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
    // Default: keep enrichment very small to avoid blocking first paint.
    return hideNoImage ? 24 : 4;
  })();
  const enrichBudgetMs = (() => {
    const raw = (process.env.HOTELBEDS_ENRICH_TIMEOUT_MS || '').trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1200;
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
          const details = extractHotelbedsContentDetails(res.data as any);
          const imagePath = extracted.imagePath ? String(extracted.imagePath) : '';
          const address1 = extracted.address1 || '';
          const cityName = extracted.cityName || '';
          const countryName = extracted.countryName || '';
          const amenities = Array.isArray(details.amenities)
            ? details.amenities.filter((a) => typeof a === 'string' && a.trim()).slice(0, 24)
            : [];

          const data: HotelbedsEnrichment = {
            imageUrl: imagePath ? buildHotelbedsImageUrl(imagePath, 'bigger') : undefined,
            address1: address1 || undefined,
            cityName: cityName || undefined,
            countryName: countryName || undefined,
            amenities,
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

  const payload = Array.isArray(body) ? body : [body];
  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Payload must be a non-empty array' }, { status: 400 });
  }
  const requestedProvider = payload[0] && typeof payload[0] === 'object' && !Array.isArray(payload[0])
    ? (payload[0] as Record<string, unknown>).providerOverride
    : undefined;
  const provider = getHotelProvider(requestedProvider);
  const vyspaPayload = normalizeVyspaAvailabilityPayload(payload);
  const firstCriteria = (vyspaPayload[0] as any) || {};
  const searchTimeoutSec = extractSearchTimeoutSec(firstCriteria);
  const timeoutBufferSec = extractSearchTimeoutBufferSec();
  const vyspaAvailabilityTimeoutMs = resolveVyspaAvailabilityTimeoutMs(searchTimeoutSec, timeoutBufferSec);
  const requestedSearchCriteriaId = normalizeSearchCriteriaId(firstCriteria?.searchCriteriaId);
  const hybridRequestFingerprint = buildHybridRequestFingerprint(firstCriteria);

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

  // Hybrid mode:
  // - Return fast with HotelBeds + current Vyspa partials (searchComplete=false)
  // - Re-run with searchCriteriaId until Vyspa reports searchComplete=true
  // - Apply liveProperties dedupe once search is complete
  const cachedHb = getHybridHbFromCache({
    searchCriteriaId: requestedSearchCriteriaId,
    fingerprint: hybridRequestFingerprint,
  });
  const hbPromise: Promise<HotelbedsSearchResult> = cachedHb
    ? Promise.resolve({ ...cachedHb, ok: true as const, status: 200 as const })
    : runHotelbedsSearch(payload[0] as any, debug, debugSample);

  const [vyspaRes, hb] = await Promise.all([
    vyspaRestFetch('/rest/v4/accommodationAvailabilityV3/', vyspaPayload, {
      timeoutMs: vyspaAvailabilityTimeoutMs,
    }),
    hbPromise,
  ]);
  if (!vyspaRes.ok) {
    if (hb.ok) {
      return NextResponse.json(
        {
          Results: hb.results,
          Criteria: {
            provider: 'hybrid',
            searchCriteriaId: requestedSearchCriteriaId || hb.token,
            searchComplete: false,
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
  const vyspaCriteria = ((vyspaRes.data as any)?.Criteria || {}) as Record<string, unknown>;
  const responseSearchCriteriaId = normalizeSearchCriteriaId(vyspaCriteria.searchCriteriaId);
  const responseSearchComplete = toBooleanOrNull(vyspaCriteria.searchComplete);

  if (hb.ok) {
    putHybridHbIntoCache({
      searchCriteriaId: responseSearchCriteriaId || requestedSearchCriteriaId,
      fingerprint: hybridRequestFingerprint,
      data: hb,
    });
  }

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

  // Skip expensive liveProperties lookup while Vyspa search is still running.
  // We'll return progressive results quickly, then do full dedupe when complete.
  const shouldRunFinalDedupe = responseSearchComplete === true;
  const liveProperties = shouldRunFinalDedupe
    ? await fetchVyspaLiveProperties({
        cityName: String((payload[0] as any)?.location || '').trim(),
        limit: Number(process.env.VYSPA_LIVEPROPERTIES_LIMIT || '500'),
        maxPages: toOptionalPositiveInt(process.env.VYSPA_LIVEPROPERTIES_MAX_PAGES),
        maxDurationMs: Number(process.env.VYSPA_LIVEPROPERTIES_TIMEOUT_MS || '8000'),
        pageTimeoutMs: Number(process.env.VYSPA_LIVEPROPERTIES_PAGE_TIMEOUT_MS || '4500'),
      }).catch(() => [])
    : [];
  const idMap = shouldRunFinalDedupe ? buildHotelbedsToVyspaIdMap(liveProperties) : new Map<string, string>();
  const includeUnmappedHotelbeds =
    String(process.env.HYBRID_INCLUDE_UNMAPPED_HOTELBEDS ?? 'true')
      .trim()
      .toLowerCase() !== 'false';

  const dedupe = shouldRunFinalDedupe
    ? dedupeVyspaWithHotelbedsByLiveProperties({
        vyspaResults,
        hotelbedsResults: hb.results,
        hotelbedsToVyspaId: idMap,
        includeUnmappedHotelbeds,
      })
    : dedupeHybridPartialByNameAddress({
        vyspaResults,
        hotelbedsResults: hb.results,
        includeUnmappedHotelbeds,
      });

  return NextResponse.json(
    {
      ...(vyspaRes.data as any),
      Results: dedupe.results,
      Criteria: {
        ...((vyspaRes.data as any)?.Criteria || {}),
        provider: 'hybrid',
        ...(responseSearchCriteriaId ? { searchCriteriaId: responseSearchCriteriaId } : {}),
        ...(responseSearchComplete !== null ? { searchComplete: responseSearchComplete } : {}),
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
              searchComplete: responseSearchComplete,
              pendingFinalDedupe: !shouldRunFinalDedupe,
              timeoutSec: searchTimeoutSec,
              timeoutBufferSec,
              vyspaAvailabilityTimeoutMs,
              usedCachedHotelbeds: Boolean(cachedHb),
              dedupe: dedupe.stats,
              hotelbedsDebug: hb.debugInfo,
            },
          }
        : {}),
    },
    { status: 200 }
  );
}
