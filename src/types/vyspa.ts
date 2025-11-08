/**
 * Vyspa API Type Definitions
 * Types for Vyspa flight search API request and response structures
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Vyspa API search parameters (version 2)
 */
export interface VyspaSearchParams {
  version: '2';
  departure_airport: string;
  arrival_airport: string;
  departure_date: string; // YYYY-MM-DD format
  return_date?: string; // YYYY-MM-DD format
  adults: string;
  children: string;
  child_ages: string[];
  direct_flight_only: '0' | '1';
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
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Individual flight within a segment
 */
export interface VyspaFlight {
  airline_code: string;
  airline_name: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string; // YYYY-MM-DD
  departure_time: string; // HHMM format (e.g., "1330")
  arrival_date: string; // YYYY-MM-DD
  arrival_time: string; // HHMM format (e.g., "1605")
  cabin_class: string;
  travel_time: number | string; // minutes
  distance?: number | string;
  aircraft_type?: string;
  departure_terminal?: string;
  arrival_terminal?: string;
  fare_class?: string;
  FareBasis?: string;
  operating_carrier?: string;
  available_seats?: number | string;
  refundable?: '0' | '1';
  refundable_text?: string;
  BaggageQuantity?: string;
  BaggageUnit?: string;
  Bdown?: string; // Price breakdown string format: "ADT~2~143.00~252.92~0.00~0.00~395.92~0"
}

/**
 * Flight segment (one leg of journey)
 */
export interface VyspaSegment {
  Route: string; // e.g., "LHRJFK" or "LHRIST"
  FlyingTime: number; // total flying time in minutes
  Stops: number; // number of stops
  Flights: VyspaFlight[]; // array of flights (multiple if connections)
}

/**
 * Price breakdown by passenger type
 */
export interface VyspaPriceBreakdown {
  pax_type: string; // "ADT" (adult), "CHD" (child), "INF" (infant)
  total_pax: string; // number of passengers of this type
  total: string; // total price for all passengers of this type
}

/**
 * Single flight result from Vyspa API
 */
export interface VyspaResult {
  Result_id: string; // Unique identifier for this result
  module_id: string; // Supplier/module identifier
  Total: string; // Total price for all passengers
  currency_code: string; // Currency code (USD, GBP, EUR, INR, etc.)
  Deep_link?: string; // Optional deep link for booking
  Baggage?: string; // Baggage allowance
  Breakdown?: VyspaPriceBreakdown[]; // Price breakdown by passenger type
  Segments: VyspaSegment[]; // Journey segments (outbound, return)
}

/**
 * Vyspa API response
 */
export interface VyspaApiResponse {
  Results?: VyspaResult[];
  error?: string; // Error message if request failed
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
