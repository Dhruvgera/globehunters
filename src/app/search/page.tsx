"use client";

import { useState, Suspense, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useFlights } from "@/hooks/useFlights";
import { useDatePrices } from "@/hooks/useDatePrices";
import { useBookingStore } from "@/store/bookingStore";
import { filterFlights, filterFlightsExcludingStops, parseDurationToMinutes, sortFlights, countByStops, getTimeBounds } from "@/utils/flightFilter";
import { airportCache } from "@/lib/cache/airportCache";
import { shortenAirportName } from "@/lib/vyspa/utils";
import { normalizeCabinClass } from "@/lib/utils";
import { FilterState, Flight, SearchParams } from "@/types/flight";
import { DEFAULT_FILTER_STATE } from "@/config/constants";
import { useFilterExpansion } from "@/hooks/useFilterExpansion";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAffiliate } from "@/lib/AffiliateContext";
import { packageService } from "@/services/api/packageService";
import { buildPackageFlightFilters, mapPackageAlternateFlightToFlight } from "@/lib/package/flights";

// Import new modular components
import { SearchHeader } from "@/components/search/SearchHeader";
import { DatePriceSelector } from "@/components/search/DatePriceSelector";
import { SearchSummary } from "@/components/search/SearchSummary";
import { FilterSidebar } from "@/components/search/filters/FilterSidebar";
import { FilterSheet } from "@/components/search/filters/FilterSheet";
import { FlightsList } from "@/components/search/FlightsList";
import { ContactCard } from "@/components/search/ContactCard";
import { FlightSortTabs } from "@/components/search/FlightSortTabs";
import { SortOption } from "@/utils/flightFilter";
import { FlightSearchLoading } from "@/components/flights/FlightSearchLoading";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import { PackageStaySummary } from "@/components/packages/PackageStaySummary";

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

function safeDateTime(value: unknown): number | null {
  if (value == null) return null;
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "string" || typeof value === "number") {
    d = new Date(value);
  } else {
    return null;
  }
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function getQueryParamCaseInsensitive(
  searchParams: { get: (name: string) => string | null; entries: () => IterableIterator<[string, string]> },
  key: string
): string | null {
  const direct = searchParams.get(key);
  if (direct !== null) return direct;

  const target = key.toLowerCase();
  for (const [entryKey, entryValue] of searchParams.entries()) {
    if (entryKey.toLowerCase() === target) {
      return entryValue;
    }
  }

  return null;
}

