/**
 * Vyspa Business Rules
 * Apply business logic, filtering, and transformations to flight data
 */

import type { FlightSearchRequest } from '@/types/vyspa';
import type { FlightSearchResponse } from '@/services/api/flightService';
import type { Flight } from '@/types/flight';
// COMMENTED OUT: Using API-returned currency directly (FlightsUK returns GBP, FlightsUS returns USD)
// import { convertCurrency as convertCurrencyAmount, getTargetCurrency } from '@/lib/currency/converter';

/**
 * Apply business rules to flight search results
 * This includes filtering, sorting, pricing adjustments, etc.
 * 
 * @param data Transformed flight search response
 * @param params Original search parameters
 * @param targetCurrency Optional target currency (defaults to GBP for globehunters)
 * @returns Filtered and processed flight search response
 */
export async function applyBusinessRules(
  data: FlightSearchResponse,
  params: FlightSearchRequest,
  targetCurrency?: string
): Promise<FlightSearchResponse> {
  let flights = [...data.flights];
  
  // Determine target currency
  // COMMENTED OUT: Using API-returned currency directly (FlightsUK returns GBP, FlightsUS returns USD)
  // const targetCcy = targetCurrency || getTargetCurrency();
  // console.log(`💱 Target currency: ${targetCcy}`);

  // 1. Apply direct flights only filter
  if (params.dir === '1') {
    flights = filterDirectFlightsOnly(flights);
  }

  // 2. Remove duplicate flights (same airline, times, price)
  flights = removeDuplicateFlights(flights);
  
  // 3. Convert currency for all flights
  // COMMENTED OUT: Using API-returned currency directly (FlightsUK returns GBP, FlightsUS returns USD)
  // flights = await convertFlightCurrencies(flights, targetCcy);

  // 4. Sort flights by price (cheapest first)
  flights = sortFlightsByPrice(flights);

  // 5. Apply any additional business logic here
  // - Discount rules (if CMS exists)
  // - Route restrictions (if configured)
  // - Airline priorities (if configured)

  // 6. Update filters based on filtered results
  const updatedFilters = updateFiltersForFlights(flights);

  return {
    flights,
    filters: updatedFilters,
  };
}

/**
 * Filter to only include direct flights
 */
function filterDirectFlightsOnly(flights: Flight[]): Flight[] {
  return flights.filter(flight => {
    const outboundDirect = flight.outbound.stops === 0;
    const inboundDirect = !flight.inbound || flight.inbound.stops === 0;
    return outboundDirect && inboundDirect;
  });
}

/**
 * Remove duplicate flights
 * Two flights are considered duplicates if they have:
 * - Same airline
 * - Same departure/arrival times
 * - Same price
 */
function removeDuplicateFlights(flights: Flight[]): Flight[] {
  const seen = new Set<string>();
  const uniqueFlights: Flight[] = [];

  for (const flight of flights) {
    const key = generateFlightKey(flight);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFlights.push(flight);
    }
  }

  return uniqueFlights;
}

/**
 * Generate a unique key for a flight to detect duplicates
 */
function generateFlightKey(flight: Flight): string {
  const outboundKey = `${flight.airline.code}-${flight.outbound.departureTime}-${flight.outbound.arrivalTime}`;
  const inboundKey = flight.inbound 
    ? `-${flight.inbound.departureTime}-${flight.inbound.arrivalTime}`
    : '';
  const priceKey = flight.price;
  
  return `${outboundKey}${inboundKey}-${priceKey}`;
}

/**
 * Convert all flight prices to target currency
 * COMMENTED OUT: Using API-returned currency directly (FlightsUK returns GBP, FlightsUS returns USD)
 */
// async function convertFlightCurrencies(
//   flights: Flight[],
//   targetCurrency: string
// ): Promise<Flight[]> {
//   const convertedFlights: Flight[] = [];

//   for (const flight of flights) {
//     const originalCurrency = flight.currency;
    
//     // Skip if already in target currency
//     if (originalCurrency === targetCurrency) {
//       //console.log(`✅ Flight ${flight.id}: Already in ${targetCurrency}`);
//       convertedFlights.push(flight);
//       continue;
//     }

//     // Convert price
//     const convertedPrice = await convertCurrencyAmount(
//       flight.price,
//       originalCurrency,
//       targetCurrency
//     );

//     // Convert price per person
//     const convertedPricePerPerson = await convertCurrencyAmount(
//       flight.pricePerPerson,
//       originalCurrency,
//       targetCurrency
//     );

