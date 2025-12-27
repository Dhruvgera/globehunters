/**
 * Flight Service
 * Handles all flight-related API calls
 */

import { apiClient } from './client';
import { API_CONFIG } from '@/config/api';
import { Flight, SearchParams } from '@/types/flight';
import { ApiResponse } from '@/types/api';
import { mockFlights, mockDatePrices, mockAirlines, mockAirports } from '@/data/mockFlights';
import { searchFlights as searchFlightsAction } from '@/actions/flights';
import type { FlightSearchRequest } from '@/types/vyspa';

export interface DatePrice {
  date: string;
  price: number;
}

export interface AirlineFilter {
  name: string;
  code: string;
  count: number;
  minPrice: number;
}

export interface AirportFilter {
  code: string;
  name: string;
  count: number;
  minPrice: number;
}

export interface FlightSearchResponse {
  flights: Flight[];
  filters: {
    airlines: AirlineFilter[];
    departureAirports: AirportFilter[];
    arrivalAirports: AirportFilter[];
    minPrice: number;
    maxPrice: number;
  };
  datePrices?: DatePrice[];
  requestId?: string; // Request ID from API - used as web ref until folder is created
}

export interface FlightPricing {
  flightId: string;
  baseFare: number;
  taxes: number;
  fees: number;
  total: number;
  currency: string;
  fareOptions: {
    type: 'Eco Value' | 'Eco Classic' | 'Eco Flex';
    price: number;
    available: boolean;
  }[];
}

class FlightService {
  // In-memory response cache (session-scoped)
  private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private responseCache: Map<string, { data: FlightSearchResponse; ts: number }> = new Map();

  private makeCacheKey(params: SearchParams, requestId?: string): string {
    if (requestId) {
      return `REQ_${requestId}`;
    }
    const format = (d?: Date) => d ? this.formatDate(d) : '';
    const segmentsPart = params.segments && params.segments.length
      ? params.segments
          .map(seg => [seg.from, seg.to, format(seg.departureDate)].join('>'))
          .join('|')
      : '';
    return [
      params.from,
      params.to,
      format(params.departureDate),
      format(params.returnDate),
      params.passengers.adults,
      params.passengers.children,
      params.passengers.infants || 0,
      params.class,
      params.tripType,
      segmentsPart
    ].join('|');
  }

  private getFromCache(params: SearchParams, requestId?: string): FlightSearchResponse | null {
    const key = this.makeCacheKey(params, requestId);
    const entry = this.responseCache.get(key);
    if (!entry) return null;
    const isFresh = Date.now() - entry.ts < FlightService.CACHE_TTL_MS;
    if (!isFresh) {
      this.responseCache.delete(key);
      return null;
    }
    return entry.data;
  }

  private saveToCache(params: SearchParams, data: FlightSearchResponse, requestId?: string) {
    const key = this.makeCacheKey(params, requestId);
    this.responseCache.set(key, { data, ts: Date.now() });
  }

