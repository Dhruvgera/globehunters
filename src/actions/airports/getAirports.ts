/**
 * Airport Server Actions
 * Server-side actions for fetching and searching airports
 */

'use server';

import { airportCache } from '@/lib/cache/airportCache';
import { searchAirports, getPopularAirports } from '@/lib/utils/airportSearch';
import type { Airport, AirportSearchResult } from '@/types/airport';

/**
 * Search airports by query
 * @param query Search query (airport code, city, or country)
 * @param limit Maximum number of results (default: 10)
 * @returns Array of matching airports
 */
export async function searchAirportsAction(
  query: string,
  limit: number = 10
): Promise<AirportSearchResult[]> {
  try {
    // Get airports from cache (or fetch if needed)
    const airports = await airportCache.getAirports();

    // Search and return results
    const results = searchAirports(airports, query, limit);

    return results;
  } catch (error: any) {
    console.error('Error searching airports:', error);
    return [];
  }
}

/**
 * Get all airports
 * @returns Array of all airports
 */
export async function getAllAirportsAction(): Promise<Airport[]> {
  try {
    const airports = await airportCache.getAirports();
    return airports;
  } catch (error: any) {
    console.error('Error getting all airports:', error);
    return [];
  }
}

/**
 * Get popular airports
 * @returns Array of popular airports
 */
export async function getPopularAirportsAction(): Promise<Airport[]> {
  try {
    const airports = await airportCache.getAirports();
    const popular = getPopularAirports(airports);
    return popular;
  } catch (error: any) {
    console.error('Error getting popular airports:', error);
    return [];
  }
}

/**
 * Refresh airport cache
 * @returns Success status
 */
export async function refreshAirportCacheAction(): Promise<{ success: boolean; count: number }> {
  try {
    const airports = await airportCache.refresh();
    return { success: true, count: airports.length };
  } catch (error: any) {
    console.error('Error refreshing airport cache:', error);
    return { success: false, count: 0 };
  }
}
