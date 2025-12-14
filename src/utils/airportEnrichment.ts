/**
 * Airport Enrichment Utility
 * Enriches flight data with full airport names from the airport cache
 */

import { airportCache } from '@/lib/cache/airportCache';
import type { Flight, FlightSegment, Airport } from '@/types/flight';

/**
 * Enrich a single airport object with full name from cache
 */
function enrichAirport(airport: Airport): Airport {
  const cached = airportCache.getAirportByCode(airport.code);
  if (cached) {
    return {
      ...airport,
      name: cached.name || cached.city || airport.code,
      city: cached.city || airport.city,
    };
  }
  return airport;
}

/**
 * Enrich a flight segment with full airport names
 */
function enrichSegment(segment: FlightSegment): FlightSegment {
  return {
    ...segment,
    departureAirport: enrichAirport(segment.departureAirport),
    arrivalAirport: enrichAirport(segment.arrivalAirport),
  };
}

/**
 * Enrich a flight with full airport names for all segments
 */
export function enrichFlightWithAirportNames(flight: Flight): Flight {
  return {
    ...flight,
    outbound: enrichSegment(flight.outbound),
    inbound: flight.inbound ? enrichSegment(flight.inbound) : undefined,
    segments: flight.segments?.map(enrichSegment),
  };
}

/**
 * Enrich an array of flights with full airport names
 */
export function enrichFlightsWithAirportNames(flights: Flight[]): Flight[] {
  return flights.map(enrichFlightWithAirportNames);
}
