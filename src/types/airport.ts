/**
 * Airport Type Definitions
 */

export interface Airport {
  code: string; // IATA code (e.g., "LHR")
  city: string; // City name
  country: string; // Country name
  countryCode: string; // ISO2 code (e.g., "GB")
}

export interface AirportSearchResult extends Airport {
  matchScore: number; // For ranking results
  matchedFields: string[]; // Which fields matched the search
}

export interface VyspaAirportResponse {
  id: string; // Airport IATA code
  city?: string;
  country?: string; // Country name
  country_code?: string; // ISO2 code
}
