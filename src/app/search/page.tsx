"use client";

import { useState, Suspense, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useFlights } from "@/hooks/useFlights";
import { useDatePrices } from "@/hooks/useDatePrices";
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
  const t = useTranslations('search');
  const urlParams = useSearchParams();
  const setStoreSearchParams = useBookingStore((state) => state.setSearchParams);
  const storeSearchParams = useBookingStore((state) => state.searchParams);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  
  // Parse URL parameters and set in store on mount
  useEffect(() => {
    const from = urlParams.get('from');
    const to = urlParams.get('to');
    const departureDate = urlParams.get('departureDate');
    const returnDate = urlParams.get('returnDate');
    const adults = urlParams.get('adults');
    const children = urlParams.get('children');
    const infants = urlParams.get('infants');
    const travelClass = urlParams.get('class');
    const tripType = urlParams.get('tripType');

    if (from && to && departureDate) {
      const params: SearchParams = {
        from: from,
        to: to,
        departureDate: new Date(departureDate),
        returnDate: returnDate ? new Date(returnDate) : undefined,
        passengers: {
          adults: parseInt(adults || '1'),
          children: parseInt(children || '0'),
          infants: parseInt(infants || '0'),
        },
        class: (travelClass as any) || 'Economy',
        tripType: (tripType as any) || 'round-trip',
      };
      setStoreSearchParams(params);
    }
    // Mark as initialized after parsing URL params
    setIsInitialized(true);
  }, [urlParams, setStoreSearchParams]);
  
  const effectiveSearchParams = storeSearchParams || DEFAULT_SEARCH_PARAMS;

  // Fetch flights using custom hook - but only after initialization
  const { flights, filters: apiFilters, loading, error } = useFlights(
    isInitialized ? effectiveSearchParams : null,
    { enabled: isInitialized }
  );

  // Track when the first fetch completes
  useEffect(() => {
    if (isInitialized && !loading && !hasAttemptedFetch) {
      setHasAttemptedFetch(true);
    }
  }, [isInitialized, loading, hasAttemptedFetch]);

  // Calculate actual minimum price from flights for current dates
  const actualMinPrice = useMemo(() => {
    if (flights.length === 0) return null;
    const minFlight = flights.reduce((min, flight) => 
      flight.pricePerPerson < min.pricePerPerson ? flight : min
    , flights[0]);
    return minFlight.pricePerPerson;
  }, [flights]);

  // Fetch date prices with background loading and lazy fetching
  const { 
    departureDates, 
    returnDates, 
    loadingIndices, 
    fetchDatePrice,
    fetchDatePricesBatch,
    getDateFromIndex
  } = useDatePrices(isInitialized ? effectiveSearchParams : null, actualMinPrice);

  // Auto-prefetch all date prices in parallel once main search completes
  useEffect(() => {
    if (!loading && flights.length > 0 && actualMinPrice) {
      // Prefetch all departure dates (excluding selected center one - index 3)
      const departureIndices = departureDates
        .map((_, index) => index)
        .filter(index => index !== 3); // Skip center/selected date
      
      if (departureIndices.length > 0) {
        fetchDatePricesBatch(departureIndices, 'departure');
      }

      // Prefetch all return dates if round trip
      if (effectiveSearchParams.tripType === 'round-trip' && returnDates.length > 0) {
        const returnIndices = returnDates
          .map((_, index) => index)
          .filter(index => index !== 3); // Skip center/selected date
        
        if (returnIndices.length > 0) {
          fetchDatePricesBatch(returnIndices, 'return');
        }
      }
    }
  }, [loading, flights.length, actualMinPrice, departureDates.length, returnDates.length, fetchDatePricesBatch, effectiveSearchParams.tripType]);

  // Only use mock data if explicitly in error state and no real data
  const effectiveFlights = useMemo(() => {
    // If loading, don't show mock data
    if (loading) return [];
    // If we have real data, use it
    if (flights.length > 0) return flights;
    // If error and no data, show mock data as fallback
    if (error) return mockFlights;
    // Otherwise empty
    return [];
  }, [flights, loading, error]);
  
  const effectiveFilters = useMemo(() => {
    // Always return filters (even empty during loading)
    return apiFilters || {
      airlines: loading ? [] : mockAirlines,
      departureAirports: loading ? [] : mockAirports.departure,
      arrivalAirports: loading ? [] : mockAirports.arrival,
      minPrice: 400,
      maxPrice: 1200,
    };
  }, [apiFilters, loading]);
  
  // Handler for when a date comes into view
  const handleDateInView = (index: number, type: 'departure' | 'return') => {
    // Fetch date price when it comes into view
    fetchDatePrice(index, type);
  };

  // Handler for departure date selection
  const handleSelectDepartureDate = (index: number) => {
    // Get the actual date object
    const selectedDate = getDateFromIndex(index, 'departure');
    if (selectedDate) {
      // Check if we need to adjust return date (for round trips)
      let updatedReturnDate = effectiveSearchParams.returnDate;
      
      if (effectiveSearchParams.tripType === 'round-trip' && updatedReturnDate) {
        // Ensure return date is not before departure date
        if (updatedReturnDate < selectedDate) {
          // Set return date to be at least 1 day after departure
          updatedReturnDate = new Date(selectedDate);
          updatedReturnDate.setDate(updatedReturnDate.getDate() + 1);
          console.log('⚠️  Return date adjusted to be after departure date');
        }
      }
      
      // Update search params with new departure date (and adjusted return date if needed)
      const updatedParams: SearchParams = {
        ...effectiveSearchParams,
        departureDate: selectedDate,
        returnDate: updatedReturnDate,
      };
      setStoreSearchParams(updatedParams);
      
      // Reset to middle index since date range will re-center around selected date
      setSelectedDepartureDateIndex(3);
    }
  };

  // Handler for return date selection
  const handleSelectReturnDate = (index: number) => {
    // Get the actual date object
    const selectedDate = getDateFromIndex(index, 'return');
    if (selectedDate) {
      // Validate that return date is not before departure date
      if (selectedDate < effectiveSearchParams.departureDate) {
        console.warn('⚠️  Cannot select return date before departure date');
        return; // Don't allow selection
      }
      
      // Update search params with new return date
      const updatedParams: SearchParams = {
        ...effectiveSearchParams,
        returnDate: selectedDate,
      };
      setStoreSearchParams(updatedParams);
      
      // Reset to middle index since date range will re-center around selected date
      setSelectedReturnDateIndex(3);
    }
  };

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
  const [selectedDepartureDateIndex, setSelectedDepartureDateIndex] = useState<number>(3);
  const [selectedReturnDateIndex, setSelectedReturnDateIndex] = useState<number>(3);
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

      {/* Search Header with Filter Button (includes SearchBar) */}
      <SearchHeader
        onFilterClick={() => setIsFilterSheetOpen(true)}
        resultCount={filteredFlights.length}
      />

      {/* Date Price Selector - Always show when not in error state */}
      {!error && departureDates.length > 0 && (
        <div className="relative">
          {/* Subtle loading indicator when changing dates (but we already have flights) */}
          {loading && flights.length > 0 && (
            <div className="absolute top-2 right-4 z-10">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 text-xs">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                <span>Updating...</span>
              </div>
            </div>
          )}
          <DatePriceSelector
            departureDates={departureDates}
            returnDates={effectiveSearchParams.tripType === 'round-trip' ? returnDates : undefined}
            selectedDepartureIndex={selectedDepartureDateIndex}
            selectedReturnIndex={selectedReturnDateIndex}
            onSelectDepartureDate={handleSelectDepartureDate}
            onSelectReturnDate={effectiveSearchParams.tripType === 'round-trip' ? handleSelectReturnDate : undefined}
            currency="GBP"
            loadingIndices={loadingIndices}
            onDateInView={handleDateInView}
          />
        </div>
      )}

      {/* Loading State - Show when no flights loaded yet */}
      {(!isInitialized || (loading && flights.length === 0)) && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">{t('states.loading.title')}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-1">{t('states.error.title')}</h3>
                <p className="text-red-800">{error.message}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t('states.error.tryAgain')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Results State - Show when no flights from API */}
      {hasAttemptedFetch && !loading && !error && flights.length === 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('states.noResults.title')}</h3>
            <p className="text-gray-600 mb-4">{t('states.noResults.message')}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('states.noResults.newSearch')}
            </button>
          </div>
        </div>
      )}

      {/* No Filtered Results - Show when filters return 0 results but flights exist */}
      {!loading && !error && flights.length > 0 && filteredFlights.length === 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Flights Match Your Filters</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters to see more results</p>
            <button
              onClick={() => {
                setFilterState({
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
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {!loading && !error && <FilterSheet
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
      }
      {/* Main Content - Show when we have flights */}
      {!error && flights.length > 0 && filteredFlights.length > 0 && (
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
      )}

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
