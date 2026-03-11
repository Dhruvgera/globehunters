import type { VyspaLiveProperty } from '@/lib/vyspa/liveProperties';

function parseNumericId(input: unknown): string | null {
  const s = String(input ?? '').trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return null;
  return s;
}

function allVyspaKeys(input: any): string[] {
  const keys = [
    parseNumericId(input?.VmapId),
    parseNumericId(input?.vMapId),
    parseNumericId(input?.vmapid),
    parseNumericId(input?.hotel_id),
    parseNumericId(input?.hotelId),
    parseNumericId(input?.id),
  ].filter(Boolean) as string[];
  return Array.from(new Set(keys));
}

export function hotelbedsCodeFromLiveProperty(property: VyspaLiveProperty): string | null {
  const code = parseNumericId(property?.code);
  if (code) return code;
  return parseNumericId(property?.mapToVendor);
}

export function buildHotelbedsToVyspaIdMap(properties: VyspaLiveProperty[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of properties || []) {
    const hbCode = hotelbedsCodeFromLiveProperty(p);
    const vyspaId = parseNumericId(p?.id);
    if (!hbCode || !vyspaId) continue;
    map.set(hbCode, vyspaId);
  }
  return map;
}

function mergeUniqueStrings(a: unknown[], b: unknown[]): string[] {
  const out = new Set<string>();
  for (const entry of [...(a || []), ...(b || [])]) {
    const s = String(entry || '').trim();
    if (s) out.add(s);
  }
  return Array.from(out);
}

function minPositive(a: unknown, b: unknown): number | undefined {
  const na = Number(a);
  const nb = Number(b);
  const va = Number.isFinite(na) && na > 0 ? na : Number.POSITIVE_INFINITY;
  const vb = Number.isFinite(nb) && nb > 0 ? nb : Number.POSITIVE_INFINITY;
  const v = Math.min(va, vb);
  return Number.isFinite(v) ? v : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
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
  return address ? `${name}|${address}` : name;
}

