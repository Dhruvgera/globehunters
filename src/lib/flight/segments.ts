import type { Flight, FlightSegment } from '@/types/flight';

export function getJourneySegments(flight: Flight | null | undefined, isPackageMode?: boolean): FlightSegment[] {
  if (!flight) {
    if (isPackageMode) {
      // TODO: Raise mixpanel event to track missing flight data in package mode
      throw new Error('Package bookings require flight data');
    }
    return [];
  }
  
  if (flight.segments && flight.segments.length > 0) {
    return flight.segments;
  }
  
  const segments = [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])].filter(Boolean);
  
  if (segments.length === 0 && isPackageMode) {
    // TODO: Raise mixpanel event to track missing flight segments in package mode
    throw new Error('Package bookings require at least one flight segment');
  }
  
  return segments;
}
