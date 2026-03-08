/**
 * usePackageSearch Hook
 * Manages holiday package search, alternate flights, and package details
 */

'use client';

import { useState, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import {
  packageService,
  PackageSearchResponse,
  AlternateFlightsResponse,
  PackageDetailsResponse,
  ChangeFlightsParams,
  PackageDetailParams,
} from '@/services/api/packageService';
import type {
  HolidayDestination,
  PackageSearchCriteria,
  PackageSearchResult,
  PackageResultsMeta,
  SelectedPackage,
  TransformedAlternateFlight,
  HolidayHotelFilters,
  RoomConfiguration,
} from '@/types/holidayPackage';

export interface UsePackageSearchReturn {
  // State from store
  packageSearch: PackageSearchCriteria | null;
  packageDestination: HolidayDestination | null;
  packages: PackageSearchResult[] | null;
  meta: PackageResultsMeta | null;
  alternateFlights: TransformedAlternateFlight[] | null;
  selectedPackage: SelectedPackage | null;
  selectedRoomIds: string[];

  // Loading and error states
  loading: boolean;
  destinationLoading: boolean;
  error: string | null;

  // Actions
  lookupDestinations: (query: string) => Promise<HolidayDestination[]>;
  searchPackages: (criteria: PackageSearchCriteria) => Promise<PackageSearchResponse>;
  getAlternateFlights: (hotelId?: number, roomId?: number) => Promise<AlternateFlightsResponse>;
  selectAlternateFlight: (flightResultId: string) => void;
  getPackageDetails: (flightResultId: string, roomIds: string[]) => Promise<PackageDetailsResponse>;
  selectPackage: (pkg: SelectedPackage | null) => void;
  selectRooms: (roomIds: string[]) => void;
  setDestination: (destination: HolidayDestination | null) => void;
  setSearchCriteria: (criteria: PackageSearchCriteria | null) => void;
  clearError: () => void;
  clearResults: () => void;
  clearAll: () => void;

  // Helper methods
  buildSearchCriteria: (params: {
    departureCode: string;
    departureName: string;
    destination: HolidayDestination;
    checkIn: string;
    nights: number;
    rooms: RoomConfiguration[];
    directFlightsOnly?: boolean;
    hotelFilters?: HolidayHotelFilters;
  }) => PackageSearchCriteria;
  calculateTotalPassengers: (rooms: Array<{ adults: number; children: number; infants: number }>) => {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
  formatPriceDifference: (diff: number, currency?: string) => string;
}

export function usePackageSearch(): UsePackageSearchReturn {
  // Store state
  const packageSearch = useBookingStore((state) => state.packageSearch);
  const packageDestination = useBookingStore((state) => state.packageDestination);
  const packages = useBookingStore((state) => state.packageResults);
  const meta = useBookingStore((state) => state.packageResultsMeta);
  const alternateFlights = useBookingStore((state) => state.alternateFlights);
  const selectedPackage = useBookingStore((state) => state.selectedPackage);
  const selectedRoomIds = useBookingStore((state) => state.selectedPackageRoomIds);

  // Store actions
  const setPackageSearch = useBookingStore((state) => state.setPackageSearch);
  const setPackageDestination = useBookingStore((state) => state.setPackageDestination);
  const setPackageResults = useBookingStore((state) => state.setPackageResults);
  const clearPackageResults = useBookingStore((state) => state.clearPackageResults);
  const setSelectedPackage = useBookingStore((state) => state.setSelectedPackage);
  const setSelectedPackageRoomIds = useBookingStore((state) => state.setSelectedPackageRoomIds);
  const setAlternateFlights = useBookingStore((state) => state.setAlternateFlights);
  const clearPackageState = useBookingStore((state) => state.clearPackageState);

  // Local state
  const [loading, setLoading] = useState(false);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Lookup destinations for autocomplete
   */
  const lookupDestinations = useCallback(async (query: string): Promise<HolidayDestination[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    setDestinationLoading(true);
    try {
      const destinations = await packageService.lookupDestinations(query);
      return destinations;
    } catch (err) {
      console.error('[usePackageSearch] Destination lookup error:', err);
      // Don't set error state for destination lookups - just return empty
      return [];
    } finally {
      setDestinationLoading(false);
    }
  }, []);

  /**
   * Search for holiday packages
   */
  const searchPackages = useCallback(async (criteria: PackageSearchCriteria): Promise<PackageSearchResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Save search criteria to store
      setPackageSearch(criteria);

      const response = await packageService.searchPackages(criteria);

      // Save results to store
      setPackageResults(response.results, response.meta);

      console.log('[usePackageSearch] Package search complete:', {
        resultCount: response.results.length,
        completed: response.meta.completed,
      });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search packages';
      setError(errorMessage);
      console.error('[usePackageSearch] Package search error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setPackageSearch, setPackageResults]);

  /**
   * Get alternate flights for a package
   */
  const getAlternateFlights = useCallback(async (
    hotelId?: number,
    _roomId?: number
  ): Promise<AlternateFlightsResponse> => {
    if (!meta) {
      throw new Error('No package search results available');
    }

    setLoading(true);
    setError(null);

    try {
      const effectiveHotelResultId = hotelId || selectedPackage?.hotel?.id;
      if (!effectiveHotelResultId || !meta.selectedFlightResultId) {
        throw new Error('Missing hotelResultId or selectedFlightResultId');
      }

      const params: ChangeFlightsParams = {
        flightResultId: meta.selectedFlightResultId,
        hotelResultId: effectiveHotelResultId,
      };

      const response = await packageService.getAlternateFlights(params);

      // Save alternate flights to store
      setAlternateFlights(response.flights);

      console.log('[usePackageSearch] Alternate flights fetched:', {
        count: response.flights.length,
      });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get alternate flights';
      setError(errorMessage);
      console.error('[usePackageSearch] Get alternate flights error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [meta, selectedPackage?.hotel?.id, setAlternateFlights]);

  /**
   * Select an alternate flight and update the selected package
   */
  const selectAlternateFlight = useCallback((flightResultId: string) => {
    if (!alternateFlights || !selectedPackage) {
      console.warn('[usePackageSearch] Cannot select alternate flight: no flights or package selected');
      return;
    }

    const flight = alternateFlights.find((f) => f.resultId === flightResultId);
    if (!flight) {
      console.warn('[usePackageSearch] Alternate flight not found:', flightResultId);
      return;
    }

    // Update the selected package with the new flight
    // Note: This is a simplified update - in production, you might want to
    // re-fetch the package details with the new flight
    setSelectedPackage({
      ...selectedPackage,
      flightResultId: flight.resultId,
      totalPrice: selectedPackage.totalPrice 
        ? selectedPackage.totalPrice + flight.priceDifference 
        : flight.totalFare,
    });

    console.log('[usePackageSearch] Alternate flight selected:', {
      flightResultId,
      priceDifference: flight.priceDifference,
    });
  }, [alternateFlights, selectedPackage, setSelectedPackage]);

  /**
   * Get full package details
   */
  const getPackageDetails = useCallback(async (
    flightResultId: string,
    roomIds: string[]
  ): Promise<PackageDetailsResponse> => {
    setLoading(true);
    setError(null);

    try {
      const params: PackageDetailParams = {
        flightResultId,
        hotelResultRoomIds: roomIds,
      };

      const response = await packageService.getPackageDetails(params);

      console.log('[usePackageSearch] Package details fetched:', {
        quoteId: response.details.quoteId,
        hotelName: response.details.hotel?.name,
        success: response.details.success,
      });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get package details';
      setError(errorMessage);
      console.error('[usePackageSearch] Get package details error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select a package for booking
   */
  const selectPackage = useCallback((pkg: SelectedPackage | null) => {
    setSelectedPackage(pkg);
  }, [setSelectedPackage]);

  /**
   * Select room IDs for the package
   */
  const selectRooms = useCallback((roomIds: string[]) => {
    setSelectedPackageRoomIds(roomIds);
  }, [setSelectedPackageRoomIds]);

  /**
   * Set the selected destination
   */
  const setDestination = useCallback((destination: HolidayDestination | null) => {
    setPackageDestination(destination);
  }, [setPackageDestination]);

  /**
   * Set search criteria
   */
  const setSearchCriteria = useCallback((criteria: PackageSearchCriteria | null) => {
    setPackageSearch(criteria);
  }, [setPackageSearch]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear results only
   */
  const clearResults = useCallback(() => {
    clearPackageResults();
    setAlternateFlights(null);
  }, [clearPackageResults, setAlternateFlights]);

  /**
   * Clear all package state
   */
  const clearAll = useCallback(() => {
    clearPackageState();
    setError(null);
  }, [clearPackageState]);

  /**
   * Build search criteria from user inputs
   */
  const buildSearchCriteria = useCallback((params: {
    departureCode: string;
    departureName: string;
    destination: HolidayDestination;
    checkIn: string;
    nights: number;
    rooms: RoomConfiguration[];
    directFlightsOnly?: boolean;
    hotelFilters?: HolidayHotelFilters;
  }): PackageSearchCriteria => {
    return packageService.buildSearchCriteria(params);
  }, []);

  /**
   * Calculate total passengers from room configurations
   */
  const calculateTotalPassengers = useCallback((rooms: Array<{ adults: number; children: number; infants: number }>) => {
    return packageService.calculateTotalPassengers(rooms);
  }, []);

  /**
   * Format price difference for display
   */
  const formatPriceDifference = useCallback((diff: number, currency: string = 'GBP') => {
    return packageService.formatPriceDifference(diff, currency);
  }, []);

  return {
    // State
    packageSearch,
    packageDestination,
    packages,
    meta,
    alternateFlights,
    selectedPackage,
    selectedRoomIds,

    // Loading and error
    loading,
    destinationLoading,
    error,

    // Actions
    lookupDestinations,
    searchPackages,
    getAlternateFlights,
    selectAlternateFlight,
    getPackageDetails,
    selectPackage,
    selectRooms,
    setDestination,
    setSearchCriteria,
    clearError,
    clearResults,
    clearAll,

    // Helpers
    buildSearchCriteria,
    calculateTotalPassengers,
    formatPriceDifference,
  };
}

// Re-export types for convenience
export type {
  HolidayDestination,
  PackageSearchCriteria,
  PackageSearchResult,
  PackageResultsMeta,
  SelectedPackage,
  TransformedAlternateFlight,
  HolidayHotelFilters,
  RoomConfiguration,
};
