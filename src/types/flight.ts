export interface Airport {
  code: string;
  name: string;
  city: string;
}

export interface IndividualFlight {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  flightNumber?: string;
  carrierCode?: string;
  departureDate?: string; // Raw API date for debugging
  arrivalDate?: string;   // Raw API date for debugging
}

export interface FlightSegment {
  departureTime: string;
  arrivalTime: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  date: string;
  arrivalDate?: string; // Arrival date (may differ from departure for long flights)
  duration: string; // Total flying time (excluding layovers)
  totalJourneyTime?: string; // Total time including layovers
  stops: number;
  stopDetails?: string;
  carrierCode?: string;
  flightNumber?: string;
  cabinClass?: string;
  aircraftType?: string;
  distance?: string | number;
  departureTerminal?: string;
  arrivalTerminal?: string;
  layovers?: Array<{
    viaAirport: string;
    duration: string; // e.g., "2h 15m"
  }>;
  individualFlights?: IndividualFlight[]; // Individual flight legs with their durations
  segmentBaggage?: string;
  segmentBaggageQuantity?: string;
  segmentBaggageUnit?: string;
}

export interface Airline {
  name: string;
  logo: string;
  code: string;
}

export interface TicketOption {
  type: 'Eco Value' | 'Eco Classic' | 'Eco Flex';
  price: number;
}

export interface Flight {
  id: string;
  airline: Airline;
  outbound: FlightSegment;
  inbound?: FlightSegment;
  /**
   * Full list of journey segments (supports multi-city)
   * For one-way/round-trip this will typically be [outbound] or [outbound, inbound].
   */
  segments?: FlightSegment[];
  /**
   * Trip type for this result. When omitted, infer from segments or presence of inbound.
   */
  tripType?: 'round-trip' | 'one-way' | 'multi-city';
  price: number;
  pricePerPerson: number;
  currency: string;
  originalPrice?: number;      // Price before currency conversion
  originalCurrency?: string;   // Original currency from API
  ticketOptions?: TicketOption[];
  webRef?: string;
  baggage?: string;
  // Extras for filters/details
  refundable?: boolean | null;
  refundableText?: string;
  hasBaggage?: boolean;
  meals?: boolean;
  // Price check integration
  segmentResultId?: string;    // Result_id from API for price check
  moduleId?: string;           // module_id from API for debugging
}

export interface MultiCitySegmentSearch {
  from: string;
  to: string;
  departureDate: Date;
}

export interface SearchParams {
  from: string;
  to: string;
  departureDate: Date;
  returnDate?: Date;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  class: 'Economy' | 'Premium Economy' | 'Business' | 'First';
  tripType: 'round-trip' | 'one-way' | 'multi-city';
  /**
   * Optional: Multi-city segments (used when tripType === 'multi-city')
   * First segment should correspond to top-level from/to/departureDate.
   */
  segments?: MultiCitySegmentSearch[];
}

export interface FilterState {
  stops: number[];
  priceRange: [number, number];
  departureTimeOutbound: [number, number];
  departureTimeInbound: [number, number];
  journeyTimeOutbound: [number, number];
  journeyTimeInbound: [number, number];
  departureAirports: string[];
  arrivalAirports: string[];
  airlines: string[];
  extras: string[];
}

