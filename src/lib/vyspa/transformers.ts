/**
 * Vyspa API Response Transformers
 * Transform Vyspa API responses to frontend types
 */

import {
  parsePriceValue,
  formatTime,
  parseIntSafe,
  formatDuration,
  parsePriceBreakdownString,
  calculateDuration,
} from './utils';
import { getAircraftName } from './aircraftTypes';
import { airportCache } from '@/lib/cache/airportCache';
import type {
  VyspaApiResponse,
  VyspaResult,
  VyspaSegment,
  VyspaFlight,
} from '@/types/vyspa';
import type { Flight, FlightSegment, Airport, Airline } from '@/types/flight';
import type {
  FlightSearchResponse,
  AirlineFilter,
  AirportFilter
} from '@/services/api/flightService';

/**
 * Transform Vyspa API response to FlightSearchResponse
 */
export function transformVyspaResponse(
  vyspaData: VyspaApiResponse
): FlightSearchResponse {
  // Extract Request_id from API response (used as web ref until folder is created)
  const requestId = vyspaData.Request_id ? String(vyspaData.Request_id) : undefined;

  // Handle errors or empty results
  if (!vyspaData.Results || vyspaData.Results.length === 0) {
    return {
      flights: [],
      filters: {
        airlines: [],
        departureAirports: [],
        arrivalAirports: [],
        minPrice: 0,
        maxPrice: 0,
      },
      requestId,
    };
  }

  const flights: Flight[] = [];
  const airlinesMap = new Map<string, AirlineFilter>();
  const departureAirportsMap = new Map<string, AirportFilter>();
  const arrivalAirportsMap = new Map<string, AirportFilter>();
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const result of vyspaData.Results) {
    try {
      const flight = transformResult(result);
      if (flight) {
        flights.push(flight);

        // Update price range
        if (flight.price < minPrice) minPrice = flight.price;
        if (flight.price > maxPrice) maxPrice = flight.price;

        // Collect filter data
        collectFilterData(
          flight,
          airlinesMap,
          departureAirportsMap,
          arrivalAirportsMap
        );
      }
    } catch (error) {
      console.error('Error transforming result:', error);
      // Continue processing other results
    }
  }

  return {
    flights,
    filters: {
      airlines: Array.from(airlinesMap.values()),
      departureAirports: Array.from(departureAirportsMap.values()),
      arrivalAirports: Array.from(arrivalAirportsMap.values()),
      minPrice: minPrice === Infinity ? 0 : Math.floor(minPrice),
      maxPrice: maxPrice === -Infinity ? 0 : Math.ceil(maxPrice),
    },
    requestId,
  };
}

/**
 * Extract the Request_id (first number before hyphen) from Result_id
 * V3 format: "79596866-0-0-172" -> "79596866"
 * V1 format: "940769580" -> "940769580"
 */
function extractRequestIdFromResultId(resultId: string): string {
  if (!resultId) return '';
  // V3 format has hyphens, extract first part
  if (resultId.includes('-')) {
    return resultId.split('-')[0];
  }
  // V1 format is just the ID
  return resultId;
}

/**
 * Extract the flight key from Deep_link URL
 * Deep_link format: "www.globehunters.com/checkout.htm?...&flight=bnprMzRsc2ZxbXkwRHZJOUxpNHcyRW5TRENmZHVZNzdSRVFCWDZGSUw3RT0="
 * Returns the base64 encoded flight key
 */
