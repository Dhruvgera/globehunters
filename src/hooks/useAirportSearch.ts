/**
 * Airport Search Hook
 * Manages airport search state and debouncing
 */

import { useState, useEffect, useCallback } from 'react';
import { searchAirportsAction } from '@/actions/airports';
import type { Airport, AirportSearchResult } from '@/types/airport';

interface UseAirportSearchOptions {
  debounceMs?: number;
  limit?: number;
}

export function useAirportSearch(options: UseAirportSearchOptions = {}) {
  const { debounceMs = 300, limit = 10 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AirportSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounced search function
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchResults = await searchAirportsAction(query, limit);
        setResults(searchResults);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to search airports');
        setError(error);
        console.error('Airport search error:', error);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, limit, debounceMs]);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    search,
    clear,
  };
}
