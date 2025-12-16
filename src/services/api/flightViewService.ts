/**
 * FlightView Service
 * Handles transformation of FlightView API responses (from Skyscanner meta channel deeplinks)
 * to our internal Flight type format.
 */

import { Flight, FlightSegment, Airport, Airline, SearchParams } from '@/types/flight';
import { formatTime, formatDuration, parseIntSafe, parsePriceValue } from '@/lib/vyspa/utils';
import { getAircraftName } from '@/lib/vyspa/aircraftTypes';

// ============================================================================
// FlightView API Response Types
// ============================================================================

/**
 * Individual flight within a segment from FlightView API
 */
export interface FlightViewFlight {
  airline_code: string;
  flight_number: number | string;
  fare_class: string;
  distance: number | string;
  travel_time: number | string; // minutes
  departure_terminal: string | number;
  arrival_terminal: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string; // YYYY-MM-DD
  arrival_date: string; // YYYY-MM-DD
  departure_time: number | string; // HHMM format
  arrival_time: number | string; // HHMM format
  dep_arr_date_diff: string | null;
  aircraft_type: string;
  number_stops: number | string;
  etk_eligible: number | string;
  code_share_info: string;
  operating_carrier: string;
  cabin_class: string; // e.g., "Y" for economy
  airline_name: string;
  op_airline_name: string;
  Baggage: string;
  class_name: string; // e.g., "Economy"
  available_seats: number | string;
  refundable: number | string; // 1=Refundable, 2=Non-Refundable, 3=RefundableWithPenalty, 4=FullyRefundable
  refundable_text: string;
  FareCat: string; // e.g., "PU"
  segment_flying_time: number | string;
  depart_airport_name: string;
  arrive_airport_name: string;
}

/**
 * Segment from FlightView API
 */
export interface FlightViewSegment {
  SegmentNo: number;
  Route: string; // e.g., "LHREWR"
  Stops: number;
  FlyingTime: number; // total flying time in minutes
  Flights: FlightViewFlight[];
}

/**
 * Passenger breakdown from FlightView API
 */
export interface FlightViewBreakdown {
  pax_type: string; // "ADT", "CHD", "INF"
  total_pax: number;
  fare: number;
  tax: number;
  markup: number;
  total: number;
}

/**
 * FlightView API response structure
 */
export interface FlightViewResponse {
  Total: number;
  Total_fare: number;
  key: string;
  Request_id: number;
  Result_id: number;
  Breakdown: FlightViewBreakdown[];
  Segments: FlightViewSegment[];
}

// ============================================================================
// Transformed Result Types
// ============================================================================

export interface TransformedFlightViewResult {
  flight: Flight;
  searchParams: SearchParams;
  rawResponse?: FlightViewResponse;
}

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transform FlightView API response to our internal Flight type
 */
