/**
 * Search Flights Server Action
 * Server-side action for searching flights via Vyspa API
 */

'use server';

import { searchFlightsVyspa } from '@/lib/vyspa/client';
import { transformVyspaResponse } from '@/lib/vyspa/transformers';
import { validateSearchParams } from '@/lib/vyspa/validators';
import { applyBusinessRules } from '@/lib/vyspa/rules';
import type { FlightSearchRequest, VyspaError } from '@/types/vyspa';
import type { FlightSearchResponse } from '@/services/api/flightService';

/**
 * Search for flights
 * @param params Flight search parameters from frontend
 * @returns Flight search results with filters
 */
export async function searchFlights(
  params: FlightSearchRequest
): Promise<FlightSearchResponse> {
  try {
    console.log('🔍 Server Action: searchFlights called with params:', params);

    // 1. Validate parameters
    const validationResult = validateSearchParams(params);
    if (!validationResult.valid) {
      throw new Error(`Invalid parameters: ${validationResult.errors.join(', ')}`);
    }

    // 2. Call Vyspa API
    const vyspaResponse = await searchFlightsVyspa(params);

    // 3. Check for API errors
    if (vyspaResponse.error) {
      throw new Error(`Vyspa API error: ${vyspaResponse.error}`);
    }

    // 4. Handle empty results
    if (!vyspaResponse.Results || vyspaResponse.Results.length === 0) {
      console.log('⚠️  No flights found for this search');
      return {
        flights: [],
        filters: {
          airlines: [],
          departureAirports: [],
          arrivalAirports: [],
          minPrice: 0,
          maxPrice: 0,
        },
      };
    }

    // 5. Transform response to frontend format
    const transformedData = transformVyspaResponse(vyspaResponse);

    // 6. Apply business rules (filtering, pricing, prioritization, currency conversion)
    const finalData = await applyBusinessRules(transformedData, params);

    console.log(`✅ Server Action: Returning ${finalData.flights.length} flights`);

    return finalData;
  } catch (error: any) {
    console.error('❌ Server Action: searchFlights error:', error);

    // Handle VyspaError
    if (error.type) {
      const vyspaError = error as VyspaError;
      throw new Error(vyspaError.userMessage || vyspaError.message);
    }

    // Re-throw with user-friendly message
    throw new Error(
      error.message || 'An error occurred while searching for flights. Please try again.'
    );
  }
}

/**
 * Get flight details by ID
 * Note: Since Vyspa doesn't have a dedicated details endpoint,
 * this would require caching search results or re-searching
 * @param fareId Flight fare ID
 * @returns Flight details or null if not found
 */
export async function getFlightDetails(fareId: string): Promise<any> {
  console.warn('getFlightDetails called but not yet implemented - requires caching strategy');
  throw new Error('Flight details endpoint requires caching implementation');
}
