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
}

export interface FlightSegment {
  departureTime: string;
  arrivalTime: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  date: string;
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

