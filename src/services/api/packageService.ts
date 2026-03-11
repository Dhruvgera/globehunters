/**
 * Package Service
 * Handles all holiday package-related API calls
 */

import type {
  HolidayDestination,
  PackageSearchCriteria,
  PackageSearchResult,
  PackageResultsMeta,
  PackageRoomsParams,
  PackageRoomsResponse,
  TransformedAlternateFlight,
  HolidayHotelFilters,
  HolidayFlightFilter,
} from '@/types/holidayPackage';

// ============================================================================
// Response Types
// ============================================================================

export interface PackageSearchResponse {
  /** Package search results */
  results: PackageSearchResult[];
  /** Metadata including IDs for subsequent calls */
  meta: PackageResultsMeta;
}

export interface AlternateFlightsResponse {
  /** Alternate flight options */
  flights: TransformedAlternateFlight[];
}

export interface PackageDetailsResponse {
  /** Transformed package details */
  details: {
    quoteId?: number;
    packagePrice?: string;
    hotel?: {
      id: number;
      hotelId: number;
      name: string;
      description?: string;
      imageUrl?: string;
      starRating?: number;
      amenities?: string[];
      checkOutDate?: string;
      visaInfo?: string;
      countryRemarks?: string[];
      vendorRemarks?: string[];
      rooms?: Array<{
        id: number;
        name?: string;
        nights?: number;
        checkIn?: string;
        checkOut?: string;
        price?: number;
        netPrice?: number;
        mealCode?: string;
        mealName?: string;
        currency?: string;
        nonRefundable?: boolean;
        remarks?: string;
      }>;
    };
    cancellationPolicies?: Array<{
      id: number;
      roomName?: string;
      effectiveDate?: string;
      endEffectiveDate?: string;
      policy?: string;
      chargeType?: string;
      penalty?: number;
      penaltyCurrency?: string;
    }>;
    flight?: {
      pswResultId?: number;
      origin?: string;
      destination?: string;
      totalFare?: number;
      baseFare?: number;
      tax?: number;
      currency?: string;
      fareCategory?: string;
      lastTicketDate?: string;
      validatingCarrier?: string;
      refundable?: boolean;
      passengers?: Array<{
        type: string;
        count: number;
        baseFare: number;
        totalFare: number;
        tax: number;
      }>;
      brandOptions?: Array<{
        brandId?: number;
        name?: string;
        total: number;
        base: number;
        tax: number;
        currency?: string;
        cabinClass?: string;
        selected?: boolean;
      }>;
    };
    success: boolean;
  };
}

// ============================================================================
// Request Parameter Types
// ============================================================================

export interface ChangeFlightsParams {
  /** Selected/default flight result ID from package search */
  flightResultId: string;
  /** Selected hotel result ID from package search */
  hotelResultId: number;
}

export interface PackageDetailParams {
  /** Selected/default flight result ID */
  flightResultId: string;
  /** Selected room IDs */
  hotelResultRoomIds: string[];
}

// ============================================================================
// Package Service Class
// ============================================================================

class PackageService {
  // Cache for destination lookups
  private destinationCache: Map<string, { data: HolidayDestination[]; ts: number }> = new Map();
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Lookup destinations for autocomplete
   */
  async lookupDestinations(location: string): Promise<HolidayDestination[]> {
    if (!location || location.trim().length < 2) {
      return [];
    }

    const cacheKey = location.trim().toLowerCase();
    const cached = this.destinationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.ts < PackageService.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/packages/destinations?location=${encodeURIComponent(location)}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[PackageService] Destination lookup error:', error);
        throw new Error(error.message || 'Failed to lookup destinations');
      }

      const destinations = await response.json() as HolidayDestination[];
      
      // Cache the result
      this.destinationCache.set(cacheKey, { data: destinations, ts: Date.now() });
      
