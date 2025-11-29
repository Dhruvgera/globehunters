/**
 * Type definitions for Vyspa Price Check API
 * 
 * The price check endpoint returns detailed flight information including:
 * - Detailed pricing breakdown by passenger type
 * - Flight segment details with baggage information
 * - Potential upgrade options (different cabin classes/fare types)
 * - Fare rules and restrictions
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Price check request parameters
 */
export interface PriceCheckRequest {
  /** Reference ID for the segment result from flight search */
  segment_psw_result1: number;
  /** Optional: Reference ID for second segment (multi-city) */
  segment_psw_result2?: number;
  /** Optional: Reference ID for third segment (multi-city) */
  segment_psw_result3?: number;
}

// ============================================================================
// Response Types - Main Structure
// ============================================================================

/**
 * Main price check API response
 */
export interface PriceCheckResponse {
  success: number;
  message: string;
  priceCheck: PriceCheckData;
}

/**
 * Price check data container
 */
export interface PriceCheckData {
  success: number;
  confirmFolder: string;
  fold_no: string;
  flight_data: FlightData;
  price_data: PriceData[];
  passengers: string | PassengerData[];
  sessionId: string;
  bpc_request_id: string;
  psc_request_id: string;
  gds: string;
  ChooseSupplier: string;
  filetype: string;
  psw_result_id: string;
  OptionDate: string;
}

// ============================================================================
// Flight Data Types
// ============================================================================

/**
 * Flight data container
 */
export interface FlightData {
  result: FlightResult;
  flights: FlightSegment[];
  passengers?: PassengerData[];
}

/**
 * Flight result summary
 */
export interface FlightResult {
  FlightPswResult: FlightPswResult;
  FlightPublished: FlightPublished;
}

/**
 * PSW flight result details
 */
export interface FlightPswResult {
  id: string;
  psc_request_id: string;
  Origin: string;
  Destination: string;
  base_fare: string;
  tax: string;
  total_fare: string;
  iso_currency_code: string;
  fare_type: string;
  FareCat: string; // Fare category (e.g., "IT" for inclusive tour)
  Designator: string;
  pax_type_count: string;
  last_ticket_date: string;
  ticket_advisory: string;
  flight_count: string;
  trip_count: string;
  created: string;
  folder_id: string;
  sent_to_folder: string;
  updated: string;
  gds: string;
  isLowest: string;
  itinerary_id: string;
  markupAmt: string;
  CommissionAmount: string;
  segment1_elapse_flying_time: string;
  segment1_majority_carrier: string;
  segment2_elapse_flying_time: string;
  segment2_majority_carrier: string;
  segment3_elapse_flying_time?: string;
  segment3_majority_carrier?: string;
  validating_carrier: string;
  segment4_elapse_flying_time?: string;
  segment4_majority_carrier?: string;
  segment5_elapse_flying_time?: string;
  segment5_majority_carrier?: string;
  segment6_elapse_flying_time?: string;
  segment6_majority_carrier?: string;
  search_session_id: string;
  config_id: string;
  avlSeats: string;
  refundable: string;
  module_id: string;
  account_code: string;
}

/**
 * Published flight search details
 */
export interface FlightPublished {
  id: string;
  session_id: string;
  departure_date: string;
  return_date: string;
  departure_airport_id: string;
  arrival_airport_id: string;
  departure_time: string;
  arrival_time: string;
  ticket_type: string;
  adults: string;
  children: string;
  seniors: string;
  misc_pax_num: string;
  misc_pax_type: string;
  airline_preference: string;
  airlines: string;
  cabin_class: string;
  cabin2_class: string;
  cabin3_class: string;
  cabin4_class: string;
  cabin5_class: string;
  cabin6_class: string;
  number_of_alternates: string;
  direct_flight_only: string;
  exclude_penalty_fares: string;
  use_direct_access: string;
  include_multi_airports: string;
  online_connections_only: string;
  only_it_fares: string;
  fares_indicator: string;
  outbound_time_qualifier: string;
  return_time_qualifier: string;
  psc_request: string;
  psw_response: string;
  psw_results: string;
  staff_id: string;
  status: string;
  error_message: string;
  searched_fare_types: string;
  selected_gds: string;
  trip_ninja_search: string;
  created: string;
  modified: string;
  arrival2_airport_id: string;
  arrival3_airport_id: string;
  calendar_search: string;
  departure2_airport_id: string;
  departure2_date: string;
  departure3_airport_id: string;
  departure3_date: string;
  exclude_connection: string;
  exclude_intracity_connection: string;
  infants: string;
  via1_airport_id: string;
  child_ages: string;
  infant_seats: string;
  searchSourceId: string;
  branchSearched: string;
  arrival4_airport_id: string;
  departure4_airport_id: string;
  departure4_date: string;
  arrival5_airport_id: string;
  departure5_airport_id: string;
  departure5_date: string;
  arrival6_airport_id: string;
  departure6_airport_id: string;
  departure6_date: string;
}

/**
 * Individual flight segment
 */
export interface FlightSegment {
  FlightPswFlightnew: FlightPswFlightnew;
  Link: FlightLink;
}

/**
 * PSW flight segment details
 */