function SearchPageContent() {
  const t = useTranslations('search');
  const urlParams = useSearchParams();
  const router = useRouter();
  
  // Detect if we're in package (Flight+Hotel) mode
  const isPackageMode = getQueryParamCaseInsensitive(urlParams, "type") === "package";
  const packageHotelId = getQueryParamCaseInsensitive(urlParams, "hotelId");
  const packageHotelName = getQueryParamCaseInsensitive(urlParams, "hotelName");
  const packageFlightResultId = getQueryParamCaseInsensitive(urlParams, "flightResultId");
  
  const setStoreSearchParams = useBookingStore((state) => state.setSearchParams);
  const storeSearchParams = useBookingStore((state) => state.searchParams);
  const setSearchRequestId = useBookingStore((state) => state.setSearchRequestId);
  const searchRequestId = useBookingStore((state) => state.searchRequestId);
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const selectedHotelRoomSummary = useBookingStore((state) => state.selectedHotelRoomSummary);
  const packageResultsMeta = useBookingStore((state) => state.packageResultsMeta);
  const setAffiliateData = useBookingStore((state) => state.setAffiliateData);
  const setIsFromDeeplink = useBookingStore((state) => state.setIsFromDeeplink);
  const clearForNewSearch = useBookingStore((state) => state.clearForNewSearch);
  const { setAffiliateCode } = useAffiliate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const prevLoadingRef = useRef(false);
  const [isDateChanging, setIsDateChanging] = useState(false);
  const [fareExpiredOpen, setFareExpiredOpen] = useState(false);
  const [isDeeplinkLoading, setIsDeeplinkLoading] = useState(false);
  const [packageFlights, setPackageFlights] = useState<Flight[]>([]);
  const [packageFlightsLoading, setPackageFlightsLoading] = useState(false);
  const [packageFlightsError, setPackageFlightsError] = useState<Error | null>(null);

  // Handle flight deeplink parameter - redirect directly to booking
  useEffect(() => {
    const flightKey = getQueryParamCaseInsensitive(urlParams, 'flight');

    if (flightKey) {
      // This is a deeplink with a pre-selected flight - redirect to booking
      setIsDeeplinkLoading(true);

      // Mark this as a deeplink flow
      setIsFromDeeplink(true);

      // Extract tracking data
      const affCode = getQueryParamCaseInsensitive(urlParams, 'aff');
      const utmSource = getQueryParamCaseInsensitive(urlParams, 'utm_source');
      const utmMedium = getQueryParamCaseInsensitive(urlParams, 'utm_medium');
      const utmCampaign = getQueryParamCaseInsensitive(urlParams, 'utm_campaign');
      const cnc = getQueryParamCaseInsensitive(urlParams, 'cnc');

      // Store affiliate/tracking data
      const affiliateCode = affCode || utmSource;
      if (affiliateCode) {
        setAffiliateCode(affiliateCode);
        setAffiliateData({
          code: affiliateCode,
          utmSource: utmSource || undefined,
          utmMedium: utmMedium || undefined,
          utmCampaign: utmCampaign || undefined,
          cnc: cnc || undefined,
        });
      }

      // Process the deeplink
      (async () => {
        try {
          // Call FlightView API to get flight details
          const response = await fetch('/api/flight-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: flightKey }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            console.error('FlightView API error:', data);
            // On error, continue with normal search (remove flight param)
            const newParams = new URLSearchParams(urlParams.toString());
            newParams.delete('flight');
            router.replace(`/search?${newParams.toString()}&error=flight_unavailable`);
            setIsDeeplinkLoading(false);
            return;
          }

          // Store flight and search params in booking store
          if (data.flight) {
            const flightWithKey = {
              ...data.flight,
              flightKey: flightKey,
            };
            setSelectedFlight(flightWithKey, normalizeCabinClass(data.flight.outbound?.cabinClass));
          }

          if (data.searchParams) {
            const params = {
              ...data.searchParams,
              departureDate: new Date(data.searchParams.departureDate),
              returnDate: data.searchParams.returnDate
                ? new Date(data.searchParams.returnDate)
                : undefined,
            };
            setStoreSearchParams(params);
          }

          // Store the request ID as web ref (from FlightView response)
          if (data.requestId) {
            setSearchRequestId(data.requestId);
          }

          // Redirect directly to booking page
          router.push('/booking');
        } catch (err) {
          console.error('Search deeplink processing error:', err);
          // On error, continue with normal search
          const newParams = new URLSearchParams(urlParams.toString());
          newParams.delete('flight');
          router.replace(`/search?${newParams.toString()}&error=flight_unavailable`);
          setIsDeeplinkLoading(false);
        }
      })();

      return; // Don't continue with normal search initialization
    }
  }, [urlParams, router, setAffiliateCode, setSelectedFlight, setStoreSearchParams, setAffiliateData, setIsFromDeeplink, setSearchRequestId]);

  // Handle affiliate code and UTM params from URL
  useEffect(() => {
    // Skip if this is a deeplink flow (handled above)
    if (getQueryParamCaseInsensitive(urlParams, 'flight')) return;

    const affCode = getQueryParamCaseInsensitive(urlParams, 'aff');
    const utmSource = getQueryParamCaseInsensitive(urlParams, 'utm_source');

    // Prioritize aff code, fall back to utm_source
    const affiliateCode = affCode || utmSource;
    if (affiliateCode) {
      setAffiliateCode(affiliateCode);
      console.log('Affiliate code detected in search URL:', affiliateCode);
    }

    // Store UTM params in sessionStorage for persistence
    if (typeof window !== 'undefined') {
      if (utmSource) sessionStorage.setItem('utm_source', utmSource);
      const utmMedium = getQueryParamCaseInsensitive(urlParams, 'utm_medium');
      const utmCampaign = getQueryParamCaseInsensitive(urlParams, 'utm_campaign');
      if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium);
      if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign);
    }
  }, [urlParams, setAffiliateCode]);

  // Helper to parse date string (YYYY-MM-DD) as local date
  const parseDateFromURL = (dateStr: string): Date => {
    // Parse YYYY-MM-DD as local date at midnight (not UTC)
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const parseTravelClassFromURL = (value: string | null): SearchParams['class'] => {
    const allowed: SearchParams['class'][] = ['Economy', 'Premium Economy', 'Business', 'First'];
    if (value && (allowed as string[]).includes(value)) {
      return value as SearchParams['class'];
    }
    return 'Economy';
  };

  // Parse URL parameters and set in store on mount
  useEffect(() => {
    const from = getQueryParamCaseInsensitive(urlParams, 'from');
    const to = getQueryParamCaseInsensitive(urlParams, 'to');
    const departureDate = getQueryParamCaseInsensitive(urlParams, 'departureDate');
    const returnDate = getQueryParamCaseInsensitive(urlParams, 'returnDate');
    const adults = getQueryParamCaseInsensitive(urlParams, 'adults');
    const children = getQueryParamCaseInsensitive(urlParams, 'children');
    const infants = getQueryParamCaseInsensitive(urlParams, 'infants');
    const travelClass = getQueryParamCaseInsensitive(urlParams, 'class');
    const tripType = getQueryParamCaseInsensitive(urlParams, 'tripType') as SearchParams['tripType'] | null;

    if (tripType === 'multi-city') {
      const segments: SearchParams['segments'] = [];

      // Support both from/to/departureDate and from1/to1/departureDate1 for first leg
      const firstFrom = getQueryParamCaseInsensitive(urlParams, 'from1') || from;
      const firstTo = getQueryParamCaseInsensitive(urlParams, 'to1') || to;
      const firstDeparture = getQueryParamCaseInsensitive(urlParams, 'departureDate1') || departureDate;

      if (firstFrom && firstTo && firstDeparture) {
        segments.push({
          from: firstFrom,
          to: firstTo,
          departureDate: parseDateFromURL(firstDeparture),
        });
      }

      // Parse additional legs up to 6
      for (let i = 2; i <= 6; i++) {
        const segFrom = getQueryParamCaseInsensitive(urlParams, `from${i}`);
        const segTo = getQueryParamCaseInsensitive(urlParams, `to${i}`);
        const segDate = getQueryParamCaseInsensitive(urlParams, `departureDate${i}`);
        if (segFrom && segTo && segDate) {
          segments.push({
            from: segFrom,
            to: segTo,
            departureDate: parseDateFromURL(segDate),
          });
        }
      }

      if (segments.length > 0) {
        const first = segments[0];
        const params: SearchParams = {
          from: first.from,
          to: first.to,
          departureDate: first.departureDate,
          // For multi-city we rely on per-leg dates, not a single returnDate
          passengers: {
            adults: parseInt(adults || '1'),
            children: parseInt(children || '0'),
            infants: parseInt(infants || '0'),
          },
          class: parseTravelClassFromURL(travelClass),
          tripType: 'multi-city',
          segments,
        };
        setStoreSearchParams(params);
      }
    } else if (from && to && departureDate) {
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
        class: parseTravelClassFromURL(travelClass),
        tripType: (tripType as SearchParams['tripType']) || 'round-trip',
      };
      setStoreSearchParams(params);
    }
    // Mark as initialized after parsing URL params
    setIsInitialized(true);
  }, [urlParams, setStoreSearchParams]);

  const effectiveSearchParams = storeSearchParams || DEFAULT_SEARCH_PARAMS;

  // Fetch flights using custom hook - but only after initialization
  const { flights, filters: apiFilters, requestId, loading, error } = useFlights(
    isInitialized ? effectiveSearchParams : null,
    { 
      enabled: isInitialized && !isPackageMode,
      // Pass the searchRequestId from store to restore previous search results
      // This is crucial for "Back" navigation from booking flow
      requestId: isPackageMode ? null : searchRequestId 
    }
  );

  // Store requestId in booking store when flights are fetched
  useEffect(() => {
    if (requestId) {
      setSearchRequestId(requestId);
    }
  }, [requestId, setSearchRequestId]);

  useEffect(() => {
    const effectiveFlightResultId = packageFlightResultId || packageResultsMeta?.selectedFlightResultId || "";

    if (!isPackageMode || !packageHotelId || !effectiveFlightResultId) {
      setPackageFlights([]);
      setPackageFlightsError(null);
      setPackageFlightsLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setPackageFlightsLoading(true);
      setPackageFlightsError(null);
      try {
        const packageRequestId = packageResultsMeta?.requestId;
        const response = await packageService.getAlternateFlights({
          flightResultId: effectiveFlightResultId,
          hotelResultId: Number(packageHotelId),
        });

        if (cancelled) return;

        const mappedFlights = response.flights
          .map((flight) => mapPackageAlternateFlightToFlight(flight, searchRequestId || String(packageRequestId || "")))
          .filter((flight): flight is Flight => !!flight);

        const includedFlight = mappedFlights.find(
          (f) => f.id === effectiveFlightResultId || f.segmentResultId === effectiveFlightResultId
        );
        const baselinePrice = includedFlight?.price ?? 0;
        const baselinePerPerson = includedFlight?.pricePerPerson ?? baselinePrice;

        const adjustedFlights = mappedFlights.map((flight) => ({
          ...flight,
          packagePriceDeltaTotal: Math.round((flight.price - baselinePrice) * 100) / 100,
          packagePriceDeltaPerPerson: Math.round((flight.pricePerPerson - baselinePerPerson) * 100) / 100,
        }));

        setPackageFlights(adjustedFlights);
        setHasAttemptedFetch(true);
      } catch (err) {
        if (cancelled) return;
        setPackageFlights([]);
        setPackageFlightsError(err instanceof Error ? err : new Error("Failed to fetch package flights"));
        setHasAttemptedFetch(true);
      } finally {
        if (!cancelled) {
          setPackageFlightsLoading(false);
          setIsDateChanging(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isPackageMode, packageFlightResultId, packageHotelId, packageResultsMeta, searchRequestId]);

  // State for resolved airport names (loaded from cache)
  const [resolvedAirportNames, setResolvedAirportNames] = useState<{
    origin: string;
    destination: string;
  }>({ origin: '', destination: '' });

  // Load airport cache and resolve airport names
  useEffect(() => {
    const loadAirportNames = async () => {
      // Ensure airport cache is populated
      await airportCache.getAirports();

      // Get airport names from cache
      const originName = airportCache.getAirportName(effectiveSearchParams.from);
      const destName = airportCache.getAirportName(effectiveSearchParams.to);

      setResolvedAirportNames({
        origin: shortenAirportName(originName),
        destination: shortenAirportName(destName),
      });
    };

    if (effectiveSearchParams.from && effectiveSearchParams.to) {
      loadAirportNames();
    }
  }, [effectiveSearchParams.from, effectiveSearchParams.to]);

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
    const sourceFlights = isPackageMode ? packageFlights : flights;
    if (sourceFlights.length === 0) return null;
    const minFlight = sourceFlights.reduce((min, flight) =>
      flight.pricePerPerson < min.pricePerPerson ? flight : min
      , sourceFlights[0]);
    return minFlight.pricePerPerson;
  }, [flights, isPackageMode, packageFlights]);

  // Fetch date prices with background loading and lazy fetching
  const {
    departureDates,
    returnDates,
    loadingIndices,
    fetchDatePrice,
    fetchDatePricesBatch,
    getDateFromIndex
  } = useDatePrices(isInitialized && !isPackageMode ? effectiveSearchParams : null, actualMinPrice);

  // Auto-prefetch date prices in background; start early for better concurrency
  useEffect(() => {
    if (isPackageMode) return;
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
  }, [departureDates.length, returnDates.length, fetchDatePricesBatch, effectiveSearchParams.tripType, isPackageMode]);

  const effectiveFlights = useMemo(() => {
    if (isPackageMode) {
      return packageFlights;
    }
    // While loading after initial results, keep showing last results
    if (loading) {
      if (flights.length > 0) return flights;
      if (lastFlightsRef.current.length > 0) return lastFlightsRef.current;
    }
    // If we have real data, use it
    if (flights.length > 0) return flights;
    // If error and no data, show empty state
    if (error) return [];
    // Otherwise empty
    return [];
  }, [flights, loading, error, isPackageMode, packageFlights]);

  const effectiveFilters = useMemo(() => {
    if (isPackageMode) {
      const derived = buildPackageFlightFilters(packageFlights);
      return {
        airlines: derived.airlines,
        departureAirports: derived.departureAirports,
        arrivalAirports: derived.arrivalAirports,
        minPrice: derived.minPrice,
        maxPrice: derived.maxPrice || 5000,
      };
    }

    // Always return filters (even empty during loading)
    const baseFilters = apiFilters || {
      airlines: [],
      departureAirports: [],
      arrivalAirports: [],
      minPrice: 0,
      maxPrice: 0,
    };

    // Enrich airport names from cache (the cache is loaded asynchronously)
    // This will update when resolvedAirportNames changes (cache loaded)
    if (resolvedAirportNames.origin) {
      return {
        ...baseFilters,
        departureAirports: baseFilters.departureAirports.map((airport) => ({
          ...airport,
          name: shortenAirportName(airportCache.getAirportName(airport.code) || airport.name),
        })),
        arrivalAirports: baseFilters.arrivalAirports.map((airport) => ({
          ...airport,
          name: shortenAirportName(airportCache.getAirportName(airport.code) || airport.name),
        })),
      };
    }

    return baseFilters;
  }, [apiFilters, isPackageMode, loading, packageFlights, resolvedAirportNames]);

  // Initialize/adjust price range when real API filters arrive or bounds change
  // For package mode, use a wide price range to show all flights
  useEffect(() => {
    if (isPackageMode) {
      setFilterState((prev) => ({
        ...prev,
        priceRange: [effectiveFilters.minPrice || 0, effectiveFilters.maxPrice || 5000],
        departureAirports: [],
        arrivalAirports: [],
        airlines: [],
        stops: [],
      }));
      return;
    }
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
  }, [apiFilters?.minPrice, apiFilters?.maxPrice, effectiveFilters.maxPrice, effectiveFilters.minPrice, isPackageMode]);

  // Track date changes from date slider to reset filters
  const prevDatesRef = useRef<{ departure: number | null; return: number | null }>({
    departure: null,
    return: null,
  });

  useEffect(() => {
    const currentDeparture = safeDateTime(effectiveSearchParams.departureDate);
    const currentReturn = safeDateTime(effectiveSearchParams.returnDate);

    // Skip initial mount - only react to subsequent changes
    if (prevDatesRef.current.departure === null && prevDatesRef.current.return === null) {
      prevDatesRef.current = { departure: currentDeparture, return: currentReturn };
      return;
    }

    // Check if dates have actually changed
    const departureDateChanged = prevDatesRef.current.departure !== currentDeparture;
    const returnDateChanged = prevDatesRef.current.return !== currentReturn;

    if (departureDateChanged || returnDateChanged) {
      console.log('[Search] Date changed via slider, resetting filters');
      // Reset filter state to defaults - new bounds will be set by apiFilters effect
      setFilterState({ ...DEFAULT_FILTER_STATE });
      // Reset the displayed flights count as well
      setDisplayedFlightsCount(5);
    }

    prevDatesRef.current = { departure: currentDeparture, return: currentReturn };
  }, [effectiveSearchParams.departureDate, effectiveSearchParams.returnDate]);

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
  const [filterState, setFilterState] = useState<FilterState>({ ...DEFAULT_FILTER_STATE });

  const [sortBy, setSortBy] = useState<'best' | 'cheapest' | 'fastest'>('cheapest');

  // Track previous search params to detect new searches and reset filters
  const prevSearchParamsRef = useRef<string | null>(null);

  const showInboundLeg = effectiveSearchParams.tripType === "round-trip";

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

  const updateArrivalTime = (type: "outbound" | "inbound", range: [number, number]) => {
    setFilterState((prev) => ({
      ...prev,
      [type === "outbound" ? "arrivalTimeOutbound" : "arrivalTimeInbound"]: range,
    }));
  };

  const updateTimeType = (timeType: "takeoff" | "landing") => {
    setFilterState((prev) => ({
      ...prev,
      timeFilterMode: timeType,
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
  // Also enrich airport names from cache when available
  const preparedFlights = useMemo(() => {
    let sorted: Flight[];

    if (isPackageMode) {
      const selectedId = packageFlightResultId || packageResultsMeta?.selectedFlightResultId || "";
      sorted = [...effectiveFlights].sort((a, b) => {
        const aIsSelected = a.id === selectedId || a.segmentResultId === selectedId;
        const bIsSelected = b.id === selectedId || b.segmentResultId === selectedId;
        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;
        const deltaA = a.packagePriceDeltaTotal ?? 0;
        const deltaB = b.packagePriceDeltaTotal ?? 0;
        return deltaA - deltaB;
      });
    } else {
      sorted = sortFlights(effectiveFlights, 'price-asc');
    }

    if (resolvedAirportNames.origin && resolvedAirportNames.origin !== effectiveSearchParams.from) {
      return sorted.map((flight) => ({
        ...flight,
        outbound: {
          ...flight.outbound,
          departureAirport: {
            ...flight.outbound.departureAirport,
            name: shortenAirportName(airportCache.getAirportName(flight.outbound.departureAirport.code)),
          },
          arrivalAirport: {
            ...flight.outbound.arrivalAirport,
            name: shortenAirportName(airportCache.getAirportName(flight.outbound.arrivalAirport.code)),
          },
        },
        ...(flight.inbound ? {
          inbound: {
            ...flight.inbound,
            departureAirport: {
              ...flight.inbound.departureAirport,
              name: shortenAirportName(airportCache.getAirportName(flight.inbound.departureAirport.code)),
            },
            arrivalAirport: {
              ...flight.inbound.arrivalAirport,
              name: shortenAirportName(airportCache.getAirportName(flight.inbound.arrivalAirport.code)),
            },
          },
        } : {}),
      }));
    }

    return sorted;
  }, [effectiveFlights, resolvedAirportNames, effectiveSearchParams.from, isPackageMode, packageFlightResultId, packageResultsMeta?.selectedFlightResultId]);

  // Compute available stops from flights filtered by all OTHER filters (excluding stops)
  // This makes the stop counts update when user selects airline or other filters
  const availableStops = useMemo(() => {
    const flightsForStopCounts = filterFlightsExcludingStops(preparedFlights, filterState);
    return countByStops(flightsForStopCounts);
  }, [preparedFlights, filterState]);

  // Compute time bounds from flights
  const timeBounds = useMemo(() => {
    return getTimeBounds(preparedFlights);
  }, [preparedFlights]);

  // Get airport names from resolved state (loaded asynchronously from cache)
  const airportNames = useMemo(() => {
    // Use resolved names from state (loaded from cache asynchronously)
    if (resolvedAirportNames.origin && resolvedAirportNames.origin !== effectiveSearchParams.from) {
      return resolvedAirportNames;
    }

    // Fall back to flight data if cache hasn't loaded yet
    if (preparedFlights.length > 0) {
      const firstFlight = preparedFlights[0];
      const originName = firstFlight.outbound.departureAirport.name;
      const destName = firstFlight.outbound.arrivalAirport.name;

      // Only use flight data if name is different from code
      return {
        origin: (originName && originName !== firstFlight.outbound.departureAirport.code)
          ? originName
          : effectiveSearchParams.from,
        destination: (destName && destName !== firstFlight.outbound.arrivalAirport.code)
          ? destName
          : effectiveSearchParams.to,
      };
    }

    return {
      origin: effectiveSearchParams.from,
      destination: effectiveSearchParams.to,
    };
  }, [preparedFlights, effectiveSearchParams.from, effectiveSearchParams.to, resolvedAirportNames]);

  // Reset filters when a new search is initiated (URL query params change)
  // This ensures filters are cleared on every new search from home page
  useEffect(() => {
    const currentUrlKey = urlParams.toString();

    // Only reset if we have a previous key and it's different (skip initial load)
    if (prevSearchParamsRef.current !== null && prevSearchParamsRef.current !== currentUrlKey) {
      // New search detected - clear stale booking data (folder ID, passengers, etc.)
      clearForNewSearch();
      // Reset filters
      setFilterState({ ...DEFAULT_FILTER_STATE });
      setDisplayedFlightsCount(5);
    }

    prevSearchParamsRef.current = currentUrlKey;
  }, [urlParams, clearForNewSearch]);

  // Prefetch airline logos for top results to avoid layout delays
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const top = preparedFlights.slice(0, 20);
    const logos = Array.from(new Set(top.map(f => f.airline?.logo).filter(Boolean)));
    logos.forEach((src) => {
      try {
        const img = new Image();
        img.src = src as string;
      } catch { }
    });
  }, [preparedFlights]);

  // Compute min/max journey duration from actual flight results
  const journeyTimeBounds = useMemo(() => {
    const fallback = {
      outbound: { min: 0, max: 35 },
      inbound: { min: 0, max: 35 },
    };

    if (!preparedFlights || preparedFlights.length === 0) {
      return fallback;
    }

    const clampBounds = (min: number, max: number) => {
      if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 35 };
      const normalizedMin = Math.max(0, Math.floor(min));
      const normalizedMax = Math.max(normalizedMin + 1, Math.ceil(max));
      return { min: normalizedMin, max: normalizedMax };
    };

    const outboundHours = preparedFlights
      .map((f) => parseDurationToMinutes(f.outbound.totalJourneyTime || f.outbound.duration) / 60)
      .filter((v) => Number.isFinite(v));

    const inboundHours = preparedFlights
      .filter((f) => !!f.inbound)
      .map((f) => parseDurationToMinutes(f.inbound!.totalJourneyTime || f.inbound!.duration) / 60)
      .filter((v) => Number.isFinite(v));

    const outbound =
      outboundHours.length > 0
        ? clampBounds(Math.min(...outboundHours), Math.max(...outboundHours))
        : fallback.outbound;

    const inbound =
      inboundHours.length > 0
        ? clampBounds(Math.min(...inboundHours), Math.max(...inboundHours))
        : fallback.inbound;

    return { outbound, inbound };
  }, [preparedFlights]);

  // Align duration ranges to actual min/max (avoid 0-based slider)
  useEffect(() => {
    setFilterState((prev) => {
      const clampRange = (range: [number, number], bounds: { min: number; max: number }): [number, number] => {
        const lo = Math.max(bounds.min, Math.min(bounds.max, range[0]));
        const hi = Math.max(bounds.min, Math.min(bounds.max, range[1]));
        return lo <= hi ? [lo, hi] : [bounds.min, bounds.max];
      };

      const shouldResetOutbound =
        prev.journeyTimeOutbound[0] === 0 && prev.journeyTimeOutbound[1] === 35 && journeyTimeBounds.outbound.min > 0;

      const shouldResetInbound =
        prev.journeyTimeInbound[0] === 0 && prev.journeyTimeInbound[1] === 35 && journeyTimeBounds.inbound.min > 0;

      return {
        ...prev,
        journeyTimeOutbound: shouldResetOutbound
          ? [journeyTimeBounds.outbound.min, journeyTimeBounds.outbound.max]
          : clampRange(prev.journeyTimeOutbound, journeyTimeBounds.outbound),
        journeyTimeInbound: shouldResetInbound
          ? [journeyTimeBounds.inbound.min, journeyTimeBounds.inbound.max]
          : clampRange(prev.journeyTimeInbound, journeyTimeBounds.inbound),
      };
    });
  }, [journeyTimeBounds]);

  // Filter and Sort flights
  const filteredFlights = useMemo(() => {
    const filtered = filterFlights(preparedFlights, filterState);
    return sortFlights(filtered, sortBy);
  }, [preparedFlights, filterState, sortBy]);

  // Handler for loading more flights
  const handleLoadMore = () => {
    setDisplayedFlightsCount((prev) => Math.min(prev + 5, filteredFlights.length));
  };

  // Handler for package mode flight selection
  const handlePackageFlightSelect = (flight: typeof filteredFlights[0]) => {
    // Build URL with all package parameters for review page
    const params = new URLSearchParams(urlParams.toString());
    params.set("flightId", flight.id);
    router.push(`/packages/review?${params.toString()}`);
  };

  const activeLoading = isPackageMode ? packageFlightsLoading : loading;
  const activeError = isPackageMode ? packageFlightsError : error;

  // Inactivity: 30 minutes -> show fare expired popup
  useIdleTimer({
    timeoutMs: 30 * 60 * 1000,
    onIdle: () => setFareExpiredOpen(true),
  });

  // Show loading UI when processing a deeplink with flight key
  if (isDeeplinkLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <FlightSearchLoading
                showText={false}
                lottieClassName="w-[280px] max-w-full mx-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-[#010D50] mb-3">
              Loading Your Flight
            </h1>
            <p className="text-[#3A478A]">
              Please wait while we retrieve your selected flight details...
            </p>
            <div className="mt-6 flex justify-center gap-1">
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Search Header with Filter Button (includes SearchBar) */}
      <SearchHeader
        onFilterClick={() => setIsFilterSheetOpen(true)}
        resultCount={filteredFlights.length}
        showSearchBar={!isPackageMode}
      />

      {/* Package Mode: Step Progress */}
      {isPackageMode && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-7 pb-2">
          <PackageStepProgress currentStep="flight" />
          {/* Hotel/Stay Summary for package mode */}
          {packageHotelName && (
            <PackageStaySummary 
              hotelName={decodeURIComponent(packageHotelName)}
              checkIn={urlParams.get("checkIn") || urlParams.get("departureDate") || ""}
              checkOut={urlParams.get("checkOut") || urlParams.get("returnDate") || ""}
              guests={parseInt(urlParams.get("guests") || urlParams.get("adults") || "2")}
              adults={parseInt(urlParams.get("adults") || "2")}
              children={parseInt(urlParams.get("children") || "0")}
              infants={parseInt(urlParams.get("infants") || "0")}
              rooms={parseInt(urlParams.get("rooms") || "1")}
              price={selectedHotelRoomSummary?.total}
              currency={selectedHotelRoomSummary?.currency}
            />
          )}
        </div>
      )}

      {/* Date Price Selector - Show for one-way and round-trip only (not multi-city) */}
      {!isPackageMode && !activeError && departureDates.length > 0 && effectiveSearchParams.tripType !== 'multi-city' && (
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

      {/* Loading state during bootstrap, first fetch, and date changes */}
      {!isPackageMode && (!isInitialized || activeLoading || isDateChanging || (isInitialized && !activeLoading && flights.length === 0 && !hasAttemptedFetch)) && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <FlightSearchLoading showText={false} lottieClassName="w-[220px] max-w-full" />
            <p className="text-gray-600">{t('states.loading.title')}</p>
          </div>
        </div>
      )}

      {isPackageMode && activeLoading && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <FlightSearchLoading showText={false} lottieClassName="w-[220px] max-w-full" />
            <p className="text-gray-600">Loading package flight options...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {activeError && !activeLoading && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-1">{t('states.error.title')}</h3>
                <p className="text-red-800">{activeError.message}</p>
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
      {hasAttemptedFetch && !activeLoading && !activeError && effectiveFlights.length === 0 && (
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



      {/* Mobile Filter Sheet */}
      {!activeLoading && !activeError && !isDateChanging && <FilterSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        filterState={filterState}
        filters={effectiveFilters}
        showInboundLeg={showInboundLeg}
        journeyTimeBounds={journeyTimeBounds}
        timeBounds={timeBounds}
        originAirport={effectiveSearchParams.from}
        destinationAirport={effectiveSearchParams.to}
        originAirportName={airportNames.origin}
        destinationAirportName={airportNames.destination}
        availableStops={availableStops}
        expandedFilters={expandedFilters}
        onToggleExpand={toggleFilter}
        onToggleStop={toggleStop}
        onToggleAirline={toggleAirline}
        onToggleAllAirlines={toggleAllAirlines}
        onToggleDepartureAirport={toggleDepartureAirport}
        onToggleArrivalAirport={toggleArrivalAirport}
        onUpdatePrice={updatePriceRange}
        onUpdateDepartureTime={updateDepartureTime}
        onUpdateArrivalTime={updateArrivalTime}
        onUpdateJourneyTime={updateJourneyTime}
        onTimeTypeChange={updateTimeType}
        onToggleExtra={toggleExtra}
        resultCount={filteredFlights.length}
      />
      }
      {/* Main Content - Hide during date change; show when we have flights */}
      {!activeError && !isDateChanging && preparedFlights.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 pb-10">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Filters Sidebar - Desktop Only */}
            <div className="hidden lg:flex w-full lg:w-72 flex-col gap-5 order-3 lg:order-1">
              <SearchSummary />
              <FilterSidebar
                filterState={filterState}
                filters={effectiveFilters}
                showInboundLeg={showInboundLeg}
                journeyTimeBounds={journeyTimeBounds}
                timeBounds={timeBounds}
                originAirport={effectiveSearchParams.from}
                destinationAirport={effectiveSearchParams.to}
                originAirportName={airportNames.origin}
                destinationAirportName={airportNames.destination}
                availableStops={availableStops}
                expandedFilters={expandedFilters}
                onToggleExpand={toggleFilter}
                onToggleStop={toggleStop}
                onToggleAirline={toggleAirline}
                onToggleAllAirlines={toggleAllAirlines}
                onToggleDepartureAirport={toggleDepartureAirport}
                onToggleArrivalAirport={toggleArrivalAirport}
                onUpdatePrice={updatePriceRange}
                onUpdateDepartureTime={updateDepartureTime}
                onUpdateArrivalTime={updateArrivalTime}
                onUpdateJourneyTime={updateJourneyTime}
                onTimeTypeChange={updateTimeType}
                onToggleExtra={toggleExtra}
                resultCount={filteredFlights.length}
              />
            </div>

            {/* Flight Results */}
            <div className="flex-1 flex flex-col gap-3 order-2 lg:order-2 min-w-0 overflow-hidden">
              {filteredFlights.length > 0 ? (
                <>
                  {!isPackageMode && (
                    <FlightSortTabs
                      flights={filteredFlights}
                      activeTab={sortBy}
                      onTabChange={setSortBy}
                    />
                  )}
                  <FlightsList
                    flights={filteredFlights}
                    displayCount={displayedFlightsCount}
                    onLoadMore={handleLoadMore}
                    isPackageMode={isPackageMode}
                    onSelect={isPackageMode ? handlePackageFlightSelect : undefined}
                  />
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Flights Match Your Filters</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your filters to see more results</p>
                  <button
                    onClick={() => {
                      setFilterState({
                        stops: [],
                        priceRange: [effectiveFilters.minPrice, effectiveFilters.maxPrice],
                        departureTimeOutbound: [0, 24],
                        departureTimeInbound: [0, 24],
                        arrivalTimeOutbound: [0, 24],
                        arrivalTimeInbound: [0, 24],
                        timeFilterMode: 'takeoff',
                        journeyTimeOutbound: [journeyTimeBounds.outbound.min, journeyTimeBounds.outbound.max],
                        journeyTimeInbound: [journeyTimeBounds.inbound.min, journeyTimeBounds.inbound.max],
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
              )}
            </div>

            {/* Right Sidebar - Contact Card */}
            <div className="w-full lg:w-80 flex flex-col gap-5 order-1 lg:order-3">
              <ContactCard webRef={preparedFlights[0]?.webRef} />
            </div>
          </div>
        </div>
      )}

      <Footer />
      {/* Fare Expired Popup */}
      <Dialog open={fareExpiredOpen} onOpenChange={setFareExpiredOpen}>
        <DialogContent className="max-w-[min(100vw-24px,560px)] p-0 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Fare expired</DialogTitle>
          </DialogHeader>
          <ErrorMessage
            title="Your Fare Have Expired"
            message="Please refresh your search to get the latest availability and prices."
          />
        </DialogContent>
      </Dialog>
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
