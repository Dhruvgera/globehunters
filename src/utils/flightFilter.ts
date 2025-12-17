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
 * Uses maximum stops across all legs - a flight is "direct" only if ALL legs are direct
 * "1 stop" means the worst leg has at most 1 stop, etc.
 */
function matchesStops(flight: Flight, selectedStops: number[]): boolean {
  if (selectedStops.length === 0) {
    return true;
  }

  // Get the maximum stops across all legs
  const outboundStops = flight.outbound.stops;
  const inboundStops = flight.inbound?.stops ?? 0;
  const maxStops = Math.max(outboundStops, inboundStops);

  // Cap at 2 for "2+ stops" category
  const stopsCategory = Math.min(maxStops, 2);

  return selectedStops.includes(stopsCategory);
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
 * Check if flight matches arrival/landing time filter
 */
function matchesArrivalTime(
  flight: Flight,
  timeRange: [number, number],
  isInbound: boolean = false
): boolean {
  const segment = isInbound && flight.inbound ? flight.inbound : flight.outbound;
  const arrivalMinutes = parseTimeToMinutes(segment.arrivalTime);

  return arrivalMinutes >= timeRange[0] * 60 && arrivalMinutes <= timeRange[1] * 60;
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
 * Check if flight matches extras filter (refundable, meals, baggage)
 */
function matchesExtras(flight: Flight, selectedExtras: string[]): boolean {
  if (selectedExtras.length === 0) {
    return true;
  }

  return selectedExtras.every((extra) => {
    switch (extra) {
      case 'refundable':
        return flight.refundable === true;
      case 'meals':
        return flight.meals === true;
      case 'baggage':
        return flight.hasBaggage === true || !!flight.baggage;
      default:
        return true;
    }
  });
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

    // Time filters based on mode (takeoff = departure, landing = arrival)
    if (filters.timeFilterMode === 'landing') {
      // Outbound arrival/landing time filter
      if (!matchesArrivalTime(flight, filters.arrivalTimeOutbound, false)) {
        return false;
      }
      // Inbound arrival/landing time filter (if round trip)
      if (flight.inbound && !matchesArrivalTime(flight, filters.arrivalTimeInbound, true)) {
        return false;
      }
    } else {
      // Default: Outbound departure/takeoff time filter
      if (!matchesDepartureTime(flight, filters.departureTimeOutbound, false)) {
        return false;
      }
      // Inbound departure/takeoff time filter (if round trip)
      if (flight.inbound && !matchesDepartureTime(flight, filters.departureTimeInbound, true)) {
        return false;
      }
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

export type SortOption = 'best' | 'cheapest' | 'fastest' | 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'departure-asc' | 'departure-desc';

/**
 * Sort flights by various criteria
 */
export function sortFlights(
  flights: Flight[],
  sortBy: SortOption
): Flight[] {
  const sorted = [...flights];

  switch (sortBy) {
    case 'cheapest':
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);

    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);

    case 'fastest':
    case 'duration-asc':
      return sorted.sort((a, b) => {
        const durationA = parseDurationToMinutes(a.outbound.duration) + (a.inbound ? parseDurationToMinutes(a.inbound.duration) : 0);
        const durationB = parseDurationToMinutes(b.outbound.duration) + (b.inbound ? parseDurationToMinutes(b.inbound.duration) : 0);
        return durationA - durationB;
      });

    case 'duration-desc':
      return sorted.sort((a, b) => {
        const durationA = parseDurationToMinutes(a.outbound.duration) + (a.inbound ? parseDurationToMinutes(a.inbound.duration) : 0);
        const durationB = parseDurationToMinutes(b.outbound.duration) + (b.inbound ? parseDurationToMinutes(b.inbound.duration) : 0);
        return durationB - durationA;
      });

    case 'best':
      return sorted.sort((a, b) => {
        const durationA = parseDurationToMinutes(a.outbound.duration) + (a.inbound ? parseDurationToMinutes(a.inbound.duration) : 0);
        const durationB = parseDurationToMinutes(b.outbound.duration) + (b.inbound ? parseDurationToMinutes(b.inbound.duration) : 0);

        // Best score: price + (duration in minutes * factor) + (stops * penalty)
        // Factor: £30 per hour (£0.5 per minute)
        // Penalty: £50 per stop
        const scoreA = a.price + (durationA * 0.5) + (a.outbound.stops * 50) + (a.inbound ? a.inbound.stops * 50 : 0);
        const scoreB = b.price + (durationB * 0.5) + (b.outbound.stops * 50) + (b.inbound ? b.inbound.stops * 50 : 0);

        return scoreA - scoreB;
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
 * For round-trip flights, uses the maximum stops between outbound and inbound
 * so that a flight only counts as "direct" if BOTH legs are direct
 */
export function countByStops(flights: Flight[]): Record<number, number> {
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };

  flights.forEach(flight => {
    // For round-trip, take the max stops (so a flight is only "direct" if both legs are direct)
    const outboundStops = flight.outbound.stops;
    const inboundStops = flight.inbound?.stops ?? 0;
    const maxStops = Math.max(outboundStops, inboundStops);

    // Cap at 2+ for the filter categories
    const stopsCategory = Math.min(maxStops, 2);
    counts[stopsCategory] = (counts[stopsCategory] || 0) + 1;
  });

  return counts;
}

/**
 * Get time bounds (min/max hours) for departure and arrival times from flights
 * Returns bounds as hours (0-24) for use with time filter sliders
 */
export function getTimeBounds(flights: Flight[]): {
  outboundDeparture: { min: number; max: number };
  outboundArrival: { min: number; max: number };
  inboundDeparture: { min: number; max: number };
  inboundArrival: { min: number; max: number };
} {
  const defaultBounds = { min: 0, max: 24 };

  if (flights.length === 0) {
    return {
      outboundDeparture: { ...defaultBounds },
      outboundArrival: { ...defaultBounds },
      inboundDeparture: { ...defaultBounds },
      inboundArrival: { ...defaultBounds },
    };
  }

  // Collect times from all flights
  const outboundDepartureTimes: number[] = [];
  const outboundArrivalTimes: number[] = [];
  const inboundDepartureTimes: number[] = [];
  const inboundArrivalTimes: number[] = [];

  flights.forEach(flight => {
    // Outbound
    const outDepMinutes = parseTimeToMinutes(flight.outbound.departureTime);
    const outArrMinutes = parseTimeToMinutes(flight.outbound.arrivalTime);
    outboundDepartureTimes.push(outDepMinutes / 60);
    outboundArrivalTimes.push(outArrMinutes / 60);

    // Inbound (if exists)
    if (flight.inbound) {
      const inDepMinutes = parseTimeToMinutes(flight.inbound.departureTime);
      const inArrMinutes = parseTimeToMinutes(flight.inbound.arrivalTime);
      inboundDepartureTimes.push(inDepMinutes / 60);
      inboundArrivalTimes.push(inArrMinutes / 60);
    }
  });

  const computeBounds = (times: number[]): { min: number; max: number } => {
    if (times.length === 0) return { ...defaultBounds };
    const min = Math.floor(Math.min(...times));
    const max = Math.ceil(Math.max(...times));
    return { min: Math.max(0, min), max: Math.min(24, max) };
  };

  return {
    outboundDeparture: computeBounds(outboundDepartureTimes),
    outboundArrival: computeBounds(outboundArrivalTimes),
    inboundDeparture: computeBounds(inboundDepartureTimes),
    inboundArrival: computeBounds(inboundArrivalTimes),
  };
}
