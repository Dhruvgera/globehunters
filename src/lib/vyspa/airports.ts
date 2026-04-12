/**
 * Vyspa Airport API Client
 * Fetches airport data from Vyspa API
 */

import { VYSPA_CONFIG } from '@/config/vyspa';
import type { Airport, VyspaAirportResponse } from '@/types/airport';
import { VyspaErrorType } from '@/types/vyspa';
import { createVyspaError } from './errors';
import { normalizeCountryCode } from '@/lib/utils/countryUtils';


function transformVyspaAirport(item: VyspaAirportResponse): Airport | null {
  const code = String(item.id || '').toUpperCase().trim();
  const name = String(item.name || '').trim();
  const city = String(item.city || '').trim();
  const country = String(item.country || '').trim();
  const countryCode = normalizeCountryCode(item.country_code || item.country);
  
  if (!code) {
    return null;
  }
  
  return {
    code,
    name: name || city || code, // Fallback to city, then code if name is empty
    city: city || code, // Fallback to code if city is empty
    country: country || countryCode,
    countryCode,
  };
}

/**
 * Fetch airports from Vyspa API
 * @returns Array of airports
 */
export async function fetchAirportsFromVyspa(query?: string): Promise<Airport[]> {
  console.log('🛫 Fetching airports from GH API...');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  // Build Basic auth and endpoint URL
  const base = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
  const path = query && query.trim().length > 0
    ? `/rest/v4/get_airports/${encodeURIComponent(query.trim())}`
    : `/rest/v4/get_airports`;
  const url = `${base}${path}`;
  const basicAuth = Buffer
    .from(`${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`)
    .toString('base64');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw createVyspaError(
        VyspaErrorType.API_ERROR,
        `HTTP ${response.status}: ${response.statusText}`,
        'Unable to fetch airports. Please try again later.'
      );
    }

    const data: VyspaAirportResponse[] | { error: string } = await response.json();

    // Check for API error
    if (!Array.isArray(data)) {
      if ('error' in data) {
        throw createVyspaError(
          VyspaErrorType.API_ERROR,
          data.error,
          'Unable to load airports from the server.'
        );
      }
      throw createVyspaError(
        VyspaErrorType.API_ERROR,
        'Invalid response format',
        'Unable to process airport data.'
      );
    }

    // Transform and filter airports
    const airports = data
      .map(transformVyspaAirport)
      .filter((airport): airport is Airport => airport !== null);

    console.log(`✅ Fetched ${airports.length} airports from Vyspa`);

    return airports;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw createVyspaError(
        VyspaErrorType.TIMEOUT_ERROR,
        'Airport fetch timeout',
        'Request took too long. Please try again.'
      );
    }

    if (error.type) {
      throw error; // Already a VyspaError
    }

    throw createVyspaError(
      VyspaErrorType.NETWORK_ERROR,
      error.message || 'Unknown error',
      'Unable to connect to airport service.'
    );
  }
}
