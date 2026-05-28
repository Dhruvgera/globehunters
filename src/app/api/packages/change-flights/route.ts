/**
 * Holiday Package Change Flights API Route
 * Endpoint: POST /api/packages/change-flights
 *
 * Uses Vyspa API: POST /rest/v4/holiday_change_flights/ (Api-Version: 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type {
  HolidayAlternateFlight,
  HolidayChangeFlightsRequest,
  HolidayChangeFlightsResponse,
  TransformedAlternateFlight,
} from '@/types/holidayPackage';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getVyspaBaseUrl(): string {
  return VYSPA_CONFIG.apiUrl.replace(/\/anon\.php\/?$/, '').replace(/\/+$/, '');
}

interface ChangeFlightsRequestBody {
  flightResultId: string;
  hotelResultId: number;
}

function buildVyspaRequest(body: ChangeFlightsRequestBody): HolidayChangeFlightsRequest {
  return {
    FlightResultId: body.flightResultId,
    HotelResultId: body.hotelResultId,
  };
}

function transformAlternateFlight(flight: HolidayAlternateFlight): TransformedAlternateFlight {
  const firstDirection = Array.isArray(flight.Segments) ? flight.Segments[0] : undefined;
  const directionFlights = Array.isArray((firstDirection as { Flights?: unknown[] } | undefined)?.Flights)
    ? ((firstDirection as { Flights?: unknown[] }).Flights as Array<Record<string, unknown>>)
    : Array.isArray((firstDirection as { flights?: unknown[] } | undefined)?.flights)
      ? ((firstDirection as { flights?: unknown[] }).flights as Array<Record<string, unknown>>)
      : [];
  const firstFlight = directionFlights[0];
  const lastFlight = directionFlights[directionFlights.length - 1];

  return {
    resultId: flight.Result_id,
    priceDifference: Number(flight.holiday_diff ?? 0),
    priceDifferencePerPerson: flight.holiday_diff_per_person != null ? Number(flight.holiday_diff_per_person) : undefined,
    totalFare: Number(flight.Total ?? 0),
    holidayPrice: Number(flight.holiday_price ?? 0) || undefined,
    holidayPricePerRoom: Number(flight.holiday_price_per_room ?? 0) || undefined,
    segments: flight.Segments,
    airlineCode: String(firstFlight?.airline_code || ''),
    airlineName: String(firstFlight?.airline_name || ''),
    flightNumber: Number(firstFlight?.flight_number ?? 0),
    departureAirport: String(firstFlight?.departure_airport || ''),
    arrivalAirport: String(lastFlight?.arrival_airport || ''),
    departureDate: String(firstFlight?.departure_date || ''),
    arrivalDate: String(lastFlight?.arrival_date || ''),
    departureTime: Number(firstFlight?.departure_time ?? 0),
    arrivalTime: Number(lastFlight?.arrival_time ?? 0),
    stops: Math.max(0, directionFlights.length - 1),
    travelTime: Number((firstDirection as { Flying_time?: number; flying_time?: number } | undefined)?.Flying_time ?? (firstDirection as { flying_time?: number } | undefined)?.flying_time ?? 0),
    cabinClass: String(firstFlight?.class_name || firstFlight?.cabin_class || ''),
    baggage: String(firstFlight?.baggage || firstFlight?.Baggage || '') || undefined,
    currency: flight.Currency_code,
    refundableText: String(firstFlight?.refundable_text || '') || undefined,
    gds: flight.Gds,
    moduleId: flight.Module_id,
    fareType: flight.Fare_type,
    validatingCarrier: flight.Validating_carrier,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChangeFlightsRequestBody;

    if (!body.flightResultId || !body.hotelResultId) {
      return NextResponse.json(
        { error: 'Missing required fields: flightResultId, hotelResultId' },
        { status: 400 }
      );
    }

    const url = `${getVyspaBaseUrl()}/rest/v4/holiday_change_flights/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout * 2);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildBasicAuthHeader(),
        'Api-Version': '2',
      },
      body: JSON.stringify([buildVyspaRequest(body)]),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Vyspa API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const vyspaResponse = (await response.json()) as HolidayChangeFlightsResponse;
    const flights = Array.isArray(vyspaResponse.Results)
      ? vyspaResponse.Results.map(transformAlternateFlight)
      : [];

    return NextResponse.json({
      flights,
      _raw: vyspaResponse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    return NextResponse.json(
      {
        error: isTimeout ? 'Request timeout' : 'Internal server error',
        message: isTimeout ? 'The change flights request timed out' : message,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
