/**
 * usePriceCheck Hook
 * React hook for managing price check state and API calls
 */

import { useState, useCallback, useRef } from 'react';
import type { PriceCheckResult, PriceCheckError } from '@/types/priceCheck';

interface UsePriceCheckReturn {
  priceCheck: PriceCheckResult | null;
  isLoading: boolean;
  error: PriceCheckError | null;
  checkPrice: (segmentId: string) => Promise<void>;
  clearCache: () => void;
  clearError: () => void;
}

/**
 * In-memory cache for price check results
 * TTL: 5 minutes
 */
const priceCheckCache = new Map<string, {
  data: PriceCheckResult;
  timestamp: number;
  ttl: number;
}>();

const priceCheckFailureCache = new Map<string, {
  error: PriceCheckError;
  timestamp: number;
  ttl: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached price check data
 */
function getCachedPriceCheck(segmentId: string): PriceCheckResult | null {
  const cached = priceCheckCache.get(segmentId);
  
  if (!cached) return null;
  
  // Check if cache is expired
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    priceCheckCache.delete(segmentId);
    return null;
  }
  
  return cached.data;
}

function getCachedPriceCheckFailure(segmentId: string): PriceCheckError | null {
  const cached = priceCheckFailureCache.get(segmentId);
  if (!cached) return null;
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    priceCheckFailureCache.delete(segmentId);
    return null;
  }
  return cached.error;
}

/**
 * Set cached price check data
 */
function setCachedPriceCheck(segmentId: string, data: PriceCheckResult): void {
  priceCheckCache.set(segmentId, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  });
}

function setCachedPriceCheckFailure(segmentId: string, error: PriceCheckError): void {
  priceCheckFailureCache.set(segmentId, {
    error,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  });
}

/**
 * Clear all cached data
 */
function clearPriceCheckCache(): void {
  priceCheckCache.clear();
  priceCheckFailureCache.clear();
}

/**
 * Hook for price check functionality
 */
export function usePriceCheck(): UsePriceCheckReturn {
  const [priceCheck, setPriceCheck] = useState<PriceCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PriceCheckError | null>(null);
  
  // Track current request to prevent race conditions
  const currentRequestRef = useRef<string | null>(null);

  /**
   * Check price for a segment
   */
  const checkPrice = useCallback(async (segmentId: string) => {
    // Don't make duplicate requests
    if (currentRequestRef.current === segmentId && isLoading) {
      console.log('⏩ Price check already in progress for', segmentId);
      return;
    }

    const cachedFailure = getCachedPriceCheckFailure(segmentId);
    if (cachedFailure) {
      console.log('⏩ Skipping price check due to cached failure for', segmentId);
      setError(cachedFailure);
      setPriceCheck(null);
      return;
    }

    // Check cache first
    const cached = getCachedPriceCheck(segmentId);
    if (cached) {
      console.log('✅ Using cached price check for', segmentId);
      setPriceCheck(cached);
      setError(null);
      return;
    }

    // Start loading
    setIsLoading(true);
    setError(null);
    currentRequestRef.current = segmentId;

    console.log('🔍 Fetching price check for', segmentId);

    try {
      const res = await fetch('/api/price-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ segmentResultId: segmentId }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = errJson?.message || `HTTP ${res.status} ${res.statusText}`;
        throw {
          type: errJson?.type || 'API_ERROR',
          message,
          userMessage: errJson?.userMessage || 'Unable to check price. Please try again.',
          details: errJson?.details,
        };
      }
      const result: PriceCheckResult = await res.json();
      
      // Only update if this is still the current request
      if (currentRequestRef.current === segmentId) {
        setPriceCheck(result);
        setCachedPriceCheck(segmentId, result);
        console.log('✅ Price check successful for', segmentId);
      }
    } catch (err: any) {
      // Only update if this is still the current request
      if (currentRequestRef.current === segmentId) {
        console.error('❌ Price check error caught:', err);
        
        const priceCheckError: PriceCheckError = {
          type: err.type || 'UNKNOWN_ERROR',
          message: err.message || err.toString() || 'Unknown error',
          userMessage: err.userMessage || 'Unable to load pricing. The fare may no longer be available.',
          details: err.details || err,
        };
        
        setError(priceCheckError);
        // Clear any previous price check data so the UI treats this as
        // "no upgrade options available" and falls back to search pricing.
        setPriceCheck(null);
        // Cache this failure so we don't keep retrying a segment that is
        // returning errors (e.g., repeated 502s) within the TTL window.
        setCachedPriceCheckFailure(segmentId, priceCheckError);

        const status = (priceCheckError.details && (priceCheckError.details as any).status) as number | undefined;
        if (status === 502) {
          console.warn('⚠️ Price check received 502 Bad Gateway for', segmentId, {
            error: priceCheckError,
          });
        } else {
          console.error('❌ Price check failed for', segmentId, {
            error: priceCheckError,
            originalError: err,
          });
        }
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestRef.current === segmentId) {
        setIsLoading(false);
        currentRequestRef.current = null;
      }
    }
  }, [isLoading]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    clearPriceCheckCache();
    console.log('🗑️ Price check cache cleared');
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    priceCheck,
    isLoading,
    error,
    checkPrice,
    clearCache,
    clearError,
  };
}

