/**
 * Holiday Package Change Flights API Route
 * Endpoint: POST /api/packages/change-flights
 * 
 * Returns an array of all available alternate flight options for a holiday package.
 * Uses Vyspa API: POST /rest/v4/holiday_change_flights/ with Api-Version: 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type {
  HolidayChangeFlightsRequest,
  HolidayChangeFlightsResponse,
  HolidayAlternateFlight,
  TransformedAlternateFlight,
} from '@/types/holidayPackage';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${basicAuth}`;
}

/** Request body for the change flights endpoint */
interface ChangeFlightsRequestBody {
  /** Flight search criteria ID from package search */
  flightSearchCriteriaId: number;
  /** Selected flight psw_result_id from package search */
  selectedFlightPswResultId: number;
  /** Hotel search criteria ID from package search */
  hotelSearchCriteriaIds: number;
  /** Hotel ID (optional) */
  hotelId?: number;
  /** Hotel search result ID (optional) */
  hotelResultId?: number;
  /** Hotel search result room ID (optional) */
  hotelResultRoomId?: number;
  /** Maximum number of results to return */
  limit?: number;
  /** Page number for pagination */
  page?: number;
  /** Flight filters */
  filter?: {
    priceFrom?: string;
    priceTo?: string;
    airlines?: string[];
    cabins?: ('M' | 'W' | 'C' | 'F')[];
  };
}

/**
 * Transform frontend request to Vyspa API request format
 */
function buildVyspaRequest(body: ChangeFlightsRequestBody): HolidayChangeFlightsRequest {
  const request: HolidayChangeFlightsRequest = {
    psc_request_id: body.flightSearchCriteriaId,
    psw_result_id: body.selectedFlightPswResultId,
    hotel_request_id: body.hotelSearchCriteriaIds,
  };

  if (body.hotelId !== undefined) {
    request.hotel_id = body.hotelId;
  }

  if (body.hotelResultId !== undefined) {
    request.hotel_result_id = body.hotelResultId;
  }

  if (body.hotelResultRoomId !== undefined) {
    request.hotel_result_room_id = body.hotelResultRoomId;
  }

  if (body.limit !== undefined) {
    request.limit = body.limit;
  }

  if (body.page !== undefined) {
    request.page = body.page;
  }

  if (body.filter) {
    request.filter = {
      price_from: body.filter.priceFrom,
      price_to: body.filter.priceTo,
      airlines: body.filter.airlines,
      cabins: body.filter.cabins,
    };
  }

  return request;
}

/**
 * Transform Vyspa alternate flight to frontend format
 */
function transformAlternateFlight(flight: HolidayAlternateFlight): TransformedAlternateFlight {
  return {
    pswResultId: flight.psw_result_id,
    priceDifference: flight.holiday_diff,
    priceDifferencePerPerson: flight.holiday_diff_per_person,
    totalFare: flight.total_fare,
    airlineCode: flight.airline_code,
    airlineName: flight.airline_name,
    flightNumber: flight.flight_number,
    departureAirport: flight.departure_airport,
    arrivalAirport: flight.arrival_airport,
    departureDate: flight.departure_date,
    arrivalDate: flight.arrival_date,
    departureTime: flight.departure_time,
    arrivalTime: flight.arrival_time,
    stops: flight.number_stops,
    travelTime: flight.travel_time,
    cabinClass: flight.class_name,
    baggage: flight.Baggage,
    currency: flight.iso_currency_code,
    refundableText: flight.refundable_text,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChangeFlightsRequestBody;

    // Validate required fields
    if (!body.flightSearchCriteriaId || !body.selectedFlightPswResultId || !body.hotelSearchCriteriaIds) {
      return NextResponse.json(
        { error: 'Missing required fields: flightSearchCriteriaId, selectedFlightPswResultId, hotelSearchCriteriaIds' },
        { status: 400 }
      );
    }

    // Build Vyspa request
    const vyspaRequest = buildVyspaRequest(body);

    const baseUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/rest/v4/holiday_change_flights/`;

    console.log('[PackageChangeFlights] Fetching alternate flights:', {
      psc_request_id: vyspaRequest.psc_request_id,
      psw_result_id: vyspaRequest.psw_result_id,
      hotel_request_id: vyspaRequest.hotel_request_id,
      hotel_id: vyspaRequest.hotel_id,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout * 2);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuthHeader(),
        'Api-Version': '2', // Use API version 2 for change flights
      },
      body: JSON.stringify([vyspaRequest]), // API expects array
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[PackageChangeFlights] Vyspa API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: `Vyspa API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const vyspaResponse = await response.json() as HolidayChangeFlightsResponse;

    // Transform response to frontend format
    const alternateFlights: TransformedAlternateFlight[] = (vyspaResponse.Results || []).map(transformAlternateFlight);

    console.log('[PackageChangeFlights] Found alternate flights:', {
      count: alternateFlights.length,
    });

    return NextResponse.json({
      flights: alternateFlights,
      // Include raw response for debugging (can be removed in production)
      _raw: vyspaResponse,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    console.error('[PackageChangeFlights] Error:', {
      message: errorMessage,
      isTimeout,
    });

    if (isTimeout) {
      return NextResponse.json(
        { error: 'Request timeout', message: 'The change flights request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}