export function transformFlightViewResponse(data: FlightViewResponse): TransformedFlightViewResult {
  const segments = data.Segments || [];

  if (segments.length === 0) {
    throw new Error('No flight segments in response');
  }

  // Get first flight for airline info
  const firstSegment = segments[0];
  const firstFlight = firstSegment.Flights[0];

  if (!firstFlight) {
    throw new Error('No flights in first segment');
  }

  // Build airline info
  const airline: Airline = {
    name: firstFlight.airline_name || firstFlight.airline_code,
    code: firstFlight.airline_code,
    logo: `/airlines/${firstFlight.airline_code.toLowerCase()}.png`,
  };

  // Transform all segments to FlightSegments
  const flightSegments: FlightSegment[] = segments.map(transformSegment);

  // Calculate total passengers from breakdown
  let totalPassengers = 0;
  let adults = 0;
  let children = 0;
  let infants = 0;

  for (const breakdown of data.Breakdown || []) {
    const count = parseIntSafe(breakdown.total_pax, 0);
    totalPassengers += count;

    if (breakdown.pax_type === 'ADT') {
      adults = count;
    } else if (breakdown.pax_type === 'CHD') {
      children = count;
    } else if (breakdown.pax_type === 'INF') {
      infants = count;
    }
  }

  // Fallback to 1 passenger if breakdown is empty
  if (totalPassengers === 0) {
    totalPassengers = 1;
    adults = 1;
  }

  // Calculate price
  const totalPrice = parsePriceValue(data.Total, 0);
  const pricePerPerson = totalPrice / totalPassengers;

  // Determine trip type
  const tripType = (() => {
    if (segments.length === 1) return 'one-way';
    if (segments.length === 2) {
      // Check if it's a round trip (return to origin)
      const firstOrigin = segments[0].Flights[0]?.departure_airport;
      const lastDestination = segments[1].Flights[segments[1].Flights.length - 1]?.arrival_airport;
      if (firstOrigin === lastDestination) return 'round-trip';
    }
    return segments.length > 2 ? 'multi-city' : 'round-trip';
  })();

  // Get refundable status from first flight
  const refundableCode = parseIntSafe(firstFlight.refundable, 0);
  const refundable = refundableCode === 1 || refundableCode === 3 || refundableCode === 4 ? true :
    refundableCode === 2 ? false : null;

  // Check for baggage
  const hasBaggage = firstFlight.Baggage &&
    String(firstFlight.Baggage).toLowerCase() !== 'none' &&
    String(firstFlight.Baggage).trim() !== '';

  // Build the Flight object
  const flight: Flight = {
    id: String(data.Result_id),
    airline,
    outbound: flightSegments[0],
    inbound: flightSegments[1] || undefined,
    segments: flightSegments,
    tripType,
    price: Math.round(totalPrice),
    pricePerPerson: Math.round(pricePerPerson),
    currency: 'GBP', // FlightView typically returns GBP for UK market
    webRef: String(data.Result_id),
    baggage: firstFlight.Baggage,
    refundable,
    refundableText: firstFlight.refundable_text,
    hasBaggage: hasBaggage || false,
    segmentResultId: String(data.Result_id),
  };

  // Build search params from flight data
  const searchParams: SearchParams = {
    from: firstSegment.Flights[0]?.departure_airport || '',
    to: firstSegment.Flights[firstSegment.Flights.length - 1]?.arrival_airport || '',
    departureDate: new Date(firstSegment.Flights[0]?.departure_date || Date.now()),
    returnDate: segments[1] ? new Date(segments[1].Flights[0]?.departure_date || Date.now()) : undefined,
    passengers: {
      adults,
      children,
      infants,
    },
    class: mapCabinClass(firstFlight.cabin_class),
    tripType,
  };

  return {
    flight,
    searchParams,
    rawResponse: process.env.NODE_ENV === 'development' ? data : undefined,
  };
}

/**
 * Transform a FlightView segment to FlightSegment
 */
function transformSegment(segment: FlightViewSegment): FlightSegment {
  const flights = segment.Flights || [];

  if (flights.length === 0) {
    throw new Error('No flights in segment');
  }

  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];

  // Build airport info
  const departureAirport: Airport = {
    code: firstFlight.departure_airport,
    name: firstFlight.depart_airport_name || firstFlight.departure_airport,
    city: extractCityFromAirportName(firstFlight.depart_airport_name) || firstFlight.departure_airport,
  };

  const arrivalAirport: Airport = {
    code: lastFlight.arrival_airport,
    name: lastFlight.arrive_airport_name || lastFlight.arrival_airport,
    city: extractCityFromAirportName(lastFlight.arrive_airport_name) || lastFlight.arrival_airport,
  };

  // Format times
  const departureTime = formatTime(firstFlight.departure_time);
  const arrivalTime = formatTime(lastFlight.arrival_time);

  // Format date
  const date = formatDate(firstFlight.departure_date);
  const arrivalDate = lastFlight.arrival_date !== firstFlight.departure_date
    ? formatDate(lastFlight.arrival_date)
    : undefined;

  // Calculate duration
  const totalFlyingTime = parseIntSafe(segment.FlyingTime, 0);
  const duration = formatDuration(totalFlyingTime);

  // Calculate layovers for total journey time
  let totalLayoverMinutes = 0;
  const layovers: Array<{ viaAirport: string; duration: string }> = [];

  if (flights.length > 1) {
    for (let i = 0; i < flights.length - 1; i++) {
      const current = flights[i];
      const next = flights[i + 1];

      const layoverMinutes = calculateLayoverMinutes(
        current.arrival_date,
        current.arrival_time,
        next.departure_date,
        next.departure_time
      );

      totalLayoverMinutes += layoverMinutes;
      layovers.push({
        viaAirport: current.arrival_airport,
        duration: formatDuration(layoverMinutes),
      });
    }
  }

  // Total journey time = flying time + layovers
  const totalJourneyMinutes = totalFlyingTime + totalLayoverMinutes;
  const totalJourneyTime = formatDuration(totalJourneyMinutes);

  // Get stop details - compute stops from actual flight count since API Stops field is unreliable
  const stops = Math.max(0, flights.length - 1);
  const stopDetails = getStopDetails(stops, layovers);

  // Build individual flights
  const individualFlights = flights.map((flight) => ({
    departureAirport: flight.departure_airport,
    arrivalAirport: flight.arrival_airport,
    departureTime: formatTime(flight.departure_time),
    arrivalTime: formatTime(flight.arrival_time),
    duration: formatDuration(parseIntSafe(flight.travel_time, 0)),
    flightNumber: String(flight.flight_number || '').trim() || undefined,
    carrierCode: flight.airline_code,
    departureDate: flight.departure_date,
    arrivalDate: flight.arrival_date,
  }));

  // Get aircraft name
  const aircraftName = getAircraftName(firstFlight.aircraft_type);

  return {
    departureTime,
    arrivalTime,
    departureAirport,
    arrivalAirport,
    date,
    arrivalDate,
    duration,
    totalJourneyTime,
    stops,
    stopDetails,
    carrierCode: firstFlight.airline_code,
    flightNumber: String(firstFlight.flight_number || '').trim() || undefined,
    cabinClass: firstFlight.cabin_class,
    aircraftType: aircraftName || undefined,
    distance: firstFlight.distance ? `${firstFlight.distance} mi` : undefined,
    departureTerminal: firstFlight.departure_terminal ? String(firstFlight.departure_terminal) : undefined,
    arrivalTerminal: lastFlight.arrival_terminal || undefined,
    layovers: layovers.length > 0 ? layovers : undefined,
    individualFlights: individualFlights.length > 1 ? individualFlights : undefined,
    segmentBaggage: firstFlight.Baggage,
  };
}

