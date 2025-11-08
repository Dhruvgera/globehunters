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
  getDateFromIndex: (index: number, type: 'departure' | 'return') => Date | null;
}

interface DatePriceCache {
  [key: string]: DatePrice;
}

export function useDatePrices(
  searchParams: SearchParams | null
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

  // Generate date array around selected date
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
    if (!dates[index]) return;

    const dateStr = dates[index].date;
    const cacheKey = `${type}-${dateStr}`;

    // Check cache first
    if (cacheRef.current[cacheKey]) {
      return;
    }

    setLoadingIndices(prev => new Set([...prev, index]));

    try {
      // Simulate API call - in real implementation, call actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate random price variation
      const basePrice = 649;
      const variation = Math.floor(Math.random() * 200) - 100;
      const price = basePrice + variation;

      const updatedDate: DatePrice = {
        date: dateStr,
        price,
      };

      // Update cache
      cacheRef.current[cacheKey] = updatedDate;

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
    } finally {
      setLoadingIndices(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  }, [searchParams]);

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
      // Generate departure dates
      const departureDateRange = generateDateRange(searchParams.departureDate, 7);
      departureDateObjectsRef.current = departureDateRange;
      
      const departureDatePrices: DatePrice[] = departureDateRange.map((date, index) => {
        const dateStr = formatDateDisplay(date);
        const cacheKey = getCacheKey(date, 'departure');
        
        // Check if we have cached price
        if (cacheRef.current[cacheKey]) {
          return cacheRef.current[cacheKey];
        }
        
        // Generate initial estimated price
        const basePrice = 649;
        const variation = Math.floor(Math.random() * 150) - 75;
        const price = basePrice + variation;
        
        return { date: dateStr, price };
      });

      setDepartureDates(departureDatePrices);

      // Generate return dates if round trip
      if (searchParams.tripType === 'round-trip' && searchParams.returnDate) {
        const returnDateRange = generateDateRange(searchParams.returnDate, 7);
        returnDateObjectsRef.current = returnDateRange;
        
        const returnDatePrices: DatePrice[] = returnDateRange.map((date, index) => {
          const dateStr = formatDateDisplay(date);
          const cacheKey = getCacheKey(date, 'return');
          
          if (cacheRef.current[cacheKey]) {
            return cacheRef.current[cacheKey];
          }
          
          const basePrice = 649;
          const variation = Math.floor(Math.random() * 150) - 75;
          const price = basePrice + variation;
          
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
    searchParams?.tripType
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
    getDateFromIndex,
  };
}
