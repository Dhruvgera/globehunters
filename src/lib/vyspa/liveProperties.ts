import { VYSPA_CONFIG } from '@/config/vyspa';

export interface VyspaLiveProperty {
  id?: number | string;
  code?: number | string;
  name?: string;
  cityName?: string;
  mapToVendor?: number | string;
  [key: string]: unknown;
}

interface LivePropertiesResponse {
  properties?: VyspaLiveProperty[];
  nextLink?: string;
}

type CacheEntry = {
  at: number;
  properties: VyspaLiveProperty[];
};

const allPropertiesCache = new Map<string, CacheEntry>();
const inFlightFetches = new Map<string, Promise<VyspaLiveProperty[]>>();
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function filterByCity(properties: VyspaLiveProperty[], cityName: string): VyspaLiveProperty[] {
  if (!cityName) return properties;
  return properties.filter((p) => String(p.cityName || '').trim().toLowerCase() === cityName);
}

function toBasicAuth(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function toAbsoluteLivePropertiesUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${cleanBase}${p}`;
}

export async function fetchVyspaLiveProperties(input: {
  cityName?: string;
  limit?: number;
  maxPages?: number;
  ttlMs?: number;
  maxDurationMs?: number;
  pageTimeoutMs?: number;
} = {}): Promise<VyspaLiveProperty[]> {
  const cityName = String(input.cityName || '').trim().toLowerCase();
  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.trunc(Number(input.limit))) : 500;
  const maxPages =
    Number.isFinite(input.maxPages) && Number(input.maxPages) > 0 ? Math.trunc(Number(input.maxPages)) : undefined;
  const ttlMs = Number.isFinite(input.ttlMs) ? Math.max(1000, Math.trunc(Number(input.ttlMs))) : DEFAULT_TTL_MS;
  const maxDurationMs =
    Number.isFinite(input.maxDurationMs) && Number(input.maxDurationMs) > 0
      ? Math.max(1000, Math.trunc(Number(input.maxDurationMs)))
      : undefined;
  const pageTimeoutMs =
    Number.isFinite(input.pageTimeoutMs) && Number(input.pageTimeoutMs) > 0
      ? Math.max(500, Math.trunc(Number(input.pageTimeoutMs)))
      : 4500;

  const cacheKey = `${limit}|${maxPages}`;
  const cachedAll = allPropertiesCache.get(cacheKey);
  if (cachedAll && Date.now() - cachedAll.at < ttlMs) {
    return filterByCity(cachedAll.properties, cityName);
  }

  const active = inFlightFetches.get(cacheKey);
  if (active) {
    const shared = await active;
    return filterByCity(shared, cityName);
  }

  const fetchPromise = (async () => {
    const baseUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    let nextUrl = `${baseUrl}/rest/v4/liveProperties/?limit=${limit}`;

    const all: VyspaLiveProperty[] = [];
    const seenNextLinks = new Set<string>();
    const startedAt = Date.now();
    let completed = true;

    for (let page = 0; ; page += 1) {
      if (typeof maxPages === 'number' && page >= maxPages) break;
      if (!nextUrl || seenNextLinks.has(nextUrl)) break;
      if (typeof maxDurationMs === 'number' && Date.now() - startedAt >= maxDurationMs) {
        completed = false;
        break;
      }
      seenNextLinks.add(nextUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), pageTimeoutMs);
      let resp: Response;
      try {
        resp = await fetch(nextUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: toBasicAuth(),
            'Api-Version': VYSPA_CONFIG.apiVersion,
          },
          signal: controller.signal,
        });
      } catch {
        completed = false;
        clearTimeout(timeout);
        break;
      }
      clearTimeout(timeout);
      const text = await resp.text().catch(() => '');
      let data: LivePropertiesResponse = {};
      try {
        data = text ? (JSON.parse(text) as LivePropertiesResponse) : {};
      } catch {
        data = {};
      }
      if (!resp.ok) {
        completed = false;
        break;
      }

      const props = Array.isArray(data.properties) ? data.properties : [];
      all.push(...props);

      if (!data.nextLink) break;
      nextUrl = toAbsoluteLivePropertiesUrl(baseUrl, data.nextLink);
    }

    if (all.length > 0) {
      allPropertiesCache.set(cacheKey, { at: Date.now(), properties: all });
    }

    if (!completed && cachedAll?.properties?.length) {
      return cachedAll.properties;
    }

    return all;
  })();

  inFlightFetches.set(cacheKey, fetchPromise);
  try {
    const properties = await fetchPromise;
    return filterByCity(properties, cityName);
  } finally {
    inFlightFetches.delete(cacheKey);
  }
}
