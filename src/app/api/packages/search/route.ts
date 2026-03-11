/**
 * Holiday Package Search API Route
 * Endpoint: POST /api/packages/search
 *
 * Uses Vyspa API: POST /rest/v4/holiday_package_search/ (Api-Version: 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type {
  HolidayFlightDirection,
  HolidayFlightSegment,
  HolidayPackageSearchRequest,
  HolidayPackageSearchResponse,
  PackageResultsMeta,
  PackageSearchCriteria,
  PackageSearchResult,
  RoomChildAges,
  TransformedFlightLeg,
  TransformedFlightSegment,
} from '@/types/holidayPackage';

function resolvePackageSearchTimeoutSec(): number {
  const raw = Number(
    process.env.VYSPA_PACKAGE_SEARCH_TIMEOUT_SEC
      || process.env.VYSPA_HOTELS_SEARCH_TIMEOUT_SEC
      || process.env.NEXT_PUBLIC_VYSPA_HOTELS_TIMEOUT_SEC
      || 30
  );
  if (!Number.isFinite(raw) || raw <= 0) return 30;
  return Math.max(5, Math.trunc(raw));
}

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getVyspaBaseUrl(): string {
  return VYSPA_CONFIG.apiUrl.replace(/\/anon\.php\/?$/, '').replace(/\/+$/, '');
}

function formatDateForVyspa(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function buildVyspaRequest(criteria: PackageSearchCriteria): HolidayPackageSearchRequest {
  const adults: string[] = [];
  const children: string[] = [];
  const childAges: RoomChildAges[] = [];
  const infants: string[] = [];

  for (const room of criteria.rooms) {
    adults.push(String(room.adults));
    children.push(String(room.children));
    infants.push(String(room.infants));

    const roomChildAges: RoomChildAges = {};
    room.childAges.forEach((age, index) => {
      roomChildAges[String(index + 1)] = String(age);
    });
    childAges.push(roomChildAges);
  }

  return {
    DestinationFrom: criteria.departureCode,
    Destination: criteria.destinationHiddenValue,
    departure_date: formatDateForVyspa(criteria.checkIn),
    nights: String(criteria.nights),
    rooms: String(criteria.rooms.length),
    adults,
    children,
    child_ages: childAges,
    infants,
    minimalResponse: false,
    timeout: resolvePackageSearchTimeoutSec(),
    ...(criteria.directFlightsOnly ? { direct_flight_only: 1 } : {}),
    ...(criteria.hotelFilters ? { hotel_filters: criteria.hotelFilters } : {}),
    ...(criteria.customSort ? { customsort: criteria.customSort } : {}),
  };
}

function transformFlightLeg(direction: HolidayFlightDirection): TransformedFlightLeg {
  const rawDirection = direction as unknown as { Flights?: HolidayFlightSegment[]; flights?: HolidayFlightSegment[]; Flying_time?: number; flying_time?: number };
  const flightRows = Array.isArray(rawDirection.Flights)
    ? rawDirection.Flights
    : Array.isArray(rawDirection.flights)
      ? rawDirection.flights
      : [];
  const segments: TransformedFlightSegment[] = flightRows.map((segment: HolidayFlightSegment, index) => ({
    id: Number(segment.id ?? index + 1),
    pswResultId: Number(segment.psw_result_id ?? 0),
    airlineCode: segment.airline_code,
    airlineName: segment.airline_name,
    flightNumber: segment.flight_number,
    departureAirport: segment.departure_airport,
    arrivalAirport: segment.arrival_airport,
    departureDate: segment.departure_date,
    arrivalDate: segment.arrival_date,
    departureTime: segment.departure_time,
    arrivalTime: segment.arrival_time,
    stops: Number(segment.number_stops ?? 0),
    travelTime: Number(segment.travel_time ?? 0),
    cabinClass: segment.class_name || segment.cabin_class,
    baggage: segment.Baggage,
  }));

  return {
    duration: Number(rawDirection.Flying_time ?? rawDirection.flying_time ?? 0),
    segments,
  };
}

function extractStartingPrice(hotel: Record<string, unknown>): number | undefined {
  const candidates = ['MinSC', 'MinRO', 'MinBB', 'MinHB', 'MinFB', 'MinAI']
    .map((key) => Number(hotel[key]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (candidates.length === 0) return undefined;
  return Math.min(...candidates);
}

function extractPackageEmptyMessage(rawResults: unknown): string | undefined {
  if (!Array.isArray(rawResults) || rawResults.length < 2) return undefined;
  const [, message] = rawResults;
  if (typeof message !== 'string') return undefined;
  const normalized = message.trim();
  return normalized || undefined;
}

function isPackageHotelResultRow(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  const hotelId = Number(row.hotel_id);
  const hotelName = String(row.hotel_name || '').trim();
  return Number.isFinite(id) && Number.isFinite(hotelId) && Boolean(hotelName);
}

export function transformResponse(
  vyspaResponse: HolidayPackageSearchResponse
): { results: PackageSearchResult[]; meta: PackageResultsMeta } {
  const criteria = Array.isArray(vyspaResponse.SearchCriteria)
    ? vyspaResponse.SearchCriteria[0]
    : vyspaResponse.SearchCriteria;

  const flightDirections = Array.isArray(vyspaResponse.FlightDetails)
    ? vyspaResponse.FlightDetails
    : [];

  const outboundLeg = flightDirections[0] ? transformFlightLeg(flightDirections[0]) : undefined;
  const inboundLeg = flightDirections[1] ? transformFlightLeg(flightDirections[1]) : undefined;

  const rawHotelRows = Array.isArray(vyspaResponse.Packages?.results)
    ? vyspaResponse.Packages.results
    : [];
  const hotelRows = rawHotelRows.filter(isPackageHotelResultRow);

  const results: PackageSearchResult[] = hotelRows.map((hotel) => {
    const hotelRow = hotel as unknown as Record<string, unknown>;
    return {
      id: Number(hotel.id),
      hotelId: Number(hotel.hotel_id),
      hotelName: hotel.hotel_name,
      description: hotel.quickDescription,
      imageUrl: hotel.image_name,
      starRating: Number(hotelRow.hotel_rating ?? hotel.HotelInfo?.hotel_rating ?? 0) || undefined,
      address: {
        street1: typeof hotelRow.address1 === 'string' ? hotelRow.address1 : undefined,
        street2: typeof hotelRow.address2 === 'string' ? hotelRow.address2 : undefined,
        latitude: Number(hotelRow.geo_loc_latitude ?? 0) || undefined,
        longitude: Number(hotelRow.geo_loc_longitude ?? 0) || undefined,
      },
      rooms: {},
      startingPrice: extractStartingPrice(hotelRow),
      currency:
        typeof hotelRow.SellCur === 'string'
          ? hotelRow.SellCur
          : undefined,
      flight: outboundLeg ? { outbound: outboundLeg, inbound: inboundLeg } : undefined,
    };
  });

  const meta: PackageResultsMeta = {
    requestId: Number(criteria?.RequestId ?? 0),
    hotelRequestId: Number(criteria?.HotelRequestId ?? 0) || undefined,
    hotelRequestIdNextDay: Number(criteria?.HotelRequestIdNextDay ?? 0) || undefined,
    flightRequestId: Number(criteria?.FlightRequestId ?? 0) || undefined,
    selectedFlightResultId: String(criteria?.FlightResultId ?? ''),
    hotelDayOption: Number(criteria?.HotelDayOption ?? vyspaResponse.HotelDayOption ?? 0) || undefined,
    pagination: vyspaResponse.Packages?.pagination,
    completed: Boolean(criteria?.searchComplete),
    emptyMessage: results.length === 0 ? extractPackageEmptyMessage(rawHotelRows) : undefined,
    flightSearchCriteriaId: Number(criteria?.FlightRequestId ?? 0) || undefined,
    hotelSearchCriteriaIds: Number(criteria?.HotelRequestId ?? 0) || undefined,
  };

  return { results, meta };
}

export async function POST(request: NextRequest) {
  try {
    const criteria = (await request.json()) as PackageSearchCriteria;

    if (
      !criteria.departureCode ||
      !criteria.destinationHiddenValue ||
      !criteria.checkIn ||
      !criteria.nights ||
      !criteria.rooms?.length
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: departureCode, destinationHiddenValue, checkIn, nights, rooms' },
        { status: 400 }
      );
    }

    const vyspaRequest = buildVyspaRequest(criteria);
    const url = `${getVyspaBaseUrl()}/rest/v4/holiday_package_search/`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout * 2);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildBasicAuthHeader(),
        'Api-Version': '2',
      },
      body: JSON.stringify([vyspaRequest]),
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

    const vyspaResponse = (await response.json()) as HolidayPackageSearchResponse;
    const { results, meta } = transformResponse(vyspaResponse);

    return NextResponse.json({
      results,
      meta,
      _raw: vyspaResponse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    return NextResponse.json(
      {
        error: isTimeout ? 'Request timeout' : 'Internal server error',
        message: isTimeout ? 'The package search request timed out' : message,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
