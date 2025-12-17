/**
 * Airport Cache System
 * In-memory cache for airport data with TTL
 * Works on both server (direct Vyspa call) and client (via API route)
 */

import type { Airport } from '@/types/airport';
import { fetchAirportsFromVyspa } from '@/lib/vyspa/airports';

interface AirportCacheEntry {
  airports: Airport[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// Check if running on server or client
const isServer = typeof window === 'undefined';

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
   * Uses direct Vyspa call on server, API route on client
   */
  private async fetchAndCache(): Promise<Airport[]> {
    console.log(`🔄 Fetching fresh airport data (${isServer ? 'server' : 'client'})...`);

    try {
      let airports: Airport[];

      if (isServer) {
        // On server: directly call Vyspa API (has access to env vars)
        airports = await fetchAirportsFromVyspa();
      } else {
        // On client: use internal API route
        const response = await fetch('/api/airports');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        airports = await response.json();
      }

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

      // Return empty array instead of throwing to prevent app crashes
      return [];
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

  /**
   * Get airport by code from cache (sync - returns null if not cached)
   */
  getAirportByCode(code: string): Airport | null {
    if (!this.cache || !code) return null;
    const searchCode = String(code).toUpperCase();
    return this.cache.airports.find(a => a?.code && a.code.toUpperCase() === searchCode) || null;
  }

  /**
   * Get airport name by code (sync - returns code if not found)
   */
  getAirportName(code: string): string {
    const airport = this.getAirportByCode(code);
    return airport?.name || airport?.city || code;
  }
}

// Singleton instance
export const airportCache = new AirportCacheManager();
