/**
 * Hotel/City lookup hook (Vyspa get_cities)
 * Debounced client-side search against /api/hotels/cities.
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
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestSeqRef.current;
    const abortController = new AbortController();

    const fetchCities = async (q: string): Promise<VyspaCityHotelLookupItem[]> => {
      const cacheKey = q.toLowerCase();
      const cached = cacheRef.current.get(cacheKey);
      if (cached) return cached;

      const resp = await fetch('/api/hotels/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: q, json_format: true }),
        signal: abortController.signal,
      });

      const data = await resp.json().catch(() => []);
      if (!resp.ok) {
        const message =
          typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof (data as { message?: unknown }).message === 'string'
            ? (data as { message: string }).message
            : `HTTP ${resp.status}`;
        throw new Error(message);
      }

      const arr = Array.isArray(data) ? (data as VyspaCityHotelLookupItem[]) : [];
      cacheRef.current.set(cacheKey, arr);
      return arr;
    };

    const locationPriority = (loc: string) => {
      const value = String(loc || '').toUpperCase();
      if (value === 'CITY') return 0;
      if (value === 'TOWN') return 1;
      if (value === 'LOC') return 2;
      if (value === 'HOTEL') return 3;
      return 9;
    };

    const sortByRelevance = (items: VyspaCityHotelLookupItem[], q: string) => {
      const normalizedQuery = q.trim().toLowerCase();
      if (!normalizedQuery) return items;

      const rank = (item: VyspaCityHotelLookupItem) => {
        const label = String(item.label || '').trim().toLowerCase();
        const city = String(item.city_name || '').trim().toLowerCase();
        const exactLabel = label === normalizedQuery ? 0 : 1;
        const exactCity = city === normalizedQuery ? 0 : 1;
        const startsWithLabel = label.startsWith(normalizedQuery) ? 0 : 1;
        const containsLabel = label.includes(normalizedQuery) ? 0 : 1;
        return [exactLabel, exactCity, startsWithLabel, containsLabel, locationPriority(item.loc), label];
      };

      return [...items].sort((a, b) => {
        const ar = rank(a);
        const br = rank(b);
        for (let i = 0; i < ar.length - 1; i += 1) {
          if (ar[i] !== br[i]) return Number(ar[i]) - Number(br[i]);
        }
        return String(ar[ar.length - 1]).localeCompare(String(br[br.length - 1]));
      });
    };

    const hasStrongQueryMatch = (items: VyspaCityHotelLookupItem[], q: string) => {
      const normalizedQuery = q.trim().toLowerCase();
      if (!normalizedQuery) return true;

      return items.some((item) => {
        const label = String(item.label || '').trim().toLowerCase();
        const city = String(item.city_name || '').trim().toLowerCase();
        return (
          label === normalizedQuery ||
          city === normalizedQuery ||
          label.startsWith(normalizedQuery) ||
          city.startsWith(normalizedQuery)
        );
      });
    };

    const timer = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        if (requestId !== requestSeqRef.current) return;
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let arr = await fetchCities(q);

        // Vyspa can return weak/non-city matches for full names. Recover by merging prefix results.
        if (q.length >= 4 && (arr.length === 0 || !hasStrongQueryMatch(arr, q))) {
          const prefix = q.slice(0, 3);
          const prefixMatches = await fetchCities(prefix);
          const normalizedQ = q.toLowerCase();
          const recovered = prefixMatches.filter((item) => {
            const label = String(item.label || '').toLowerCase();
            const city = String(item.city_name || '').toLowerCase();
            return label.includes(normalizedQ) || city.includes(normalizedQ);
          });
          const deduped = new Map<string, VyspaCityHotelLookupItem>();
          [...arr, ...recovered].forEach((item) => {
            const key = `${String(item.id)}:${String(item.label || '').trim().toLowerCase()}:${String(item.loc || '').toUpperCase()}`;
            if (!deduped.has(key)) deduped.set(key, item);
          });
          arr = Array.from(deduped.values());
        }

        if (requestId !== requestSeqRef.current) return;
        setResults(sortByRelevance(arr, q).slice(0, limit));
      } catch (err) {
        if (abortController.signal.aborted || requestId !== requestSeqRef.current) return;
        const e = err instanceof Error ? err : new Error('Failed to search locations');
        setError(e);
        setResults([]);
      } finally {
        if (requestId !== requestSeqRef.current) return;
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, debounceMs, limit]);

  const search = useCallback((q: string) => setQuery(q), []);
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return { query, results, loading, error, search, clear };
}