export interface FlightPswFlightnew {
  id: string;
  key: string; // e.g., "BA0105"
  link_indicator: string;
  airline_code: string;
  flight_number: string;
  fare_class: string;
  distance: string;
  travel_time: string; // in minutes
  flight_date: string; // e.g., "01Dec"
  flight_day: string; // e.g., "Mon"
  departure_terminal: string;
  arrival_terminal: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string; // YYYY-MM-DD
  arrival_date: string; // YYYY-MM-DD
  departure_time: string; // HHMM format
  arrival_time: string; // HHMM format
  day_change_indicator: string;
  dep_arr_date_diff: string;
  aircraft_type: string;
  meal_type: string;
  number_stops: string;
  etk_eligible: string;
  code_share_info: string;
  operating_carrier: string;
  segment_old: string;
  segment: string; // segment number
  created: string;
}

/**
 * Flight link/fare details
 */
export interface FlightLink {
  is_connection: string;
  FareBasis: string;
  CabinClass: string; // e.g., "M" for Economy
  Baggage: string; // e.g., "1p" (1 piece)
  fare_class: string;
  FareRuleKey: string;
  FareInfoRef: string;
  segment: string;
}

// ============================================================================
// Price Data Types (Upgrade Options)
// ============================================================================

/**
 * Price data with potential upgrade options
 */
export interface PriceData {
  pricingArr: PricingBreakdown[];
  Total_Fare: TotalFare;
  baggageTxt: string[];
  infotext: string[];
  CabinClass: string;
  BookingCode: string;
  BrandInfo: BrandInfo[];
  brandText: string[];
}

/**
 * Pricing breakdown by passenger type
 */
export interface PricingBreakdown {
  passengers: string; // number of passengers
  paxtype: string; // "ADT" (adult), "CHD" (child), "INF" (infant)
  base: string; // base fare
  gross: string; // gross fare (base + tax for one pax)
  base_cur: string; // base currency
  sellcurr: string; // selling currency
  total: string; // total for all passengers of this type
  tax: string; // tax amount
  last_ticket_date: string;
}

/**
 * Total fare summary
 */
export interface TotalFare {
  base: string;
  basecurr: string;
  AgtNet: string; // Agent net price
  markup: string;
  comm: string; // Commission
  gross: string;
  sellcurr: string;
  total: string;
  tax: string;
  taxcurr: string;
  BookingCode: string;
  CabinClass: string;
  Name: string;
  Atol_fee: string;
  Atol_count: string;
  SAFI: string;
  OptionalService?: {
    Type?: string;
    Tag?: string;
    Chargeable?: string;
    text?: string;
    DisplayOrder?: number;
    Key?: string;
    ServiceSubCode?: string;
    SecondaryType?: string;
  }[];
}

/**
 * Brand information for fare
 */
export interface BrandInfo {
  airline?: string;
  brandName?: string;
  features?: string[];
}

// ============================================================================
// Passenger Data Types
// ============================================================================

/**
 * Passenger information
 */
export interface PassengerData {
  type: 'ADT' | 'CHD' | 'INF';
  count: number;
  title?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
}

// ============================================================================
// Transformed/UI Types
// ============================================================================

/**
 * Transformed price option for UI display
 */
export interface TransformedPriceOption {
  id: string;
  cabinClass: string;
  cabinClassDisplay: string; // "Economy", "Premium Economy", "Business", "First"
  bookingCode: string;
  totalPrice: number;
  pricePerPerson: number;
  currency: string;
  baseFare: number;
  taxes: number;
  markup: number;
  commission: number;
  atolFee: number;
  passengerBreakdown: {
    type: string;
    count: number;
    basePrice: number;
    totalPrice: number;
    taxesPerPerson: number;
  }[];
  baggage: {
    description: string;
    details?: string;
    perLeg?: { route: string; allowance: string }[];
  };
  brandInfo?: BrandInfo[];
  isUpgrade: boolean; // true if this is an upgrade from base fare
  priceDifference?: number; // difference from base fare
}

/**
 * Complete price check result for UI
 */
export interface PriceCheckResult {
  success: boolean;
  message?: string;
  /** Raw API response for debugging (only included when NEXT_PUBLIC_DEBUG_FLIGHT_IDS=true) */
  rawResponse?: PriceCheckResponse;
  flightDetails: {
    id: string;
    origin: string;
    destination: string;
    validatingCarrier: string;
    lastTicketDate: string;
    /** true if any form of refund is available (codes 1, 3, 4) */
    refundable: boolean;
    /** Detailed refund status: 'non-refundable' | 'refundable' | 'refundable-with-penalty' | 'fully-refundable' */
    refundableStatus: 'non-refundable' | 'refundable' | 'refundable-with-penalty' | 'fully-refundable';
    /** Human-readable refund description */
    refundableText: string;
    changeable: boolean;
    seatSelectionFree: boolean;
    availableSeats: string;
    segments: {
      segmentNumber: number;
      flights: {
        airline: string;
        flightNumber: string;
        departureAirport: string;
        arrivalAirport: string;
        departureDate: string;
        departureTime: string;
        arrivalDate: string;
        arrivalTime: string;
        duration: string; // in minutes
        cabinClass: string;
        aircraft: string;
        baggage: string;
        fareBasis: string;
        terminal?: {
          departure?: string;
          arrival?: string;
        };
      }[];
    }[];
  };
  priceOptions: TransformedPriceOption[];
  sessionInfo: {
    sessionId: string;
    pscRequestId: string;
    pswResultId: string;
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Price check error
 */
export interface PriceCheckError {
  type: 'NETWORK_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  details?: any;
}



