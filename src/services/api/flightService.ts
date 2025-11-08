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
  /**
   * Search for flights using Vyspa API via server action
   */
  async searchFlights(params: SearchParams): Promise<FlightSearchResponse> {
    try {
      // Convert SearchParams to FlightSearchRequest format
      const vyspaParams: FlightSearchRequest = {
        origin1: params.from,
        destinationid: params.to,
        fr: this.formatDate(params.departureDate),
        to: params.returnDate ? this.formatDate(params.returnDate) : undefined,
        adt1: String(params.passengers.adults),
        chd1: String(params.passengers.children),
        inf1: String(params.passengers.infants || 0),
        ow: params.tripType === 'one-way' ? '1' : '0',
        dir: '0', // TODO: Add direct flights filter to UI
        cl: this.mapCabinClass(params.class),
      };

      // Call server action
      const response = await searchFlightsAction(vyspaParams);

      // Add mock date prices for now (Vyspa doesn't provide this)
      return {
        ...response,
        datePrices: mockDatePrices,
      };
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
