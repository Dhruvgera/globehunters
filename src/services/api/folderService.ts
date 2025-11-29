/**
 * Folder Service
 * Handles folder creation and adding items (flights, hotels, transfers, cars) to folders
 * 
 * This service is used for the "Add to Folder" API which adds travel components
 * (flights, hotels, transfers, cars) to an existing folder/booking.
 */

import {
  AddToFolderRequest,
  AddToFolderResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  FolderPassenger,
  FlightRequestItem,
  FlightBookingDetails,
  PassengerDetails,
  PassengerType,
  PassengerTitle,
  SeatSelection,
} from '@/types/folder';

/**
 * Convert passenger details to folder passenger format
 */
export function toFolderPassenger(
  passenger: PassengerDetails,
  index: number
): FolderPassenger {
  return {
    pax_no: index + 1,
    title: passenger.title,
    first_name: passenger.firstName,
    middle_name: passenger.middleName || '',
    last_name: passenger.lastName,
    birth_date: passenger.dateOfBirth,
    pax_type: passenger.type,
    api_gender: passenger.gender,
    nationality: passenger.nationality,
    passport_number: passenger.passportNumber,
    passport_expiry: passenger.passportExpiry,
    passport_country: passenger.passportCountry,
  };
}

/**
 * Build flight request item for adding to folder
 */
export function buildFlightRequestItem(
  flightDetails: FlightBookingDetails,
  passengerIndices: number[]
): FlightRequestItem {
  return {
    type: 'flight',
    psw_result_id: flightDetails.pswResultId,
    passengers: passengerIndices.join(','),
    fare_selected_price: String(flightDetails.farePrice),
    brandid: flightDetails.brandId ?? 0,
    optionalServices: flightDetails.optionalServices,
    seats: flightDetails.seats,
  };
}

/**
 * Get appropriate title based on passenger type and gender
 */
export function getPassengerTitle(
  type: PassengerType,
  gender: 'M' | 'F',
  existingTitle?: string
): PassengerTitle {
  // If a valid title is provided, use it
  if (existingTitle && ['Mr', 'Mrs', 'Ms', 'Mstr', 'Miss'].includes(existingTitle)) {
    return existingTitle as PassengerTitle;
  }

  // For children
  if (type === 'CHD' || type === 'INF') {
    return gender === 'M' ? 'Mstr' : 'Miss';
  }

  // For adults
  return gender === 'M' ? 'Mr' : 'Mrs';
}

class FolderService {
  /**
   * Add items to an existing folder
   * This is the main method for adding flights, hotels, transfers, cars to a folder
   * Calls the Next.js API route which handles Vyspa authentication
   */
  async addToFolder(request: AddToFolderRequest): Promise<AddToFolderResponse> {
    try {
      console.log('[FolderService] Adding to folder:', {
        folderNumber: request.folderNumber,
        itineraryNumber: request.itineraryNumber,
        passengerCount: request.passengers.length,
        itemCount: request.requestData.length,
      });

      // Call the Next.js API route which handles Vyspa authentication
      const response = await fetch('/api/vyspa/add-to-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[FolderService] API error:', data);
        return {
          success: false,
          message: data.message || 'Failed to add items to folder',
          errors: data.errors || [data.error || 'Unknown error'],
          rawResponse: data,
        };
      }

      console.log('[FolderService] Successfully added to folder:', data);

      return {
        success: true,
        message: 'Items added to folder successfully',
        folderNumber: request.folderNumber,
        itineraryNumber: String(request.itineraryNumber),
        rawResponse: data,
      };
    } catch (error) {
      console.error('[FolderService] Error adding to folder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add items to folder',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Add a flight to an existing folder
   * Convenience method for adding just a flight
   */
  async addFlightToFolder(params: {
    folderNumber: number;
    itineraryNumber: string | number;
    currency: string;
    passengers: PassengerDetails[];
    flight: FlightBookingDetails;
    travelPurpose?: string;
    comments?: string[];
    setAsPreferred?: boolean;
  }): Promise<AddToFolderResponse> {
    // Convert passengers to folder format
    const folderPassengers = params.passengers.map((p, i) => toFolderPassenger(p, i));

    // Build passenger indices (1-based)
    const passengerIndices = params.passengers.map((_, i) => i + 1);

    // Build flight request item
    const flightItem = buildFlightRequestItem(params.flight, passengerIndices);

    const request: AddToFolderRequest = {
      folderNumber: params.folderNumber,
      itineraryNumber: params.itineraryNumber,
      foldcur: params.currency,
      travelPurpose: params.travelPurpose || 'Holiday',
      comments: params.comments,
      set_as_preferred_itinerary: params.setAsPreferred ?? true,
      passengers: folderPassengers,
      requestData: [flightItem],
    };

    return this.addToFolder(request);
  }

  /**
   * Create a new folder (booking)
   * Note: This may require a separate API endpoint - implement when available
   */
  async createFolder(request: CreateFolderRequest): Promise<CreateFolderResponse> {
    try {
      console.log('[FolderService] Creating folder for:', request.leadPassenger.first_name);

      // TODO: Implement actual folder creation API call
      // The API endpoint for folder creation may be different
      // For now, return a placeholder response

      return {
        success: false,
        message: 'Folder creation API not yet implemented',
        error: 'NOT_IMPLEMENTED',
      };
    } catch (error) {
      console.error('[FolderService] Error creating folder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create folder',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build a complete AddToFolderRequest from booking context
   * This is a helper to construct the request from typical booking flow data
   */
  buildAddToFolderRequest(params: {
    folderNumber: number;
    itineraryNumber?: string | number;
    currency: string;
    passengers: PassengerDetails[];
    flights?: FlightBookingDetails[];
    travelPurpose?: string;
    comments?: string[];
    setAsPreferred?: boolean;
  }): AddToFolderRequest {
    // Convert passengers to folder format
    const folderPassengers = params.passengers.map((p, i) => toFolderPassenger(p, i));

    // Build passenger indices (1-based)
    const passengerIndices = params.passengers.map((_, i) => i + 1);

    // Build request data items
    const requestData = [];

    // Add flights
    if (params.flights) {
      for (const flight of params.flights) {
        requestData.push(buildFlightRequestItem(flight, passengerIndices));
      }
    }

    return {
      folderNumber: params.folderNumber,
      itineraryNumber: params.itineraryNumber ?? '1',
      foldcur: params.currency,
      travelPurpose: params.travelPurpose || 'Holiday',
      comments: params.comments,
      set_as_preferred_itinerary: params.setAsPreferred ?? true,
      passengers: folderPassengers,
      requestData,
    };
  }

  /**
   * Format seat selection for API
   * Seat value format: "row-seat***currency+price***pax_segment_index***pax_type"
   * Example: "4-A***GBP22.99***pax_0_0***ADT"
   */
  formatSeatSelection(params: {
    seatName: string; // e.g., "LTNAGP1" (route + leg identifier)
    row: string;
    seat: string;
    currency: string;
    price: number;
    passengerIndex: number; // 0-based
    segmentIndex: number; // 0-based
    passengerType: PassengerType;
  }): SeatSelection {
    return {
      name: params.seatName,
      value: `${params.row}-${params.seat}***${params.currency}${params.price.toFixed(2)}***pax_${params.segmentIndex}_${params.passengerIndex}***${params.passengerType}`,
    };
  }
}

// Export singleton instance
export const folderService = new FolderService();

// Export types for convenience
export type {
  AddToFolderRequest,
  AddToFolderResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  FolderPassenger,
  FlightRequestItem,
  FlightBookingDetails,
  PassengerDetails,
  SeatSelection,
};
