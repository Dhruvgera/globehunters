/**
 * Custom hook for fetching and managing flights
 */

import { useState, useEffect, useCallback } from 'react';
import { Flight, SearchParams } from '@/types/flight';
import { flightService, FlightSearchResponse } from '@/services/api/flightService';
import { flightCache } from '@/lib/cache/flightCache';

// Helper to safely get timestamp from a date that might be a string or Date
function getTimestamp(date: Date | string | undefined | null): number | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date.getTime();
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? undefined : parsed.getTime();
}

interface UseFlightsOptions {
  enabled?: boolean; // Whether to automatically fetch on mount
}

interface UseFlightsReturn {
  flights: Flight[];
  filters: FlightSearchResponse['filters'] | null;
  datePrices: FlightSearchResponse['datePrices'];
  requestId: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFlights(
  searchParams: SearchParams | null,
  options: UseFlightsOptions = {}
): UseFlightsReturn {
  const { enabled = true } = options;

  const [flights, setFlights] = useState<Flight[]>([]);
  const [filters, setFilters] = useState<FlightSearchResponse['filters'] | null>(null);
  const [datePrices, setDatePrices] = useState<FlightSearchResponse['datePrices']>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlights = useCallback(async () => {
    if (!searchParams) {
      return;
    }

    // Always set loading to true first to show UI update
    setLoading(true);
    setError(null);

    // Check cache first
    const cachedData = flightCache.get(searchParams);
    if (cachedData) {
      console.log('🚀 Using cached flight data - no API call needed!');
      // Use setTimeout to ensure loading state shows briefly (prevents UI flickering)
      setTimeout(() => {
        setFlights(cachedData.flights);
        setFilters(cachedData.filters);
        setDatePrices(cachedData.datePrices);
        setRequestId(cachedData.requestId || null);
        setLoading(false);
      }, 100); // 100ms delay to show transition
      return;
    }

    try {
      console.log('🌐 Fetching fresh flight data from API...');
      const response = await flightService.searchFlights(searchParams);
      
      // Store in cache for future use
      flightCache.set(searchParams, response);
      
      setFlights(response.flights);
      setFilters(response.filters);
      setDatePrices(response.datePrices);
      setRequestId(response.requestId || null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch flights');
      setError(error);
      console.error('Error fetching flights:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (enabled && searchParams) {
      fetchFlights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams?.from,
    searchParams?.to,
    getTimestamp(searchParams?.departureDate),
    getTimestamp(searchParams?.returnDate),
    searchParams?.passengers?.adults,
    searchParams?.passengers?.children,
    searchParams?.passengers?.infants,
    searchParams?.class,
    searchParams?.tripType,
    enabled
  ]);

  return {
    flights,
    filters,
    datePrices,
    requestId,
    loading,
    error,
    refetch: fetchFlights,
  };
}
