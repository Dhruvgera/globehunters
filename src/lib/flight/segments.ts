import type { Flight, FlightSegment } from '@/types/flight';

export function getJourneySegments(flight: Flight): FlightSegment[] {
  if (flight.segments && flight.segments.length > 0) {
    return flight.segments;
  }
  return [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];
}
