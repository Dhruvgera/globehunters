/**
 * Holiday Package Search API Route
 * Endpoint: POST /api/packages/search
 * 
 * Returns an array of all holiday packages availability.
 * Uses Vyspa API: POST /rest/v4/holiday_package_search/
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type {
  HolidayPackageSearchRequest,
  HolidayPackageSearchResponse,
  PackageSearchCriteria,
  PackageSearchResult,
  PackageResultsMeta,
  TransformedFlightLeg,
  TransformedFlightSegment,
  HolidayFlightDirection,
  HolidayFlightSegment,
  RoomChildAges,
} from '@/types/holidayPackage';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${basicAuth}`;
}

/**
 * Convert ISO date (YYYY-MM-DD) to Vyspa format (DD/MM/YYYY)
 */
function formatDateForVyspa(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Transform frontend search criteria to Vyspa API request format
 */
function buildVyspaRequest(criteria: PackageSearchCriteria): HolidayPackageSearchRequest {
  const adults: string[] = [];
  const children: string[] = [];
  const childAges: RoomChildAges[] = [];
  const infants: string[] = [];

  for (const room of criteria.rooms) {
    adults.push(String(room.adults));
    children.push(String(room.children));
    infants.push(String(room.infants));

    // Build child_ages object for this room
    const roomChildAges: RoomChildAges = {};
    if (room.childAges && room.childAges.length > 0) {
      room.childAges.forEach((age, index) => {
        // Keys are 1-based child indices
        roomChildAges[String(index + 1)] = String(age);
      });
    }
    childAges.push(roomChildAges);
  }

  const request: HolidayPackageSearchRequest = {
    DestinationFrom: criteria.departureCode,
    Destination: criteria.destinationHiddenValue,
    departure_date: formatDateForVyspa(criteria.checkIn),
    nights: String(criteria.nights),
    rooms: String(criteria.rooms.length),
    minimalResponse: false,
    adults,
    children,
    child_ages: childAges,
    infants,
  };

  // Add optional filters
  if (criteria.directFlightsOnly) {
    request.direct_flight_only = 1;
  }

  if (criteria.hotelFilters) {
    request.hotel_filters = criteria.hotelFilters;
  }

  if (criteria.customSort) {
    request.customsort = criteria.customSort;
  }

  return request;
}

/**
 * Transform Vyspa flight direction to frontend format
 */
function transformFlightLeg(direction: HolidayFlightDirection): TransformedFlightLeg {
  const segments: TransformedFlightSegment[] = direction.flights.map((segment: HolidayFlightSegment) => ({
    id: segment.id,
    pswResultId: segment.psw_result_id,
    airlineCode: segment.airline_code,
    airlineName: segment.airline_name,
    flightNumber: segment.flight_number,
    departureAirport: segment.departure_airport,
    arrivalAirport: segment.arrival_airport,
    departureDate: segment.departure_date,
    arrivalDate: segment.arrival_date,
    departureTime: segment.departure_time,
    arrivalTime: segment.arrival_time,
    stops: segment.number_stops,
    travelTime: segment.travel_time,
    cabinClass: segment.class_name || segment.cabin_class,
    baggage: segment.Baggage,
  }));

  return {
    duration: direction.flying_time,
    segments,
    price: direction.FlightPswResult?.total_fare,
  };
}

/**
 * Transform Vyspa response to frontend format
 */
function transformResponse(
  vyspaResponse: HolidayPackageSearchResponse
): { results: PackageSearchResult[]; meta: PackageResultsMeta } {
  const results: PackageSearchResult[] = [];
  const flightDetails = vyspaResponse.FlightDetails;

  // Transform flight legs (shared across all packages in this response)
  let outboundLeg: TransformedFlightLeg | undefined;
  let inboundLeg: TransformedFlightLeg | undefined;

  if (flightDetails?.outbound) {
    outboundLeg = transformFlightLeg(flightDetails.outbound);
  }

  if (flightDetails?.inbound) {
    inboundLeg = transformFlightLeg(flightDetails.inbound);
  }

  // Transform hotel results
  if (vyspaResponse.Packages?.results) {
    for (const hotel of vyspaResponse.Packages.results) {
      // Find the cheapest room price
      let startingPrice: number | undefined;
      let currency: string | undefined;

      if (hotel.Rooms) {
        for (const roomOptions of Object.values(hotel.Rooms)) {
          for (const room of roomOptions) {
            if (room.room_price !== undefined) {
              if (startingPrice === undefined || room.room_price < startingPrice) {
                startingPrice = room.room_price;
                currency = room.currency_code;
              }
            }
          }
        }
      }

      results.push({
        id: hotel.id,
        hotelId: hotel.hotel_id,
        hotelName: hotel.hotel_name,
        description: hotel.quickDescription,
        imageUrl: hotel.image_name,
        starRating: hotel.HotelInfo?.hotel_rating,
        address: hotel.address,
        rooms: hotel.Rooms || {},
        startingPrice,
        currency,
        flight: outboundLeg ? {
          outbound: outboundLeg,
          inbound: inboundLeg,
        } : undefined,
      });
    }
  }

  // Extract IDs for subsequent API calls
  const searchCriteria = vyspaResponse.SearchCriteria?.[0];
  const searchKey = vyspaResponse.search_key;
  const firstOutboundFlight = flightDetails?.outbound?.flights?.[0];

  const meta: PackageResultsMeta = {
    flightSearchCriteriaId: searchCriteria?.ids?.flightSearchCriteriaId || searchKey?.flightSearchCriteriaId || 0,
    hotelSearchCriteriaIds: searchCriteria?.ids?.hotelSearchCriteriaIds || searchKey?.hotelSearchCriteriaIds || 0,
    selectedFlightPswResultId: searchCriteria?.ids?.selectedFlight || firstOutboundFlight?.psw_result_id || 0,
    pagination: vyspaResponse.Packages?.pagination,
    completed: searchKey?.completed === 1,
  };

  return { results, meta };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const criteria = body as PackageSearchCriteria;

    // Validate required fields
    if (!criteria.departureCode || !criteria.destinationHiddenValue || !criteria.checkIn || !criteria.nights || !criteria.rooms?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: departureCode, destinationHiddenValue, checkIn, nights, rooms' },
        { status: 400 }
      );
    }

    // Build Vyspa request
    const vyspaRequest = buildVyspaRequest(criteria);

    const baseUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/rest/v4/holiday_package_search/`;

    console.log('[PackageSearch] Searching packages:', {
      departure: criteria.departureCode,
      destination: criteria.destinationName,
      checkIn: criteria.checkIn,
      nights: criteria.nights,
      rooms: criteria.rooms.length,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout * 2); // Longer timeout for search

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuthHeader(),
        'Api-Version': '1',
      },
      body: JSON.stringify([vyspaRequest]), // API expects array
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[PackageSearch] Vyspa API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: `Vyspa API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const vyspaResponse = await response.json() as HolidayPackageSearchResponse;

    // Transform response to frontend format
    const { results, meta } = transformResponse(vyspaResponse);

    console.log('[PackageSearch] Found packages:', {
      hotelCount: results.length,
      completed: meta.completed,
      flightSearchCriteriaId: meta.flightSearchCriteriaId,
      hotelSearchCriteriaIds: meta.hotelSearchCriteriaIds,
    });

    return NextResponse.json({
      results,
      meta,
      // Include raw response for debugging (can be removed in production)
      _raw: vyspaResponse,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    console.error('[PackageSearch] Error:', {
      message: errorMessage,
      isTimeout,
    });

    if (isTimeout) {
      return NextResponse.json(
        { error: 'Request timeout', message: 'The package search request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}