  /**
   * Search for flights using Vyspa API via server action
   */
  async searchFlights(params: SearchParams, requestId?: string): Promise<FlightSearchResponse> {
    try {
      // 1) Return cached result if present (instant render on date you already prefetched)
      // Only use cache if NOT using requestId (fresh request explicitly requested if ID provided?)
      // Actually, if we have a requestId, we might want to check cache for it too? 
      // But usually requestId means "restore session", so maybe we should fetch fresh to be safe?
      // Let's cache it too.
      const cached = this.getFromCache(params, requestId);
      if (cached) {
        return cached;
      }

      let vyspaParams: FlightSearchRequest;

      if (requestId) {
        // Build minimal request for session restoration
        // Note: We still need some dummy values for required fields in SearchParams to satisfy TS,
        // but FlightSearchRequest with Request_id doesn't need them (handled by validator)
        // However, we construct FlightSearchRequest here.
        vyspaParams = {
          Request_id: requestId,
          // Provide dummy/fallback values for required fields to satisfy TS interface
          // These won't be used by the API client when Request_id is present
          origin1: params.from,
          destinationid: params.to,
          fr: this.formatDate(params.departureDate),
          adt1: String(params.passengers.adults),
          chd1: String(params.passengers.children),
          ow: params.tripType === 'one-way' ? '1' : '0',
          dir: '0',
          cl: '1'
        };
      } else {
        // Normal search params construction
        // Convert SearchParams to FlightSearchRequest format
        // For multi-city, we still send a single flights_availability_search request
        // but populate departureN_/arrivalN_/departureN_date fields for extra legs.
        let origin1 = params.from;
        let destinationid = params.to;
        let fr = this.formatDate(params.departureDate);
        let to = params.returnDate ? this.formatDate(params.returnDate) : undefined;
        let ow: '0' | '1' = params.tripType === 'one-way' ? '1' : '0';

        const multiCityExtras: Partial<FlightSearchRequest> = {};
        if (params.tripType === 'multi-city' && params.segments && params.segments.length >= 2) {
          const segments = params.segments;
          // First leg goes into origin1/destinationid/fr
          const first = segments[0];
          origin1 = first.from;
          destinationid = first.to;
          fr = this.formatDate(first.departureDate);
          to = undefined; // multi-city uses per-leg dates, not a single return
          ow = '1';

          // Subsequent legs go into origin2-6/destination2-6/fr2-6
          // Segments array: [0, 1, 2, ...] maps to API: leg1, leg2, leg3, ...
          // So segments[1] → origin2/destination2/fr2, etc.
          for (let i = 1; i < segments.length && i < 6; i++) {
            const seg = segments[i];
            const legFr = this.formatDate(seg.departureDate);
            const legIndex = i + 1; // API leg index: 2, 3, 4, 5, 6
            
            switch (legIndex) {
              case 2:
                multiCityExtras.origin2 = seg.from;
                multiCityExtras.destination2 = seg.to;
                multiCityExtras.fr2 = legFr;
                break;
              case 3:
                multiCityExtras.origin3 = seg.from;
                multiCityExtras.destination3 = seg.to;
                multiCityExtras.fr3 = legFr;
                break;
              case 4:
                multiCityExtras.origin4 = seg.from;
                multiCityExtras.destination4 = seg.to;
                multiCityExtras.fr4 = legFr;
                break;
              case 5:
                multiCityExtras.origin5 = seg.from;
                multiCityExtras.destination5 = seg.to;
                multiCityExtras.fr5 = legFr;
                break;
              case 6:
                multiCityExtras.origin6 = seg.from;
                multiCityExtras.destination6 = seg.to;
                multiCityExtras.fr6 = legFr;
                break;
            }
          }
        }

        vyspaParams = {
          origin1,
          destinationid,
          fr,
          to,
          adt1: String(params.passengers.adults),
          chd1: String(params.passengers.children),
          inf1: String(params.passengers.infants || 0),
          ow,
          dir: '0', // TODO: Add direct flights filter to UI
          cl: this.mapCabinClass(params.class),
          ...multiCityExtras,
        };
      }

      console.log('🔍 Flight search request built:', {
        tripType: params.tripType,
        segmentCount: params.segments?.length || 1,
        vyspaParams,
        hasRequestId: !!requestId
      });

      // Call server action
      const response = await searchFlightsAction(vyspaParams);

      // Override tripType on each flight using the original search params.
      // This avoids inferring trip type from the number of segments returned
      // by the API, which can be unreliable for multi-city searches.
      const flightsWithTripType: Flight[] = response.flights.map((flight) => ({
        ...flight,
        tripType: params.tripType || flight.tripType,
      }));

      // Add mock date prices for now (Vyspa doesn't provide this)
      const result: FlightSearchResponse = {
        ...response,
        flights: flightsWithTripType,
        datePrices: mockDatePrices,
      };
      // 2) Save to cache
      this.saveToCache(params, result, requestId);
      return result;
    } catch (error) {
      console.error('Error searching flights:', error);
      throw error;
    }
  }

  /**
   * Format Date object to DD/MM/YYYY string
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Map cabin class to Vyspa format
   */
  private mapCabinClass(cabinClass: string): string {
    const classMap: Record<string, string> = {
      'Economy': '1',
      'Premium Economy': '2',
      'Business': '3',
      'First': '4',
    };
    return classMap[cabinClass] || '1';
  }

  /**
   * Get flight details by ID
   * TODO: Replace mock data with actual API call
   */
  async getFlightDetails(flightId: string): Promise<Flight> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.get<ApiResponse<Flight>>(
      //   `${API_CONFIG.endpoints.flights.details}/${flightId}`
      // );
      // return response.data;

      // Mock implementation - simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const flight = mockFlights.find(f => f.id === flightId);
      if (!flight) {
        throw new Error(`Flight with ID ${flightId} not found`);
      }

      return flight;
    } catch (error) {
      console.error('Error fetching flight details:', error);
      throw error;
    }
  }

  /**
   * Get flight pricing details
   * TODO: Replace mock data with actual API call
   */
  async getFlightPricing(flightId: string, fareType?: string): Promise<FlightPricing> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.post<ApiResponse<FlightPricing>>(
      //   API_CONFIG.endpoints.flights.pricing,
      //   { flightId, fareType }
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 300));

      const flight = mockFlights.find(f => f.id === flightId);
      if (!flight) {
        throw new Error(`Flight with ID ${flightId} not found`);
      }

      return {
        flightId: flight.id,
        baseFare: flight.price * 0.75,
        taxes: flight.price * 0.20,
        fees: flight.price * 0.05,
        total: flight.price,
        currency: flight.currency,
        fareOptions: flight.ticketOptions?.map(opt => ({
          type: opt.type,
          price: opt.price,
          available: true,
        })) || [],
      };
    } catch (error) {
      console.error('Error fetching flight pricing:', error);
      throw error;
    }
  }

  /**
   * Get date-based pricing for flexible date search
   * TODO: Replace mock data with actual API call
   */
  async getDatePricing(from: string, to: string, month: string): Promise<DatePrice[]> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.post<ApiResponse<DatePrice[]>>(
      //   API_CONFIG.endpoints.flights.datePrice,
      //   { from, to, month }
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 300));

      return mockDatePrices;
    } catch (error) {
      console.error('Error fetching date pricing:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const flightService = new FlightService();
