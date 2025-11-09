'use server';

import { searchFlightsVyspa } from '@/lib/vyspa/client';
import { transformVyspaResponse } from '@/lib/vyspa/transformers';
import { validateSearchParams } from '@/lib/vyspa/validators';
import { applyBusinessRules } from '@/lib/vyspa/rules';
import type { FlightSearchRequest } from '@/types/vyspa';
import type { SearchParams } from '@/types/flight';
import type { FlightSearchResponse } from '@/services/api/flightService';

interface BatchSearchItem {
  key: string; // client cache key to echo back
  type: 'departure' | 'return';
  params: SearchParams;
}

interface BatchSearchResult {
  key: string;
  type: 'departure' | 'return';
  minPrice: number | null;
  success: boolean;
  error?: string;
  response?: FlightSearchResponse;
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function mapCabinClass(cabinClass: string): string {
  const classMap: Record<string, string> = {
    'Economy': '1',
    'Premium Economy': '2',
    'Business': '3',
    'First': '4',
  };
  return classMap[cabinClass] || '1';
}

function toVyspaRequest(params: SearchParams): FlightSearchRequest {
  return {
    origin1: params.from,
    destinationid: params.to,
    fr: formatDate(params.departureDate),
    to: params.returnDate ? formatDate(params.returnDate) : undefined,
    adt1: String(params.passengers.adults),
    chd1: String(params.passengers.children),
    inf1: String(params.passengers.infants || 0),
    ow: params.tripType === 'one-way' ? '1' : '0',
    dir: '0',
    cl: mapCabinClass(params.class),
  };
}

export async function searchFlightsBatch(items: BatchSearchItem[]): Promise<BatchSearchResult[]> {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const tasks = items.map(async (item): Promise<BatchSearchResult> => {
    try {
      const vyspaParams = toVyspaRequest(item.params);
      const validationResult = validateSearchParams(vyspaParams);
      if (!validationResult.valid) {
        return {
          key: item.key,
          type: item.type,
          minPrice: null,
          success: false,
          error: `Invalid parameters: ${validationResult.errors.join(', ')}`,
        };
      }

      // Call Vyspa API directly
      const vyspaResponse = await searchFlightsVyspa(vyspaParams);
      if (vyspaResponse.error) {
        return {
          key: item.key,
          type: item.type,
          minPrice: null,
          success: false,
          error: `Vyspa API error: ${vyspaResponse.error}`,
        };
      }

      // Handle empty results quickly
      if (!vyspaResponse.Results || vyspaResponse.Results.length === 0) {
        return {
          key: item.key,
          type: item.type,
          minPrice: null,
          success: true,
        };
      }

      // Transform and apply business rules to be consistent with single search
      const transformedData = transformVyspaResponse(vyspaResponse);
      const finalData: FlightSearchResponse = await applyBusinessRules(
        transformedData,
        toVyspaRequest(item.params) // pass mapped params for rules context
      );

      let minPrice: number | null = null;
      if (finalData.flights && finalData.flights.length > 0) {
        const minFlight = finalData.flights.reduce((min, flight) =>
          flight.pricePerPerson < min.pricePerPerson ? flight : min
        , finalData.flights[0]);
        minPrice = Math.round(minFlight.pricePerPerson);
      }

      return {
        key: item.key,
        type: item.type,
        minPrice,
        success: true,
        response: finalData,
      };
    } catch (err: any) {
      return {
        key: item.key,
        type: item.type,
        minPrice: null,
        success: false,
        error: err?.message || 'Unknown error',
      };
    }
  });

  const settled = await Promise.allSettled(tasks);
  return settled.map((r, idx) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      key: items[idx].key,
      type: items[idx].type,
      minPrice: null,
      success: false,
      error: r.reason?.message || 'Unknown error',
    };
  });
}


