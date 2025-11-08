/**
 * Vyspa API Client
 * HTTP client for calling Vyspa flight search API
 */

import { VYSPA_CONFIG } from '@/config/vyspa';
import { convertDateFormat, generateChildAges } from './utils';
import { validateVyspaConfig } from './validators';
import type { 
  FlightSearchRequest, 
  VyspaApiRequest, 
  VyspaApiResponse,
  VyspaSearchParams,
  VyspaError,
  VyspaErrorType,
} from '@/types/vyspa';

/**
 * Create a Vyspa error object
 */
function createVyspaError(
  type: VyspaErrorType,
  message: string,
  userMessage: string,
  details?: any
): VyspaError {
  return {
    type,
    message,
    userMessage,
    details,
  };
}

/**
 * Call Vyspa API to search for flights
 * @param params Frontend flight search parameters
 * @returns Vyspa API response
 * @throws VyspaError if request fails
 */
export async function searchFlightsVyspa(
  params: FlightSearchRequest
): Promise<VyspaApiResponse> {
  // Validate configuration
  const configValidation = validateVyspaConfig();
  if (!configValidation.valid) {
    throw createVyspaError(
      'API_ERROR' as VyspaErrorType,
      `Configuration error: ${configValidation.errors.join(', ')}`,
      'Service configuration error. Please contact support.',
      configValidation.errors
    );
  }

  // Transform frontend params to Vyspa format
  const departureDate = convertDateFormat(params.fr);
  const returnDate = params.to ? convertDateFormat(params.to) : '';
  const adults = parseInt(params.adt1, 10);
  const children = parseInt(params.chd1 || '0', 10);
  const directOnly = params.dir === '1' ? '1' : '0';

  const vyspaParams: VyspaSearchParams[] = [{
    version: VYSPA_CONFIG.defaults.version,
    departure_airport: params.origin1.toUpperCase(),
    arrival_airport: params.destinationid.toUpperCase(),
    departure_date: departureDate,
    return_date: returnDate,
    adults: String(adults),
    children: String(children),
    child_ages: generateChildAges(children),
    direct_flight_only: directOnly,
  }];

  console.log('🔍 Vyspa API Request:', {
    url: VYSPA_CONFIG.apiUrl,
    params: vyspaParams[0],
    timestamp: new Date().toISOString(),
  });

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, VYSPA_CONFIG.defaults.timeout);

    // Build Basic auth header and flights endpoint URL from base
    const basicAuth = Buffer.from(
      `${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
    ).toString('base64');
    const base = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const flightsUrl = `${base}/rest/v4/flights_availability_search/`;

    const response = await fetch(flightsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
      body: JSON.stringify(vyspaParams),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📥 Vyspa API Response Status:', response.status);

    if (!response.ok) {
      throw createVyspaError(
        'API_ERROR' as VyspaErrorType,
        `HTTP ${response.status}: ${response.statusText}`,
        'Flight search service is currently unavailable. Please try again later.',
        { status: response.status, statusText: response.statusText }
      );
    }

    const data: VyspaApiResponse = await response.json();
    
    console.log('✅ Vyspa API Response:', {
      hasResults: !!data.Results,
      resultCount: data.Results?.length || 0,
      hasError: !!data.error,
      timestamp: new Date().toISOString(),
    });

    // Check for API-level errors
    if (data.error) {
      // Check for "Module Not Found" error (route not supported)
      if (data.error.includes('Module Not Found')) {
        throw createVyspaError(
          'MODULE_NOT_FOUND' as VyspaErrorType,
          data.error,
          `No flights available for the route ${params.origin1} → ${params.destinationid}. This route may not be served by our flight providers.`,
          { route: `${params.origin1}-${params.destinationid}` }
        );
      }

      throw createVyspaError(
        'API_ERROR' as VyspaErrorType,
        data.error,
        'An error occurred while searching for flights. Please try again.',
        data.error
      );
    }

    return data;
  } catch (error: any) {
    // Handle timeout
    if (error.name === 'AbortError') {
      throw createVyspaError(
        'TIMEOUT_ERROR' as VyspaErrorType,
        'Request timed out after 30 seconds',
        'The search is taking longer than expected. Please try again.',
        { timeout: VYSPA_CONFIG.defaults.timeout }
      );
    }

    // Handle network errors
    if (error.message?.includes('fetch')) {
      throw createVyspaError(
        'NETWORK_ERROR' as VyspaErrorType,
        `Network error: ${error.message}`,
        'Unable to connect to flight search service. Please check your internet connection.',
        error
      );
    }

    // Re-throw if already a VyspaError
    if (error.type) {
      throw error;
    }

    // Unknown error
    console.error('❌ Vyspa API call failed:', error);
    throw createVyspaError(
      'UNKNOWN_ERROR' as VyspaErrorType,
      error.message || 'Unknown error occurred',
      'An unexpected error occurred. Please try again.',
      error
    );
  }
}

/**
 * Test Vyspa API connection
 * @returns True if connection successful
 */
export async function testVyspaConnection(): Promise<boolean> {
  try {
    const testParams: FlightSearchRequest = {
      origin1: 'LHR',
      destinationid: 'JFK',
      fr: '01/12/2025',
      adt1: '1',
      chd1: '0',
      ow: '0',
      dir: '0',
      cl: '1',
    };

    const response = await searchFlightsVyspa(testParams);
    return !response.error;
  } catch (error) {
    console.error('Vyspa connection test failed:', error);
    return false;
  }
}
