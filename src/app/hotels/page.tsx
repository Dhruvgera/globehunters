"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ContactCard } from "@/components/search/ContactCard";
import SearchBar from "@/components/search/SearchBar";
import { HotelFiltersSidebar, HotelFiltersState, type HotelAmenityOption } from "@/components/hotels/HotelFiltersSidebar";
import { HotelSearchLoading } from "@/components/hotels/HotelSearchLoading";
import {
  HotelResultsToolbar,
  HybridSupplierFilterMode,
  HotelSortMode,
  HotelViewMode,
} from "@/components/hotels/HotelResultsToolbar";
import { HotelResultCard } from "@/components/hotels/HotelResultCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Hotel } from "@/types/hotel";
import { hotelService } from "@/services/api/hotelService";
import { packageService } from "@/services/api/packageService";
import { useBookingStore, useStoreHydration } from "@/store/bookingStore";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import type { PackageSearchResult } from "@/types/holidayPackage";
import { resolveTrustYouHotelId } from "@/lib/trustyou/hotelMapping";
import type { TrustYouBulkResultItem } from "@/types/trustyou";
import { normalizeHotelChildAges, parseHotelChildAges, serializeHotelChildAges } from "@/lib/hotels/childAges";
import { getHotelProvider, parseHotelProvider, type HotelProvider } from "@/lib/hotels/provider";
import { fixStubaImageUrl } from "@/lib/hotels/imageUrl";
import { calculatePackagePerPersonPrice } from "@/lib/package/passengers";
import { calculateNights } from "@/lib/hotels/nights";

const DEFAULT_FILTERS: HotelFiltersState = {
  propertyQuery: "",
  neighborhoods: [],
  amenities: [],
  popular: {
    breakfastIncluded: false,
    reserveWithoutCard: false,
    reserveNowPayLater: false,
    airportShuttle: false,
  },
  priceMode: "nightly",
  priceRange: [20, 250],
  starRatings: [],
  fullyRefundableOnly: false,
  mealPlans: [],
  bedrooms: null,
  accessibility: [],
};

const SHOW_HYBRID_PROVIDER_IN_RESULTS = ["1", "true", "yes", "on"].includes(
  String(process.env.NEXT_PUBLIC_SHOW_HOTEL_PROVIDER_IN_RESULTS || "").trim().toLowerCase()
);

const VYSPA_SEARCH_TIMEOUT_SEC = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_VYSPA_HOTELS_TIMEOUT_SEC || 8);
  if (!Number.isFinite(raw) || raw <= 0) return 8;
  return Math.max(5, Math.trunc(raw));
})();

const HYBRID_POLL_INTERVAL_MS = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_HYBRID_VYSPA_POLL_INTERVAL_MS || 5000);
  if (!Number.isFinite(raw) || raw <= 0) return 5000;
  return Math.max(5000, Math.trunc(raw));
})();

const HYBRID_MAX_POLLS = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_HYBRID_VYSPA_MAX_POLLS || 5);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.max(1, Math.trunc(raw));
})();

const ENABLE_TRUSTYOU_ENRICHMENT = false;
const HOTEL_PROVIDER_TOGGLE_ENABLED = ["1", "true", "yes", "on"].includes(
  String(process.env.NEXT_PUBLIC_ENABLE_HOTEL_PROVIDER_TOGGLE || "").trim().toLowerCase()
);
const HYBRID_SUPPLIER_FILTER_ENABLED =
  SHOW_HYBRID_PROVIDER_IN_RESULTS ||
  ["1", "true", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_DEBUG_HOTEL_DATES || "").trim().toLowerCase());
const HOTEL_PROVIDER_OVERRIDE_STORAGE_KEY = "gh-hotel-provider-override";

function buildPackageRoomConfigurations(
  adults: number,
  children: number,
  rooms: number,
  childAgesInput: unknown
) {
  const roomCount = Math.max(1, Number(rooms || 1));
  const totalAdults = Math.max(roomCount, Number(adults || 0));
  const totalChildren = Math.max(0, Number(children || 0));
  const normalizedChildAges = normalizeHotelChildAges(childAgesInput, roomCount, totalChildren);
  const baseAdults = Math.floor(totalAdults / roomCount);
  const adultRemainder = totalAdults % roomCount;

  return Array.from({ length: roomCount }, (_, roomIndex) => {
    const roomChildren = normalizedChildAges[roomIndex] || {};
    return {
      adults: Math.max(1, baseAdults + (roomIndex < adultRemainder ? 1 : 0)),
      children: Object.keys(roomChildren).length,
      childAges: Object.entries(roomChildren)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, age]) => Number(age)),
      infants: 0,
    };
  });
}

function sanitizeHiddenHotelFilters(filters: HotelFiltersState): HotelFiltersState {
  return {
    ...filters,
    popular: {
      breakfastIncluded: false,
      reserveWithoutCard: false,
      reserveNowPayLater: false,
      airportShuttle: false,
    },
    bedrooms: null,
    accessibility: [],
  };
}

function normalizeMealPlanLabel(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const upper = s.toUpperCase();
  // Common Vyspa meal plan codes
  if (upper === "RO") return "Room only";
  if (upper === "BB") return "Breakfast";
  if (upper === "HB") return "Half board";
  if (upper === "FB") return "Full board";
  if (upper === "AI") return "All inclusive";
  // Sometimes API returns already-human labels
  if (upper.includes("BREAKFAST")) return "Breakfast";
  const lettersOnly = s.replace(/[^A-Za-z]/g, "");
  const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
  if (!isAllCaps) return s;
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (m) => m.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of");
}

