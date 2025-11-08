/**
 * Custom hook for managing date prices with background fetching and lazy loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchParams } from '@/types/flight';
import { flightService, DatePrice } from '@/services/api/flightService';

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

    // Use refs to get current dates without causing re-renders
    const dates = type === 'departure' ? departureDatesRef.current : returnDatesRef.current;
    const dateObjects = type === 'departure' ? departureDateObjectsRef.current : returnDateObjectsRef.current;
    
    if (!dates[index] || !dateObjects[index]) return;

    const dateStr = dates[index].date;
    const dateObj = dateObjects[index];
    const cacheKey = `${type}-${dateStr}`;

    // Check cache first - if already has data or error, skip
    if (cacheRef.current[cacheKey]?.hasData || cacheRef.current[cacheKey]?.error) {
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
      // Create modified search params for this specific date
      const modifiedParams = {
        ...searchParams,
        [type === 'departure' ? 'departureDate' : 'returnDate']: dateObj
      };

      // Fetch actual flights for this date
      const response = await flightService.searchFlights(modifiedParams);
      
      // Find minimum price from results
      let minPrice: number | null = null;
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
    } finally {
      setLoadingIndices(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  }, [searchParams, basePrice]);

  // Fetch prices for multiple dates with staggered delays (travcart-style with 500ms delays)
  const fetchDatePricesBatch = useCallback(async (indices: number[], type: 'departure' | 'return') => {
    if (!searchParams || indices.length === 0) return;

    const dates = type === 'departure' ? departureDatesRef.current : returnDatesRef.current;
    const dateObjects = type === 'departure' ? departureDateObjectsRef.current : returnDateObjectsRef.current;

    // Filter out dates that are already cached, have errors, or are currently loading
    const indicesToFetch = indices.filter(index => {
      if (!dates[index] || !dateObjects[index]) return false;
      const dateStr = dates[index].date;
      const cacheKey = `${type}-${dateStr}`;
      const cacheEntry = cacheRef.current[cacheKey];
      return !cacheEntry?.hasData && !cacheEntry?.error && !loadingIndices.has(index);
    });

    if (indicesToFetch.length === 0) return;

    console.log(`[useDatePrices] Queueing ${indicesToFetch.length} ${type} dates for staggered fetch`);

    // Staggered fetching with 500ms delays (like travcart)
    indicesToFetch.forEach((index, arrayIndex) => {
      setTimeout(async () => {
        const dateObj = dateObjects[index];
        const dateStr = dates[index].date;
        const cacheKey = `${type}-${dateStr}`;

        // Double-check cache before fetching
        if (cacheRef.current[cacheKey]?.hasData || cacheRef.current[cacheKey]?.error) {
          return;
        }

        // Mark as loading
        cacheRef.current[cacheKey] = {
          date: dateStr,
          price: null,
          hasData: false,
          loading: true,
          error: false,
        };

        setLoadingIndices(prev => new Set([...prev, index]));

        try {
          // Create modified search params for this specific date
          const modifiedParams = {
            ...searchParams,
            [type === 'departure' ? 'departureDate' : 'returnDate']: dateObj
          };

          // Fetch actual flights for this date
          const response = await flightService.searchFlights(modifiedParams);
          
          // Find minimum price from results
          let minPrice: number | null = null;
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

          const updatedDate: DatePrice = {
            date: dateStr,
            price: minPrice || basePrice || 649,
          };

          // Update state
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
          console.error(`Error fetching price for ${type} date ${dateStr}:`, err);
          
          // Mark as error in cache
          cacheRef.current[cacheKey] = {
            date: dateStr,
            price: null,
            hasData: false,
            loading: false,
            error: true,
          };
        } finally {
          setLoadingIndices(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
          });
        }
      }, arrayIndex * 500); // 500ms delay between each request
    });
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
