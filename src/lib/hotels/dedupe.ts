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

export function dedupeVyspaWithHotelbedsByLiveProperties(input: {
  vyspaResults: any[];
  hotelbedsResults: any[];
  hotelbedsToVyspaId: Map<string, string>;
  includeUnmappedHotelbeds?: boolean;
}): { results: any[]; stats: Record<string, number> } {
  const vyspaResults = Array.isArray(input.vyspaResults) ? input.vyspaResults : [];
  const hotelbedsResults = Array.isArray(input.hotelbedsResults) ? input.hotelbedsResults : [];
  const includeUnmappedHotelbeds = !!input.includeUnmappedHotelbeds;

  const mergedByVyspaId = new Map<string, any>();
  for (const v of vyspaResults) {
    const keys = allVyspaKeys(v);
    if (keys.length === 0) continue;
    const merged = {
      ...v,
      suppliers: mergeUniqueStrings(v?.suppliers || [], ['vyspa']),
    };
    for (const key of keys) {
      if (!mergedByVyspaId.has(key)) {
        mergedByVyspaId.set(key, merged);
      }
    }
  }

  let matched = 0;
  let unmapped = 0;
  let mappedNoVyspaResult = 0;

  for (const hb of hotelbedsResults) {
    const hbCode = parseNumericId(hb?.providerHotelCode ?? hb?.hotel_id ?? hb?.hotelId ?? hb?.id);
    if (!hbCode) continue;

    const mappedVyspaId = input.hotelbedsToVyspaId.get(hbCode);
    if (!mappedVyspaId) {
      unmapped += 1;
      if (includeUnmappedHotelbeds) {
        mergedByVyspaId.set(`hb:${hbCode}`, {
          ...hb,
          suppliers: mergeUniqueStrings(hb?.suppliers || [], ['hotelbeds']),
          _dedupe: { matchedBy: 'none', hbCode, mappedVyspaId: null },
        });
      }
      continue;
    }

    const existing = mergedByVyspaId.get(mappedVyspaId);
    if (!existing) {
      mappedNoVyspaResult += 1;
      if (includeUnmappedHotelbeds) {
        mergedByVyspaId.set(`hb-map:${mappedVyspaId}`, {
          ...hb,
          suppliers: mergeUniqueStrings(hb?.suppliers || [], ['hotelbeds']),
          _dedupe: { matchedBy: 'liveProperties', hbCode, mappedVyspaId },
        });
      }
      continue;
    }

    matched += 1;
    mergedByVyspaId.set(mappedVyspaId, {
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
        matchedBy: 'liveProperties',
        hbCode,
        mappedVyspaId,
      },
      _hotelbeds: hb?._hotelbeds || existing?._hotelbeds,
    });
  }

  const results = Array.from(new Set(mergedByVyspaId.values()));
  return {
    results,
    stats: {
      vyspaInput: vyspaResults.length,
      hotelbedsInput: hotelbedsResults.length,
      matched,
      unmappedHotelbeds: unmapped,
      mappedNoVyspaResult,
      output: results.length,
    },
  };
}
