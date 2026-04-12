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
  ConfirmItineraryRequest,
  ConfirmItineraryResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  FolderPassenger,
  FlightRequestItem,
  HotelRequestItem,
  FlightBookingDetails,
  HotelBookingDetails,
  PassengerDetails,
  PassengerType,
  PassengerTitle,
  SeatSelection,
  HotelRoomPassengers,
} from '@/types/folder';

/**
 * Convert passenger details to folder passenger format
 */
function toFolderPassenger(
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
function buildFlightRequestItem(
  flightDetails: FlightBookingDetails,
  passengerIndices: number[]
): FlightRequestItem {
  const item: FlightRequestItem = {
    type: 'flight',
    psw_result_id: flightDetails.pswResultId,
    passengers: passengerIndices.join(','),
    fare_selected_price: String(flightDetails.farePrice),
    brandid: flightDetails.brandId ?? 0,
    optionalServices: flightDetails.optionalServices,
    seats: flightDetails.seats,
  };

  // Add holiday_package flag if this is part of a package booking
  if (flightDetails.holidayPackage) {
    item.holiday_package = flightDetails.holidayPackage;
  }

  return item;
}

/**
 * Build hotel request item for adding to folder
 */
function buildHotelRequestItem(
  hotelDetails: HotelBookingDetails
): HotelRequestItem {
  const item: HotelRequestItem = {
    type: 'hotel',
    search_result_id: hotelDetails.searchResultId,
    roomCodes: hotelDetails.roomIds.join(','),
    roomIds: hotelDetails.roomIds.join(','),
    passengers: hotelDetails.roomPassengers,
  };

  // Add holiday_package flag if this is part of a package booking
  if (hotelDetails.holidayPackage) {
    item.holiday_package = hotelDetails.holidayPackage;
  }

  return item;
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

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async confirmItinerary(request: ConfirmItineraryRequest): Promise<ConfirmItineraryResponse> {
    return { success: false, message: '' };
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
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
    return { success: false, message: '' };
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async createFolder(request: CreateFolderRequest): Promise<CreateFolderResponse> {
    return { success: false, message: '', error: '' };
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  buildAddToFolderRequest(params: {
    folderNumber: number;
    itineraryNumber?: string | number;
    currency: string;
    passengers: PassengerDetails[];
    flights?: FlightBookingDetails[];
    hotels?: HotelBookingDetails[];
    travelPurpose?: string;
    comments?: string[];
    setAsPreferred?: boolean;
  }): AddToFolderRequest {
    return {} as AddToFolderRequest;
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async addPackageToFolder(params: {
    folderNumber: number;
    itineraryNumber: string | number;
    currency: string;
    passengers: PassengerDetails[];
    flight: FlightBookingDetails;
    hotel: HotelBookingDetails;
    travelPurpose?: string;
    comments?: string[];
    setAsPreferred?: boolean;
  }): Promise<AddToFolderResponse> {
    return { success: false, message: '' };
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  formatSeatSelection(params: {
    seatName: string;
    row: string;
    seat: string;
    currency: string;
    price: number;
    passengerIndex: number;
    segmentIndex: number;
    passengerType: PassengerType;
  }): SeatSelection {
    return { name: '', value: '' };
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
  HotelRequestItem,
  FlightBookingDetails,
  HotelBookingDetails,
  HotelRoomPassengers,
  PassengerDetails,
  SeatSelection,
};
