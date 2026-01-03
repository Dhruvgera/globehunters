"use client";

import { useMemo, useState } from "react";

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
import { mockHotels } from "@/data/mockHotels";
import type { Hotel } from "@/types/hotel";

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

  const [viewMode, setViewMode] = useState<HotelViewMode>("list");
  const [sortMode, setSortMode] = useState<HotelSortMode>("recommended");
  const [selectedHotelId, setSelectedHotelId] = useState<string>(mockHotels[0]?.id || "");

  const filteredHotels = useMemo(() => {
    const q = filters.propertyQuery.trim().toLowerCase();
    const [minPrice, maxPrice] = filters.priceRange;

    const base = mockHotels.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;

      if (filters.starRatings.length > 0 && !filters.starRatings.includes(h.starRating)) return false;

      if (filters.fullyRefundableOnly && !h.amenities.includes("Free cancellation")) return false;

      if (filters.neighborhoods.length > 0) {
        if (!h.neighborhood || !filters.neighborhoods.includes(h.neighborhood)) return false;
      }

      if (filters.amenities.length > 0) {
        const hasAll = filters.amenities.every((a) => h.amenities.includes(a as any));
        if (!hasAll) return false;
      }

      if (!matchesPopular(h, filters)) return false;

      const priceValue = filters.priceMode === "nightly" ? h.price.nightly : h.price.total;
      if (priceValue < minPrice) return false;
      if (filters.priceMode === "nightly" && priceValue > maxPrice) return false;
      return true;
    });

    const sorted = [...base];
    if (sortMode === "price_low") {
      sorted.sort((a, b) => a.price.nightly - b.price.nightly);
    } else if (sortMode === "review_score") {
      sorted.sort((a, b) => b.reviews.score - a.reviews.score);
    }

    return sorted;
  }, [filters, sortMode]);

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
              <div className="flex flex-col gap-4">
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
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}


