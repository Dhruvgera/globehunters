/**
 * Custom hook for fetching flight details by ID
 */

import { useState, useEffect } from 'react';
import { Flight } from '@/types/flight';
import { flightService } from '@/services/api/flightService';

interface UseFlightDetailsOptions {
  enabled?: boolean;
}

interface UseFlightDetailsReturn {
  flight: Flight | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFlightDetails(
  flightId: string | null,
  options: UseFlightDetailsOptions = {}
): UseFlightDetailsReturn {
  const { enabled = true } = options;

  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlight = async () => {
    if (!flightId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const flightData = await flightService.getFlightDetails(flightId);
      setFlight(flightData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch flight details');
      setError(error);
      console.error('Error fetching flight details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && flightId) {
      fetchFlight();
    }
  }, [flightId, enabled]);

  return {
    flight,
    loading,
    error,
    refetch: fetchFlight,
  };
}
