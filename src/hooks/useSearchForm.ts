import { useState, useEffect, useRef } from "react";
import type { Airport } from "@/types/airport";
import { useBookingStore } from "@/store/bookingStore";
import { airportCache } from "@/lib/cache/airportCache";

type TripType = "round-trip" | "one-way" | "multi-city";

interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

interface MultiCitySegmentState {
  from: Airport | null;
  to: Airport | null;
  departureDate?: Date;
}

export function useSearchForm() {
  const searchParamsFromStore = useBookingStore((state) => state.searchParams);
  const hasInitializedRef = useRef(false);
  const lastStoreVersionRef = useRef<string>('');

  // Helper to safely get timestamp from a date that might be a string or Date
  const getTimestamp = (date: Date | string | undefined | null): number | undefined => {
    if (!date) return undefined;
    if (date instanceof Date) return date.getTime();
    // If it's a string, parse it
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? undefined : parsed.getTime();
  };

  // Helper to ensure a date value is a Date object
  const ensureDate = (date: Date | string | undefined | null): Date | undefined => {
    if (!date) return undefined;
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  // Generate a version key from store params to detect changes
  const getStoreVersion = (params: typeof searchParamsFromStore) => {
    if (!params) return '';
    return JSON.stringify({
      from: params.from,
      to: params.to,
      departureDate: getTimestamp(params.departureDate),
      returnDate: getTimestamp(params.returnDate),
      class: params.class,
      tripType: params.tripType,
      adults: params.passengers?.adults,
      children: params.passengers?.children,
      infants: params.passengers?.infants,
    });
  };

  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [from, setFrom] = useState<Airport | null>(null);
  const [to, setTo] = useState<Airport | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState<Passengers>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [travelClass, setTravelClass] = useState("Economy");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [multiCitySegments, setMultiCitySegments] = useState<MultiCitySegmentState[]>([
    { from: null, to: null, departureDate: undefined },
    { from: null, to: null, departureDate: undefined },
  ]);

  // Sync with store when it changes (for page refresh scenario)
  useEffect(() => {
    const currentVersion = getStoreVersion(searchParamsFromStore);
    const hasVersionChanged = currentVersion !== lastStoreVersionRef.current;

    // Initialize or re-sync when store data changes
    if (searchParamsFromStore && (!hasInitializedRef.current || hasVersionChanged)) {
      hasInitializedRef.current = true;
      lastStoreVersionRef.current = currentVersion;

      const buildAirport = (code?: string | null): Airport | null => {
        if (!code) return null;
        // Try to get from cache first for better display
        const cached = airportCache.getAirportByCode(code);
        if (cached) return cached;

        return {
          code,
          city: code,
          country: '',
          countryCode: '',
        };
      };

      if (searchParamsFromStore.tripType === 'multi-city' && searchParamsFromStore.segments?.length) {
        const segmentsFromStore: MultiCitySegmentState[] = searchParamsFromStore.segments.map((seg) => ({
          from: buildAirport(seg.from),
          to: buildAirport(seg.to),
          departureDate: seg.departureDate ? new Date(seg.departureDate) : undefined,
        }));

        // Ensure at least two rows for UX, similar to Skyscanner/Kayak
        while (segmentsFromStore.length < 2) {
          segmentsFromStore.push({ from: null, to: null, departureDate: undefined });
        }

        setMultiCitySegments(segmentsFromStore);

        const first = segmentsFromStore[0];
        setFrom(first?.from || null);
        setTo(first?.to || null);
        setDepartureDate(first?.departureDate);
        setReturnDate(undefined);
      } else {
        // Create Airport objects from codes (minimal info, will be enriched by autocomplete)
        if (searchParamsFromStore.from) {
          setFrom(buildAirport(searchParamsFromStore.from));
        }
        if (searchParamsFromStore.to) {
          setTo(buildAirport(searchParamsFromStore.to));
        }
        if (searchParamsFromStore.departureDate) {
          // Ensure date is a Date object (might be string from sessionStorage)
          setDepartureDate(ensureDate(searchParamsFromStore.departureDate));
        }
        if (searchParamsFromStore.returnDate) {
          // Ensure date is a Date object (might be string from sessionStorage)
          setReturnDate(ensureDate(searchParamsFromStore.returnDate));
        }
        // Reset multi-city rows to empty defaults when switching away
        setMultiCitySegments([
          { from: null, to: null, departureDate: undefined },
          { from: null, to: null, departureDate: undefined },
        ]);
      }
      if (searchParamsFromStore.passengers) {
        setPassengers(searchParamsFromStore.passengers);
      }
      if (searchParamsFromStore.class) {
        setTravelClass(searchParamsFromStore.class);
      }
      if (searchParamsFromStore.tripType) {
        setTripType(searchParamsFromStore.tripType as TripType);
      }
    }
  }, [searchParamsFromStore]); // React to store changes

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const addMultiCitySegment = () => {
    setMultiCitySegments((prev) => {
      if (prev.length >= 6) return prev; // API supports up to 6 segments
      return [...prev, { from: null, to: null, departureDate: undefined }];
    });
  };

  const removeMultiCitySegment = (index: number) => {
    setMultiCitySegments((prev) => {
      if (prev.length <= 2) return prev; // Keep at least two segments for UX
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const updateMultiCitySegment = (
    index: number,
    updates: Partial<MultiCitySegmentState>
  ) => {
    setMultiCitySegments((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const getSearchParams = () => {
    // Helper to format date as YYYY-MM-DD (date-only, no timezone issues)
    const formatDateForURL = (date: Date | undefined): string => {
      if (!date) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const common = {
      adults: passengers.adults.toString(),
      children: passengers.children.toString(),
      infants: passengers.infants.toString(),
      class: travelClass,
      tripType,
    };

    if (tripType === 'multi-city') {
      // Build per-leg query parameters: from1/to1/departureDate1, from2/to2/departureDate2, etc.
      const segmentsForUrl = multiCitySegments
        .map((seg, index) => {
          const fromCode = seg.from?.code || "";
          const toCode = seg.to?.code || "";
          const dep = formatDateForURL(seg.departureDate);
          if (!fromCode || !toCode || !dep) return null;
          const legIndex = index + 1;
          return {
            [`from${legIndex}`]: fromCode,
            [`to${legIndex}`]: toCode,
            [`departureDate${legIndex}`]: dep,
          } as Record<string, string>;
        })
        .filter((entry): entry is Record<string, string> => entry !== null)
        .reduce<Record<string, string>>((acc, cur) => ({ ...acc, ...cur }), {});

      const firstLeg = multiCitySegments[0];

      return {
        from: firstLeg?.from?.code || from?.code || "",
        to: firstLeg?.to?.code || to?.code || "",
        departureDate: formatDateForURL(firstLeg?.departureDate || departureDate),
        returnDate: "", // Multi-city uses per-leg dates, no single returnDate
        ...common,
        ...segmentsForUrl,
      };
    }

    return {
      from: from?.code || "",
      to: to?.code || "",
      departureDate: formatDateForURL(departureDate),
      // For one-way trips, explicitly exclude return date to ensure fresh search
      returnDate: tripType === 'one-way' ? "" : formatDateForURL(returnDate),
      ...common,
    };
  };

  return {
    // State
    tripType,
    from,
    to,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    isDatePickerOpen,
    multiCitySegments,
    // Setters
    setTripType,
    setFrom,
    setTo,
    setDepartureDate,
    setReturnDate,
    setPassengers,
    setTravelClass,
    setIsDatePickerOpen,
    addMultiCitySegment,
    removeMultiCitySegment,
    updateMultiCitySegment,
    // Helpers
    swapLocations,
    getSearchParams,
  };
}
