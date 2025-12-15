/**
 * Vyspa API Type Definitions
 * Types for Vyspa flight search API request and response structures
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Vyspa API search parameters (version 2 or 3)
 */
export interface VyspaSearchParams {
  version: '2' | '3';
  departure_airport: string;
  arrival_airport: string;
  departure_date: string; // YYYY-MM-DD format
  return_date?: string; // YYYY-MM-DD format
  adults: string;
  children: string;
  child_ages: string[];
  infants: string; // Required: Number of infants (API expects string digits)
  direct_flight_only: '0' | '1';
  /**
   * One-letter cabin class code for outbound flight:
   * M - Economy, W - Premium, C - Business, F - First
   */
  cabin_class?: string;
  /**
   * One-letter cabin class code for inbound flight (round trips)
   */
  inbound_cabin_class?: string;

  // --------------------------------------------------------------------------
  // Multi-city extensions: additional segments (up to 6 total)
  // These map directly to the REST v4 flights_availability_search parameters.
  // --------------------------------------------------------------------------
  departure2_airport?: string;
  arrival2_airport?: string;
  departure2_date?: string;
  cabin2_class?: string;

  departure3_airport?: string;
  arrival3_airport?: string;
  departure3_date?: string;
  cabin3_class?: string;

  departure4_airport?: string;
  arrival4_airport?: string;
  departure4_date?: string;
  cabin4_class?: string;

  departure5_airport?: string;
  arrival5_airport?: string;
  departure5_date?: string;
  cabin5_class?: string;

  departure6_airport?: string;
  arrival6_airport?: string;
  departure6_date?: string;
  cabin6_class?: string;

  // Optional pagination and filtering
  limit?: number; // Maximum number of results to return
  page?: number; // Page number for paginated results
}

/**
 * Vyspa API request payload
 */
export interface VyspaApiRequest {
  username: string;
  password: string;
  token: string;
  method: 'flights_availability_search';
  params: string; // JSON stringified VyspaSearchParams[]
}

/**
 * Frontend flight search request (from search form)
 */
export interface FlightSearchRequest {
  origin1: string;
  destinationid: string;
  fr: string; // DD/MM/YYYY format
  to?: string; // DD/MM/YYYY format
  adt1: string; // number of adults
  chd1: string; // number of children
  inf1?: string; // number of infants
  ow: '0' | '1'; // 0 = round trip, 1 = one way
  dir: '0' | '1'; // 0 = any flights, 1 = direct only
  cl: string; // cabin class
  aff?: string; // affiliate code (optional)
  cip?: string; // client IP (optional)

  // --------------------------------------------------------------------------
  // Multi-city extensions: additional legs (up to 6 total)
  // These are converted into departureN_/arrivalN_/departureN_date fields.
  // Dates are in DD/MM/YYYY format, consistent with `fr`.
  // --------------------------------------------------------------------------
  origin2?: string;
  destination2?: string;
  fr2?: string;
  origin3?: string;
  destination3?: string;
  fr3?: string;
  origin4?: string;
  destination4?: string;
  fr4?: string;
  origin5?: string;
  destination5?: string;
  fr5?: string;
  origin6?: string;
  destination6?: string;
  fr6?: string;
}

// ============================================================================
// Response Types (v1 and v3 compatible)
// ============================================================================

/**
 * Individual flight within a segment
 * Compatible with both API v1 and v3 response formats
 */
export interface VyspaFlight {
  airline_code: string;
  airline_name: string;
  flight_number: string | number;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string; // YYYY-MM-DD
  departure_time: string | number; // HHMM format: "1330" (v1) or 1330 (v3)
  arrival_date: string; // YYYY-MM-DD
  arrival_time: string | number; // HHMM format: "1605" (v1) or 1605 (v3)
  cabin_class: string;
  travel_time: number | string; // minutes
  distance?: number | string;
  aircraft_type?: string | number;
  departure_terminal?: string | number;
  arrival_terminal?: string | number;
  fare_class?: string;
  FareBasis?: string; // v1 format
  fare_basis?: string; // v3 format (lowercase)
  operating_carrier?: string;
  operating_airline_code?: string; // v3 format
  operating_airline_name?: string; // v3 format
  available_seats?: number | string;
  // Refundable codes: 1=Refundable, 2=Non-Refundable, 3=RefundableWithPenalty, 4=FullyRefundable
  refundable?: number | string;
  refundable_text?: string;
  Baggage?: string; // v1 format
  baggage?: string; // v3 format (lowercase)
  BaggageQuantity?: string;
  BaggageUnit?: string;
  Bdown?: string; // Price breakdown string format: "ADT~2~143.00~252.92~0.00~0.00~395.92~0"
  // v3 additional fields
  class_name?: string; // e.g., "Economy"
  cabin_type?: number; // e.g., 4 for Economy
  dep_arr_date_diff?: number; // Date difference between departure and arrival
  code_share_info?: string;
}