      return destinations;
    } catch (error) {
      console.error('[PackageService] Error looking up destinations:', error);
      throw error;
    }
  }

  /**
   * Search for holiday packages
   */
  async searchPackages(criteria: PackageSearchCriteria): Promise<PackageSearchResponse> {
    try {
      console.log('[PackageService] Searching packages:', {
        departure: criteria.departureCode,
        destination: criteria.destinationName,
        checkIn: criteria.checkIn,
        nights: criteria.nights,
        rooms: criteria.rooms.length,
      });

      const response = await fetch('/api/packages/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(criteria),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[PackageService] Package search error:', error);
        throw new Error(error.message || 'Failed to search packages');
      }

      const data = await response.json();
      
      return {
        results: data.results || [],
        meta: data.meta || {
          requestId: 0,
          selectedFlightResultId: '',
          completed: false,
        },
      };
    } catch (error) {
      console.error('[PackageService] Error searching packages:', error);
      throw error;
    }
  }

  /**
   * Get alternate flights for a package
   */
  async getAlternateFlights(params: ChangeFlightsParams): Promise<AlternateFlightsResponse> {
    try {
      console.log('[PackageService] Getting alternate flights:', {
        flightResultId: params.flightResultId,
        hotelResultId: params.hotelResultId,
      });

      const response = await fetch('/api/packages/change-flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[PackageService] Change flights error:', error);
        throw new Error(error.message || 'Failed to get alternate flights');
      }

      const data = await response.json();
      
      return {
        flights: data.flights || [],
      };
    } catch (error) {
      console.error('[PackageService] Error getting alternate flights:', error);
      throw error;
    }
  }

  /**
   * Get room options for a selected package hotel
   */
  async getPackageRooms(params: PackageRoomsParams): Promise<PackageRoomsResponse> {
    try {
      const response = await fetch('/api/packages/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[PackageService] Package rooms error:', error);
        throw new Error(error.message || 'Failed to get package rooms');
      }

      const data = await response.json();
      return {
        results: data.results || [],
      };
    } catch (error) {
      console.error('[PackageService] Error getting package rooms:', error);
      throw error;
    }
  }

  /**
   * Get full package details
   */
  async getPackageDetails(params: PackageDetailParams): Promise<PackageDetailsResponse> {
    try {
      console.log('[PackageService] Getting package details:', {
        flightResultId: params.flightResultId,
        hotelResultRoomIds: params.hotelResultRoomIds,
      });

      const response = await fetch('/api/packages/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[PackageService] Package details error:', error);
        throw new Error(error.message || 'Failed to get package details');
      }

      const data = await response.json();
      
      return {
        details: data.details || { success: false },
      };
    } catch (error) {
      console.error('[PackageService] Error getting package details:', error);
      throw error;
    }
  }

  /**
   * Build search criteria from user inputs
   * Helper method to construct PackageSearchCriteria from form data
   */
  buildSearchCriteria(params: {
    departureCode: string;
    departureName: string;
    destination: HolidayDestination;
    checkIn: string;
    nights: number;
    rooms: Array<{
      adults: number;
      children: number;
      childAges: number[];
      infants: number;
    }>;
    directFlightsOnly?: boolean;
    hotelFilters?: HolidayHotelFilters;
  }): PackageSearchCriteria {
    return {
      departureCode: params.departureCode,
      departureName: params.departureName,
      destinationCode: params.destination.airportcode,
      destinationName: params.destination.name,
      destinationHiddenValue: params.destination.hiddenvalue,
      checkIn: params.checkIn,
      nights: params.nights,
      rooms: params.rooms,
      directFlightsOnly: params.directFlightsOnly,
      hotelFilters: params.hotelFilters,
    };
  }

  /**
   * Calculate total passengers from room configurations
   */
  calculateTotalPassengers(rooms: Array<{ adults: number; children: number; infants: number }>): {
    adults: number;
    children: number;
    infants: number;
    total: number;
  } {
    type AccumulatorType = { adults: number; children: number; infants: number; total: number };
    const initial: AccumulatorType = { adults: 0, children: 0, infants: 0, total: 0 };
    const result = rooms.reduce<AccumulatorType>(
      (acc, room) => ({
        adults: acc.adults + room.adults,
        children: acc.children + room.children,
        infants: acc.infants + room.infants,
        total: acc.total + room.adults + room.children + room.infants,
      }),
      initial
    );
    return result;
  }

  /**
   * Format price difference for display
   */
  formatPriceDifference(diff: number, currency: string = 'GBP'): string {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      signDisplay: 'exceptZero',
    });
    return formatter.format(diff);
  }

  /**
   * Clear destination cache
   */
  clearDestinationCache(): void {
    this.destinationCache.clear();
  }
}

// Export singleton instance
export const packageService = new PackageService();

// Export types for convenience
export type {
  HolidayDestination,
  PackageSearchCriteria,
  PackageSearchResult,
  PackageResultsMeta,
  PackageRoomsParams,
  PackageRoomsResponse,
  TransformedAlternateFlight,
  HolidayHotelFilters,
  HolidayFlightFilter,
};
