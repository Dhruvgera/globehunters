"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ContactCard } from "@/components/search/ContactCard";
import SearchBar from "@/components/search/SearchBar";
import { HotelFiltersSidebar, HotelFiltersState } from "@/components/hotels/HotelFiltersSidebar";
import {
  HotelResultsToolbar,
  HotelSortMode,
  HotelViewMode,
} from "@/components/hotels/HotelResultsToolbar";
import { HotelResultCard } from "@/components/hotels/HotelResultCard";
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

function matchesPopular(hotel: Hotel, filters: HotelFiltersState) {
  const wantsBreakfast = filters.popular.breakfastIncluded;
  const wantsShuttle = filters.popular.airportShuttle;
  const wantsNoCard = filters.popular.reserveWithoutCard;

  if (wantsBreakfast && !hotel.amenities.includes("Breakfast included")) return false;
  if (wantsShuttle && !hotel.amenities.includes("Airport shuttle included")) return false;
  if (wantsNoCard && !hotel.amenities.includes("Reserve without a credit card")) return false;

  // Mock dataset doesn't include an explicit "pay later" flag; treat as no-op for now.
  return true;
}

export default function HotelsPage() {
  const urlParams = useSearchParams();
  const setHotelSearch = useBookingStore((s) => s.setHotelSearch);
  const setHotelResultsMeta = useBookingStore((s) => s.setHotelResultsMeta);
  const hotelResultsCache = useBookingStore((s) => s.hotelResultsCache);
  const setHotelResultsCache = useBookingStore((s) => s.setHotelResultsCache);
  const savedHotelSearch = useBookingStore((s) => s.hotelSearch);

  const [filters, setFilters] = useState<HotelFiltersState>(DEFAULT_FILTERS);

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const location = urlParams.get("location") || savedHotelSearch?.location || "London";
      const checkIn = urlParams.get("checkIn") || savedHotelSearch?.checkIn || "2026-02-10";
      const checkOut = urlParams.get("checkOut") || savedHotelSearch?.checkOut || "2026-02-12";
      const adults = Math.max(1, Number(urlParams.get("adults") || savedHotelSearch?.adults || "2") || 2);
      const rooms = Math.max(1, Number(urlParams.get("rooms") || savedHotelSearch?.rooms || "1") || 1);
      const branches = urlParams.get("branches") || savedHotelSearch?.branches || "UK";

      const queryKey = JSON.stringify({
        location,
        checkIn,
        checkOut,
        adults,
        rooms,
        hidden_id: urlParams.get("hidden_id") || savedHotelSearch?.hidden_id || null,
        hidden_key: urlParams.get("hidden_key") || savedHotelSearch?.hidden_key || null,
        branches,
      });

      // Hydrate from cache immediately to preserve results on back-navigation.
      if (hotelResultsCache?.queryKey === queryKey && hotelResultsCache.hotels.length > 0) {
        setHotels(hotelResultsCache.hotels);
        setSelectedHotelId(hotelResultsCache.selectedHotelId || hotelResultsCache.hotels[0]?.id || "");
        setLoading(false);
        // Still proceed to refresh in background (no need to block UI).
      }

      try {
        const urlHiddenId = urlParams.get("hidden_id");
        const urlHiddenKey = urlParams.get("hidden_key");
        const urlArrivalPointCode = urlParams.get("arrival_point_code") || undefined;

        const pick = urlHiddenId && urlHiddenKey
          ? {
              id: Number(urlHiddenId),
              label: location,
              loc: urlHiddenKey,
              arrival_point_code: urlArrivalPointCode,
            }
          : (await (async () => {
              const lookup = await hotelService.lookupCities(location);
              return lookup.find((x) => String(x.loc).toLowerCase() === "city") || lookup[0];
            })());

        if (!pick?.id || !pick?.label || !pick?.loc) {
          throw new Error("No matching city/hotel found for the selected destination.");
        }

        const availability = await hotelService.searchAvailabilityV3({
          location: pick.label,
          hidden_id: String(pick.id),
          hidden_key: String(pick.loc),
          checkIn,
          checkOut,
          rooms,
          adults,
          children: 0,
          branches,
        });

        const results = availability?.Results || [];
        const criteria = availability?.Criteria;

        const nights =
          Math.max(
            1,
            Math.round(
              (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
            )
          ) || 1;

        const mapped: Hotel[] = results.map((r: any, idx: number) => {
          const hotelId = String(r?.hotel_id ?? r?.hotelId ?? r?.id ?? idx);
          const total = parsePriceFromResult(r) ?? 0;
          const sellCur = r?.SellCur || r?.sellCur || r?.currency;
          const mealPlans = Array.isArray(r?.MealPlans) ? r.MealPlans.filter(Boolean) : [];
          const reviewsRating = Number(r?.reviews_rating ?? 0) || 0;
          return {
            id: hotelId,
            name: r?.hotel_name || r?.hotelName || "Content missing from API: hotel name",
            distanceLabel:
              r?.address1 || r?.address2
                ? [r?.address1, r?.address2].filter(Boolean).join(", ")
                : "Content missing from API: address",
            neighborhood: undefined,
            starRating: clampStar(r?.hotel_rating ?? r?.hotelRating),
            amenities: [],
            room: {
              name: mealPlans.length > 0 ? `Meal plans: ${mealPlans.slice(0, 2).join(", ")}` : "Room options available",
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
              rooms,
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

        if (cancelled) return;

        setHotels(mapped);
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
          checkIn,
          checkOut,
          rooms,
          adults,
          children: 0,
          branches,
          searchCriteriaId:
            typeof (criteria as any)?.searchCriteriaId === "number"
              ? (criteria as any).searchCriteriaId
              : undefined,
          arrivalPointCode: pick.arrival_point_code,
        });
        setHotelResultsMeta(meta);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to fetch hotels");
        setHotels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hotelResultsCache?.queryKey, savedHotelSearch, setHotelResultsCache, setHotelResultsMeta, setHotelSearch, urlParams]);

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

      if (!matchesPopular(h, filters)) return false;

      const priceValue = filters.priceMode === "nightly" ? h.price.nightly : h.price.total;
      if (priceValue < minPrice) return false;
      if (filters.priceMode === "nightly" && priceValue > maxPrice) return false;
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
              onChange={setFilters}
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

            {loading && (
              <div className="text-sm text-[#3A478A]">Loading hotels…</div>
            )}
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            {viewMode === "map" ? (
              <div className="rounded-2xl border border-[#DFE0E4] bg-white p-8 text-center text-[#3A478A]">
                Map view coming soon.
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                {filteredHotels.map((hotel) => (
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
                  {filteredHotels.map((hotel) => (
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
                  {filteredHotels.map((hotel) => (
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
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}


