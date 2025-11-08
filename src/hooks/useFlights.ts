/**
 * Custom hook for fetching and managing flights
 */

import { useState, useEffect, useCallback } from 'react';
import { Flight, SearchParams } from '@/types/flight';
import { flightService, FlightSearchResponse } from '@/services/api/flightService';

interface UseFlightsOptions {
  enabled?: boolean; // Whether to automatically fetch on mount
}

interface UseFlightsReturn {
  flights: Flight[];
  filters: FlightSearchResponse['filters'] | null;
  datePrices: FlightSearchResponse['datePrices'];
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlights = useCallback(async () => {
    if (!searchParams) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await flightService.searchFlights(searchParams);
      setFlights(response.flights);
      setFilters(response.filters);
      setDatePrices(response.datePrices);
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
    searchParams?.departureDate?.getTime(),
    searchParams?.returnDate?.getTime(),
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
    loading,
    error,
    refetch: fetchFlights,
  };
}