function mealPlanKey(raw: string): string {
  return normalizeMealPlanLabel(raw).toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toReadableNeighborhoodCase(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "";
  const lettersOnly = text.replace(/[^A-Za-z]/g, "");
  const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
  if (!isAllCaps) return text;
  return text
    .toLowerCase()
    .replace(/\b[a-z]/g, (m) => m.toUpperCase())
    .replace(/\bUae\b/g, "UAE");
}

function normalizeNeighborhoodValue(
  raw: string,
  context: { city?: string; country?: string; searchLocation?: string } = {}
): { key: string; label: string } {
  const original = String(raw || "").replace(/\s+/g, " ").trim();
  if (!original) return { key: "", label: "" };

  let normalized = original;
  const suffixes = [
    context.country,
    context.city,
    context.searchLocation,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  for (const suffix of suffixes) {
    const escaped = escapeRegExp(suffix);
    normalized = normalized
      .replace(new RegExp(`(?:\\s*[,-]\\s*|\\s+-\\s+)${escaped}$`, "i"), "")
      .replace(new RegExp(`\\s+${escaped}$`, "i"), "")
      .trim();
  }

  const label = toReadableNeighborhoodCase(normalized || original);
  const key = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return { key, label };
}

function includesBreakfast(mealPlans: string[]): boolean {
  return mealPlans.some((p) => normalizeMealPlanLabel(p).toLowerCase().includes("breakfast"));
}

function mealPlanFieldCandidates(rawMealPlan: string): string[] {
  const key = mealPlanKey(rawMealPlan);
  switch (key) {
    case "room only":
    case "ro":
      return ["MinRO"];
    case "bed and breakfast":
    case "bb":
    case "breakfast":
      return ["MinBB"];
    case "half board":
    case "hb":
      return ["MinHB"];
    case "full board":
    case "fb":
      return ["MinFB"];
    case "all inclusive":
    case "ai":
      return ["MinAI"];
    case "self catering":
    case "sc":
      return ["MinSC"];
    default:
      return [];
  }
}

function parsePositivePriceCandidate(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveMealPlanAdjustedTotal(hotel: Hotel, selectedMealPlans: string[]): number | null {
  if (!selectedMealPlans.length) return null;
  const raw =
    hotel.rawSearchResult && typeof hotel.rawSearchResult === "object" && !Array.isArray(hotel.rawSearchResult)
      ? (hotel.rawSearchResult as Record<string, unknown>)
      : null;
  if (!raw) return null;

  const candidates: number[] = [];
  for (const selectedMealPlan of selectedMealPlans) {
    for (const field of mealPlanFieldCandidates(selectedMealPlan)) {
      const candidate = parsePositivePriceCandidate(raw[field]);
      if (candidate != null) candidates.push(candidate);
    }
  }

  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

function applySelectedMealPlanPrice(hotel: Hotel, selectedMealPlans: string[]): Hotel {
  const adjustedTotal = resolveMealPlanAdjustedTotal(hotel, selectedMealPlans);
  if (adjustedTotal == null) return hotel;
  const nights = hotel.price.nights > 0 ? hotel.price.nights : 1;
  const adjustedNightly = Math.round((adjustedTotal / nights) * 100) / 100;
  return {
    ...hotel,
    price: {
      ...hotel.price,
      total: adjustedTotal,
      nightly: adjustedNightly,
    },
  };
}

type BreakfastStatus = "unknown" | "yes" | "no";

function hasBreakfastInRoomsResponse(resp: any): boolean {
  const seen = new Set<any>();
  const walk = (node: any): boolean => {
    if (node == null) return false;
    if (typeof node === "string") return node.toLowerCase().includes("breakfast") || node.toUpperCase() === "BB";
    if (typeof node !== "object") return false;
    if (seen.has(node)) return false;
    seen.add(node);
    if (Array.isArray(node)) return node.some(walk);
    for (const [k, v] of Object.entries(node)) {
      if (k === "meal_name" || k === "mealName") {
        if (typeof v === "string" && v.toLowerCase().includes("breakfast")) return true;
      }
      if (k === "MealPlan" || k === "mealPlan") {
        if (typeof v === "string" && v.toUpperCase() === "BB") return true;
      }
      if (walk(v)) return true;
    }
    return false;
  };
  return walk(resp);
}

function parseSearchComplete(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function matchesPopular(hotel: Hotel, filters: HotelFiltersState) {
  const wantsShuttle = filters.popular.airportShuttle;
  const wantsNoCard = filters.popular.reserveWithoutCard;

  if (wantsShuttle && !hotel.amenities.includes("Airport shuttle included")) return false;
  if (wantsNoCard && !hotel.amenities.includes("Reserve without a credit card")) return false;

  // Current dataset doesn't include an explicit "pay later" flag; treat as no-op for now.
  return true;
}

function HotelsPageInner() {
  const hasHydrated = useStoreHydration();
  const urlParams = useSearchParams();
  const urlParamsKey = urlParams.toString();

  // Detect if we're in package (Flight+Hotel) mode
  const isPackageMode = urlParams.get("type") === "package";

  const setHotelSearch = useBookingStore((s) => s.setHotelSearch);
  const setHotelResultsMeta = useBookingStore((s) => s.setHotelResultsMeta);
  const hotelResultsCache = useBookingStore((s) => s.hotelResultsCache);
  const searchRequestId = useBookingStore((s) => s.searchRequestId);
  const hotelFiltersCache = useBookingStore((s) => s.hotelFiltersCache);
  const setHotelFiltersCache = useBookingStore((s) => s.setHotelFiltersCache);
  const setHotelResultsCache = useBookingStore((s) => s.setHotelResultsCache);
  const savedHotelSearch = useBookingStore((s) => s.hotelSearch);

  const [filters, setFilters] = useState<HotelFiltersState>(DEFAULT_FILTERS);
  const hasUserAdjustedPriceRef = useRef(false);
  const hydratedFiltersRef = useRef(false);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    popular: true,
    price: true,
    neighborhood: true,
    stars: true,
    refund: true,
    amenities: true,
    mealPlans: true,
    bedrooms: true,
    accessibility: true,
  });

  const [viewMode, setViewMode] = useState<HotelViewMode>("grid");
  // Default: low -> high (user request), but keep other options available.
  const [sortMode, setSortMode] = useState<HotelSortMode>("price_low");
  const [selectedHotelKey, setSelectedHotelKey] = useState<string>("");
  const [providerOverride, setProviderOverride] = useState<HotelProvider | null>(null);
  const [providerMode, setProviderMode] = useState<HotelProvider>(getHotelProvider());
  const [providerOverrideReady, setProviderOverrideReady] = useState(!HOTEL_PROVIDER_TOGGLE_ENABLED);
  const [hybridSupplierFilter, setHybridSupplierFilter] = useState<HybridSupplierFilterMode>("all");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noResultsMessage, setNoResultsMessage] = useState<string | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [displayedHotelsCount, setDisplayedHotelsCount] = useState(12);
  const [hiddenImageHotelIds, setHiddenImageHotelIds] = useState<Set<string>>(new Set());
  const activeRequestSeq = useRef(0);
  const contentInflightRef = useRef<Set<string>>(new Set());
  const contentAttemptRef = useRef<Map<string, { attempts: number; lastAttemptAt: number; ok: boolean }>>(new Map());
  const hotelResultsCacheRef = useRef(hotelResultsCache);
  const prevPriceModeRef = useRef<HotelFiltersState["priceMode"]>(DEFAULT_FILTERS.priceMode);
  const [searchCriteriaId, setSearchCriteriaId] = useState<number | string | null>(null);
  const [breakfastByHotelId, setBreakfastByHotelId] = useState<Record<string, BreakfastStatus>>({});
  const [breakfastEnriching, setBreakfastEnriching] = useState(false);
  const [loadingMoreHotels, setLoadingMoreHotels] = useState(false);
  const [contentEnriching, setContentEnriching] = useState(false);
  const [trustYouEnriching, setTrustYouEnriching] = useState(false);
  const trustYouInflightRef = useRef<Set<string>>(new Set());
  const trustYouAttemptRef = useRef<Map<string, { attempts: number; lastAttemptAt: number; ok: boolean }>>(new Map());

  useEffect(() => {
    if (!HOTEL_PROVIDER_TOGGLE_ENABLED || typeof window === "undefined") {
      setProviderOverrideReady(true);
      return;
    }

    const saved = parseHotelProvider(window.localStorage.getItem(HOTEL_PROVIDER_OVERRIDE_STORAGE_KEY));
    setProviderOverride(saved);
    if (saved) {
      setProviderMode(saved);
    }
    setProviderOverrideReady(true);
  }, []);

  useEffect(() => {
    if (!HOTEL_PROVIDER_TOGGLE_ENABLED || typeof window === "undefined") return;
    if (providerOverride) {
      window.localStorage.setItem(HOTEL_PROVIDER_OVERRIDE_STORAGE_KEY, providerOverride);
      return;
    }
    window.localStorage.removeItem(HOTEL_PROVIDER_OVERRIDE_STORAGE_KEY);
  }, [providerOverride]);

  useEffect(() => {
    hotelResultsCacheRef.current = hotelResultsCache;
  }, [hotelResultsCache]);

  useEffect(() => {
    if (providerMode !== "hybrid" && hybridSupplierFilter !== "all") {
      setHybridSupplierFilter("all");
    }
  }, [hybridSupplierFilter, providerMode]);

  function currencySymbol(code?: string) {
    const c = (code || "").toUpperCase();
    if (c === "GBP") return "£";
    if (c === "USD") return "$";
    if (c === "EUR") return "€";
    return c ? `${c} ` : "$";
  }

  function clampStar(n: any): 1 | 2 | 3 | 4 | 5 {
    const v = Math.round(Number(n) || 3);
    if (v <= 1) return 1;
    if (v === 2) return 2;
    if (v === 3) return 3;
    if (v === 4) return 4;
    return 5;
  }

  function shortWebRefFromToken(token: string): string {
    // Small, deterministic hash for display only (avoid leaking long opaque tokens in UI).
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `HB-${(h >>> 0).toString(16).padStart(8, "0").slice(0, 8).toUpperCase()}`;
  }

  function extractResultAmenities(result: any): string[] {
    const values = new Set<string>();

    if (Array.isArray(result?.amenities)) {
      for (const amenity of result.amenities) {
        const value = String(amenity || "").trim();
        if (!value) continue;
        values.add(value);
        if (values.size >= 24) return Array.from(values);
      }
    }

    const attributes =
      result?.attributes && typeof result.attributes === "object" && !Array.isArray(result.attributes)
        ? result.attributes
        : null;
    if (attributes) {
      for (const value of Object.values(attributes)) {
        const normalized = String(value || "").trim();
        if (!normalized) continue;
        values.add(normalized);
        if (values.size >= 24) break;
      }
    }

    return Array.from(values);
  }

  function parsePriceFromResult(r: any): number | null {
    const candidates = [
      Array.isArray(r?.NetPrices) && r.NetPrices.length > 0 ? Math.min(...r.NetPrices.map((x: any) => Number(x) || Infinity)) : null,
      r?.min_price,
      r?.minPrice,
      r?.price,
      r?.total_price,
      r?.totalPrice,
      r?.amount,
      r?.MinPrice,
    ];
    for (const c of candidates) {
      if (c == null) continue;
      const num = typeof c === "string" ? Number(c.replace(/[^\d.]/g, "")) : Number(c);
      if (!Number.isNaN(num) && num > 0) return num;
    }
    return null;
  }

  function trustYouIdFromRawResult(rawResult: Record<string, unknown> | null | undefined): string | null {
    if (!rawResult) return null;
    const topLevelCandidates = [
      rawResult.ty_id,
      rawResult.tyId,
      rawResult.trustyou_id,
      rawResult.trustyouId,
      rawResult.trust_you_id,
    ];
    const nestedHotelBeds = (rawResult._hotelbeds ?? null) as Record<string, unknown> | null;
    const nestedCandidates = nestedHotelBeds
      ? [
        nestedHotelBeds.ty_id,
        nestedHotelBeds.tyId,
        nestedHotelBeds.trustyou_id,
        nestedHotelBeds.trustyouId,
      ]
      : [];

    return resolveTrustYouHotelId({
      candidateIds: [...topLevelCandidates, ...nestedCandidates].map((v) => String(v || "").trim()),
    });
  }

  function toPositiveNumericId(value: unknown): string | null {
    const s = String(value ?? "").trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    return s;
  }

  function resolveHotelResultId(r: any, fallbackIdx?: number): string {
    const hotelId = toPositiveNumericId(r?.hotel_id ?? r?.hotelId);
    if (hotelId) return hotelId;

    const srId = toPositiveNumericId(r?.id ?? r?.srId);
    if (srId) return srId;

    return String(fallbackIdx ?? 0);
  }

  function isVyspaSearchCriteriaId(value: unknown): value is number | string {
    if (typeof value === "number" && Number.isFinite(value)) return true;
    const normalized = String(value ?? "").trim();
    return /^\d+$/.test(normalized);
  }

  const resolvedSearch = useMemo(() => {
    const p = new URLSearchParams(urlParamsKey);
    const location = p.get("location") || savedHotelSearch?.location || "London";
    const checkIn = p.get("checkIn") || savedHotelSearch?.checkIn || "2026-02-10";
    const checkOut = p.get("checkOut") || savedHotelSearch?.checkOut || "2026-02-12";
    const adults = Math.max(1, Number(p.get("adults") || savedHotelSearch?.adults || "2") || 2);
    const children = Math.max(0, Number(p.get("children") || savedHotelSearch?.children || "0") || 0);
    const rooms = Math.max(1, Number(p.get("rooms") || savedHotelSearch?.rooms || "1") || 1);
    const child_age = p.get("child_age")
      ? parseHotelChildAges(p.get("child_age"), rooms, children)
      : parseHotelChildAges(
          savedHotelSearch?.child_age ? JSON.stringify(savedHotelSearch.child_age) : null,
          rooms,
          children
        );
    const branches = p.get("branches") || savedHotelSearch?.branches || "UK";
    const hidden_id = p.get("hidden_id") || savedHotelSearch?.hidden_id || null;
    const hidden_key = p.get("hidden_key") || savedHotelSearch?.hidden_key || null;
    const arrival_point_code = p.get("arrival_point_code") || savedHotelSearch?.arrivalPointCode || null;

    return {
      location,
      checkIn,
      checkOut,
      adults,
      children,
      child_age,
      rooms,
      branches,
      hidden_id,
      hidden_key,
      arrival_point_code,
    };
  }, [urlParamsKey, savedHotelSearch]);

  // Ref to access resolvedSearch in effects without causing re-triggers
  const resolvedSearchRef = useRef(resolvedSearch);
  useEffect(() => {
    resolvedSearchRef.current = resolvedSearch;
  }, [resolvedSearch]);

  const queryKey = useMemo(() => {
    return JSON.stringify({
      providerOverride,
      location: resolvedSearch.location,
      checkIn: resolvedSearch.checkIn,
      checkOut: resolvedSearch.checkOut,
      adults: resolvedSearch.adults,
      children: resolvedSearch.children,
      child_age: serializeHotelChildAges(resolvedSearch.child_age, resolvedSearch.rooms, resolvedSearch.children),
      rooms: resolvedSearch.rooms,
      hidden_id: resolvedSearch.hidden_id,
      hidden_key: resolvedSearch.hidden_key,
      branches: resolvedSearch.branches,
    });
  }, [providerOverride, resolvedSearch]);

  // Hydrate filters for this queryKey (so opening a hotel and coming back doesn't reset price slider).
  useEffect(() => {
    if (!hasHydrated || !queryKey) return;
    if (hotelFiltersCache?.queryKey === queryKey) {
      if (!hydratedFiltersRef.current) {
        const sanitized = sanitizeHiddenHotelFilters(hotelFiltersCache.filters);
        setFilters(sanitized);
        if (JSON.stringify(sanitized) !== JSON.stringify(hotelFiltersCache.filters)) {
          setHotelFiltersCache({ queryKey, filters: sanitized });
        }
        hydratedFiltersRef.current = true;
      }
      return;
    }
    // New search => reset to defaults and clear "user adjusted" flags.
    hydratedFiltersRef.current = true;
    hasUserAdjustedPriceRef.current = false;
    setFilters(DEFAULT_FILTERS);
    setHotelFiltersCache({ queryKey, filters: sanitizeHiddenHotelFilters(DEFAULT_FILTERS) });
  }, [hotelFiltersCache, queryKey, setHotelFiltersCache]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasHydrated) return;
      if (!providerOverrideReady) return;

      const requestSeq = ++activeRequestSeq.current;

      // Hydrate from cache immediately to preserve results on back-navigation.
      // Only use cache if queryKey matches and cache has results and is fresh (< 2 min).
      const cache = hotelResultsCacheRef.current;
      const cacheAge = cache?.fetchedAt ? Date.now() - cache.fetchedAt : Infinity;
      const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
      const isCacheFresh = cacheAge < CACHE_TTL;

      if (cache?.queryKey === queryKey && cache.hotels.length > 0 && isCacheFresh) {
        if (!cancelled && requestSeq === activeRequestSeq.current) {
          setHotels(cache.hotels);
          setSelectedHotelKey(cache.selectedHotelKey || (cache.hotels.length > 0 ? `${cache.hotels[0]?.id}-0` : ""));
          const metaFromCache: Record<string, any> = {};
          cache.hotels.forEach((h, idx) => {
            const raw = (h as any)?.rawSearchResult as any;
            if (!raw || typeof raw !== "object") return;
            const hid = h.id || resolveHotelResultId(raw, idx);
            if (!hid) return;
            const rowProvider = String(raw?.provider || "").trim().toLowerCase() === "hotelbeds" ? "hotelbeds" : "vyspa";
            const rowSearchCriteriaAny = rowProvider === "hotelbeds"
              ? (raw?.searchCriteriaId ?? raw?._hotelbeds?.searchToken)
              : raw?.searchCriteriaId;
            const rowSearchCriteriaId =
              typeof rowSearchCriteriaAny === "string" || typeof rowSearchCriteriaAny === "number"
                ? rowSearchCriteriaAny
                : undefined;
            metaFromCache[String(hid)] = {
              hotelId: String(hid),
              hotelName: raw?.hotel_name || raw?.hotelName || h.name,
              provider: rowProvider,
              searchCriteriaId: rowSearchCriteriaId,
              searchResultId: raw?.id ? String(raw.id) : undefined,
              srId: raw?.id ? String(raw.id) : undefined,
              vyspaHotelId: toPositiveNumericId(raw?.hotel_id ?? raw?.hotelId) || undefined,
              vMapId: toPositiveNumericId(raw?.VmapId ?? raw?.vMapId) || undefined,
              imageName: typeof raw?.image_name === "string" ? fixStubaImageUrl(raw.image_name) : undefined,
              address1: typeof raw?.address1 === "string" ? raw.address1 : undefined,
              address2: typeof raw?.address2 === "string" ? raw.address2 : undefined,
              hotelRating: Number.isFinite(Number(raw?.hotel_rating)) ? Number(raw.hotel_rating) : undefined,
              rawSearchResult: raw,
            };
          });
          if (Object.keys(metaFromCache).length > 0) {
            setHotelResultsMeta(metaFromCache);
            const firstMeta = metaFromCache[String(cache.hotels[0]?.id)];
            const firstCriteria = firstMeta?.searchCriteriaId;
            const firstProvider: "vyspa" | "hotelbeds" =
              firstMeta?.provider === "hotelbeds" ? "hotelbeds" : "vyspa";
            const search = resolvedSearchRef.current;
            setHotelSearch({
              provider: firstProvider,
              location: search.location,
              hidden_id: search.hidden_id || "",
              hidden_key: search.hidden_key || "",
              checkIn: search.checkIn,
              checkOut: search.checkOut,
              rooms: search.rooms,
              adults: search.adults,
              children: search.children,
              child_age: search.child_age,
              branches: search.branches,
              searchCriteriaId:
                typeof firstCriteria === "string" || typeof firstCriteria === "number"
                  ? firstCriteria
                  : undefined,
              arrivalPointCode: search.arrival_point_code || undefined,
            });
            setSearchCriteriaId(
              typeof firstCriteria === "string" || typeof firstCriteria === "number" ? firstCriteria : null
            );
            if (firstCriteria) {
              const displayRef =
                typeof firstCriteria === "string"
                  ? shortWebRefFromToken(firstCriteria)
                  : String(firstCriteria);
              useBookingStore.getState().setSearchRequestId(displayRef);
            }
          }
          setLoading(false);
          setLoadingMoreHotels(false);
          setHasAttemptedFetch(true);
        }
        return;
      }

      setLoading(true);
      setLoadingMoreHotels(false);
      setError(null);
      setNoResultsMessage(null);
      // Clear stale results immediately on a new search (match flights UX).
      setHotels([]);
      setSelectedHotelKey("");
      setDisplayedHotelsCount(12);
      setHiddenImageHotelIds(new Set());
      setBreakfastByHotelId({});
      setBreakfastEnriching(false);
      setTrustYouEnriching(false);
      trustYouInflightRef.current.clear();
      trustYouAttemptRef.current.clear();

      if (isPackageMode) {
        // Use package search API for Flight+Hotel packages
        try {
          const search = resolvedSearchRef.current;
          const p = new URLSearchParams(urlParamsKey);
          const roomConfigurations = buildPackageRoomConfigurations(
            search.adults,
            search.children,
            search.rooms,
            search.child_age
          );
          
          // Get package-specific params from URL
          const fromCode = p.get("fromCode") || "LON";
          const fromName = p.get("from") || "London";
          let destinationHiddenValue = p.get("hidden_key") || search.hidden_key || "";
          if (!destinationHiddenValue.includes(";") && search.location) {
            try {
              const destinationResponse = await fetch(
                `/api/packages/destinations?location=${encodeURIComponent(search.location)}`
              );
              if (destinationResponse.ok) {
                const destinations = await destinationResponse.json() as Array<{
                  id?: string | number;
                  name?: string;
                  hiddenvalue?: string;
                }>;
                const normalizedLocation = search.location.trim().toLowerCase();
                const normalizedHiddenId = String(p.get("hidden_id") || search.hidden_id || "");
                const matchedDestination =
                  destinations.find((destination) => String(destination.id || "") === normalizedHiddenId) ||
                  destinations.find((destination) => String(destination.name || "").trim().toLowerCase() === normalizedLocation);
                if (matchedDestination?.hiddenvalue) {
                  destinationHiddenValue = matchedDestination.hiddenvalue;
                }
              }
            } catch (destinationError) {
              console.warn("[Hotels Page] Failed to resolve package destination hidden value", destinationError);
            }
          }
          if (!destinationHiddenValue.includes(";")) {
            throw new Error("No matching package destination found.");
          }
          
          const nights = calculateNights(search.checkIn, search.checkOut);
          
          console.log('[Hotels Page] Package mode - searching packages:', {
            from: fromCode,
            to: search.location,
            checkIn: search.checkIn,
            nights,
            rooms: search.rooms,
            adults: search.adults,
            children: search.children,
          });

          const packageCriteria = {
            departureCode: fromCode,
            departureName: fromName,
            destinationCode: destinationHiddenValue.split(";")[0] || "",
            destinationName: search.location,
            destinationHiddenValue,
            checkIn: search.checkIn,
            nights,
            rooms: roomConfigurations,
            timeout: VYSPA_SEARCH_TIMEOUT_SEC,
          };

          const mapPackageHotels = (response: { results: PackageSearchResult[] }) =>
            response.results.map((pkg: PackageSearchResult): Hotel => {
              const total = pkg.startingPrice || 0;
              const perPerson = calculatePackagePerPersonPrice(total, roomConfigurations);
              const nightly = nights > 0 ? total / nights : total;
              const starRatingClamped = Math.min(5, Math.max(1, pkg.starRating || 3)) as 1 | 2 | 3 | 4 | 5;
              const location = [pkg.address?.street1, pkg.address?.city, pkg.address?.country].filter(Boolean).join(", ");
              const tyId = resolveTrustYouHotelId({
                hotelName: pkg.hotelName,
                location,
              });

              return {
                id: String(pkg.id),
                tyId: tyId || undefined,
                name: pkg.hotelName,
                distanceLabel: pkg.address?.street1 || pkg.address?.city || search.location,
                neighborhood:
                  pkg.address?.city && pkg.address?.country
                    ? `${pkg.address.city}, ${pkg.address.country}`
                    : pkg.address?.city || pkg.cityName || undefined,
                starRating: starRatingClamped,
                amenities: (pkg.amenities || []).slice(0, 24) as Hotel["amenities"],
                room: {
                  name:
                    pkg.mealPlans && pkg.mealPlans.length > 0
                      ? `Meal plans: ${pkg.mealPlans.slice(0, 2).join(", ")}${pkg.mealPlans.length > 2 ? " +" : ""}`
                      : "Room options available",
                  highlights: pkg.flight ? ["Includes flights"] : [],
                },
                reviews: {
                  score: 0,
                  label: "No guest rating yet",
                  count: 0,
                },
                price: {
                  currency: currencySymbol(pkg.currency || "GBP"),
                  nightly,
                  total,
                  perPerson,
                  nights,
                  rooms: search.rooms,
                },
                imageSrc: pkg.imageUrl || "/hotel-placeholder.jpg",
                description: pkg.description || "",
                cityName: pkg.address?.city || pkg.cityName || "",
                countryName: pkg.address?.country || pkg.countryName || "",
                mealPlans: pkg.mealPlans || [],
                refundable: undefined,
                checkInDate: pkg.checkInDate,
                checkOutDate: pkg.checkOutDate,
                deepLinkKeys: pkg.deepLinkKeys,
                deepLinkUrl: pkg.deepLinkUrl,
                rawSearchResult: pkg.rawSearchResult ?? pkg,
              };
            });

          const applyPackageResponse = (packageResponse: { results: PackageSearchResult[]; meta: import("@/types/holidayPackage").PackageResultsMeta }) => {
            const mappedHotels = mapPackageHotels(packageResponse);
            const {
              setPackageSearch,
              setPackageResults,
              setHotelSearch,
              setSearchRequestId,
            } = useBookingStore.getState();

            setPackageSearch({
              ...packageCriteria,
              requestId: packageResponse.meta.requestId || undefined,
            });
            setPackageResults(packageResponse.results, packageResponse.meta);
            setHotelSearch({
              provider: "vyspa",
              location: search.location,
              hidden_id: search.hidden_id || "",
              hidden_key: search.hidden_key || "",
              checkIn: search.checkIn,
              checkOut: search.checkOut,
              rooms: search.rooms,
              adults: search.adults,
              children: search.children,
              child_age: search.child_age,
              branches: search.branches,
              searchCriteriaId: packageResponse.meta.requestId,
              arrivalPointCode: search.arrival_point_code || undefined,
            });
            if (packageResponse.meta.requestId) {
              setSearchRequestId(String(packageResponse.meta.requestId));
            }

            if (!cancelled && requestSeq === activeRequestSeq.current) {
              if (mappedHotels.length > 0) {
                setHotels(mappedHotels);
                setSelectedHotelKey(mappedHotels.length > 0 ? `${mappedHotels[0]?.id}-0` : "");
                setNoResultsMessage(null);
              } else {
                setHotels([]);
                setSelectedHotelKey("");
                setNoResultsMessage(packageResponse.meta.emptyMessage || "No results found");
              }
            }

            return mappedHotels;
          };

          const packageResponse = await packageService.searchPackages(packageCriteria);

          console.log('[Hotels Page] Package search response:', {
            resultsCount: packageResponse.results.length,
            meta: packageResponse.meta,
          });

          applyPackageResponse(packageResponse);

          if (!cancelled && requestSeq === activeRequestSeq.current) {
            setLoading(false);
            setHasAttemptedFetch(true);
          }

          if (packageResponse.meta.completed === false && packageResponse.meta.requestId) {
            setLoadingMoreHotels(true);
            let latestRequestId = packageResponse.meta.requestId;

            for (let attempt = 0; attempt < HYBRID_MAX_POLLS; attempt += 1) {
              if (cancelled || requestSeq !== activeRequestSeq.current) break;
              await new Promise((resolve) => setTimeout(resolve, HYBRID_POLL_INTERVAL_MS));
              if (cancelled || requestSeq !== activeRequestSeq.current) break;

              try {
                const polledPackageResponse = await packageService.searchPackages({
                  ...packageCriteria,
                  requestId: latestRequestId,
                });

                console.log('[Hotels Page] Package poll response:', {
                  requestId: polledPackageResponse.meta.requestId,
                  completed: polledPackageResponse.meta.completed,
                  resultsCount: polledPackageResponse.results.length,
                });

                applyPackageResponse(polledPackageResponse);
                if (polledPackageResponse.meta.requestId) {
                  latestRequestId = polledPackageResponse.meta.requestId;
                }
                if (polledPackageResponse.meta.completed) break;
              } catch (pollError) {
                console.warn("[Hotels Page] Package poll request failed", pollError);
                break;
              }
            }
          }

          if (!cancelled && requestSeq === activeRequestSeq.current) {
            setLoadingMoreHotels(false);
            setHasAttemptedFetch(true);
          }
        } catch (err) {
          console.error('[Hotels Page] Package search error:', err);
          if (!cancelled && requestSeq === activeRequestSeq.current) {
            setError(null);
            setHotels([]);
            setSelectedHotelKey("");
            setNoResultsMessage("No results found");
            setLoading(false);
            setLoadingMoreHotels(false);
            setHasAttemptedFetch(true);
          }
        }
        return;
      }

      try {
        // Use ref to avoid infinite loop (setHotelSearch updates savedHotelSearch which would re-trigger this effect)
        const search = resolvedSearchRef.current;
        const urlHiddenId = search.hidden_id;
        const urlHiddenKey = search.hidden_key;
        const urlArrivalPointCode = search.arrival_point_code || undefined;

        const pick = urlHiddenId && urlHiddenKey
          ? {
            id: Number(urlHiddenId),
            label: search.location,
            loc: urlHiddenKey,
            arrival_point_code: urlArrivalPointCode,
          }
          : (await (async () => {
            const lookup = await hotelService.lookupCities(search.location);
            return lookup.find((x) => String(x.loc).toLowerCase() === "city") || lookup[0];
          })());

        if (!pick?.id || !pick?.label || !pick?.loc) {
          throw new Error("No matching city/hotel found for the selected destination.");
        }

        const availability = await hotelService.searchAvailabilityV3({
          providerOverride: providerOverride || undefined,
          location: pick.label,
          hidden_id: String(pick.id),
          hidden_key: String(pick.loc),
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          rooms: search.rooms,
          adults: search.adults,
          children: search.children,
          child_age: search.child_age,
          branches: search.branches,
          timeout: VYSPA_SEARCH_TIMEOUT_SEC,
        });

        const nights = calculateNights(search.checkIn, search.checkOut) || 1;

        type ParsedAvailability = {
          mapped: Hotel[];
          meta: Record<string, any>;
          results: any[];
          criteriaId: number | string | null;
          criteriaProvider: HotelProvider;
          isHybridProviderResponse: boolean;
          searchComplete: boolean | null;
        };

        const mapAvailability = (availabilityResponse: any): ParsedAvailability => {
          const rawResults = availabilityResponse?.Results || [];
          const criteria = availabilityResponse?.Criteria;
          const rawCriteriaId = (criteria as any)?.searchCriteriaId;
          const criteriaId =
            typeof rawCriteriaId === "number" || typeof rawCriteriaId === "string" ? rawCriteriaId : null;
          const criteriaProvider = getHotelProvider((criteria as any)?.provider);
          const isHybridProviderResponse = criteriaProvider === "hybrid";
          const searchComplete = parseSearchComplete((criteria as any)?.searchComplete);

          // Filter out non-object results (e.g. [true, "No hotels found"] becomes empty array)
          const results = rawResults.filter(
            (r: any) => r && typeof r === "object" && !Array.isArray(r) && (r.hotel_id || r.hotelId || r.id)
          );

          // Debug logging - track what we receive from API vs what we render
          console.log('[Hotels Page] Raw API Results Count:', rawResults.length);
          console.log('[Hotels Page] Valid Hotel Objects Count:', results.length);
          console.log('[Hotels Page] Search Criteria ID:', criteriaId);
          console.log('[Hotels Page] Search Complete:', searchComplete);

          const mapped: Hotel[] = results.map((r: any, idx: number) => {
            const hotelId = resolveHotelResultId(r, idx);
            const rowProvider = String(r?.provider || "").trim().toLowerCase() === "hotelbeds" ? "hotelbeds" : "vyspa";
            const rawSearchResult = (r ?? null) as Record<string, unknown> | null;
            const total = parsePriceFromResult(r) ?? 0;
            const sellCur = r?.SellCur || r?.sellCur || r?.currency;
            const rawMealPlans = Array.isArray(r?.MealPlans) ? r.MealPlans.filter(Boolean) : [];
            const mealPlansByKey = new Map<string, string>();
            for (const rawPlan of rawMealPlans) {
              const label = normalizeMealPlanLabel(String(rawPlan));
              const key = mealPlanKey(label);
              if (!label || !key) continue;
              if (!mealPlansByKey.has(key)) mealPlansByKey.set(key, label);
            }
            const mealPlans = Array.from(mealPlansByKey.values());
            const reviewsRating = Number(r?.reviews_rating ?? 0) || 0;
            const reviewsLabelRaw = String(r?.reviews_label || r?.reviews_description || r?.reviews_desc || "").trim();
            const amenitiesSet = new Set<string>();
            const hasBreakfast = includesBreakfast(rawMealPlans) || includesBreakfast(mealPlans);
            if (hasBreakfast) {
              amenitiesSet.add("Breakfast included");
            }
            for (const amenity of extractResultAmenities(r)) {
              amenitiesSet.add(amenity);
              if (amenitiesSet.size >= 24) break;
            }
            const amenities = Array.from(amenitiesSet) as Hotel["amenities"];

            const totalReviews = Number(r?.total_reviews ?? 0) || 0;
            const cityName = r?.cityName || r?.city_name || "";
            const countryName = r?.countryName || r?.country_name || "";
            const quickDesc = r?.quickDescription || "";
            const starRating = clampStar(r?.hotel_rating ?? r?.hotelRating);
            const hbCheapest = (r as any)?._hotelbeds?.cheapest;
            const resolvedTrustYouId =
              trustYouIdFromRawResult(rawSearchResult) ||
              resolveTrustYouHotelId({
                hotelName: r?.hotel_name || r?.hotelName,
                location: [r?.address1, r?.address2, cityName, countryName].filter(Boolean).join(", "),
              });

            return {
              id: hotelId,
              tyId: resolvedTrustYouId || undefined,
              name: r?.hotel_name || r?.hotelName || `Hotel ${hotelId}`,
              distanceLabel:
                r?.address1 || r?.address2
                  ? [r?.address1, r?.address2].filter(Boolean).join(", ")
                  : "",
              neighborhood: cityName && countryName ? `${cityName}, ${countryName}` : cityName || countryName || undefined,
              starRating,
              amenities,
              room: {
                name:
                  hbCheapest?.roomName
                    ? `${hbCheapest.roomName}${hbCheapest.boardName ? ` · ${normalizeMealPlanLabel(String(hbCheapest.boardName))}` : ""}`
                    : mealPlans.length > 0
                      ? `Meal plans: ${mealPlans.slice(0, 2).join(", ")}${mealPlans.length > 2 ? " +" : ""}`
                      : "Room options available",
                highlights: [
                  ...(r?.AvailabilityStatuses ? [`Availability: ${r.AvailabilityStatuses}`] : []),
                  ...(SHOW_HYBRID_PROVIDER_IN_RESULTS && isHybridProviderResponse ? [`Provider: ${rowProvider}`] : []),
                  ...(r?.suppliers?.[0] ? [`Supplier: ${r.suppliers[0]}`] : []),
                  ...(hbCheapest?.refundable === true ? ["Refundable"] : hbCheapest?.refundable === false ? ["Non-refundable"] : []),
                ].slice(0, 2),
              },
              reviews: {
                score: reviewsRating,
                label: reviewsRating > 0 ? reviewsLabelRaw || "Guest rating" : "No guest rating yet",
                count: totalReviews,
              },
              price: {
                currency: currencySymbol(sellCur),
                nightly: nights > 0 ? Math.round((total / nights) * 100) / 100 : total,
                total,
                nights,
                rooms: search.rooms,
              },
              imageSrc: fixStubaImageUrl(r?.image_name) || "/hotel-placeholder.jpg",
              description: quickDesc,
              cityName,
              countryName,
              mealPlans,
              refundable: hbCheapest?.refundable === true ? true : hbCheapest?.refundable === false ? false : null,
              deepLinkKeys: typeof r?.keys === 'object' && r?.keys !== null && !Array.isArray(r?.keys)
                ? (r?.keys as Record<string, string>)
                : undefined,
              deepLinkUrl: typeof r?.DeepLink === 'string' ? r.DeepLink : undefined,
              rawSearchResult,
            };
          });

          const meta: Record<string, any> = {};
          for (const r of results as any[]) {
            const hid = resolveHotelResultId(r);
            if (!hid) continue;
            const rowProvider = String(r?.provider || "").trim().toLowerCase() === "hotelbeds" ? "hotelbeds" : "vyspa";
            const rowSearchCriteriaAny =
              rowProvider === "hotelbeds"
                ? ((r as any)?.searchCriteriaId ?? (r as any)?._hotelbeds?.searchToken ?? criteriaId)
                : criteriaId;
            const rowSearchCriteriaId =
              typeof rowSearchCriteriaAny === "string" || typeof rowSearchCriteriaAny === "number"
                ? rowSearchCriteriaAny
                : undefined;
            meta[hid] = {
              hotelId: hid,
              hotelName: r?.hotel_name || r?.hotelName,
              provider: rowProvider,
              searchCriteriaId: rowSearchCriteriaId,
              searchResultId: r?.id ? String(r.id) : undefined,
              srId: r?.id ? String(r.id) : undefined,
              vyspaHotelId: toPositiveNumericId(r?.hotel_id ?? r?.hotelId) || undefined,
              vMapId: toPositiveNumericId(r?.VmapId ?? r?.vMapId) || undefined,
              imageName: typeof r?.image_name === "string" ? fixStubaImageUrl(r.image_name) : undefined,
              address1: typeof r?.address1 === "string" ? r.address1 : undefined,
              address2: typeof r?.address2 === "string" ? r.address2 : undefined,
              hotelRating: Number.isFinite(Number(r?.hotel_rating)) ? Number(r.hotel_rating) : undefined,
              trustyouId:
                trustYouIdFromRawResult((r ?? null) as Record<string, unknown> | null) ||
                resolveTrustYouHotelId({
                  hotelName: r?.hotel_name || r?.hotelName,
                  location: [r?.address1, r?.address2, r?.city_name, r?.country_name].filter(Boolean).join(", "),
                }) ||
                undefined,
              rawSearchResult: r,
            };
          }

          return {
            mapped,
            meta,
            results,
            criteriaId,
            isHybridProviderResponse,
            searchComplete,
            criteriaProvider,
          };
        };

        const applyAvailabilityToState = (parsed: ParsedAvailability) => {
          if (cancelled || requestSeq !== activeRequestSeq.current) return;

          const { mapped, meta, results, criteriaId, criteriaProvider } = parsed;

          // Respect the user's explicit provider tab selection. The response
          // provider is informative, but it should not flip the active toggle
          // away from the requested mode while searches are refreshing.
          setProviderMode(providerOverride || criteriaProvider);

          setHotels(mapped);
          setBreakfastByHotelId((prev) => {
            const next = { ...prev };
            for (const h of mapped) {
              if (!(h.id in next)) next[h.id] = "unknown";
              if (h.amenities.includes("Breakfast included")) next[h.id] = "yes";
            }
            return next;
          });
          setSelectedHotelKey(mapped.length > 0 ? `${mapped[0]?.id}-0` : "");
          // Only cache if we have actual results (don't cache empty "no results" responses)
          if (mapped.length > 0) {
            const selectedHotelKey = `${mapped[0]?.id}-0`;
            setHotelResultsCache({ queryKey, hotels: mapped, selectedHotelKey, fetchedAt: Date.now() });
          }

          // If user hasn't interacted yet, set price slider bounds from real data (total).
          setFilters((prev) => {
            const isDefault =
              prev.propertyQuery === "" &&
              prev.starRatings.length === 0 &&
              prev.priceRange[0] === 20 &&
              prev.priceRange[1] === 250;
            if (!isDefault) return prev;
            const totals = mapped.map((h) => h.price.total).filter((n) => typeof n === "number" && n > 0);
            if (totals.length === 0) return prev;
            const min = Math.floor(Math.min(...totals));
            const max = Math.ceil(Math.max(...totals));
            return { ...prev, priceMode: "total", priceRange: [min, max] };
          });

          const firstResult = results[0] as any;
          const firstResultProvider = String(firstResult?.provider || "").trim().toLowerCase();
          const provider =
            firstResultProvider === "hotelbeds" || typeof criteriaId === "string" ? "hotelbeds" : "vyspa";
          const searchCriteriaForStore =
            provider === "hotelbeds"
              ? (firstResult?.searchCriteriaId ?? firstResult?._hotelbeds?.searchToken ?? criteriaId)
              : criteriaId;

          setHotelSearch({
            provider,
            location: pick.label,
            hidden_id: String(pick.id),
            hidden_key: String(pick.loc),
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            rooms: search.rooms,
            adults: search.adults,
            children: search.children,
            child_age: search.child_age,
            branches: search.branches,
            searchCriteriaId:
              typeof searchCriteriaForStore === "string" || typeof searchCriteriaForStore === "number"
                ? searchCriteriaForStore
                : undefined,
            arrivalPointCode: pick.arrival_point_code,
          });
          setSearchCriteriaId(
            typeof searchCriteriaForStore === "number" || typeof searchCriteriaForStore === "string"
              ? searchCriteriaForStore
              : null
          );

          // Set searchRequestId for consistent web reference (same as flight logic).
          // For HotelBeds, criteriaId is an opaque token (too long for UI), so derive a short display ref.
          if (searchCriteriaForStore) {
            const displayRef =
              typeof searchCriteriaForStore === "string"
                ? shortWebRefFromToken(searchCriteriaForStore)
                : String(searchCriteriaForStore);
            useBookingStore.getState().setSearchRequestId(displayRef);
          }
          setHotelResultsMeta(meta);
        };

        const parsedInitial = mapAvailability(availability);
        if (cancelled || requestSeq !== activeRequestSeq.current) return;
        applyAvailabilityToState(parsedInitial);

        // As soon as we have the first batch, enable result interactions (filters/sort/cards)
        // while background polling continues to append/refresh results.
        if (!cancelled && requestSeq === activeRequestSeq.current) {
          setLoading(false);
          setHasAttemptedFetch(true);
        }

        const shouldPollMore =
          (parsedInitial.criteriaProvider === "hybrid" || parsedInitial.criteriaProvider === "vyspa") &&
          (
            parsedInitial.searchComplete === false ||
            (parsedInitial.searchComplete === null && parsedInitial.mapped.length === 0)
          );

        if (shouldPollMore) {
          setLoadingMoreHotels(true);
          let latestCriteriaId: number | string | null = parsedInitial.criteriaId;

          for (let attempt = 0; attempt < HYBRID_MAX_POLLS; attempt += 1) {
            if (cancelled || requestSeq !== activeRequestSeq.current) break;
            const pollDelayMs = isVyspaSearchCriteriaId(latestCriteriaId) ? HYBRID_POLL_INTERVAL_MS : 750;
            await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
            if (cancelled || requestSeq !== activeRequestSeq.current) break;
            try {
              const polledAvailability = await hotelService.searchAvailabilityV3({
                providerOverride: providerOverride || undefined,
                location: pick.label,
                hidden_id: String(pick.id),
                hidden_key: String(pick.loc),
                checkIn: search.checkIn,
                checkOut: search.checkOut,
                rooms: search.rooms,
                adults: search.adults,
                children: search.children,
                child_age: search.child_age,
                branches: search.branches,
                timeout: VYSPA_SEARCH_TIMEOUT_SEC,
                ...(isVyspaSearchCriteriaId(latestCriteriaId) ? { searchCriteriaId: latestCriteriaId } : {}),
              });

              const parsedPoll = mapAvailability(polledAvailability);
              if (cancelled || requestSeq !== activeRequestSeq.current) break;

              applyAvailabilityToState(parsedPoll);
              if (isVyspaSearchCriteriaId(parsedPoll.criteriaId)) {
                latestCriteriaId = parsedPoll.criteriaId;
              }
              if (parsedPoll.searchComplete === true) break;
            } catch (pollError) {
              console.warn("[Hotels Page] Hybrid poll request failed", pollError);
              break;
            }
          }
          if (!cancelled && requestSeq === activeRequestSeq.current) {
            setLoadingMoreHotels(false);
          }
        }
      } catch (e: any) {
        if (cancelled || requestSeq !== activeRequestSeq.current) return;
        setError(e?.message || "Failed to fetch hotels");
        setLoadingMoreHotels(false);
        let shouldResetSearchState = false;
        setHotels((prev) => {
          if (prev.length > 0) {
            console.warn("[Hotels Page] Preserving existing hotels after availability error");
            return prev;
          }
          shouldResetSearchState = true;
          return [];
        });
        if (shouldResetSearchState) {
          setSearchCriteriaId(null);
          setBreakfastByHotelId({});
        }
      } finally {
        if (!cancelled && requestSeq === activeRequestSeq.current) {
          setLoading(false);
          setLoadingMoreHotels(false);
          setHasAttemptedFetch(true);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolvedSearch accessed via ref to avoid loop
  }, [
    queryKey,
    setHotelResultsCache,
    setHotelResultsMeta,
    setHotelSearch,
    isPackageMode,
    hasHydrated,
    providerOverride,
    providerOverrideReady,
  ]);

  // On-demand breakfast enrichment: when user enables breakfast filter, use getRoomsV3 to detect breakfast
  // for hotels where availability doesn't expose meal plans reliably.
  useEffect(() => {
    if (!filters.popular.breakfastIncluded) return;
    if (!searchCriteriaId) return;
    if (hotels.length === 0) return;

    const toFetch = hotels
      .filter((h) => breakfastByHotelId[h.id] !== "yes" && breakfastByHotelId[h.id] !== "no")
      .slice(0, 30); // cap to avoid overloading

    if (toFetch.length === 0) return;

    let cancelled = false;
    setBreakfastEnriching(true);

    const run = async () => {
      const concurrency = 4;
      for (let i = 0; i < toFetch.length; i += concurrency) {
        const batch = toFetch.slice(i, i + concurrency);
        const settled = await Promise.allSettled(
          batch.map(async (h) => {
            try {
              // Use hotelId (h.id) and best-effort srId from meta cache if present in store
              const srId = useBookingStore.getState().hotelResultsMeta?.[h.id]?.srId;
              const resp = await hotelService.getRoomsV3(searchCriteriaId, h.id, srId);
              const yes = hasBreakfastInRoomsResponse(resp);
              return { id: h.id, hasBreakfast: yes };
            } catch (err) {
              throw { id: h.id, error: err };
            }
          })
        );

        if (cancelled) return;

        const updates: { id: string; hasBreakfast: boolean }[] = [];
        const failedIds: string[] = [];
        for (const s of settled) {
          if (s.status === "fulfilled") updates.push(s.value);
          else {
            // If rooms lookup fails, mark as no to avoid infinite retry loops while filter is enabled.
            // (User expectation: breakfast filter should tighten immediately.)
            const reasonAny: any = (s as any).reason;
            if (typeof reasonAny?.id === "string") failedIds.push(reasonAny.id);
          }
        }

        if (updates.length > 0) {
          setBreakfastByHotelId((prev) => {
            const next = { ...prev };
            for (const u of updates) next[u.id] = u.hasBreakfast ? "yes" : "no";
            return next;
          });
          setHotels((prev) =>
            prev.map((h) => {
              const u = updates.find((x) => x.id === h.id);
              if (!u) return h;
              if (!u.hasBreakfast) return h;
              if (h.amenities.includes("Breakfast included")) return h;
              return { ...h, amenities: [...h.amenities, "Breakfast included"] };
            })
          );
        }

        if (failedIds.length > 0) {
          setBreakfastByHotelId((prev) => {
            const next = { ...prev };
            for (const id of failedIds) next[id] = "no";
            return next;
          });
        }
      }
    };

    run().finally(() => {
      if (!cancelled) setBreakfastEnriching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [breakfastByHotelId, filters.popular.breakfastIncluded, hotels, searchCriteriaId]);

  const currency = useMemo(() => hotels[0]?.price.currency || "$", [hotels]);

  const hotelsWithSelectedMealPricing = useMemo(
    () => hotels.map((hotel) => applySelectedMealPlanPrice(hotel, filters.mealPlans)),
    [filters.mealPlans, hotels]
  );

  const hotelsForPriceBounds = useMemo(() => {
    // Apply all filters except priceRange, so slider bounds reflect the "current result set"
    // when other filters (e.g. breakfast) are toggled.
    const q = filters.propertyQuery.trim().toLowerCase();
    const selectedNeighborhoodKeys = new Set(
      filters.neighborhoods
        .map((n) => normalizeNeighborhoodValue(n, { searchLocation: resolvedSearch.location }).key)
        .filter(Boolean)
    );
    return hotelsWithSelectedMealPricing.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;
      if (filters.starRatings.length > 0 && !filters.starRatings.includes(h.starRating)) return false;
      if (selectedNeighborhoodKeys.size > 0) {
        const hotelNeighborhoodKey = normalizeNeighborhoodValue(h.neighborhood || "", {
          city: h.cityName,
          country: h.countryName,
          searchLocation: resolvedSearch.location,
        }).key;
        if (!hotelNeighborhoodKey || !selectedNeighborhoodKeys.has(hotelNeighborhoodKey)) return false;
      }
      if (filters.amenities.length > 0) {
        const hotelAmenitySet = new Set((h.amenities || []).map((amenity) => String(amenity).toLowerCase().trim()));
        const matchesAll = filters.amenities.every((amenity) => hotelAmenitySet.has(String(amenity).toLowerCase().trim()));
        if (!matchesAll) return false;
      }
      if (filters.popular.breakfastIncluded) {
        const status = breakfastByHotelId[h.id] || "unknown";
        if (status !== "yes") return false;
      }
      if (!matchesPopular(h, filters)) return false;
      return true;
    });
  }, [
    breakfastByHotelId,
    filters.neighborhoods,
    filters.amenities,
    filters.popular.breakfastIncluded,
    filters.popular.airportShuttle,
    filters.popular.reserveWithoutCard,
    filters.propertyQuery,
    resolvedSearch.location,
    filters.starRatings,
    hotelsWithSelectedMealPricing,
  ]);

  const priceBounds = useMemo((): { min: number; max: number } => {
    const values = hotelsForPriceBounds
      .map((h) => (filters.priceMode === "nightly" ? h.price.nightly : h.price.total))
      .filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0);
    if (values.length === 0) return { min: 0, max: 250 };
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    return { min, max: Math.max(max, min) };
  }, [filters.priceMode, hotelsForPriceBounds]);

  // Reset/clamp price slider whenever bounds/mode change.
  // Important: when switching nightly <-> total, reset range to full bounds (otherwise the old range can collapse to [min, min]).
  useEffect(() => {
    const modeChanged = prevPriceModeRef.current !== filters.priceMode;
    prevPriceModeRef.current = filters.priceMode;

    setFilters((prev) => {
      const minB = priceBounds.min;
      const maxB = priceBounds.max;
      // If we don't have any data yet, don't touch the user's UI.
      if (minB === 0 && maxB === 0) return prev;

      // If the user hasn't adjusted the price slider, keep it spanning the full current bounds.
      if (!hasUserAdjustedPriceRef.current) {
        const already = prev.priceRange[0] === minB && prev.priceRange[1] === maxB;
        if (already) return prev;
        return { ...prev, priceRange: [minB, maxB] };
      }

      if (modeChanged) {
        const already = prev.priceRange[0] === minB && prev.priceRange[1] === maxB;
        if (already) return prev;
        return { ...prev, priceRange: [minB, maxB] };
      }
      const clamp = (n: number) => Math.max(minB, Math.min(maxB, n));
      const next: [number, number] = [clamp(prev.priceRange[0]), clamp(prev.priceRange[1])];
      if (next[0] > next[1]) return { ...prev, priceRange: [minB, maxB] };
      if (next[0] === prev.priceRange[0] && next[1] === prev.priceRange[1]) return prev;
      return { ...prev, priceRange: next };
    });
  }, [filters.priceMode, priceBounds.max, priceBounds.min]);

  const updateFilters = (next: HotelFiltersState) => {
    const sanitized = sanitizeHiddenHotelFilters(next);
    setFilters(sanitized);
    setHotelFiltersCache({ queryKey, filters: sanitized });
  };

  const onPriceModeChange = (mode: HotelFiltersState["priceMode"]) => {
    hasUserAdjustedPriceRef.current = true;
    updateFilters({ ...filters, priceMode: mode });
  };

  const onPriceRangeChange = (range: [number, number]) => {
    hasUserAdjustedPriceRef.current = true;
    updateFilters({ ...filters, priceRange: range });
  };

  const filteredHotels = useMemo(() => {
    const q = filters.propertyQuery.trim().toLowerCase();
    const [minPrice, maxPrice] = filters.priceRange;
    const selectedNeighborhoodKeys = new Set(
      filters.neighborhoods
        .map((n) => normalizeNeighborhoodValue(n, { searchLocation: resolvedSearch.location }).key)
        .filter(Boolean)
    );

    const base = hotelsWithSelectedMealPricing.filter((h) => {
      if (providerMode === "hybrid" && hybridSupplierFilter !== "all") {
        const raw = h.rawSearchResult && typeof h.rawSearchResult === "object"
          ? (h.rawSearchResult as Record<string, unknown>)
          : null;
        const rowProvider = String(raw?.provider || "").trim().toLowerCase();
        if (rowProvider !== hybridSupplierFilter) return false;
      }

      if (q && !h.name.toLowerCase().includes(q)) return false;

      if (filters.starRatings.length > 0 && !filters.starRatings.includes(h.starRating)) return false;

      if (filters.fullyRefundableOnly && h.refundable !== true) return false;

      if (selectedNeighborhoodKeys.size > 0) {
        const hotelNeighborhoodKey = normalizeNeighborhoodValue(h.neighborhood || "", {
          city: h.cityName,
          country: h.countryName,
          searchLocation: resolvedSearch.location,
        }).key;
        if (!hotelNeighborhoodKey || !selectedNeighborhoodKeys.has(hotelNeighborhoodKey)) return false;
      }

      if (filters.amenities.length > 0) {
        const hotelAmenitySet = new Set((h.amenities || []).map((amenity) => String(amenity).toLowerCase().trim()));
        const matchesAll = filters.amenities.every((amenity) => hotelAmenitySet.has(String(amenity).toLowerCase().trim()));
        if (!matchesAll) return false;
      }

      // Meal plans filter - match if hotel has any of the selected meal plans
      if (filters.mealPlans.length > 0) {
        const hotelMealKeys = new Set((h.mealPlans || []).map((meal) => mealPlanKey(meal)).filter(Boolean));
        const hasMatchingMeal = filters.mealPlans.some((filterMeal) => hotelMealKeys.has(mealPlanKey(filterMeal)));
        if (!hasMatchingMeal) return false;
      }

      if (filters.popular.breakfastIncluded) {
        const status = breakfastByHotelId[h.id] || "unknown";
        // Strict: hide anything not confirmed to include breakfast.
        if (status !== "yes") return false;
      }

      if (!matchesPopular(h, filters)) return false;

      const priceValue = filters.priceMode === "nightly" ? h.price.nightly : h.price.total;
      if (priceValue < minPrice) return false;
      if (priceValue > maxPrice) return false;
      return true;
    });

    const sorted = [...base];
    if (sortMode === "price_low") {
      sorted.sort((a, b) => (a.price.total || 0) - (b.price.total || 0));
    } else if (sortMode === "review_score") {
      sorted.sort((a, b) => {
        const scoreDelta = (b.reviews?.score || 0) - (a.reviews?.score || 0);
        if (scoreDelta !== 0) return scoreDelta;
        return b.starRating - a.starRating;
      });
    } // recommended: keep API order

    return sorted;
  }, [filters, hotelsWithSelectedMealPricing, hybridSupplierFilter, providerMode, resolvedSearch.location, sortMode]);

  const displayedHotels = useMemo(() => {
    return filteredHotels.slice(0, displayedHotelsCount);
  }, [displayedHotelsCount, filteredHotels]);

  const filteredHotelsRef = useRef(filteredHotels);
  filteredHotelsRef.current = filteredHotels;

  const pendingImageErrorsRef = useRef<Set<string>>(new Set());
  const imageErrorFlushHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushImageErrors = useCallback(() => {
    imageErrorFlushHandleRef.current = null;
    const pending = pendingImageErrorsRef.current;
    if (pending.size === 0) return;
    const batch = new Set(pending);
    pending.clear();
    setHiddenImageHotelIds((prev) => {
      const merged = new Set(prev);
      let added = 0;
      for (const id of batch) {
        if (!merged.has(id)) { merged.add(id); added++; }
      }
      if (added === 0) return prev;
      setDisplayedHotelsCount((c) => Math.min(c + added, filteredHotelsRef.current.length));
      return merged;
    });
  }, []);

  const handleHotelImageError = useCallback((hotelId: string) => {
    pendingImageErrorsRef.current.add(hotelId);
    if (!imageErrorFlushHandleRef.current) {
      imageErrorFlushHandleRef.current = setTimeout(flushImageErrors, 0);
    }
  }, [flushImageErrors]);

  const hasMoreHotels = displayedHotelsCount < filteredHotels.length;

  // TrustYou enrichment: fetch live review scores for visible hotels and merge into card ratings.
  useEffect(() => {
    if (!ENABLE_TRUSTYOU_ENRICHMENT) return;
    if (!hasHydrated) return;
    if (filteredHotels.length === 0) return;

    const target = filteredHotels.slice(0, Math.min(filteredHotels.length, displayedHotelsCount + 24));
    const now = Date.now();
    const needs = target
      .filter((hotel) => {
        if (trustYouInflightRef.current.has(hotel.id)) return false;
        if (!hotel.tyId && !hotel.name) return false;

        const status = trustYouAttemptRef.current.get(hotel.id);
        if (status?.ok) return false;
        if ((status?.attempts ?? 0) >= 2) return false;
        if (status?.lastAttemptAt && now - status.lastAttemptAt < 4000) return false;
        return true;
      })
      .slice(0, 40);

    if (needs.length === 0) return;

    for (const hotel of needs) {
      trustYouInflightRef.current.add(hotel.id);
      const previous = trustYouAttemptRef.current.get(hotel.id);
      trustYouAttemptRef.current.set(hotel.id, {
        attempts: (previous?.attempts ?? 0) + 1,
        lastAttemptAt: now,
        ok: false,
      });
    }

    let cancelled = false;
    setTrustYouEnriching(true);

    const run = async () => {
      const response = await fetch("/api/hotels/trustyou/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: needs.map((hotel) => ({
            hotelId: hotel.id,
            tyId: hotel.tyId,
            hotelName: hotel.name,
            location: [hotel.distanceLabel, hotel.neighborhood, hotel.cityName, hotel.countryName]
              .filter(Boolean)
              .join(", "),
            partnerHotelIds: (() => {
              const raw = (hotel.rawSearchResult ?? null) as Record<string, unknown> | null;
              const hb = (raw?._hotelbeds ?? null) as Record<string, unknown> | null;
              const dedupe = (raw?._dedupe ?? null) as Record<string, unknown> | null;
              return Array.from(
                new Set(
                  [
                    hotel.id,
                    String(raw?.hotel_id ?? ""),
                    String(raw?.hotelId ?? ""),
                    String(raw?.id ?? ""),
                    String(raw?.code ?? ""),
                    String(raw?.providerHotelCode ?? ""),
                    String(raw?.hotelbedsCode ?? ""),
                    String(dedupe?.hbCode ?? ""),
                    String(hb?.providerHotelCode ?? ""),
                    String(hb?.hotelCode ?? ""),
                  ]
                    .map((value) => String(value || "").trim())
                    .filter(Boolean)
                )
              );
            })(),
          })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (cancelled) return;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || `TrustYou enrichment failed with HTTP ${response.status}`);
      }

      const updates = (data.reviewsByHotelId || {}) as Record<string, TrustYouBulkResultItem>;
      const updatedHotelIds = new Set(Object.keys(updates));

      for (const hotel of needs) {
        const ok = updatedHotelIds.has(hotel.id);
        const previous = trustYouAttemptRef.current.get(hotel.id);
        trustYouAttemptRef.current.set(hotel.id, {
          attempts: previous?.attempts ?? 1,
          lastAttemptAt: Date.now(),
          ok,
        });
        trustYouInflightRef.current.delete(hotel.id);
      }

      if (updatedHotelIds.size === 0) return;

      setHotels((prev) =>
        prev.map((hotel) => {
          const update = updates[hotel.id];
          if (!update) return hotel;
          return {
            ...hotel,
            tyId: update.tyId || hotel.tyId,
            reviews: {
              score: update.score > 0 ? update.score : hotel.reviews.score,
              label: update.scoreDescription || hotel.reviews.label || "Rating",
              count: update.reviewsCount > 0 ? update.reviewsCount : hotel.reviews.count,
            },
          };
        })
      );
    };

    run()
      .catch(() => {
        for (const hotel of needs) {
          const previous = trustYouAttemptRef.current.get(hotel.id);
          trustYouAttemptRef.current.set(hotel.id, {
            attempts: previous?.attempts ?? 1,
            lastAttemptAt: Date.now(),
            ok: false,
          });
          trustYouInflightRef.current.delete(hotel.id);
        }
      })
      .finally(() => {
        if (!cancelled) setTrustYouEnriching(false);
      });

    return () => {
      cancelled = true;
      for (const hotel of needs) {
        trustYouInflightRef.current.delete(hotel.id);
      }
    };
  }, [displayedHotelsCount, filteredHotels, hasHydrated]);

  // HotelBeds content enrichment: fill images/address/city for *visible* (filtered) results (lazy, client-side).
  useEffect(() => {
    if (!hasHydrated) return;
    const activeProvider = providerOverride || providerMode;
    if (activeProvider !== "hotelbeds") {
      setContentEnriching(false);
      return;
    }
    if (filteredHotels.length === 0) return;

    const target = filteredHotels.slice(0, Math.min(filteredHotels.length, displayedHotelsCount + 24));
    const now = Date.now();
    const needs = target
      .filter((h) => {
        if (contentInflightRef.current.has(h.id)) return false;
        const missingImage = !h.imageSrc || h.imageSrc.includes("/figma/");
        const missingAddress = !h.distanceLabel;
        if (!missingImage && !missingAddress) return false;

        const status = contentAttemptRef.current.get(h.id);
        if (status?.ok) return false;
        if ((status?.attempts ?? 0) >= 2) return false;
        // If a prior attempt was cancelled mid-flight or failed, allow retry after a short cooldown.
        if (status?.lastAttemptAt && now - status.lastAttemptAt < 4000) return false;
        return true;
      })
      .slice(0, 48);

    if (needs.length === 0) return;

    for (const h of needs) {
      contentInflightRef.current.add(h.id);
      const prev = contentAttemptRef.current.get(h.id);
      contentAttemptRef.current.set(h.id, {
        attempts: (prev?.attempts ?? 0) + 1,
        lastAttemptAt: now,
        ok: false,
      });
    }

    let cancelled = false;
    setContentEnriching(true);

    const run = async () => {
      const concurrency = 6;
      for (let i = 0; i < needs.length; i += concurrency) {
        const batch = needs.slice(i, i + concurrency);
        const settled = await Promise.allSettled(
          batch.map(async (h) => {
            const resp = await fetch(`/api/hotels/content?code=${encodeURIComponent(h.id)}`);
            const data = await resp.json().catch(() => null);
            if (!resp.ok) throw new Error((data as any)?.message || `HTTP ${resp.status}`);
            return { id: h.id, data };
          })
        );

        if (cancelled) return;

        const updates: Record<string, any> = {};
        const succeededIds: string[] = [];
        const failedIds: string[] = [];
        for (const s of settled) {
          if (s.status === "fulfilled") {
            const { id, data } = s.value as any;
            if (data?.ok) {
              updates[id] = data;
              succeededIds.push(id);
            } else {
              failedIds.push(id);
            }
          } else {
            const reasonAny: any = (s as any).reason;
            // We don't always have the id on rejection; keep it best-effort.
            if (typeof reasonAny?.id === "string") failedIds.push(reasonAny.id);
          }
        }

        for (const id of succeededIds) {
          const prev = contentAttemptRef.current.get(id);
          contentAttemptRef.current.set(id, { attempts: prev?.attempts ?? 1, lastAttemptAt: Date.now(), ok: true });
          contentInflightRef.current.delete(id);
        }
        for (const id of failedIds) {
          const prev = contentAttemptRef.current.get(id);
          contentAttemptRef.current.set(id, { attempts: prev?.attempts ?? 1, lastAttemptAt: Date.now(), ok: false });
          contentInflightRef.current.delete(id);
        }
        if (Object.keys(updates).length === 0) continue;

        setHotels((prev) =>
          prev.map((h) => {
            const u = updates[h.id];
            if (!u) return h;
            const imageSrc = u.imageUrl ? String(u.imageUrl) : h.imageSrc;
            const distanceLabel =
              u.address1 && typeof u.address1 === "string" && u.address1.trim()
                ? String(u.address1)
                : h.distanceLabel;
            const neighborhood =
              u.cityName || u.countryName
                ? [u.cityName, u.countryName].filter(Boolean).join(", ")
                : h.neighborhood;

            return {
              ...h,
              imageSrc,
              distanceLabel,
              neighborhood: neighborhood || h.neighborhood,
              cityName: u.cityName || h.cityName,
              countryName: u.countryName || h.countryName,
            };
          })
        );
      }
    };

    run().finally(() => {
      if (!cancelled) setContentEnriching(false);
      // Ensure inflight flags are cleared if we cancel mid-flight
      if (cancelled) {
        for (const h of needs) contentInflightRef.current.delete(h.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [displayedHotelsCount, filteredHotels, hasHydrated, providerMode, providerOverride]);

  // Calculate available meal plans from all hotels
  const availableMealPlans = useMemo(() => {
    const planByKey = new Map<string, string>();
    for (const h of hotelsWithSelectedMealPricing) {
      for (const p of h.mealPlans || []) {
        const label = normalizeMealPlanLabel(String(p));
        const key = mealPlanKey(label);
        if (!label || !key) continue;
        if (!planByKey.has(key)) planByKey.set(key, label);
      }
    }
    return Array.from(planByKey.values()).sort((a, b) => a.localeCompare(b));
  }, [hotelsWithSelectedMealPricing]);

  const availableAmenities = useMemo<HotelAmenityOption[]>(() => {
    const countByAmenity = new Map<string, { label: string; count: number }>();
    for (const h of hotelsWithSelectedMealPricing) {
      for (const amenity of h.amenities || []) {
        const label = String(amenity || "").trim();
        if (!label) continue;
        const key = label.toLowerCase();
        const prev = countByAmenity.get(key);
        if (prev) {
          prev.count += 1;
        } else {
          countByAmenity.set(key, { label, count: 1 });
        }
      }
    }
    return Array.from(countByAmenity.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 24);
  }, [hotelsWithSelectedMealPricing]);

  const availableNeighborhoods = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const h of hotelsWithSelectedMealPricing) {
      const { key, label } = normalizeNeighborhoodValue(h.neighborhood || "", {
        city: h.cityName,
        country: h.countryName,
        searchLocation: resolvedSearch.location,
      });
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing || label.length < existing.length) {
        byKey.set(key, label);
      }
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [hotelsWithSelectedMealPricing, resolvedSearch.location]);

  const refundableFilterEnabled = useMemo(
    () => hotelsWithSelectedMealPricing.some((h) => h.refundable === true || h.refundable === false),
    [hotelsWithSelectedMealPricing]
  );

  // Calculate min price per star rating
  const minPriceByStarRating = useMemo(() => {
    const minByRating: Record<number, number> = {};
    for (const h of hotelsWithSelectedMealPricing) {
      const rating = h.starRating;
      // Sidebar label is "per night" so always compute using nightly pricing.
      const price = h.price.nightly;
      if (minByRating[rating] === undefined || price < minByRating[rating]) {
        minByRating[rating] = price;
      }
    }
    return minByRating;
  }, [hotelsWithSelectedMealPricing]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Search section (matches the large rounded container in Figma) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white border border-[#DFE0E4] rounded-[32px] p-6 sm:p-8">
          <SearchBar embedded />
        </div>
      </div>

      {/* Package Mode: Step Progress */}
      {isPackageMode && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <PackageStepProgress currentStep="stay" />
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left sidebar */}
          <aside className="hidden lg:flex w-full lg:w-72 flex-col gap-4">
            <ContactCard webRef={searchRequestId ?? undefined} />
            {!loading && hotels.length > 0 && (
              <>
                <HotelFiltersSidebar
                  resultCount={filteredHotels.length}
                  value={filters}
                  onChange={updateFilters}
                  onPriceModeChange={onPriceModeChange}
                  onPriceRangeChange={onPriceRangeChange}
                  minPrice={priceBounds.min}
                  maxPrice={priceBounds.max}
                  currencySymbol={currency}
                  expanded={expanded}
                  onToggleExpanded={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                  availableMealPlans={availableMealPlans}
                  availableNeighborhoods={availableNeighborhoods}
                  availableAmenities={availableAmenities}
                  minPriceByStarRating={minPriceByStarRating}
                  refundableFilterEnabled={refundableFilterEnabled}
                />
              </>
            )}
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0 flex flex-col gap-4">
            <HotelResultsToolbar
              resultCount={filteredHotels.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              onOpenFilters={() => setIsMobileFiltersOpen(true)}
              hybridSupplierFilter={hybridSupplierFilter}
              onHybridSupplierFilterChange={setHybridSupplierFilter}
              providerMode={providerMode}
              onProviderModeChange={(mode) => {
                setProviderOverride(mode);
                setProviderMode(mode);
              }}
              showProviderToggle={!isPackageMode && HOTEL_PROVIDER_TOGGLE_ENABLED && providerOverrideReady}
              showHybridSupplierFilter={!isPackageMode && HYBRID_SUPPLIER_FILTER_ENABLED && providerMode === "hybrid"}
              loading={loading}
            />
            <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <SheetContent side="left" className="w-full max-w-none sm:max-w-sm p-0 lg:hidden">
                <SheetHeader className="px-4 py-4 border-b border-[#DFE0E4]">
                  <SheetTitle className="text-[#010D50]">Hotel filters</SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-64px)] overflow-y-auto px-4 py-4">
                  {!loading && hotels.length > 0 ? (
                    <HotelFiltersSidebar
                      resultCount={filteredHotels.length}
                      value={filters}
                      onChange={updateFilters}
                      onPriceModeChange={onPriceModeChange}
                      onPriceRangeChange={onPriceRangeChange}
                      minPrice={priceBounds.min}
                      maxPrice={priceBounds.max}
                      currencySymbol={currency}
                      expanded={expanded}
                      onToggleExpanded={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                      availableMealPlans={availableMealPlans}
                      availableNeighborhoods={availableNeighborhoods}
                      availableAmenities={availableAmenities}
                      minPriceByStarRating={minPriceByStarRating}
                      refundableFilterEnabled={refundableFilterEnabled}
                    />
                  ) : (
                    <div className="text-sm text-[#3A478A]">
                      Filters will appear once hotel results are loaded.
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {loading && hotels.length === 0 && <HotelSearchLoading />}
            {error && !isPackageMode && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            {/* No Results State */}
            {hasAttemptedFetch && !loading && !loadingMoreHotels && hotels.length === 0 && (!error || isPackageMode) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {isPackageMode ? "No results found" : "No Hotels Found"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {isPackageMode
                    ? (noResultsMessage || "No results found")
                    : "We couldn&apos;t find any hotels for your search. Try adjusting your dates or destination."}
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-[#3754ED] text-white rounded-lg hover:bg-[#2a45d6] transition-colors"
                >
                  New Search
                </button>
              </div>
            )}

            {((loadingMoreHotels && hasAttemptedFetch ) || (hotels.length > 0 && (breakfastEnriching || contentEnriching || trustYouEnriching))) && (
              <div className="inline-flex items-center gap-2 text-xs text-[#3A478A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3754ED] animate-pulse" />
                {hotels.length > 0 ? "More hotels are being added…" : "Updating hotel details…"}
              </div>
            )}

            {viewMode === "map" ? (
              <div className="rounded-2xl border border-[#DFE0E4] bg-white p-8 text-center text-[#3A478A]">
                Map view coming soon.
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                {displayedHotels.map((hotel, idx) => (
                  (() => {
                    const hotelKey = `${hotel.id}-${idx}`;
                    return (
                  <HotelResultCard
                    key={hotelKey}
                    hotel={hotel}
                    view="grid"
                    selected={hotelKey === selectedHotelKey}
                    onSelect={() => setSelectedHotelKey(hotelKey)}
                    isPackageMode={isPackageMode}
                    onImageError={() => handleHotelImageError(hotel.id)}
                  />
                    );
                  })()
                ))}
              </div>
            ) : (
              <>
                {/* On mobile, show grid layout since list looks the same */}
                <div className="grid grid-cols-1 gap-4 sm:hidden">
                  {displayedHotels.map((hotel, idx) => (
                    (() => {
                      const hotelKey = `${hotel.id}-${idx}`;
                      return (
                    <HotelResultCard
                      key={hotelKey}
                      hotel={hotel}
                      view="grid"
                      selected={hotelKey === selectedHotelKey}
                      onSelect={() => setSelectedHotelKey(hotelKey)}
                      isPackageMode={isPackageMode}
                      onImageError={() => handleHotelImageError(hotel.id)}
                    />
                      );
                    })()
                  ))}
                </div>
                {/* On desktop, show list layout */}
                <div className="hidden sm:flex flex-col gap-4">
                  {displayedHotels.map((hotel, idx) => (
                    (() => {
                      const hotelKey = `${hotel.id}-${idx}`;
                      return (
                    <HotelResultCard
                      key={hotelKey}
                      hotel={hotel}
                      view="list"
                      selected={hotelKey === selectedHotelKey}
                      onSelect={() => setSelectedHotelKey(hotelKey)}
                      isPackageMode={isPackageMode}
                      onImageError={() => handleHotelImageError(hotel.id)}
                    />
                      );
                    })()
                  ))}
                </div>
              </>
            )}

            {/* Load more */}
            {hasMoreHotels && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={() =>
                    setDisplayedHotelsCount((prev) => Math.min(prev + 12, filteredHotels.length))
                  }
                  variant="outline"
                  className="bg-white hover:bg-[#F5F7FF] text-[#3754ED] border-[#3754ED] rounded-full px-8 py-2 h-auto text-sm font-medium"
                >
                  Load more
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function HotelsPage() {
  return (
    <Suspense fallback={<HotelSearchLoading />}>
      <HotelsPageInner />
    </Suspense>
  );
}
