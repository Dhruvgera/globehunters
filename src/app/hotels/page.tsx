"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ContactCard } from "@/components/search/ContactCard";
import SearchBar from "@/components/search/SearchBar";
import { HotelFiltersSidebar, HotelFiltersState } from "@/components/hotels/HotelFiltersSidebar";
import { HotelSearchLoading } from "@/components/hotels/HotelSearchLoading";
import {
  HotelResultsToolbar,
  HotelSortMode,
  HotelViewMode,
} from "@/components/hotels/HotelResultsToolbar";
import { HotelResultCard } from "@/components/hotels/HotelResultCard";
import { Button } from "@/components/ui/button";
import type { Hotel } from "@/types/hotel";
import { hotelService } from "@/services/api/hotelService";
import { useBookingStore } from "@/store/bookingStore";

const DEFAULT_WEB_REF = "IN-649707636";

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

function normalizeMealPlanLabel(raw: string): string {
  const s = String(raw || "").trim();
  const upper = s.toUpperCase();
  // Common Vyspa meal plan codes
  if (upper === "RO") return "Room only";
  if (upper === "BB") return "Breakfast";
  if (upper === "HB") return "Half board";
  if (upper === "FB") return "Full board";
  if (upper === "AI") return "All inclusive";
  // Sometimes API returns already-human labels
  if (upper.includes("BREAKFAST")) return "Breakfast";
  return s;
}

