"use client";

import { useState, Suspense, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plane, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useFlights } from "@/hooks/useFlights";
import { useDatePrices } from "@/hooks/useDatePrices";
import { useBookingStore } from "@/store/bookingStore";
import { filterFlights, parseDurationToMinutes, sortFlights, countByStops, getTimeBounds } from "@/utils/flightFilter";
import { airportCache } from "@/lib/cache/airportCache";
import { shortenAirportName } from "@/lib/vyspa/utils";
import { normalizeCabinClass } from "@/lib/utils";
import { FilterState, SearchParams } from "@/types/flight";
import { mockFlights, mockDatePrices, mockAirlines, mockAirports } from "@/data/mockFlights";
import { useFilterExpansion } from "@/hooks/useFilterExpansion";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAffiliate } from "@/lib/AffiliateContext";

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
  const router = useRouter();
  const setStoreSearchParams = useBookingStore((state) => state.setSearchParams);
  const storeSearchParams = useBookingStore((state) => state.searchParams);
  const setSearchRequestId = useBookingStore((state) => state.setSearchRequestId);
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
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

  // Handle flight deeplink parameter - redirect directly to booking
  useEffect(() => {
    const flightKey = urlParams.get('flight');

    if (flightKey) {
      // This is a deeplink with a pre-selected flight - redirect to booking
      setIsDeeplinkLoading(true);

      // Mark this as a deeplink flow
      setIsFromDeeplink(true);

      // Extract tracking data
      const affCode = urlParams.get('aff');
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');
      const cnc = urlParams.get('cnc');

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
    if (urlParams.get('flight')) return;

    const affCode = urlParams.get('aff');
    const utmSource = urlParams.get('utm_source');

    // Prioritize aff code, fall back to utm_source
    const affiliateCode = affCode || utmSource;
    if (affiliateCode) {
      setAffiliateCode(affiliateCode);
      console.log('Affiliate code detected in search URL:', affiliateCode);
    }

    // Store UTM params in sessionStorage for persistence
    if (typeof window !== 'undefined') {
      if (utmSource) sessionStorage.setItem('utm_source', utmSource);
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');
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
    const from = urlParams.get('from');
    const to = urlParams.get('to');
    const departureDate = urlParams.get('departureDate');
    const returnDate = urlParams.get('returnDate');
    const adults = urlParams.get('adults');
    const children = urlParams.get('children');
    const infants = urlParams.get('infants');
    const travelClass = urlParams.get('class');
    const tripType = urlParams.get('tripType') as SearchParams['tripType'] | null;

    if (tripType === 'multi-city') {
      const segments: SearchParams['segments'] = [];

      // Support both from/to/departureDate and from1/to1/departureDate1 for first leg
      const firstFrom = urlParams.get('from1') || from;
      const firstTo = urlParams.get('to1') || to;
      const firstDeparture = urlParams.get('departureDate1') || departureDate;

      if (firstFrom && firstTo && firstDeparture) {
        segments.push({
          from: firstFrom,
          to: firstTo,
          departureDate: parseDateFromURL(firstDeparture),
        });
      }

      // Parse additional legs up to 6
      for (let i = 2; i <= 6; i++) {
        const segFrom = urlParams.get(`from${i}`);
        const segTo = urlParams.get(`to${i}`);
        const segDate = urlParams.get(`departureDate${i}`);
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
    { enabled: isInitialized }
  );

  // Store requestId in booking store when flights are fetched
  useEffect(() => {
    if (requestId) {
      setSearchRequestId(requestId);
    }
  }, [requestId, setSearchRequestId]);

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
    const baseFilters = apiFilters || {
      airlines: loading ? [] : mockAirlines,
      departureAirports: loading ? [] : mockAirports.departure,
      arrivalAirports: loading ? [] : mockAirports.arrival,
      minPrice: 400,
      maxPrice: 1200,
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
  }, [apiFilters, loading, resolvedAirportNames]);

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
    arrivalTimeOutbound: [0, 24],
    arrivalTimeInbound: [0, 24],
    timeFilterMode: 'takeoff',
    journeyTimeOutbound: [0, 35],
    journeyTimeInbound: [0, 35],
    departureAirports: [],
    arrivalAirports: [],
    airlines: [],
    extras: [],
  });

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
    const sorted = sortFlights(effectiveFlights, 'price-asc');

    // If cache has loaded (indicated by resolvedAirportNames), enrich flight airport names
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
  }, [effectiveFlights, resolvedAirportNames, effectiveSearchParams.from]);

  // Compute available stops from flights (for hiding unavailable filter options)
  const availableStops = useMemo(() => {
    return countByStops(preparedFlights);
  }, [preparedFlights]);

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
      setFilterState({
        stops: [0, 1, 2],
        priceRange: [0, 2000],
        departureTimeOutbound: [0, 24],
        departureTimeInbound: [0, 24],
        arrivalTimeOutbound: [0, 24],
        arrivalTimeInbound: [0, 24],
        timeFilterMode: 'takeoff',
        journeyTimeOutbound: [0, 35],
        journeyTimeInbound: [0, 35],
        departureAirports: [],
        arrivalAirports: [],
        airlines: [],
        extras: [],
      });
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
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto bg-[rgba(55,84,237,0.1)] rounded-full flex items-center justify-center">
                <Plane className="w-10 h-10 text-[#3754ED] animate-pulse" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-24 h-24 text-[#3754ED]/20 animate-spin" />
              </div>
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



      {/* Mobile Filter Sheet */}
      {!loading && !error && !isDateChanging && <FilterSheet
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
      {!error && !isDateChanging && preparedFlights.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Filters Sidebar - Desktop Only */}
            <div className="hidden lg:flex w-full lg:w-72 flex-col gap-4 order-3 lg:order-1">
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
            <div className="flex-1 flex flex-col gap-2 order-2 lg:order-2 min-w-0 overflow-hidden">
              {filteredFlights.length > 0 ? (
                <>
                  <FlightSortTabs
                    flights={filteredFlights}
                    activeTab={sortBy}
                    onTabChange={setSortBy}
                  />
                  <FlightsList
                    flights={filteredFlights}
                    displayCount={displayedFlightsCount}
                    onLoadMore={handleLoadMore}
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
                        stops: [0, 1, 2],
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
            <div className="w-full lg:w-80 flex flex-col gap-4 order-1 lg:order-3">
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
