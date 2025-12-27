/**
 * Airport Cache System
 * Serves static airport data from JSON file
 */

import type { Airport } from '@/types/airport';
import airportsData from '@/data/airports.json';

interface AirportCacheEntry {
  airports: Airport[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class AirportCacheManager {
  // Initialize with static data
  private cache: AirportCacheEntry = {
    airports: airportsData as Airport[],
    timestamp: Date.now(),
    ttl: Infinity
  };

  /**
   * Get airports from static data
   */
  async getAirports(): Promise<Airport[]> {
    return this.cache.airports;
  }

  /**
   * Manually refresh the cache (No-op for static data)
   */
  async refresh(): Promise<Airport[]> {
    console.log('🔄 using static data, refresh is no-op');
    return this.cache.airports;
  }

  /**
   * Clear the cache (No-op for static data to prevent data loss)
   */
  clear(): void {
    console.log('⚠️  Cannot clear static airport data');
  }

  /**
   * Get cache status
   */
  getStatus(): {
    isCached: boolean;
    isExpired: boolean;
    airportCount: number;
    age: number;
  } {
    return {
      isCached: true,
      isExpired: false,
      airportCount: this.cache.airports.length,
      age: Date.now() - this.cache.timestamp,
    };
  }

  /**
   * Get airport by code (sync)
   */
  getAirportByCode(code: string): Airport | null {
    if (!code) return null;
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