/**
 * Calculate layover minutes between two flights
 */
function calculateLayoverMinutes(
  arrivalDate: string,
  arrivalTime: number | string,
  departureDate: string,
  departureTime: number | string
): number {
  try {
    const arrTime = formatTime(arrivalTime);
    const depTime = formatTime(departureTime);

    const arrival = new Date(`${arrivalDate}T${arrTime}:00`);
    const departure = new Date(`${departureDate}T${depTime}:00`);

    const durationMs = departure.getTime() - arrival.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    return durationMinutes > 0 ? durationMinutes : 0;
  } catch (error) {
    console.error('Layover calculation error:', error);
    return 0;
  }
}

/**
 * Get stop details text
 */
function getStopDetails(stops: number, layovers: Array<{ viaAirport: string; duration: string }>): string {
  if (stops === 0) {
    return 'Direct';
  }

  if (stops === 1 && layovers.length > 0) {
    return `1 stop via ${layovers[0].viaAirport}`;
  }

  return `${stops} stop${stops !== 1 ? 's' : ''}`;
}

/**
 * Format date from YYYY-MM-DD to readable format
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(2);

    return `${dayName}, ${day} ${month} ${year}`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * Extract city name from airport name (e.g., "London Heathrow Airport" -> "London")
 */
function extractCityFromAirportName(airportName: string): string {
  if (!airportName) return '';

  // Common patterns: "City Name Airport", "City Name International Airport"
  const patterns = [
    /^(.+?)\s+(International\s+)?Airport$/i,
    /^(.+?)\s+(Intl\.?\s+)?Airport$/i,
  ];

  for (const pattern of patterns) {
    const match = airportName.match(pattern);
    if (match) {
      // Return just the city part
      return match[1].trim();
    }
  }

  // If no pattern matches, return the first word(s) before common suffixes
  const firstPart = airportName.split(/\s+(International|Airport|Intl)/i)[0];
  return firstPart.trim();
}

/**
 * Map cabin class code to display name
 */
function mapCabinClass(cabinCode: string): 'Economy' | 'Premium Economy' | 'Business' | 'First' {
  const code = (cabinCode || '').toUpperCase();

  // Common cabin class codes
  switch (code) {
    case 'F':
    case 'A':
    case 'P':
      return 'First';
    case 'C':
    case 'J':
    case 'D':
    case 'I':
    case 'Z':
      return 'Business';
    case 'W':
    case 'S':
      return 'Premium Economy';
    case 'Y':
    case 'M':
    case 'B':
    case 'H':
    case 'K':
    case 'L':
    case 'Q':
    case 'T':
    case 'U':
    case 'V':
    case 'X':
    case 'E':
    case 'G':
    case 'N':
    case 'O':
    case 'R':
    default:
      return 'Economy';
  }
}