export function dedupeVyspaWithHotelbedsByLiveProperties(input: {
  vyspaResults: any[];
  hotelbedsResults: any[];
  hotelbedsToVyspaId: Map<string, string>;
  includeUnmappedHotelbeds?: boolean;
}): { results: any[]; stats: Record<string, number> } {
  const vyspaResults = Array.isArray(input.vyspaResults) ? input.vyspaResults : [];
  const hotelbedsResults = Array.isArray(input.hotelbedsResults) ? input.hotelbedsResults : [];
  const includeUnmappedHotelbeds = !!input.includeUnmappedHotelbeds;

  const mergedByPrimaryId = new Map<string, any>();
  const primaryIdByAlias = new Map<string, string>();
  const vyspaIdByPartialKey = new Map<string, string>();
  for (const v of vyspaResults) {
    const keys = allVyspaKeys(v);
    if (keys.length === 0) continue;
    const primaryKey = keys[0];
    const merged = {
      ...v,
      suppliers: mergeUniqueStrings(v?.suppliers || [], ['vyspa']),
    };
    if (!mergedByPrimaryId.has(primaryKey)) {
      mergedByPrimaryId.set(primaryKey, merged);
    }
    for (const key of keys) {
      if (!primaryIdByAlias.has(key)) primaryIdByAlias.set(key, primaryKey);
    }
    const fallbackKey = partialDedupeKey(v);
    if (fallbackKey && !vyspaIdByPartialKey.has(fallbackKey)) {
      vyspaIdByPartialKey.set(fallbackKey, primaryKey);
    }
  }

  let matched = 0;
  let matchedByNameAddressFallback = 0;
  let unmapped = 0;
  let mappedNoVyspaResult = 0;

  for (const hb of hotelbedsResults) {
    const hbCode = parseNumericId(hb?.providerHotelCode ?? hb?.hotel_id ?? hb?.hotelId ?? hb?.id);
    if (!hbCode) continue;

    const mappedVyspaId = input.hotelbedsToVyspaId.get(hbCode);
    const fallbackVyspaId = vyspaIdByPartialKey.get(partialDedupeKey(hb) || '');
    const resolvedVyspaId = mappedVyspaId || fallbackVyspaId;
    if (!resolvedVyspaId) {
      unmapped += 1;
      const hbMeta = asRecord(hb?._hotelbeds);
      if (includeUnmappedHotelbeds) {
        mergedByVyspaId.set(`hb:${hbCode}`, {
          ...hb,
          suppliers: mergeUniqueStrings(hb?.suppliers || [], ['hotelbeds']),
          providerHotelCode: String((hb as any)?.providerHotelCode || hbCode),
          hotelbedsCode: hbCode,
          _hotelbeds: {
            ...hbMeta,
            providerHotelCode: String((hb as any)?.providerHotelCode || hbCode),
            hotelCode: hbCode,
          },
          _dedupe: { matchedBy: 'none', hbCode, mappedVyspaId: null },
        });
      }
      continue;
    }

    const primaryId = primaryIdByAlias.get(resolvedVyspaId) || resolvedVyspaId;
    const existing = mergedByPrimaryId.get(primaryId);
    if (!existing) {
      mappedNoVyspaResult += 1;
      const hbMeta = asRecord(hb?._hotelbeds);
      if (includeUnmappedHotelbeds) {
        mergedByPrimaryId.set(`hb-map:${resolvedVyspaId}`, {
          ...hb,
          suppliers: mergeUniqueStrings(hb?.suppliers || [], ['hotelbeds']),
          providerHotelCode: String((hb as any)?.providerHotelCode || hbCode),
          hotelbedsCode: hbCode,
          _hotelbeds: {
            ...hbMeta,
            providerHotelCode: String((hb as any)?.providerHotelCode || hbCode),
            hotelCode: hbCode,
          },
          _dedupe: {
            matchedBy: mappedVyspaId ? 'liveProperties' : 'partial_name_address',
            hbCode,
            mappedVyspaId: resolvedVyspaId,
          },
        });
      }
      continue;
    }

    matched += 1;
    if (!mappedVyspaId && fallbackVyspaId) matchedByNameAddressFallback += 1;
    const existingHb = asRecord(existing?._hotelbeds);
    const hbMeta = asRecord(hb?._hotelbeds);
    const providerHotelCode = String((hb as any)?.providerHotelCode || hbCode);
    mergedByPrimaryId.set(primaryId, {
      ...existing,
      image_name: existing?.image_name || hb?.image_name,
      address1: existing?.address1 || hb?.address1,
      address2: existing?.address2 || hb?.address2,
      cityName: existing?.cityName || hb?.cityName,
      countryName: existing?.countryName || hb?.countryName,
      minPrice: minPositive(existing?.minPrice, hb?.minPrice) ?? existing?.minPrice ?? hb?.minPrice,
      maxPrice: minPositive(existing?.maxPrice, hb?.maxPrice) ?? existing?.maxPrice ?? hb?.maxPrice,
      MealPlans: mergeUniqueStrings(existing?.MealPlans || [], hb?.MealPlans || []),
      suppliers: mergeUniqueStrings(existing?.suppliers || [], hb?.suppliers || ['hotelbeds']),
      _dedupe: {
        matchedBy: mappedVyspaId ? 'liveProperties' : 'partial_name_address',
        hbCode,
        mappedVyspaId: resolvedVyspaId,
      },
      providerHotelCode: providerHotelCode || (existing as any)?.providerHotelCode,
      hotelbedsCode: hbCode || (existing as any)?.hotelbedsCode,
      _hotelbeds: {
        ...existingHb,
        ...hbMeta,
        providerHotelCode: providerHotelCode || String(existingHb.providerHotelCode || ''),
        hotelCode: hbCode || String(existingHb.hotelCode || ''),
      },
    });
  }

  const results = Array.from(mergedByPrimaryId.values());
  return {
    results,
    stats: {
      vyspaInput: vyspaResults.length,
      hotelbedsInput: hotelbedsResults.length,
      matched,
      matchedByNameAddressFallback,
      unmappedHotelbeds: unmapped,
      mappedNoVyspaResult,
      output: results.length,
    },
  };
}
