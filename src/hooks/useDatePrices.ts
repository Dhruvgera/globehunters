/**
 * Custom hook for managing date prices with background fetching and lazy loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchParams } from '@/types/flight';
import { flightService, DatePrice } from '@/services/api/flightService';
import { flightCache } from '@/lib/cache/flightCache';
import { searchFlightsBatch as searchFlightsBatchAction } from '@/actions/flights/searchFlightsBatch';

// Staggering strategy for background date fetching
const DATE_SLIDER_STAGGER_MS = Number(process.env.NEXT_PUBLIC_DATE_SLIDER_STAGGER_MS || 500);
const DATE_SLIDER_CHUNK_SIZE = Number(process.env.NEXT_PUBLIC_DATE_SLIDER_CHUNK_SIZE || 2);

// Normalize date to midnight for safe comparisons
function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface UseDatePricesReturn {
  departureDates: DatePrice[];
  returnDates: DatePrice[];
  loading: boolean;
  error: Error | null;
  loadingIndices: Set<number>;
  fetchDatePrice: (index: number, type: 'departure' | 'return') => Promise<void>;
  fetchDatePricesBatch: (indices: number[], type: 'departure' | 'return') => Promise<void>;
  getDateFromIndex: (index: number, type: 'departure' | 'return') => Date | null;
}

interface DatePriceCacheEntry {
  date: string;
  price: number | null;
  hasData: boolean;
  loading: boolean;
  error: boolean;
}

interface DatePriceCache {
  [key: string]: DatePriceCacheEntry;
}

export function useDatePrices(
  searchParams: SearchParams | null,
  basePrice?: number | null
): UseDatePricesReturn {
  const [departureDates, setDepartureDates] = useState<DatePrice[]>([]);
  const [returnDates, setReturnDates] = useState<DatePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(new Set());
  
  const cacheRef = useRef<DatePriceCache>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const departureDatesRef = useRef<DatePrice[]>([]);
  const returnDatesRef = useRef<DatePrice[]>([]);
  const departureDateObjectsRef = useRef<Date[]>([]);
  const returnDateObjectsRef = useRef<Date[]>([]);
  
  // Keep refs in sync with state
  useEffect(() => {
    departureDatesRef.current = departureDates;
  }, [departureDates]);
  
  useEffect(() => {
    returnDatesRef.current = returnDates;
  }, [returnDates]);

  // Generate date array around selected date (±3 days = 7 total)
  const generateDateRange = useCallback((baseDate: Date, count: number = 7): Date[] => {
    const dates: Date[] = [];
    const centerIndex = Math.floor(count / 2);
    
    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + (i - centerIndex));
      dates.push(date);
    }
    
    return dates;
  }, []);

  // Format date for display
  const formatDateDisplay = useCallback((date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  }, []);

  // Generate cache key
  const getCacheKey = (date: Date, type: 'departure' | 'return'): string => {
    return `${type}-${date.toISOString().split('T')[0]}`;
  };

  // Fetch price for a specific date
  const fetchDatePrice = useCallback(async (index: number, type: 'departure' | 'return') => {
    if (!searchParams) return;
    // If we've been aborted (route changed/unmounted), do not start new work
    if (abortControllerRef.current?.signal.aborted) return;

    // Use refs to get current dates without causing re-renders
    const dates = type === 'departure' ? departureDatesRef.current : returnDatesRef.current;
    const dateObjects = type === 'departure' ? departureDateObjectsRef.current : returnDateObjectsRef.current;
    
    if (!dates[index] || !dateObjects[index]) return;

    const dateStr = dates[index].date;
    const dateObj = dateObjects[index];
    const cacheKey = getCacheKey(dateObj, type);
    const legacyKey = `${type}-${dateStr}`; // legacy key based on display string (buggy)

    // Deduplicate: if already loading, skip
    if (cacheRef.current[cacheKey]?.loading) {
      return;
    }

    // Constrain requests to valid windows:
    // - Return date must be >= selected departure date
    // - Departure date must be <= selected return date (when round-trip)
    const selectedDeparture = searchParams.departureDate ? normalizeDate(searchParams.departureDate) : null;
    const selectedReturn = searchParams.returnDate ? normalizeDate(searchParams.returnDate) : null;
    const candidate = normalizeDate(dateObj);
    // Enforce strict ordering for round-trip:
    // - return must be strictly after departure (candidate > selectedDeparture)
    // - departure must be strictly before return (candidate < selectedReturn)
    if ((type === 'return' && selectedDeparture && (candidate.getTime() <= selectedDeparture.getTime()))
      || (type === 'departure' && selectedReturn && (candidate.getTime() >= selectedReturn.getTime()))) {
      const fixedOther = type === 'return' ? selectedDeparture : selectedReturn;
      console.log(`[useDatePrices] SKIP ${type} date ${candidate.toISOString().slice(0,10)} vs fixed ${fixedOther?.toISOString().slice(0,10)} (violates ordering)`);
      // Mark as resolved (no data) to prevent repeat attempts
      cacheRef.current[cacheKey] = {
        date: dateStr,
        price: null,
        hasData: true,
        loading: false,
        error: false,
      };
      return;
    }

    {
      const fixedOther = type === 'return' ? selectedDeparture : selectedReturn;
      console.log(`[useDatePrices] FETCH ${type} date ${candidate.toISOString().slice(0,10)} with fixed ${fixedOther?.toISOString().slice(0,10) || 'N/A'}`);
    }

    // Check cache first - if already has data or error, skip
    if (cacheRef.current[cacheKey]?.hasData || cacheRef.current[cacheKey]?.error) {
      return;
    }
    // Backward-compat: if legacy key has data/error, migrate it and skip
    if (cacheRef.current[legacyKey]?.hasData || cacheRef.current[legacyKey]?.error) {
      cacheRef.current[cacheKey] = { ...cacheRef.current[legacyKey] };
      return;
    }

    // Mark as loading in cache
    cacheRef.current[cacheKey] = {
      date: dateStr,
      price: null,
      hasData: false,
      loading: true,
      error: false,
    };

    setLoadingIndices(prev => new Set([...prev, index]));

    try {
      // Bail out early if this request is no longer relevant
      if (abortControllerRef.current?.signal.aborted) return;
      // Create modified search params for this specific date
      const modifiedParams = {
        ...searchParams,
        [type === 'departure' ? 'departureDate' : 'returnDate']: dateObj
      };

      // Check global cache first to avoid redundant API calls
      let response = flightCache.get(modifiedParams);
      
      if (!response) {
        if (abortControllerRef.current?.signal.aborted) return;
        // Use low-priority batch action even for single date to avoid blocking critical actions
        const singleBatch = [{
          key: cacheKey,
          type,
          params: modifiedParams,
        }] as any;
        const results = await searchFlightsBatchAction(singleBatch);
        const res = results?.[0];
        if (res?.success) {
          response = res.response as any;
          try {
            // Store complete response in global cache for later use
            if (response) {
              flightCache.set(modifiedParams, response as any);
            }
          } catch {}
        } else {
          throw new Error(res?.error || 'Single date fetch failed');
        }
      } else {
        console.log(`[useDatePrices] Using cached data for ${type} date ${candidate.toISOString().slice(0,10)}`);
      }
      
      if (abortControllerRef.current?.signal.aborted) return;
      // Find minimum price from results
      let minPrice: number | null = null;
      if (!response) {
        throw new Error('No response data for single date fetch');
      }
      if (response.flights && response.flights.length > 0) {
        const minFlight = response.flights.reduce((min, flight) => 
          flight.pricePerPerson < min.pricePerPerson ? flight : min
        , response.flights[0]);
        minPrice = Math.round(minFlight.pricePerPerson);
      }

      // Update cache with success
      cacheRef.current[cacheKey] = {
        date: dateStr,
        price: minPrice,
        hasData: true,
        loading: false,
        error: false,
      };
      console.log(`[useDatePrices] DONE ${type} date ${candidate.toISOString().slice(0,10)} -> minPrice=${minPrice ?? 'null'}`);

      const updatedDate: DatePrice = {
        date: dateStr,
        price: minPrice || basePrice || 649,
      };

      // Update state using functional updates to avoid stale closures
      if (type === 'departure') {
        setDepartureDates(prev => {
          const newDates = [...prev];
          if (newDates[index]) {
            newDates[index] = updatedDate;
          }
          return newDates;
        });
      } else {
        setReturnDates(prev => {
          const newDates = [...prev];
          if (newDates[index]) {
            newDates[index] = updatedDate;
          }
          return newDates;
        });
      }
    } catch (err) {
      console.error('Error fetching date price:', err);
      // Mark as error in cache
      cacheRef.current[cacheKey] = {
        date: dateStr,
        price: null,
        hasData: false,
        loading: false,
        error: true,
      };
      console.log(`[useDatePrices] ERROR ${type} date ${candidate.toISOString().slice(0,10)}`);
    } finally {
      setLoadingIndices(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  }, [searchParams, basePrice]);

  // Fetch prices for multiple dates with controlled concurrency (prioritize nearest first, staggered)
  const fetchDatePricesBatch = useCallback(async (indices: number[], type: 'departure' | 'return') => {
    if (!searchParams || indices.length === 0) return;
    if (abortControllerRef.current?.signal.aborted) return;

    const dates = type === 'departure' ? departureDatesRef.current : returnDatesRef.current;
    const dateObjects = type === 'departure' ? departureDateObjectsRef.current : returnDateObjectsRef.current;

    // Filter out dates that are already cached, have errors, or are currently loading
    let indicesToFetch = indices.filter(index => {
      if (!dates[index] || !dateObjects[index]) return false;
      const dateStr = dates[index].date;
      const dateObj = dateObjects[index];
      const cacheKey = getCacheKey(dateObj, type);
      const legacyKey = `${type}-${dateStr}`;
      const cacheEntry = cacheRef.current[cacheKey] || cacheRef.current[legacyKey];

      // Enforce valid windows before considering fetch
      const selectedDeparture = searchParams.departureDate ? normalizeDate(searchParams.departureDate) : null;
      const selectedReturn = searchParams.returnDate ? normalizeDate(searchParams.returnDate) : null;
      const candidate = normalizeDate(dateObj);
      if ((type === 'return' && selectedDeparture && (candidate.getTime() <= selectedDeparture.getTime()))
        || (type === 'departure' && selectedReturn && (candidate.getTime() >= selectedReturn.getTime()))) {
        const fixedOther = type === 'return' ? selectedDeparture : selectedReturn;
        console.log(`[useDatePrices] SKIP ${type} date ${candidate.toISOString().slice(0,10)} vs fixed ${fixedOther?.toISOString().slice(0,10)} (violates ordering)`);
        // Pre-mark as resolved to avoid future attempts
        cacheRef.current[cacheKey] = cacheRef.current[cacheKey] || {
          date: dateStr,
          price: null,
          hasData: true,
          loading: false,
          error: false,
        };
        return false;
      }

      // Skip if already loading
      if (cacheEntry?.loading) return false;
      return !cacheEntry?.hasData && !cacheEntry?.error && !loadingIndices.has(index);
    });

    if (indicesToFetch.length === 0) return;

    // Prioritize indices closest to the selected date (center index)
    const centerIndex = Math.floor(dates.length / 2);
    indicesToFetch = [...indicesToFetch].sort((a, b) => {
      const da = Math.abs(a - centerIndex);
      const db = Math.abs(b - centerIndex);
      return da - db;
    });

    // Helper: sleep
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Chunk the work to avoid hogging concurrency
    for (let start = 0; start < indicesToFetch.length; start += DATE_SLIDER_CHUNK_SIZE) {
      if (abortControllerRef.current?.signal.aborted) return;

      const chunk = indicesToFetch.slice(start, start + DATE_SLIDER_CHUNK_SIZE);

      // Build batch payload for server action (for this chunk only)
      const batchItems = chunk.map((index) => {
        const dateStr = dates[index].date;
        const dateObj = dateObjects[index];
        const cacheKey = getCacheKey(dateObj, type);
        const modifiedParams = {
          ...searchParams,
          [type === 'departure' ? 'departureDate' : 'returnDate']: dateObj
        };
        // Mark as loading in cache and UI
        cacheRef.current[cacheKey] = {
          date: dateStr,
          price: null,
          hasData: false,
          loading: true,
          error: false,
        };
        return {
          key: cacheKey,
          type,
          params: modifiedParams,
        };
      });
      setLoadingIndices(prev => new Set([...prev, ...chunk]));

      try {
        const results = await searchFlightsBatchAction(batchItems as any);
        if (abortControllerRef.current?.signal.aborted) return;

        for (const res of results) {
          // Find the index back from the key
          const key = res.key;
          const isDeparture = res.type === 'departure';
          const arrDates = isDeparture ? departureDatesRef.current : returnDatesRef.current;
          const dateObjectsArr = isDeparture ? departureDateObjectsRef.current : returnDateObjectsRef.current;
          // Locate index by matching ISO date in key
          let idx = -1;
          for (let i = 0; i < dateObjectsArr.length; i++) {
            const k = getCacheKey(dateObjectsArr[i], res.type);
            if (k === key) { idx = i; break; }
          }
          if (idx === -1) continue;
          const dateStr = arrDates[idx]?.date;
          if (!dateStr) continue;

          if (res.success) {
            // Populate global flight cache with full response for this date
            if (res.response) {
              const modifiedParams = {
                ...searchParams,
                [isDeparture ? 'departureDate' : 'returnDate']: dateObjectsArr[idx]
              };
              try {
                flightCache.set(modifiedParams, res.response as any);
              } catch {}
            }

            cacheRef.current[key] = {
              date: dateStr,
              price: res.minPrice,
              hasData: true,
              loading: false,
              error: false,
            };
            const updated: DatePrice = {
              date: dateStr,
              price: (res.minPrice ?? basePrice ?? 649) as number,
            };
            if (isDeparture) {
              setDepartureDates(prev => {
                const next = [...prev];
                if (next[idx]) next[idx] = updated;
                return next;
              });
            } else {
              setReturnDates(prev => {
                const next = [...prev];
                if (next[idx]) next[idx] = updated;
                return next;
              });
            }
          } else {
            cacheRef.current[key] = {
              date: dateStr,
              price: null,
              hasData: false,
              loading: false,
              error: true,
            };
          }
          setLoadingIndices(prev => {
            const next = new Set(prev);
            next.delete(idx);
            return next;
          });
        }
      } catch (err) {
        console.error('Error in batch date fetch:', err);
        // On failure, clear loading flags for only this chunk
        setLoadingIndices(prev => {
          const next = new Set(prev);
          chunk.forEach(i => next.delete(i));
          return next;
        });
      }

      // Stagger next chunk to free up capacity for critical actions
      if (start + DATE_SLIDER_CHUNK_SIZE < indicesToFetch.length) {
        await sleep(DATE_SLIDER_STAGGER_MS);
      }
    }
  }, [searchParams, basePrice]);

  // Initialize dates based on search params
  useEffect(() => {
    if (!searchParams) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Generate departure dates (7 days: ±3 from selected)
      const departureDateRange = generateDateRange(searchParams.departureDate, 7);
      departureDateObjectsRef.current = departureDateRange;
      
      const departureDatePrices: DatePrice[] = departureDateRange.map((date, index) => {
        const dateStr = formatDateDisplay(date);
        const cacheKey = getCacheKey(date, 'departure');
        
        // Check if we have cached price
        const cachedEntry = cacheRef.current[cacheKey];
        if (cachedEntry?.hasData && cachedEntry.price !== null) {
          return { date: dateStr, price: cachedEntry.price };
        }
        
        // For the currently selected date (middle index), use actual price from search results
        const isSelectedDate = index === Math.floor(departureDateRange.length / 2);
        
        if (isSelectedDate && basePrice) {
          // Selected date: Use actual price and mark as loaded to prevent fetching
          const actualDatePrice = { date: dateStr, price: Math.round(basePrice) };
          cacheRef.current[cacheKey] = {
            date: dateStr,
            price: Math.round(basePrice),
            hasData: true,
            loading: false,
            error: false,
          };
          return actualDatePrice;
        }
        
        // Other dates: Use basePrice as estimate
        const price = Math.round(basePrice || 649);
        return { date: dateStr, price };
      });

      setDepartureDates(departureDatePrices);

      // Generate return dates if round trip (7 days: ±3 from selected)
      if (searchParams.tripType === 'round-trip' && searchParams.returnDate) {
        const returnDateRange = generateDateRange(searchParams.returnDate, 7);
        returnDateObjectsRef.current = returnDateRange;
        
        const returnDatePrices: DatePrice[] = returnDateRange.map((date, index) => {
          const dateStr = formatDateDisplay(date);
          const cacheKey = getCacheKey(date, 'return');
          
          const cachedEntry = cacheRef.current[cacheKey];
          if (cachedEntry?.hasData && cachedEntry.price !== null) {
            return { date: dateStr, price: cachedEntry.price };
          }
          
          // For the currently selected date (middle index), use actual price from search results
          const isSelectedDate = index === Math.floor(returnDateRange.length / 2);
          
          if (isSelectedDate && basePrice) {
            // Selected date: Use actual price and mark as loaded to prevent fetching
            const actualDatePrice = { date: dateStr, price: Math.round(basePrice) };
            cacheRef.current[cacheKey] = {
              date: dateStr,
              price: Math.round(basePrice),
              hasData: true,
              loading: false,
              error: false,
            };
            return actualDatePrice;
          }
          
          // Other dates: Use basePrice as estimate
          const price = Math.round(basePrice || 649);
          return { date: dateStr, price };
        });

        setReturnDates(returnDatePrices);
      } else {
        setReturnDates([]);
        returnDateObjectsRef.current = [];
      }

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate date prices'));
    } finally {
      setLoading(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams?.departureDate?.getTime(), 
    searchParams?.returnDate?.getTime(), 
    searchParams?.tripType,
    basePrice
  ]);

  // Get actual Date object from index
  const getDateFromIndex = useCallback((index: number, type: 'departure' | 'return'): Date | null => {
    const dateObjects = type === 'departure' ? departureDateObjectsRef.current : returnDateObjectsRef.current;
    return dateObjects[index] || null;
  }, []);

  return {
    departureDates,
    returnDates,
    loading,
    error,
    loadingIndices,
    fetchDatePrice,
    fetchDatePricesBatch,
    getDateFromIndex,
  };
}