function includesBreakfast(mealPlans: string[]): boolean {
  return mealPlans.some((p) => normalizeMealPlanLabel(p).toLowerCase().includes("breakfast"));
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

function matchesPopular(hotel: Hotel, filters: HotelFiltersState) {
  const wantsShuttle = filters.popular.airportShuttle;
  const wantsNoCard = filters.popular.reserveWithoutCard;

  if (wantsShuttle && !hotel.amenities.includes("Airport shuttle included")) return false;
  if (wantsNoCard && !hotel.amenities.includes("Reserve without a credit card")) return false;

  // Mock dataset doesn't include an explicit "pay later" flag; treat as no-op for now.
  return true;
}

export default function HotelsPage() {
  const urlParams = useSearchParams();
  const urlParamsKey = urlParams.toString();
  const setHotelSearch = useBookingStore((s) => s.setHotelSearch);
  const setHotelResultsMeta = useBookingStore((s) => s.setHotelResultsMeta);
  const hotelResultsCache = useBookingStore((s) => s.hotelResultsCache);
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
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedHotelsCount, setDisplayedHotelsCount] = useState(12);
  const activeRequestSeq = useRef(0);
  const hotelResultsCacheRef = useRef(hotelResultsCache);
  const prevPriceModeRef = useRef<HotelFiltersState["priceMode"]>(DEFAULT_FILTERS.priceMode);
  const [searchCriteriaId, setSearchCriteriaId] = useState<number | null>(null);
  const [breakfastByHotelId, setBreakfastByHotelId] = useState<Record<string, BreakfastStatus>>({});
  const [breakfastEnriching, setBreakfastEnriching] = useState(false);

  useEffect(() => {
    hotelResultsCacheRef.current = hotelResultsCache;
  }, [hotelResultsCache]);

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

  const resolvedSearch = useMemo(() => {
    const p = new URLSearchParams(urlParamsKey);
    const location = p.get("location") || savedHotelSearch?.location || "London";
    const checkIn = p.get("checkIn") || savedHotelSearch?.checkIn || "2026-02-10";
    const checkOut = p.get("checkOut") || savedHotelSearch?.checkOut || "2026-02-12";
    const adults = Math.max(1, Number(p.get("adults") || savedHotelSearch?.adults || "2") || 2);
    const rooms = Math.max(1, Number(p.get("rooms") || savedHotelSearch?.rooms || "1") || 1);
    const branches = p.get("branches") || savedHotelSearch?.branches || "UK";
    const hidden_id = p.get("hidden_id") || savedHotelSearch?.hidden_id || null;
    const hidden_key = p.get("hidden_key") || savedHotelSearch?.hidden_key || null;
    const arrival_point_code = p.get("arrival_point_code") || savedHotelSearch?.arrivalPointCode || null;

    return {
      location,
      checkIn,
      checkOut,
      adults,
      rooms,
      branches,
      hidden_id,
      hidden_key,
      arrival_point_code,
    };
  }, [urlParamsKey, savedHotelSearch]);

  const queryKey = useMemo(() => {
    return JSON.stringify({
      location: resolvedSearch.location,
      checkIn: resolvedSearch.checkIn,
      checkOut: resolvedSearch.checkOut,
      adults: resolvedSearch.adults,
      rooms: resolvedSearch.rooms,
      hidden_id: resolvedSearch.hidden_id,
      hidden_key: resolvedSearch.hidden_key,
      branches: resolvedSearch.branches,
    });
  }, [resolvedSearch]);

  // Hydrate filters for this queryKey (so opening a hotel and coming back doesn't reset price slider).
  useEffect(() => {
    if (!queryKey) return;
    if (hotelFiltersCache?.queryKey === queryKey) {
      if (!hydratedFiltersRef.current) {
        setFilters(hotelFiltersCache.filters);
        hydratedFiltersRef.current = true;
      }
      return;
    }
    // New search => reset to defaults and clear "user adjusted" flags.
    hydratedFiltersRef.current = true;
    hasUserAdjustedPriceRef.current = false;
    setFilters(DEFAULT_FILTERS);
    setHotelFiltersCache({ queryKey, filters: DEFAULT_FILTERS });
  }, [hotelFiltersCache, queryKey, setHotelFiltersCache]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const requestSeq = ++activeRequestSeq.current;
      setLoading(true);
      setError(null);
      // Clear stale results immediately on a new search (match flights UX).
      setHotels([]);
      setSelectedHotelId("");
      setDisplayedHotelsCount(12);
      setBreakfastByHotelId({});
      setBreakfastEnriching(false);

      // Hydrate from cache immediately to preserve results on back-navigation.
      // Important: if cache matches, we stop here to avoid background refresh "popping" results.
      const cache = hotelResultsCacheRef.current;
      if (cache?.queryKey === queryKey && cache.hotels.length > 0) {
        if (!cancelled && requestSeq === activeRequestSeq.current) {
          setHotels(cache.hotels);
          setSelectedHotelId(cache.selectedHotelId || cache.hotels[0]?.id || "");
          setLoading(false);
        }
        return;
      }

      try {
        const urlHiddenId = resolvedSearch.hidden_id;
        const urlHiddenKey = resolvedSearch.hidden_key;
        const urlArrivalPointCode = resolvedSearch.arrival_point_code || undefined;

        const pick = urlHiddenId && urlHiddenKey
          ? {
              id: Number(urlHiddenId),
              label: resolvedSearch.location,
              loc: urlHiddenKey,
              arrival_point_code: urlArrivalPointCode,
            }
          : (await (async () => {
              const lookup = await hotelService.lookupCities(resolvedSearch.location);
              return lookup.find((x) => String(x.loc).toLowerCase() === "city") || lookup[0];
            })());

        if (!pick?.id || !pick?.label || !pick?.loc) {
          throw new Error("No matching city/hotel found for the selected destination.");
        }

        const availability = await hotelService.searchAvailabilityV3({
          location: pick.label,
          hidden_id: String(pick.id),
          hidden_key: String(pick.loc),
          checkIn: resolvedSearch.checkIn,
          checkOut: resolvedSearch.checkOut,
          rooms: resolvedSearch.rooms,
          adults: resolvedSearch.adults,
          children: 0,
          branches: resolvedSearch.branches,
        });

        const results = availability?.Results || [];
        const criteria = availability?.Criteria;
        const criteriaId =
          typeof (criteria as any)?.searchCriteriaId === "number" ? (criteria as any).searchCriteriaId : null;
        setSearchCriteriaId(criteriaId);

        const nights =
          Math.max(
            1,
            Math.round(
              (new Date(resolvedSearch.checkOut).getTime() - new Date(resolvedSearch.checkIn).getTime()) / (1000 * 60 * 60 * 24)
            )
          ) || 1;

        const mapped: Hotel[] = results.map((r: any, idx: number) => {
          const hotelId = String(r?.hotel_id ?? r?.hotelId ?? r?.id ?? idx);
          const total = parsePriceFromResult(r) ?? 0;
          const sellCur = r?.SellCur || r?.sellCur || r?.currency;
          const rawMealPlans = Array.isArray(r?.MealPlans) ? r.MealPlans.filter(Boolean) : [];
          const mealPlans = rawMealPlans
            .map((p: any) => normalizeMealPlanLabel(String(p)))
            .filter(Boolean);
          const reviewsRating = Number(r?.reviews_rating ?? 0) || 0;
          const amenities: Hotel["amenities"] = [];
          const hasBreakfast = includesBreakfast(rawMealPlans) || includesBreakfast(mealPlans);
          if (hasBreakfast) {
            amenities.push("Breakfast included");
          }

          return {
            id: hotelId,
            name: r?.hotel_name || r?.hotelName || "Content missing from API: hotel name",
            distanceLabel:
              r?.address1 || r?.address2
                ? [r?.address1, r?.address2].filter(Boolean).join(", ")
                : "Content missing from API: address",
            neighborhood: undefined,
            starRating: clampStar(r?.hotel_rating ?? r?.hotelRating),
            amenities,
            room: {
              name:
                mealPlans.length > 0
                  ? `Meal plans: ${mealPlans.slice(0, 2).join(", ")}${mealPlans.length > 2 ? " +" : ""}`
                  : "Room options available",
              highlights: [
                ...(r?.AvailabilityStatuses ? [`Availability: ${r.AvailabilityStatuses}`] : []),
                ...(r?.suppliers?.[0] ? [`Supplier: ${r.suppliers[0]}`] : []),
              ].slice(0, 2),
            },
            reviews: {
              score: reviewsRating,
              label: reviewsRating > 0 ? "Rating" : "Content missing from API: rating",
              count: 0,
            },
            price: {
              currency: currencySymbol(sellCur),
              nightly: nights > 0 ? Math.round((total / nights) * 100) / 100 : total,
              total,
              nights,
              rooms: resolvedSearch.rooms,
            },
            imageSrc: r?.image_name || "/figma/hotels/hotel-card-image.png",
          };
        });

        const meta: Record<string, any> = {};
        for (const r of results as any[]) {
          const hid = String(r?.hotel_id ?? r?.hotelId ?? r?.id ?? "");
          if (!hid) continue;
          meta[hid] = {
            hotelId: hid,
            hotelName: r?.hotel_name || r?.hotelName,
            searchResultId: r?.id ? String(r.id) : undefined,
            srId: r?.id ? String(r.id) : undefined,
          };
        }

        if (cancelled || requestSeq !== activeRequestSeq.current) return;

        setHotels(mapped);
        setBreakfastByHotelId((prev) => {
          const next = { ...prev };
          for (const h of mapped) {
            if (!(h.id in next)) next[h.id] = "unknown";
            if (h.amenities.includes("Breakfast included")) next[h.id] = "yes";
          }
          return next;
        });
        setSelectedHotelId(mapped[0]?.id || "");
        setHotelResultsCache({ queryKey, hotels: mapped, selectedHotelId: mapped[0]?.id || "" });

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

        setHotelSearch({
          location: pick.label,
          hidden_id: String(pick.id),
          hidden_key: String(pick.loc),
          checkIn: resolvedSearch.checkIn,
          checkOut: resolvedSearch.checkOut,
          rooms: resolvedSearch.rooms,
          adults: resolvedSearch.adults,
          children: 0,
          branches: resolvedSearch.branches,
          searchCriteriaId:
            typeof (criteria as any)?.searchCriteriaId === "number"
              ? (criteria as any).searchCriteriaId
              : undefined,
          arrivalPointCode: pick.arrival_point_code,
        });
        setHotelResultsMeta(meta);
      } catch (e: any) {
        if (cancelled || requestSeq !== activeRequestSeq.current) return;
        setError(e?.message || "Failed to fetch hotels");
        setHotels([]);
        setSearchCriteriaId(null);
        setBreakfastByHotelId({});
      } finally {
        if (!cancelled && requestSeq === activeRequestSeq.current) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [queryKey, resolvedSearch, setHotelResultsCache, setHotelResultsMeta, setHotelSearch]);

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

  const hotelsForPriceBounds = useMemo(() => {
    // Apply all filters except priceRange, so slider bounds reflect the "current result set"
    // when other filters (e.g. breakfast) are toggled.
    const q = filters.propertyQuery.trim().toLowerCase();
    return hotels.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;
      if (filters.starRatings.length > 0 && !filters.starRatings.includes(h.starRating)) return false;
      if (filters.neighborhoods.length > 0) {
        if (!h.neighborhood || !filters.neighborhoods.includes(h.neighborhood)) return false;
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
    filters.popular.breakfastIncluded,
    filters.popular.airportShuttle,
    filters.popular.reserveWithoutCard,
    filters.propertyQuery,
    filters.starRatings,
    hotels,
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
    setFilters(next);
    setHotelFiltersCache({ queryKey, filters: next });
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

    const base = hotels.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;

      if (filters.starRatings.length > 0 && !filters.starRatings.includes(h.starRating)) return false;

      // Refundable filter not supported by list endpoint reliably; leave it as UI-only.
      if (filters.fullyRefundableOnly) return true;

      if (filters.neighborhoods.length > 0) {
        if (!h.neighborhood || !filters.neighborhoods.includes(h.neighborhood)) return false;
      }

      // Amenities/mealPlans/neighborhood currently not backed by availability response in a consistent way.
      if (filters.amenities.length > 0) return true;
      if (filters.mealPlans.length > 0) return true;

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
      // No real reviews in list response; use star rating as a proxy
      sorted.sort((a, b) => b.starRating - a.starRating);
    } // recommended: keep API order

    return sorted;
  }, [filters, sortMode, hotels]);

  const displayedHotels = useMemo(() => {
    return filteredHotels.slice(0, displayedHotelsCount);
  }, [displayedHotelsCount, filteredHotels]);

  const hasMoreHotels = displayedHotelsCount < filteredHotels.length;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Search section (matches the large rounded container in Figma) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white border border-[#DFE0E4] rounded-[32px] p-6 sm:p-8">
          <SearchBar embedded />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left sidebar */}
          <aside className="hidden lg:flex w-full lg:w-72 flex-col gap-4">
            <ContactCard webRef={DEFAULT_WEB_REF} />
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
            />
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0 flex flex-col gap-4">
            <HotelResultsToolbar
              resultCount={filteredHotels.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
            />

            {loading && hotels.length === 0 && <HotelSearchLoading />}
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            {filters.popular.breakfastIncluded && breakfastEnriching && (
              <div className="text-xs text-[#3A478A]">
                Checking breakfast availability…
              </div>
            )}

            {viewMode === "map" ? (
              <div className="rounded-2xl border border-[#DFE0E4] bg-white p-8 text-center text-[#3A478A]">
                Map view coming soon.
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                {displayedHotels.map((hotel) => (
                  <HotelResultCard
                    key={hotel.id}
                    hotel={hotel}
                    view="grid"
                    selected={hotel.id === selectedHotelId}
                    onSelect={() => setSelectedHotelId(hotel.id)}
                  />
                ))}
              </div>
            ) : (
              <>
                {/* On mobile, show grid layout since list looks the same */}
                <div className="grid grid-cols-1 gap-4 sm:hidden">
                  {displayedHotels.map((hotel) => (
                    <HotelResultCard
                      key={hotel.id}
                      hotel={hotel}
                      view="grid"
                      selected={hotel.id === selectedHotelId}
                      onSelect={() => setSelectedHotelId(hotel.id)}
                    />
                  ))}
                </div>
                {/* On desktop, show list layout */}
                <div className="hidden sm:flex flex-col gap-4">
                  {displayedHotels.map((hotel) => (
                    <HotelResultCard
                      key={hotel.id}
                      hotel={hotel}
                      view="list"
                      selected={hotel.id === selectedHotelId}
                      onSelect={() => setSelectedHotelId(hotel.id)}
                    />
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


