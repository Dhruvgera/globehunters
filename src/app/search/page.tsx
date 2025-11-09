"use client";

import { useState, Suspense, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useFlights } from "@/hooks/useFlights";
import { useDatePrices } from "@/hooks/useDatePrices";
import { useBookingStore } from "@/store/bookingStore";
import { filterFlights, sortFlights } from "@/utils/flightFilter";
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
  const prevLoadingRef = useRef(false);
  const [isDateChanging, setIsDateChanging] = useState(false);
  
  // Helper to parse date string (YYYY-MM-DD) as local date
  const parseDateFromURL = (dateStr: string): Date => {
    // Parse YYYY-MM-DD as local date at midnight (not UTC)
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

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
        departureDate: parseDateFromURL(departureDate),
        returnDate: returnDate ? parseDateFromURL(returnDate) : undefined,
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

  // Keep last successful flights to avoid blanking the UI during date changes
  const lastFlightsRef = useRef<typeof flights>([]);
  useEffect(() => {
    if (flights && flights.length > 0 && !loading && !error) {
      lastFlightsRef.current = flights;
    }
  }, [flights, loading, error]);

  // Mark first attempt only after a loading cycle completes (prevents early "no results" / empty flash)
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      setHasAttemptedFetch(true);
      // Turn off date-changing indicator after fetch completes
      setIsDateChanging(false);
    }
    prevLoadingRef.current = loading;
  }, [loading]);

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

  // Auto-prefetch date prices in background; start early for better concurrency
  useEffect(() => {
    if (departureDates.length > 0) {
      const departureCenter = Math.floor(departureDates.length / 2);
      const departureIndices = departureDates
        .map((_, index) => index)
        .filter(index => index !== departureCenter)
        .sort((a, b) => Math.abs(a - departureCenter) - Math.abs(b - departureCenter));

      if (departureIndices.length > 0) {
        fetchDatePricesBatch(departureIndices, 'departure').catch(err => {
          console.error('Error in background departure date fetch:', err);
        });
      }
    }

    if (effectiveSearchParams.tripType === 'round-trip' && returnDates.length > 0) {
      const returnCenter = Math.floor(returnDates.length / 2);
      const returnIndices = returnDates
        .map((_, index) => index)
        .filter(index => index !== returnCenter)
        .sort((a, b) => Math.abs(a - returnCenter) - Math.abs(b - returnCenter));

      if (returnIndices.length > 0) {
        fetchDatePricesBatch(returnIndices, 'return').catch(err => {
          console.error('Error in background return date fetch:', err);
        });
      }
    }
  }, [departureDates.length, returnDates.length, fetchDatePricesBatch, effectiveSearchParams.tripType]);

  // Only use mock data if explicitly in error state and no real data
  const effectiveFlights = useMemo(() => {
    // While loading after initial results, keep showing last results
    if (loading) {
      if (flights.length > 0) return flights;
      if (lastFlightsRef.current.length > 0) return lastFlightsRef.current;
    }
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
  
  // Initialize/adjust price range when real API filters arrive or bounds change
  useEffect(() => {
    if (apiFilters?.minPrice != null && apiFilters?.maxPrice != null) {
      setFilterState((prev) => {
        const isPlaceholder = prev.priceRange[0] === 0 && prev.priceRange[1] === 2000;
        const outOfBoundsLower = prev.priceRange[0] < apiFilters.minPrice;
        const outOfBoundsUpper = prev.priceRange[1] > apiFilters.maxPrice;
        if (isPlaceholder || outOfBoundsLower || outOfBoundsUpper) {
          return {
            ...prev,
            priceRange: [apiFilters.minPrice, apiFilters.maxPrice],
          };
        }
        return prev;
      });
    }
  }, [apiFilters?.minPrice, apiFilters?.maxPrice]);
  
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
      // Immediately show subtle updating indicator
      setIsDateChanging(true);
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
      // With 7 dates (±3), middle index is 3
      const middleIndex = Math.floor(departureDates.length / 2);
      setSelectedDepartureDateIndex(middleIndex);
    }
  };

  // Handler for return date selection
  const handleSelectReturnDate = (index: number) => {
    // Get the actual date object
    const selectedDate = getDateFromIndex(index, 'return');
    if (selectedDate) {
      // Immediately show subtle updating indicator
      setIsDateChanging(true);
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
      // With 7 dates (±3), middle index is 3
      const middleIndex = Math.floor(returnDates.length / 2);
      setSelectedReturnDateIndex(middleIndex);
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
  // Initialize to middle index (3 for 7-date range: ±3 days)
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

  // Prepare flights for instant render: default sort (price asc) and memoize
  const preparedFlights = useMemo(() => {
    return sortFlights(effectiveFlights, 'price-asc');
  }, [effectiveFlights]);

  // Prefetch airline logos for top results to avoid layout delays
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const top = preparedFlights.slice(0, 20);
    const logos = Array.from(new Set(top.map(f => f.airline?.logo).filter(Boolean)));
    logos.forEach((src) => {
      try {
        const img = new Image();
        img.src = src as string;
      } catch {}
    });
  }, [preparedFlights]);

  // Filter flights
  const filteredFlights = useMemo(() => {
    return filterFlights(preparedFlights, filterState);
  }, [preparedFlights, filterState]);

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

      {/* Loading State - Show during bootstrap, first fetch, and any date change */}
      {(!isInitialized || loading || isDateChanging || (isInitialized && !loading && flights.length === 0 && !hasAttemptedFetch)) && (
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
                    // Reset price range to full inclusive range based on current filters
                    priceRange: [effectiveFilters.minPrice, effectiveFilters.maxPrice],
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
      {!loading && !error && !isDateChanging && <FilterSheet
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
      {/* Main Content - Hide during date change; show when we have flights */}
      {!error && !isDateChanging && preparedFlights.length > 0 && filteredFlights.length > 0 && (
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
