/**
 * Hotel/City lookup hook (Vyspa get_cities)
 * Debounced client-side search against /api/vyspa/hotels/cities.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VyspaCityHotelLookupItem } from '@/types/vyspaHotels';

interface UseHotelLocationSearchOptions {
  debounceMs?: number;
  limit?: number;
}

export function useHotelLocationSearch(options: UseHotelLocationSearchOptions = {}) {
  const { debounceMs = 300, limit = 10 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VyspaCityHotelLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // naive in-memory cache per session
  const cacheRef = useRef<Map<string, VyspaCityHotelLookupItem[]>>(new Map());

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        setLoading(false);
        return;
      }

      const cached = cacheRef.current.get(q.toLowerCase());
      if (cached) {
        setResults(cached.slice(0, limit));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const resp = await fetch('/api/vyspa/hotels/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: q, json_format: true }),
        });

        const data = await resp.json().catch(() => []);
        if (!resp.ok) {
          throw new Error((data as any)?.message || `HTTP ${resp.status}`);
        }

        const arr = Array.isArray(data) ? (data as VyspaCityHotelLookupItem[]) : [];
        cacheRef.current.set(q.toLowerCase(), arr);

        setResults(arr.slice(0, limit));
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to search locations');
        setError(e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, limit]);

  const search = useCallback((q: string) => setQuery(q), []);
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return { query, results, loading, error, search, clear };
}




