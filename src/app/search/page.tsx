"use client";

import { useState, Suspense, useMemo } from "react";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useFlights } from "@/hooks/useFlights";
import { useBookingStore } from "@/store/bookingStore";
import { filterFlights } from "@/utils/flightFilter";
import { FilterState, SearchParams } from "@/types/flight";
import { mockFlights, mockDatePrices, mockAirlines, mockAirports } from "@/data/mockFlights";
import { useFilterExpansion } from "@/hooks/useFilterExpansion";

// Import new modular components
import { SearchHeader } from "@/components/search/SearchHeader";
import { DatePriceSelector } from "@/components/search/DatePriceSelector";
import { SearchSummary } from "@/components/search/SearchSummary";
import { FilterSidebar } from "@/components/search/filters/FilterSidebar";
import { FilterSheet } from "@/components/search/filters/FilterSheet";
import { FlightsList } from "@/components/search/FlightsList";
import { ContactCard } from "@/components/search/ContactCard";

// Default search params
const DEFAULT_SEARCH_PARAMS: SearchParams = {
  from: "BOM",
  to: "DEL",
  departureDate: new Date(),
  returnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  passengers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  class: "Economy",
  tripType: "round-trip",
};

function SearchPageContent() {
  // Get search params from global state
  const searchParams = useBookingStore((state) => state.searchParams);
  const effectiveSearchParams = searchParams || DEFAULT_SEARCH_PARAMS;

  // Fetch flights using custom hook
  const { flights, filters: apiFilters, datePrices, loading, error } = useFlights(effectiveSearchParams);

  // Use mock data as fallback
  const effectiveFlights = useMemo(() => flights.length > 0 ? flights : mockFlights, [flights]);
  const effectiveFilters = useMemo(() => apiFilters || {
    airlines: mockAirlines,
    departureAirports: mockAirports.departure,
    arrivalAirports: mockAirports.arrival,
    minPrice: 400,
    maxPrice: 1200,
  }, [apiFilters]);
  const effectiveDatePrices = useMemo(() => datePrices || mockDatePrices, [datePrices]);

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    stops: [0, 1, 2],
    priceRange: [0, 2000],
    departureTimeOutbound: [0, 24],
    departureTimeInbound: [0, 24],
    journeyTimeOutbound: [0, 35],
    journeyTimeInbound: [0, 35],
    departureAirports: [],
    arrivalAirports: [],
    airlines: [],
    extras: [],
  });

  // UI state
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [displayedFlightsCount, setDisplayedFlightsCount] = useState(5);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(3);
  const { expandedFilters, toggleFilter } = useFilterExpansion();

  // Filter handlers
  const toggleStop = (stops: number) => {
    setFilterState((prev) => ({
      ...prev,
      stops: prev.stops.includes(stops)
        ? prev.stops.filter((s) => s !== stops)
        : [...prev.stops, stops],
    }));
  };

  const toggleAirline = (airline: string) => {
    setFilterState((prev) => ({
      ...prev,
      airlines: prev.airlines.includes(airline)
        ? prev.airlines.filter((a) => a !== airline)
        : [...prev.airlines, airline],
    }));
  };

  const toggleAllAirlines = () => {
    setFilterState((prev) => ({
      ...prev,
      airlines:
        prev.airlines.length === effectiveFilters.airlines.length
          ? []
          : effectiveFilters.airlines.map((a) => a.name),
    }));
  };

  const toggleDepartureAirport = (code: string) => {
    setFilterState((prev) => ({
      ...prev,
      departureAirports: prev.departureAirports.includes(code)
        ? prev.departureAirports.filter((a) => a !== code)
        : [...prev.departureAirports, code],
    }));
  };

  const toggleArrivalAirport = (code: string) => {
    setFilterState((prev) => ({
      ...prev,
      arrivalAirports: prev.arrivalAirports.includes(code)
        ? prev.arrivalAirports.filter((a) => a !== code)
        : [...prev.arrivalAirports, code],
    }));
  };

  const updatePriceRange = (range: [number, number]) => {
    setFilterState((prev) => ({ ...prev, priceRange: range }));
  };

  const updateDepartureTime = (type: "outbound" | "inbound", range: [number, number]) => {
    setFilterState((prev) => ({
      ...prev,
      [type === "outbound" ? "departureTimeOutbound" : "departureTimeInbound"]: range,
    }));
  };

  const updateJourneyTime = (type: "outbound" | "inbound", range: [number, number]) => {
    setFilterState((prev) => ({
      ...prev,
      [type === "outbound" ? "journeyTimeOutbound" : "journeyTimeInbound"]: range,
    }));
  };

  const toggleExtra = (extra: string) => {
    setFilterState((prev) => ({
      ...prev,
      extras: prev.extras.includes(extra)
        ? prev.extras.filter((e) => e !== extra)
        : [...prev.extras, extra],
    }));
  };

  // Filter flights
  const filteredFlights = useMemo(() => {
    return filterFlights(effectiveFlights, filterState);
  }, [effectiveFlights, filterState]);

  // Handler for loading more flights
  const handleLoadMore = () => {
    setDisplayedFlightsCount((prev) => Math.min(prev + 5, filteredFlights.length));
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Search Header with Filter Button */}
      <SearchHeader
        onFilterClick={() => setIsFilterSheetOpen(true)}
        resultCount={filteredFlights.length}
      />

      {/* Date Price Selector */}
      <DatePriceSelector
        dates={effectiveDatePrices}
        selectedIndex={selectedDateIndex}
        onSelectDate={setSelectedDateIndex}
      />

      {/* Mobile Filter Sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        filterState={filterState}
        filters={effectiveFilters}
        expandedFilters={expandedFilters}
        onToggleExpand={toggleFilter}
        onToggleStop={toggleStop}
        onToggleAirline={toggleAirline}
        onToggleAllAirlines={toggleAllAirlines}
        onToggleDepartureAirport={toggleDepartureAirport}
        onToggleArrivalAirport={toggleArrivalAirport}
        onUpdatePrice={updatePriceRange}
        onUpdateDepartureTime={updateDepartureTime}
        onUpdateJourneyTime={updateJourneyTime}
        onToggleExtra={toggleExtra}
        resultCount={filteredFlights.length}
      />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filters Sidebar - Desktop Only */}
          <div className="hidden lg:flex w-full lg:w-72 flex-col gap-4 order-3 lg:order-1">
            <SearchSummary />
            <FilterSidebar
              filterState={filterState}
              filters={effectiveFilters}
              expandedFilters={expandedFilters}
              onToggleExpand={toggleFilter}
              onToggleStop={toggleStop}
              onToggleAirline={toggleAirline}
              onToggleAllAirlines={toggleAllAirlines}
              onToggleDepartureAirport={toggleDepartureAirport}
              onToggleArrivalAirport={toggleArrivalAirport}
              onUpdatePrice={updatePriceRange}
              onUpdateDepartureTime={updateDepartureTime}
              onUpdateJourneyTime={updateJourneyTime}
              onToggleExtra={toggleExtra}
              resultCount={filteredFlights.length}
            />
          </div>

          {/* Flight Results */}
          <div className="flex-1 flex flex-col gap-2 order-2 lg:order-2">
            <FlightsList
              flights={filteredFlights}
              displayCount={displayedFlightsCount}
              onLoadMore={handleLoadMore}
            />
          </div>

          {/* Right Sidebar - Contact Card */}
          <div className="w-full lg:w-80 flex flex-col gap-4 order-1 lg:order-3">
            <ContactCard />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
