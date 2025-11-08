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
} from './utils';
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
  };
}

/**
 * Transform a single Vyspa result to Flight
 */
function transformResult(result: VyspaResult): Flight | null {
  const totalPrice = parsePriceValue(result.Total);
  if (totalPrice === 0) {
    console.warn('Skipping flight with zero price:', result.Result_id);
    return null;
  }

  // Calculate total passengers
  let totalPassengers = 0;
  if (result.Breakdown) {
    for (const breakdown of result.Breakdown) {
      totalPassengers += parseIntSafe(breakdown.total_pax, 0);
    }
  }

  // Fallback to 1 passenger if no breakdown
  if (totalPassengers === 0) {
    totalPassengers = 1;
  }

  const pricePerPerson = totalPrice / totalPassengers;

  // Get segments (outbound and optionally inbound)
  const outboundSegment = result.Segments[0];
  const inboundSegment = result.Segments[1] || null;

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

  // Transform outbound segment
  const outbound = transformSegmentToFlightSegment(outboundSegment);

  // Transform inbound segment if exists
  const inbound = inboundSegment 
    ? transformSegmentToFlightSegment(inboundSegment)
    : undefined;

  const flight: Flight = {
    id: result.Result_id,
    airline: airline,
    outbound: outbound,
    inbound: inbound,
    price: Math.round(totalPrice),
    pricePerPerson: Math.round(pricePerPerson),
    currency: getCurrencySymbol(result.currency_code),
    webRef: result.Result_id,
  };

  return flight;
}

/**
 * Transform Vyspa segment to FlightSegment
 */
function transformSegmentToFlightSegment(segment: VyspaSegment): FlightSegment {
  const firstFlight = segment.Flights[0];
  const lastFlight = segment.Flights[segment.Flights.length - 1];

  // Get departure info from first flight
  const departureAirport: Airport = {
    code: firstFlight.departure_airport,
    name: firstFlight.departure_airport, // Vyspa doesn't provide full names
    city: firstFlight.departure_airport,
  };

  // Get arrival info from last flight
  const arrivalAirport: Airport = {
    code: lastFlight.arrival_airport,
    name: lastFlight.arrival_airport,
    city: lastFlight.arrival_airport,
  };

  // Format times
  const departureTime = formatTime(firstFlight.departure_time);
  const arrivalTime = formatTime(lastFlight.arrival_time);

  // Calculate total duration
  const totalDuration = segment.FlyingTime || 0;
  const duration = formatDuration(totalDuration);

  // Format date (convert YYYY-MM-DD to readable format)
  const date = formatDate(firstFlight.departure_date);

  // Get stop details
  const stops = segment.Stops || 0;
  const stopDetails = getStopDetails(segment);

  return {
    departureTime,
    arrivalTime,
    departureAirport,
    arrivalAirport,
    date,
    duration,
    stops,
    stopDetails,
  };
}

/**
 * Get stop details text
 */
function getStopDetails(segment: VyspaSegment): string {
  const stops = segment.Stops || 0;
  
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
