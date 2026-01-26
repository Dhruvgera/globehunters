import type { Hotel } from "./hotel";

/** Flight info for a flight+hotel package (simplified for search results) */
export interface PackageFlight {
  /** Airline name */
  airline: string;
  /** Flight number */
  flightNumber: string;
  /** Departure airport code */
  departureCode: string;
  /** Arrival airport code */
  arrivalCode: string;
  /** Departure time (ISO string or display format) */
  departureTime: string;
  /** Arrival time (ISO string or display format) */
  arrivalTime: string;
  /** Duration e.g. "14h 30m" */
  duration: string;
  /** Number of stops */
  stops: number;
  /** Whether cabin bag is included */
  cabinBagIncluded: boolean;
  /** Whether checked bag is included */
  checkedBagIncluded: boolean;
}

/** A flight+hotel package search result */
export interface Package {
  id: string;
  hotel: Hotel;
  /** Outbound flight */
  outboundFlight: PackageFlight;
  /** Return flight (optional for one-way packages) */
  returnFlight?: PackageFlight;
  /** Total package price */
  totalPrice: number;
  /** Nightly price (hotel portion divided by nights) */
  nightlyPrice: number;
  /** Currency symbol */
  currency: string;
  /** Number of nights */
  nights: number;
  /** Number of rooms */
  rooms: number;
}

/** Search criteria for flight+hotel packages */
export interface PackageSearchCriteria {
  /** Departure city/airport */
  from: string;
  fromCode: string;
  /** Destination city */
  to: string;
  toCode?: string;
  /** Check-in date (YYYY-MM-DD) */
  checkIn: string;
  /** Check-out date (YYYY-MM-DD) */
  checkOut: string;
  /** Number of travelers */
  travelers: number;
  /** Travel class */
  travelClass: string;
  /** Number of rooms */
  rooms: number;
}
