export interface Airport {
  code: string;
  name: string;
  city: string;
}

export interface FlightSegment {
  departureTime: string;
  arrivalTime: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  date: string;
  duration: string;
  stops: number;
  stopDetails?: string;
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