/**
 * Flight segment (one leg of journey)
 * Compatible with both API v1 and v3 response formats
 */
export interface VyspaSegment {
  Route: string; // e.g., "LHRJFK" or "LHRDXB"
  FlyingTime?: number; // v1: total flying time in minutes
  Flying_time?: number; // v3: total flying time in minutes (different casing)
  Stops: number; // number of stops
  Flights: VyspaFlight[]; // array of flights (multiple if connections)
  // v3 additional fields
  Segment_number?: number; // v3: segment number (1, 2, etc.)
  Total_travel_time?: number; // v3: total travel time including layovers
  Majority_carrier?: string; // v3: majority carrier code
}

/**
 * Price breakdown by passenger type (v1 format)
 */
export interface VyspaPriceBreakdown {
  pax_type: string; // "ADT" (adult), "CHD" (child), "INF" (infant)
  total_pax: string; // number of passengers of this type
  total: string; // total price for all passengers of this type
}

/**
 * Passenger breakdown (v3 format)
 * More detailed pricing per passenger type
 */
export interface VyspaPaxBreakdown {
  pax_type: string; // "ADT", "CHD", "INF"
  pax_count: number; // number of passengers
  base_fare: number;
  tax: number;
  total_fare: number;
  markup: number;
  commission: number;
  markup_ids: string;
  baggage: string[]; // Array of baggage allowances (e.g., ["25kg"])
  fare_basis: string[]; // Array of fare basis codes
  ticket_designators: (string | null)[];
}

/**
 * Single flight result from Vyspa API
 * Compatible with both API v1 and v3 response formats
 */
export interface VyspaResult {
  // Result_id formats:
  // v1: numeric string like "940769580"
  // v3: compound string like "79596866-0-0-172" (requestId-segment-index-moduleId)
  Result_id: string;
  
  // Module ID - different casing between versions
  module_id?: string | number; // v1 format
  Module_id?: number; // v3 format
  
  // Total price - different types between versions
  Total: string | number; // v1: string, v3: number
  
  // Currency code - different casing between versions
  currency_code?: string; // v1 format
  Currency_code?: string; // v3 format
  
  Deep_link?: string; // Deep link for booking - contains flight= key for FlightView API
  Baggage?: string; // Baggage allowance
  
  // Price breakdown - different formats between versions
  Breakdown?: VyspaPriceBreakdown[]; // v1 format
  Pax_breakdown?: VyspaPaxBreakdown[]; // v3 format
  
  Segments: VyspaSegment[]; // Journey segments (outbound, return)
  
  // v3 additional fields
  Last_ticket_date?: string; // v3: last date to ticket (YYYY-MM-DD)
  Journey_type?: number; // v3: 1=one-way, 2=round-trip, etc.
  Fare_type?: string; // v3: fare type code (e.g., "PU")
  Validating_carrier?: string; // v3: validating carrier code
  validating_carrier?: string; // v1: validating carrier (lowercase)
  Gds?: string; // v3: GDS source code
  Total_fare?: string | number; // Alternative total fare field
}

/**
 * FlightView API Response (V3)
 * Returns detailed flight info including psw_result_id for price check
 */
export interface VyspaFlightViewResponse {
  Result_id: string;
  Total: number;
  psw_result_id: number; // This is what price_check needs!
  Currency_code: string;
  Gds: string;
  Deep_link: string;
  Last_ticket_date: string;
  Journey_type: number;
  Fare_type: string;
  Validating_carrier: string;
  Module_id: number;
  Pax_breakdown: VyspaPaxBreakdown[];
  Segments: VyspaSegment[];
}

/**
 * Vyspa API response
 */
export interface VyspaApiResponse {
  Request_id?: number; // Request ID from the API - used as web ref until folder is created
  Results?: VyspaResult[];
  error?: string; // Error message if request failed
  error_no?: number; // Error code if request failed
  message?: string; // Error message (alternative format)
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Vyspa API error types
 */
export enum VyspaErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NO_RESULTS = 'NO_RESULTS',
  TRANSFORMATION_ERROR = 'TRANSFORMATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error for Vyspa API operations
 */
export interface VyspaError {
  type: VyspaErrorType;
  message: string;
  userMessage: string; // User-friendly error message
  details?: any;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Transformation Types
// ============================================================================

/**
 * Intermediate flight data during transformation
 */
export interface TransformedFlightData {
  fareId: string;
  supplierInfo?: string;
  fareType: string;
  totalPrice: number;
  pricePerPerson: number;
  currencyCode: string;
  totalPassengers: number;
  breakdown?: VyspaPriceBreakdown[];
  deepLink?: string;
  baggage?: string;
  segments: VyspaSegment[];
}

// ============================================================================
// Currency Conversion Types (Optional)
// ============================================================================

/**
 * Currency conversion rates
 */
export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

/**
 * Supported currencies
 */
export type SupportedCurrency = 'USD' | 'GBP' | 'EUR' | 'INR' | 'AED' | 'CAD' | 'AUD';
