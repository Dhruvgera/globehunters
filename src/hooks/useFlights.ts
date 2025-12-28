/**
 * Custom hook for fetching and managing flights
 */

import { useState, useEffect, useCallback } from 'react';
import { Flight, SearchParams } from '@/types/flight';
import { flightService, FlightSearchResponse } from '@/services/api/flightService';
import { flightCache } from '@/lib/cache/flightCache';
import { useBookingStore } from '@/store/bookingStore';

// Helper to safely get timestamp from a date that might be a string or Date
function getTimestamp(date: Date | string | undefined | null): number | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date.getTime();
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? undefined : parsed.getTime();
}

interface UseFlightsOptions {
  enabled?: boolean; // Whether to automatically fetch on mount
  requestId?: string | null; // Optional request ID to restore previous search session
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
  const { enabled = true, requestId: explicitRequestId } = options;

  const affiliateCodeFromStore = useBookingStore((s) => s.affiliateData?.code);
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

    // Check cache first (pass explicitRequestId if available)
    // Note: flightCache is separate from FlightService's cache, maybe we should update it too?
    // FlightService manages its own cache, so calling flightService.searchFlights will hit that.
    // flightCache imported here seems to be a separate util.
    // Let's rely on flightService caching logic primarily, or use flightCache if we want client-side caching.
    // However, if we use explicitRequestId, we should probably bypass simple params-based cache
    // unless the cache key includes the ID.
    // For now, let's proceed to flightService call which we updated to handle requestId caching.
    
    try {
      console.log('🌐 Fetching fresh flight data from API...', explicitRequestId ? `(Using Request ID: ${explicitRequestId})` : '');

      // Affiliate code should persist across the whole journey, including requestId restores.
      // Prefer Zustand (runtime), fall back to sessionStorage (persistence across reloads).
      const affiliateCode =
        affiliateCodeFromStore ||
        (typeof window !== 'undefined'
          ? (sessionStorage.getItem('affiliate_code') ||
              sessionStorage.getItem('utm_source') ||
              undefined)
          : undefined);

      const response = await flightService.searchFlights(
        searchParams,
        explicitRequestId || undefined,
        affiliateCode || undefined
      );
      
      // Store in cache for future use (if we want client-side persistence beyond service instance)
      // flightCache.set(searchParams, response); // existing cache might not handle requestId
      
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
  }, [searchParams, explicitRequestId, affiliateCodeFromStore]);

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
    enabled,
    explicitRequestId // Add explicitRequestId dependency
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
