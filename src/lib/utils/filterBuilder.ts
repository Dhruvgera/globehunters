export interface FilterItem {
  code: string;
  name: string;
  count: number;
  minPrice: number;
}

export interface FlightFilterResult {
  airlines: Map<string, FilterItem>;
  departureAirports: Map<string, FilterItem>;
  arrivalAirports: Map<string, FilterItem>;
  priceRange: { min: number; max: number };
}

import type { Flight } from '@/types/flight';

export function buildFlightFilters(
  flights: Flight[],
  getPrice: (flight: Flight) => number,
  getAirportName?: (code: string, rawName: string) => string
): FlightFilterResult {
  const airlines = new Map<string, FilterItem>();
  const departureAirports = new Map<string, FilterItem>();
  const arrivalAirports = new Map<string, FilterItem>();
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const flight of flights) {
    const price = getPrice(flight);

    if (price > 0) {
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }

    const airlineCode = flight.airline.code;
    if (airlines.has(airlineCode)) {
      const airline = airlines.get(airlineCode)!;
      airline.count++;
      airline.minPrice = Math.min(airline.minPrice, price);
    } else {
      airlines.set(airlineCode, {
        code: airlineCode,
        name: flight.airline.name,
        count: 1,
        minPrice: price,
      });
    }

    const depCode = flight.outbound.departureAirport.code;
    const depRawName = flight.outbound.departureAirport.name || depCode;
    const depName = getAirportName ? getAirportName(depCode, depRawName) : depRawName;
    if (departureAirports.has(depCode)) {
      const airport = departureAirports.get(depCode)!;
      airport.count++;
      airport.minPrice = Math.min(airport.minPrice, price);
    } else {
      departureAirports.set(depCode, {
        code: depCode,
        name: depName,
        count: 1,
        minPrice: price,
      });
    }

    const arrCode = flight.outbound.arrivalAirport.code;
    const arrRawName = flight.outbound.arrivalAirport.name || arrCode;
    const arrName = getAirportName ? getAirportName(arrCode, arrRawName) : arrRawName;
    if (arrivalAirports.has(arrCode)) {
      const airport = arrivalAirports.get(arrCode)!;
      airport.count++;
      airport.minPrice = Math.min(airport.minPrice, price);
    } else {
      arrivalAirports.set(arrCode, {
        code: arrCode,
        name: arrName,
        count: 1,
        minPrice: price,
      });
    }
  }

  return {
    airlines,
    departureAirports,
    arrivalAirports,
    priceRange: {
      min: minPrice === Infinity ? 0 : Math.floor(minPrice),
      max: maxPrice === -Infinity ? 0 : Math.ceil(maxPrice),
    },
  };
}