function extractFlightKeyFromDeepLink(deepLink?: string): string | undefined {
  if (!deepLink) return undefined;
  const match = deepLink.match(/flight=([^&"]+)/);
  return match ? match[1] : undefined;
}

/**
 * Transform a single Vyspa result to Flight
 */
function transformResult(result: VyspaResult): Flight | null {
  // Robust total price calculation
  // V3 returns Total as number, V1 returns as string
  // Prefer Result.Total, but fall back to Total_fare/Breakdown totals when needed
  let totalPrice = parsePriceValue(result.Total, 0);

  if (totalPrice === 0) {
    const anyResult: any = result as any;
    const totalFareField = anyResult.Total_fare ?? anyResult.TotalFare;
    const totalFareValue = parsePriceValue(totalFareField, 0);

    // V1 format: Breakdown array
    const breakdownTotal = (result.Breakdown || []).reduce((sum, entry: any) => {
      return sum + parsePriceValue(entry.total, 0);
    }, 0);

    // V3 format: Pax_breakdown array
    const paxBreakdownTotal = (result.Pax_breakdown || []).reduce((sum, entry) => {
      return sum + (entry.total_fare || 0);
    }, 0);

    const fallbackTotal = totalFareValue || paxBreakdownTotal || breakdownTotal;
    if (fallbackTotal > 0) {
      totalPrice = fallbackTotal;
    }
  }

  if (totalPrice === 0) {
    console.warn('Flight has zero total price after fallbacks:', result.Result_id);
  }

  // Calculate total passengers - support both V1 and V3 formats
  let totalPassengers = 0;

  // V3 format: Pax_breakdown
  if (result.Pax_breakdown && result.Pax_breakdown.length > 0) {
    for (const pax of result.Pax_breakdown) {
      totalPassengers += pax.pax_count || 0;
    }
  }
  // V1 format: Breakdown
  else if (result.Breakdown) {
    for (const breakdown of result.Breakdown) {
      totalPassengers += parseIntSafe(breakdown.total_pax, 0);
    }
  }

  // Fallback to 1 passenger if no breakdown
  if (totalPassengers === 0) {
    totalPassengers = 1;
  }

  const pricePerPerson = totalPrice / totalPassengers;

  // Get segments (outbound, inbound, and optionally additional multi-city legs)
  // Normalize segments by splitting extremely long layovers into separate legs
  const rawSegments = result.Segments || [];
  const vyspaSegments = normalizeSegmentsByLayover(rawSegments);
  const outboundSegment = vyspaSegments[0];
  const inboundSegment = vyspaSegments[1] || null;

  if (!outboundSegment) {
    console.warn('Skipping flight without outbound segment:', result.Result_id);
    return null;
  }

  // Get airline info from first flight
  const firstFlight = outboundSegment.Flights[0];
  if (!firstFlight) {
    console.warn('Skipping flight without flights:', result.Result_id);
    return null;
  }

  const airline: Airline = {
    name: firstFlight.airline_name || firstFlight.airline_code,
    code: firstFlight.airline_code,
    logo: `/airlines/${firstFlight.airline_code.toLowerCase()}.png`,
  };

  // Transform outbound/inbound segments
  const outbound = transformSegmentToFlightSegment(outboundSegment);
  const inbound = inboundSegment ? transformSegmentToFlightSegment(inboundSegment) : undefined;

  // Transform all segments for multi-city support
  const allSegments: FlightSegment[] = vyspaSegments.map(transformSegmentToFlightSegment);

  // Get baggage info - V3 has baggage in Pax_breakdown and flight-level, V1 has Baggage field
  const v3Baggage = result.Pax_breakdown?.[0]?.baggage?.[0]; // e.g., "25kg"
  const v3FlightBaggage = (firstFlight as any).baggage; // lowercase for V3
  const v1Baggage = firstFlight.Baggage || result.Baggage; // uppercase for V1
  const baggageValue = v3Baggage || v3FlightBaggage || v1Baggage;

  const hasBaggage =
    (baggageValue && String(baggageValue).toLowerCase() !== 'none' && String(baggageValue) !== '0p') ||
      (firstFlight.BaggageQuantity && firstFlight.BaggageQuantity !== '0') ? true : false;

  // Get currency code - V3 uses Currency_code (uppercase), V1 uses currency_code (lowercase)
  const currencyCode = (result.Currency_code || result.currency_code || 'GBP').toUpperCase();

  // Get module_id - V3 uses Module_id (uppercase), V1 uses module_id (lowercase)
  // Convert to string as Flight type expects string
  const moduleIdRaw = result.Module_id ?? result.module_id;
  const moduleId = moduleIdRaw !== undefined ? String(moduleIdRaw) : undefined;

  // Extract Request_id from Result_id for web ref (first number before hyphen in V3)
  const requestIdForWebRef = extractRequestIdFromResultId(result.Result_id);

  // Extract flight key from Deep_link (V3) for FlightView API
  const flightKey = extractFlightKeyFromDeepLink(result.Deep_link);

  const flight: Flight = {
    id: result.Result_id,
    airline: airline,
    outbound: outbound,
    inbound: inbound,
    segments: allSegments,
    tripType: (() => {
      if (allSegments.length <= 1) return 'one-way';
      if (allSegments.length === 2) return 'round-trip';
      return 'multi-city';
    })(),
    price: Math.round(totalPrice),
    pricePerPerson: Math.round(pricePerPerson),
    currency: currencyCode, // Store code, not symbol
    webRef: requestIdForWebRef, // Use Request_id (first part before hyphen) for web ref
    baggage: baggageValue,
    // Refundable codes: 1=Refundable, 2=Non-Refundable, 3=RefundableWithPenalty, 4=FullyRefundable
    refundable: (() => {
      const raw = (firstFlight as any).refundable;
      if (raw === undefined || raw === null) return null;
      const code = typeof raw === 'string' ? parseInt(raw, 10) : raw;
      // Codes 1, 3, 4 are refundable; code 2 is non-refundable
      if (code === 1 || code === 3 || code === 4) return true;
      if (code === 2) return false;
      return null;
    })(),
    refundableText: (firstFlight as any).refundable_text,
    hasBaggage,
    // Store Result_id for V1, or flightKey for V3 price check flow
    segmentResultId: result.Result_id,
    flightKey: flightKey, // V3: Base64 key for FlightView API
    moduleId: moduleId,
  };

  return flight;
}

/**
 * Transform Vyspa segment to FlightSegment
 */
function transformSegmentToFlightSegment(segment: VyspaSegment): FlightSegment {
  const firstFlight = segment.Flights[0];
  const lastFlight = segment.Flights[segment.Flights.length - 1];

  // Get departure info from first flight - lookup full names from airport cache
  const depCode = firstFlight.departure_airport;
  const depCached = airportCache.getAirportByCode(depCode);
  const departureAirport: Airport = {
    code: depCode,
    name: depCached?.name || depCode,
    city: depCached?.city || depCode,
  };

  // Get arrival info from last flight - lookup full names from airport cache
  const arrCode = lastFlight.arrival_airport;
  const arrCached = airportCache.getAirportByCode(arrCode);
  const arrivalAirport: Airport = {
    code: arrCode,
    name: arrCached?.name || arrCode,
    city: arrCached?.city || arrCode,
  };

  // Format times
  const departureTime = formatTime(firstFlight.departure_time);
  const arrivalTime = formatTime(lastFlight.arrival_time);

  // Calculate total duration - V3 uses Flying_time, V1 uses FlyingTime
  const totalDuration = segment.Flying_time ?? segment.FlyingTime ?? 0;
  const duration = formatDuration(totalDuration);

  // Format date (convert YYYY-MM-DD to readable format)
  const date = formatDate(firstFlight.departure_date);
  const arrivalDate = lastFlight.arrival_date ? formatDate(lastFlight.arrival_date) : undefined;

  // Get stop details - compute stops from actual flight count since API Stops field is unreliable
  const flightCount = segment.Flights?.length || 0;
  const stops = Math.max(0, flightCount - 1);
  const stopDetails = getStopDetails(segment);

  // Compute layover durations between connecting flights
  const layovers: Array<{ viaAirport: string; duration: string }> = [];
  let totalLayoverMinutes = 0;
  if (segment.Flights.length > 1) {
    for (let i = 0; i < segment.Flights.length - 1; i++) {
      const current = segment.Flights[i];
      const next = segment.Flights[i + 1];
      // Duration from arrival of current to departure of next
      const minutes = calculateDuration(
        current.arrival_date,
        current.arrival_time as any, // accepts string|number
        next.departure_date,
        next.departure_time as any
      );
      totalLayoverMinutes += minutes;
      layovers.push({
        viaAirport: current.arrival_airport,
        duration: formatDuration(minutes),
      });
    }
  }

  // Extract individual flight information
  const individualFlights = segment.Flights.map((flight) => ({
    departureAirport: flight.departure_airport,
    arrivalAirport: flight.arrival_airport,
    departureTime: formatTime(flight.departure_time),
    arrivalTime: formatTime(flight.arrival_time),
    duration: flight.travel_time ? formatDuration(parseIntSafe(flight.travel_time, 0)) : '',
    flightNumber: String(flight.flight_number || '').trim() || undefined,
    carrierCode: flight.airline_code,
    departureDate: flight.departure_date, // Raw API date for debugging
    arrivalDate: flight.arrival_date,     // Raw API date for debugging
  }));

  // Calculate total journey time (flying time + layovers)
  const totalJourneyMinutes = totalDuration + totalLayoverMinutes;
  const totalJourneyTime = formatDuration(totalJourneyMinutes);

  // Format distance with unit (API returns miles)
  const distanceValue = firstFlight.distance;
  const distanceStr = distanceValue !== undefined && distanceValue !== null && String(distanceValue).trim() !== ''
    ? `${distanceValue} mi`
    : undefined;

  // Convert aircraft type code to human-readable name
  const aircraftName = getAircraftName(firstFlight.aircraft_type);

  return {
    departureTime,
    arrivalTime,
    departureAirport,
    arrivalAirport,
    date,
    arrivalDate, // Arrival date (may differ from departure for long flights)
    duration, // Total flying time only
    totalJourneyTime, // Total time including layovers
    stops,
    stopDetails,
    carrierCode: firstFlight.airline_code,
    flightNumber: String(firstFlight.flight_number || '').trim() || undefined,
    cabinClass: firstFlight.cabin_class,
    aircraftType: aircraftName || undefined,
    distance: distanceStr,
    // Convert terminals to strings (V3 can return numbers like 4, 1)
    departureTerminal: firstFlight.departure_terminal !== undefined && firstFlight.departure_terminal !== ''
      ? String(firstFlight.departure_terminal)
      : undefined,
    arrivalTerminal: lastFlight.arrival_terminal !== undefined && lastFlight.arrival_terminal !== ''
      ? String(lastFlight.arrival_terminal)
      : undefined,
    layovers: layovers.length > 0 ? layovers : undefined,
    individualFlights: individualFlights.length > 1 ? individualFlights : undefined,
    // Baggage - V3 uses lowercase 'baggage', V1 uses 'Baggage'
    segmentBaggage: (firstFlight as any).baggage || firstFlight.Baggage,
    segmentBaggageQuantity: firstFlight.BaggageQuantity,
    segmentBaggageUnit: firstFlight.BaggageUnit,
  };
}

/**
 * Normalize Vyspa segments by splitting very long layovers into separate segments.
 *
 * Example: a single segment with LHR→JFK (day 1) and BOS→LAX (day 8) will be
 * split into two logical segments so the UI can treat them as separate legs
 * in multi-city flows.
 */
function normalizeSegmentsByLayover(segments: VyspaSegment[]): VyspaSegment[] {
  const normalized: VyspaSegment[] = [];

  for (const segment of segments) {
    const splitSegments = splitSegmentByLongLayovers(segment);
    normalized.push(...splitSegments);
  }

  return normalized;
}

/**
 * Split a Vyspa segment into multiple segments when layovers exceed a threshold.
 * This helps distinguish true multi-city stopovers (days between legs) from
 * normal connections.
 */
function splitSegmentByLongLayovers(
  segment: VyspaSegment,
  maxLayoverMinutes: number = 24 * 60
): VyspaSegment[] {
  const flights = segment.Flights || [];
  if (flights.length <= 1) {
    return [segment];
  }

  const groups: VyspaFlight[][] = [];
  let currentGroup: VyspaFlight[] = [flights[0]];

  for (let i = 0; i < flights.length - 1; i++) {
    const current = flights[i];
    const next = flights[i + 1];

    const layoverMinutes = calculateDuration(
      current.arrival_date as any,
      current.arrival_time as any,
      next.departure_date as any,
      next.departure_time as any
    );

    if (layoverMinutes > maxLayoverMinutes) {
      groups.push(currentGroup);
      currentGroup = [next];
    } else {
      currentGroup.push(next);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // If we didn't actually split anything, return the original segment
  if (groups.length === 1 && groups[0].length === flights.length) {
    return [segment];
  }

  return groups.map(buildSegmentFromFlights);
}

/**
 * Build a VyspaSegment from a group of flights.
 */
function buildSegmentFromFlights(flights: VyspaFlight[]): VyspaSegment {
  const first = flights[0];
  const last = flights[flights.length - 1];

  const totalFlyingTime = flights.reduce((sum, flight) => {
    const travelTime =
      typeof flight.travel_time === 'number'
        ? flight.travel_time
        : parseIntSafe(flight.travel_time, 0);
    return sum + travelTime;
  }, 0);

  const stops = Math.max(0, flights.length - 1);

  return {
    Route: `${first.departure_airport}${last.arrival_airport}`,
    FlyingTime: totalFlyingTime, // V1 format
    Flying_time: totalFlyingTime, // V3 format
    Stops: stops,
    Flights: flights,
  };
}

/**
 * Get stop details text
 * NOTE: We compute stops from Flights.length - 1 because the API's Stops field
 * is often incorrect (returns 0 even when there are multiple connecting flights)
 */
function getStopDetails(segment: VyspaSegment): string {
  // Compute stops from actual flight count - API Stops field is unreliable
  const flightCount = segment.Flights?.length || 0;
  const stops = Math.max(0, flightCount - 1);

  if (stops === 0) {
    return 'Direct';
  }

  if (stops === 1) {
    // Try to get layover airport
    if (segment.Flights.length >= 2) {
      const layoverAirport = segment.Flights[0].arrival_airport;
      return `1 stop via ${layoverAirport}`;
    }
    return '1 stop';
  }

  return `${stops} stops`;
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
 * Get currency symbol from currency code
 */
function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'INR': '₹',
    'AED': 'د.إ',
    'CAD': 'C$',
    'AUD': 'A$',
  };

  return symbols[code.toUpperCase()] || code;
}

/**
 * Collect filter data from flight
 */
function collectFilterData(
  flight: Flight,
  airlinesMap: Map<string, AirlineFilter>,
  departureAirportsMap: Map<string, AirportFilter>,
  arrivalAirportsMap: Map<string, AirportFilter>
): void {
  const airlineCode = flight.airline.code;
  const airlineName = flight.airline.name;
  const price = flight.price;

  // Update airline filter
  if (airlinesMap.has(airlineCode)) {
    const airline = airlinesMap.get(airlineCode)!;
    airline.count++;
    airline.minPrice = Math.min(airline.minPrice, price);
  } else {
    airlinesMap.set(airlineCode, {
      name: airlineName,
      code: airlineCode,
      count: 1,
      minPrice: price,
    });
  }

  // Update departure airport filter
  const depCode = flight.outbound.departureAirport.code;
  const depName = flight.outbound.departureAirport.name;
  if (departureAirportsMap.has(depCode)) {
    const airport = departureAirportsMap.get(depCode)!;
    airport.count++;
    airport.minPrice = Math.min(airport.minPrice, price);
  } else {
    departureAirportsMap.set(depCode, {
      code: depCode,
      name: depName,
      count: 1,
      minPrice: price,
    });
  }

  // Update arrival airport filter (from outbound)
  const arrCode = flight.outbound.arrivalAirport.code;
  const arrName = flight.outbound.arrivalAirport.name;
  if (arrivalAirportsMap.has(arrCode)) {
    const airport = arrivalAirportsMap.get(arrCode)!;
    airport.count++;
    airport.minPrice = Math.min(airport.minPrice, price);
  } else {
    arrivalAirportsMap.set(arrCode, {
      code: arrCode,
      name: arrName,
      count: 1,
      minPrice: price,
    });
  }
}
