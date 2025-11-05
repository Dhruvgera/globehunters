/**
 * Flight Filtering Utility Functions
 */

import { Flight, FilterState } from '@/types/flight';

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Parse duration string (e.g., "2H 10M", "13h 10m") to minutes
 */
export function parseDurationToMinutes(durationString: string): number {
  const hoursMatch = durationString.match(/(\d+)[Hh]/);
  const minutesMatch = durationString.match(/(\d+)[Mm]/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return hours * 60 + minutes;
}

/**
 * Format minutes to duration string (e.g., 130 -> "2h 10m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Check if flight matches stop filter
 */
function matchesStops(flight: Flight, selectedStops: number[]): boolean {
  if (selectedStops.length === 0) {
    return true;
  }
  return selectedStops.includes(flight.outbound.stops);
}

/**
 * Check if flight matches airline filter
 */
function matchesAirline(flight: Flight, selectedAirlines: string[]): boolean {
  if (selectedAirlines.length === 0) {
    return true;
  }
  return selectedAirlines.includes(flight.airline.name);
}

/**
 * Check if flight matches price range filter
 */
function matchesPriceRange(flight: Flight, priceRange: [number, number]): boolean {
  return flight.price >= priceRange[0] && flight.price <= priceRange[1];
}

/**
 * Check if flight matches departure time filter
 */
function matchesDepartureTime(
  flight: Flight,
  timeRange: [number, number],
  isInbound: boolean = false
): boolean {
  const segment = isInbound && flight.inbound ? flight.inbound : flight.outbound;
  const departureMinutes = parseTimeToMinutes(segment.departureTime);

  return departureMinutes >= timeRange[0] * 60 && departureMinutes <= timeRange[1] * 60;
}

/**
 * Check if flight matches journey time filter
 */
function matchesJourneyTime(
  flight: Flight,
  journeyTimeRange: [number, number],
  isInbound: boolean = false
): boolean {
  const segment = isInbound && flight.inbound ? flight.inbound : flight.outbound;
  const journeyMinutes = parseDurationToMinutes(segment.duration);
  const journeyHours = journeyMinutes / 60;

  return journeyHours >= journeyTimeRange[0] && journeyHours <= journeyTimeRange[1];
}

/**
 * Check if flight matches departure airport filter
 */
function matchesDepartureAirport(flight: Flight, selectedAirports: string[]): boolean {
  if (selectedAirports.length === 0) {
    return true;
  }
  return selectedAirports.includes(flight.outbound.departureAirport.code);
}

/**
 * Check if flight matches arrival airport filter
 */
function matchesArrivalAirport(flight: Flight, selectedAirports: string[]): boolean {
  if (selectedAirports.length === 0) {
    return true;
  }
  return selectedAirports.includes(flight.outbound.arrivalAirport.code);
}

/**
 * Check if flight matches extras filter
 * Note: This is a placeholder. The Flight type needs to include refundable, meals, and baggage fields
 * for this filter to work properly. For now, it returns true (shows all flights).
 */
function matchesExtras(flight: Flight, selectedExtras: string[]): boolean {
  if (selectedExtras.length === 0) {
    return true;
  }
  
  // TODO: Once Flight type includes extras fields, implement actual filtering:
  // return selectedExtras.every(extra => {
  //   switch (extra) {
  //     case 'refundable':
  //       return flight.refundable === true;
  //     case 'meals':
  //       return flight.meals === true;
  //     case 'baggage':
  //       return flight.baggage === true;
  //     default:
  //       return true;
  //   }
  // });
  
  return true;
}

/**
 * Main filter function - applies all filters to flights
 */
export function filterFlights(flights: Flight[], filters: FilterState): Flight[] {
  return flights.filter((flight) => {
    // Stops filter
    if (!matchesStops(flight, filters.stops)) {
      return false;
    }

    // Airline filter
    if (!matchesAirline(flight, filters.airlines)) {
      return false;
    }

    // Price range filter
    if (!matchesPriceRange(flight, filters.priceRange)) {
      return false;
    }

    // Outbound departure time filter
    if (!matchesDepartureTime(flight, filters.departureTimeOutbound, false)) {
      return false;
    }

    // Inbound departure time filter (if round trip)
    if (flight.inbound && !matchesDepartureTime(flight, filters.departureTimeInbound, true)) {
      return false;
    }

    // Outbound journey time filter
    if (!matchesJourneyTime(flight, filters.journeyTimeOutbound, false)) {
      return false;
    }

    // Inbound journey time filter (if round trip)
    if (flight.inbound && !matchesJourneyTime(flight, filters.journeyTimeInbound, true)) {
      return false;
    }

    // Departure airport filter
    if (!matchesDepartureAirport(flight, filters.departureAirports)) {
      return false;
    }

    // Arrival airport filter
    if (!matchesArrivalAirport(flight, filters.arrivalAirports)) {
      return false;
    }

    // Extras filter
    if (!matchesExtras(flight, filters.extras)) {
      return false;
    }

    return true;
  });
}

/**
 * Sort flights by various criteria
 */
export function sortFlights(
  flights: Flight[],
  sortBy: 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'departure-asc' | 'departure-desc'
): Flight[] {
  const sorted = [...flights];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);

    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);

    case 'duration-asc':
      return sorted.sort((a, b) => {
        const durationA = parseDurationToMinutes(a.outbound.duration);
        const durationB = parseDurationToMinutes(b.outbound.duration);
        return durationA - durationB;
      });

    case 'duration-desc':
      return sorted.sort((a, b) => {
        const durationA = parseDurationToMinutes(a.outbound.duration);
        const durationB = parseDurationToMinutes(b.outbound.duration);
        return durationB - durationA;
      });

    case 'departure-asc':
      return sorted.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.outbound.departureTime);
        const timeB = parseTimeToMinutes(b.outbound.departureTime);
        return timeA - timeB;
      });

    case 'departure-desc':
      return sorted.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.outbound.departureTime);
        const timeB = parseTimeToMinutes(b.outbound.departureTime);
        return timeB - timeA;
      });

    default:
      return sorted;
  }
}

/**
 * Get unique airlines from flights
 */
export function getUniqueAirlines(flights: Flight[]): string[] {
  const airlines = new Set(flights.map(flight => flight.airline.name));
  return Array.from(airlines).sort();
}

/**
 * Get price range from flights
 */
export function getPriceRange(flights: Flight[]): [number, number] {
  if (flights.length === 0) {
    return [0, 1000];
  }

  const prices = flights.map(flight => flight.price);
  return [Math.min(...prices), Math.max(...prices)];
}

/**
 * Get unique departure airports from flights
 */
export function getUniqueDepartureAirports(flights: Flight[]): string[] {
  const airports = new Set(flights.map(flight => flight.outbound.departureAirport.code));
  return Array.from(airports).sort();
}

/**
 * Get unique arrival airports from flights
 */
export function getUniqueArrivalAirports(flights: Flight[]): string[] {
  const airports = new Set(flights.map(flight => flight.outbound.arrivalAirport.code));
  return Array.from(airports).sort();
}

/**
 * Count flights by number of stops
 */
export function countByStops(flights: Flight[]): Record<number, number> {
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };

  flights.forEach(flight => {
    const stops = flight.outbound.stops;
    counts[stops] = (counts[stops] || 0) + 1;
  });

  return counts;
}
