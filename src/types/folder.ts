/**
 * Folder/Itinerary Types
 * Types for folder creation and adding items to folders
 */

// ============================================================================
// Passenger Types
// ============================================================================

export type PassengerTitle = 'Mr' | 'Mrs' | 'Ms' | 'Mstr' | 'Miss';
export type PassengerType = 'ADT' | 'CHD' | 'INF';
export type Gender = 'M' | 'F';

export interface FolderPassenger {
  /** Passenger sequence order number (1-based). pax_no 1 is the lead passenger */
  pax_no?: number;
  /** Title: Mr, Mrs, Ms for adults; Mstr, Miss for children */
  title: PassengerTitle;
  /** First/given name */
  first_name: string;
  /** Middle name (may be empty) */
  middle_name?: string;
  /** Last name/surname */
  last_name: string;
  /** Date of birth (YYYY-MM-DD). Optional for ADT, mandatory for CHD */
  birth_date?: string;
  /** Passenger type: ADT (Adult), CHD (Child), INF (Infant) */
  pax_type: PassengerType;
  /** Gender for APIS */
  api_gender: Gender;
  /** Email address (required for lead passenger) */
  email?: string;
  /** Phone number */
  phone?: string;
  /** Nationality (ISO country code) */
  nationality?: string;
  /** Passport number */
  passport_number?: string;
  /** Passport expiry date (YYYY-MM-DD) */
  passport_expiry?: string;
  /** Passport issuing country (ISO country code) */
  passport_country?: string;
}

// ============================================================================
// Request Data Item Types
// ============================================================================

export interface SeatSelection {
  /** Seat selection identifier (direction/leg) */
  name: string;
  /** Opaque seat selection payload (includes seat, price, pax ref, pax type) */
  value: string;
}

export interface FlightRequestItem {
  type: 'flight';
  /** Flight result ID to book/price (psw_result_id from price check) */
  psw_result_id: number | string;
  /** Comma-separated passenger indices (1-based) to include */
  passengers: string;
  /** Price selected for the fare, up to 2 decimal places */
  fare_selected_price: string;
  /** Selected brand option ID for the flight item */
  brandid?: number | string;
  /** Seat selections tied to this item */
  seats?: SeatSelection[];
  /** Selected ancillary/optional service keys for the flight item */
  optionalServices?: string[];
  /** Flag to mark flight as part of a package (1=yes) */
  holiday_package?: number;
}

export interface HotelRoomPassengers {
  /** Room ID mapped to comma-separated passenger indices */
  [roomId: string]: string;
}

export interface HotelRequestItem {
  type: 'hotel';
  /** Hotel search result ID */
  search_result_id?: string;
  /** Comma-separated room IDs */
  roomIds: string;
  /** Room to passenger mapping */
  passengers: HotelRoomPassengers;
  /** Flag to mark hotel as part of a package (1=yes) */
  holiday_package?: number;
}

export interface TransferRequestItem {
  type: 'transfer';
  /** Transfer ID */
  transfer_id: string;
  /** Transfer date (YYYY-MM-DD) */
  transferDate: string;
  /** Return date (YYYY-MM-DD) */
  returndate?: string;
  /** Is return transfer: 1=one-way, 2=return */
  is_return?: string;
  /** Comma-separated passenger indices */
  passengers: string;
  /** Total price for transfer */
  sumPrice: string;
  /** Pickup point name */
  transferpoint_name: string;
  /** Drop-off point name */
  transferpointto_name: string;
  /** XML flag */
  xml?: number;
}

export interface CarRequestItem {
  type: 'car';
  /** Search criteria ID */
  searchCriteriaId: string;
  /** Search result ID */
  searchResultId: string;
  /** Number of booster seats */
  booster_seat?: string;
  /** Number of child seats */
  child_seat?: string;
  /** Airline name for flight connection */
  airline_name?: string;
  /** Arrival flight number */
  arrival_flight_num?: string;
}

export type RequestDataItem = 
  | FlightRequestItem 
  | HotelRequestItem 
  | TransferRequestItem 
  | CarRequestItem;

// ============================================================================
// Add to Folder Request
// ============================================================================

export interface AddToFolderRequest {
  /** Existing folder/booking number */
  folderNumber: number;
  /** Itinerary index within the folder */
  itineraryNumber: string | number;
  /** Folder/base currency (ISO 4217, e.g., GBP) */
  foldcur: string;
  /** Trip purpose label (e.g., Holiday, Business) */
  travelPurpose?: string;
  /** Free-form comments attached to the itinerary */
  comments?: string[];
  /** Whether to mark this itinerary as preferred */
  set_as_preferred_itinerary?: boolean;
  /** Passenger list in booking order; indices are referenced by request items */
  passengers: FolderPassenger[];
  /** Line items to add to the itinerary (flights, hotels, transfers, cars) */
  requestData: RequestDataItem[];
}

// ============================================================================
// Add to Folder Response
// ============================================================================

export interface AddToFolderResponse {
  success: boolean;
  message?: string;
  /** Folder number */
  folderNumber?: number;
  /** Itinerary number */
  itineraryNumber?: string;
  /** Any errors that occurred */
  errors?: string[];
  /** Raw API response for debugging */
  rawResponse?: unknown;
}

// ============================================================================
// Create Folder Request/Response (for initial folder creation)
// ============================================================================

export interface CreateFolderRequest {
  /** Lead passenger details */
  leadPassenger: FolderPassenger;
  /** Currency for the folder */
  currency: string;
  /** Trip purpose */
  travelPurpose?: string;
  /** Branch/agent code */
  branchCode?: string;
}

export interface CreateFolderResponse {
  success: boolean;
  message?: string;
  /** Created folder number */
  folderNumber?: number;
  /** Error details if failed */
  error?: string;
}

// ============================================================================
// Helper Types for Building Requests
// ============================================================================

export interface FlightBookingDetails {
  /** PSW result ID from price check */
  pswResultId: number | string;
  /** Brand ID (0 for default/cheapest) */
  brandId?: number | string;
  /** Selected fare price */
  farePrice: number | string;
  /** Optional services keys */
  optionalServices?: string[];
  /** Seat selections */
  seats?: SeatSelection[];
}

export interface PassengerDetails {
  title: PassengerTitle;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  type: PassengerType;
  gender: Gender;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportCountry?: string;
}
