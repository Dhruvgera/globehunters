/**
 * Airport Cache System
 * In-memory cache for airport data with TTL
 */

import type { Airport } from '@/types/airport';
import { fetchAirportsFromVyspa } from '@/lib/vyspa/airports';

interface AirportCacheEntry {
  airports: Airport[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class AirportCacheManager {
  private cache: AirportCacheEntry | null = null;
  private loading: boolean = false;
  private loadingPromise: Promise<Airport[]> | null = null;
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if cache is expired
   */
  private isExpired(): boolean {
    if (!this.cache) return true;
    const now = Date.now();
    return now - this.cache.timestamp > this.cache.ttl;
  }

  /**
   * Get airports from cache or fetch from API
   */
  async getAirports(): Promise<Airport[]> {
    // If already loading, return the existing promise
    if (this.loading && this.loadingPromise) {
      return this.loadingPromise;
    }

    // If cache is valid, return cached data
    if (this.cache && !this.isExpired()) {
      console.log('✅ Returning cached airports');
      return this.cache.airports;
    }

    // Fetch fresh data
    this.loading = true;
    this.loadingPromise = this.fetchAndCache();

    try {
      const airports = await this.loadingPromise;
      return airports;
    } finally {
      this.loading = false;
      this.loadingPromise = null;
    }
  }

  /**
   * Fetch airports and update cache
   */
  private async fetchAndCache(): Promise<Airport[]> {
    console.log('🔄 Fetching fresh airport data...');
    
    try {
      const airports = await fetchAirportsFromVyspa();
      
      // Update cache
      this.cache = {
        airports,
        timestamp: Date.now(),
        ttl: this.TTL,
      };

      console.log(`✅ Cached ${airports.length} airports`);
      return airports;
    } catch (error) {
      console.error('❌ Failed to fetch airports:', error);
      
      // If fetch fails but we have stale cache, return it
      if (this.cache) {
        console.log('⚠️  Using stale cache due to fetch error');
        return this.cache.airports;
      }
      
      throw error;
    }
  }

  /**
   * Manually refresh the cache
   */
  async refresh(): Promise<Airport[]> {
    console.log('🔄 Manually refreshing airport cache...');
    this.cache = null; // Clear existing cache
    return this.getAirports();
  }

  /**
   * Clear the cache
   */
  clear(): void {
    console.log('🗑️  Clearing airport cache');
    this.cache = null;
  }

  /**
   * Get cache status
   */
  getStatus(): {
    isCached: boolean;
    isExpired: boolean;
    airportCount: number;
    age: number; // Age in milliseconds
  } {
    return {
      isCached: this.cache !== null,
      isExpired: this.isExpired(),
      airportCount: this.cache?.airports.length || 0,
      age: this.cache ? Date.now() - this.cache.timestamp : 0,
    };
  }
}

// Singleton instance
export const airportCache = new AirportCacheManager();