//     // Convert ticket options if they exist
//     let convertedTicketOptions = flight.ticketOptions;
//     if (flight.ticketOptions && flight.ticketOptions.length > 0) {
//       convertedTicketOptions = await Promise.all(
//         flight.ticketOptions.map(async (option) => ({
//           ...option,
//           price: await convertCurrencyAmount(option.price, originalCurrency, targetCurrency),
//         }))
//       );
//     }

//    // console.log(
//    //   `💱 Flight ${flight.id}: ${originalCurrency} ${flight.price} → ${targetCurrency} ${convertedPrice}`
//    // );

//     // Update flight with converted price
//     convertedFlights.push({
//       ...flight,
//       price: convertedPrice,
//       pricePerPerson: convertedPricePerPerson,
//       ticketOptions: convertedTicketOptions,
//       currency: targetCurrency,
//       originalPrice: flight.price,
//       originalCurrency,
//     });
//   }

//   return convertedFlights;
// }

/**
 * Sort flights by price (ascending)
 */
function sortFlightsByPrice(flights: Flight[]): Flight[] {
  return [...flights].sort((a, b) => a.price - b.price);
}

/**
 * Update filters based on filtered flight results
 */
function updateFiltersForFlights(flights: Flight[]) {
  const airlinesMap = new Map<string, { name: string; code: string; count: number; minPrice: number }>();
  const departureAirportsMap = new Map<string, { code: string; name: string; count: number; minPrice: number }>();
  const arrivalAirportsMap = new Map<string, { code: string; name: string; count: number; minPrice: number }>();
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const flight of flights) {
    const price = flight.price;

    // Update price range
    if (price < minPrice) minPrice = price;
    if (price > maxPrice) maxPrice = price;

    // Update airlines
    const airlineCode = flight.airline.code;
    if (airlinesMap.has(airlineCode)) {
      const airline = airlinesMap.get(airlineCode)!;
      airline.count++;
      airline.minPrice = Math.min(airline.minPrice, price);
    } else {
      airlinesMap.set(airlineCode, {
        name: flight.airline.name,
        code: airlineCode,
        count: 1,
        minPrice: price,
      });
    }

    // Update departure airports
    const depCode = flight.outbound.departureAirport.code;
    if (departureAirportsMap.has(depCode)) {
      const airport = departureAirportsMap.get(depCode)!;
      airport.count++;
      airport.minPrice = Math.min(airport.minPrice, price);
    } else {
      departureAirportsMap.set(depCode, {
        code: depCode,
        name: flight.outbound.departureAirport.name,
        count: 1,
        minPrice: price,
      });
    }

    // Update arrival airports
    const arrCode = flight.outbound.arrivalAirport.code;
    if (arrivalAirportsMap.has(arrCode)) {
      const airport = arrivalAirportsMap.get(arrCode)!;
      airport.count++;
      airport.minPrice = Math.min(airport.minPrice, price);
    } else {
      arrivalAirportsMap.set(arrCode, {
        code: arrCode,
        name: flight.outbound.arrivalAirport.name,
        count: 1,
        minPrice: price,
      });
    }
  }

  return {
    airlines: Array.from(airlinesMap.values()),
    departureAirports: Array.from(departureAirportsMap.values()),
    arrivalAirports: Array.from(arrivalAirportsMap.values()),
    minPrice: minPrice === Infinity ? 0 : Math.floor(minPrice),
    maxPrice: maxPrice === -Infinity ? 0 : Math.ceil(maxPrice),
  };
}

/**
 * Apply currency conversion (optional - implement if needed)
 * @param amount Amount to convert
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  // TODO: Implement currency conversion if needed
  // This would require exchange rate API or hardcoded rates
  
  // For now, return amount as-is
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Placeholder: Could integrate with exchange rate API
  console.warn(`Currency conversion not implemented: ${fromCurrency} → ${toCurrency}`);
  return amount;
}

/**
 * Apply discount rules (optional - implement if CMS exists)
 */
export function applyDiscountRules(
  flights: Flight[],
  discountRules: any[]
): Flight[] {
  // TODO: Implement discount rules if needed
  // This would integrate with a CMS or configuration system
  
  return flights;
}

/**
 * Filter by route rules (optional - implement if needed)
 */
export function filterByRouteRules(
  flights: Flight[],
  routeRules: any[]
): Flight[] {
  // TODO: Implement route filtering if needed
  // This would check against allowed/blocked route combinations
  
  return flights;
}
