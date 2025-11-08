/**
 * Global flight data cache
 * Stores complete flight search results to avoid redundant API calls
 */

import { Flight, SearchParams } from '@/types/flight';
import { FlightSearchResponse } from '@/services/api/flightService';

interface CacheEntry {
  response: FlightSearchResponse;
  timestamp: number;
  params: SearchParams;
}

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

class FlightCache {
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Generate cache key from search parameters
   */
  private getCacheKey(params: SearchParams): string {
    const {
      from,
      to,
      departureDate,
      returnDate,
      passengers,
      class: travelClass,
      tripType,
    } = params;

    const depDate = departureDate.toISOString().split('T')[0];
    const retDate = returnDate ? returnDate.toISOString().split('T')[0] : 'none';

    return `${from}-${to}-${depDate}-${retDate}-${passengers.adults}-${passengers.children}-${passengers.infants}-${travelClass}-${tripType}`;
  }

  /**
   * Store flight search results in cache
   */
  set(params: SearchParams, response: FlightSearchResponse): void {
    const key = this.getCacheKey(params);
    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      params,
    };

    this.cache.set(key, entry);
    
    console.log(`💾 Flight cache SET: ${key} (${response.flights.length} flights)`);
  }

  /**
   * Get cached flight search results
   * Returns null if not found or expired
   */
  get(params: SearchParams): FlightSearchResponse | null {
    const key = this.getCacheKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`❌ Flight cache MISS: ${key}`);
      return null;
    }

    // Check if cache entry is still valid
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
      console.log(`⏰ Flight cache EXPIRED: ${key} (age: ${Math.round(age / 1000)}s)`);
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Flight cache HIT: ${key} (${entry.response.flights.length} flights, age: ${Math.round(age / 1000)}s)`);
    return entry.response;
  }

  /**
   * Check if cache has valid data for given params
   */
  has(params: SearchParams): boolean {
    return this.get(params) !== null;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    console.log('🗑️  Flight cache CLEARED');
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🗑️  Flight cache cleared ${cleared} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const flightCache = new FlightCache();

// Periodically clear expired entries (every 2 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    flightCache.clearExpired();
  }, 2 * 60 * 1000);
}

