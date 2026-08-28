/**
 * Holiday Package Search API Route
 * Endpoint: POST /api/packages/search
 *
 * Uses Vyspa API: POST /rest/v4/holiday_package_search/ (Api-Version: 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import { transformPackageSearchResponse } from '@/lib/package/transformSearchResponse';
import type {
  HolidayPackageSearchRequest,
  HolidayPackageSearchResponse,
  PackageSearchCriteria,
  RoomChildAges,
} from '@/types/holidayPackage';

function resolvePackageSearchTimeoutSec(criteria?: PackageSearchCriteria): number {
  const requested = Number(criteria?.timeout);
  if (Number.isFinite(requested) && requested > 0) {
    return Math.max(30, Math.trunc(requested));
  }

  const raw = Number(
    process.env.VYSPA_PACKAGE_SEARCH_TIMEOUT_SEC
      || process.env.VYSPA_HOTELS_SEARCH_TIMEOUT_SEC
      || process.env.NEXT_PUBLIC_VYSPA_HOTELS_TIMEOUT_SEC
      || 30
  );
  if (!Number.isFinite(raw) || raw <= 0) return 30;
  return Math.max(3, Math.trunc(raw));
}

function resolvePackageSearchTimeoutBufferSec(): number {
  const raw = Number(process.env.VYSPA_PACKAGE_SEARCH_TIMEOUT_BUFFER_SEC || 5);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.min(15, Math.max(3, Math.trunc(raw)));
}

function resolvePackageTransportTimeoutMs(criteria?: PackageSearchCriteria): number {
  const configured = Number(process.env.VYSPA_PACKAGE_TRANSPORT_TIMEOUT_MS || 0);
  if (Number.isFinite(configured) && configured > 0) return Math.trunc(configured);

  const timeoutSec = resolvePackageSearchTimeoutSec(criteria);
  const bufferSec = resolvePackageSearchTimeoutBufferSec();
  return Math.max(30000, (timeoutSec + bufferSec) * 1000);
}

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getVyspaBaseUrl(): string {
  return VYSPA_CONFIG.apiUrl.replace(/\/anon\.php\/?$/, '').replace(/\/+$/, '');
}

import { formatDateToPortal } from '@/lib/utils/dateFormat';

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
    departure_date: formatDateToPortal(criteria.checkIn),
    nights: String(criteria.nights),
    rooms: String(criteria.rooms.length),
    adults,
    children,
    child_ages: childAges,
    infants,
    minimalResponse: false,
    timeout: resolvePackageSearchTimeoutSec(criteria),
    ...(criteria.requestId ? { RequestId: criteria.requestId } : {}),
    ...(criteria.directFlightsOnly ? { direct_flight_only: 1 } : {}),
    ...(criteria.includeFeesInTotal ? { includeFeesInTotal: true } : {}),
    ...(criteria.hotelFilters ? { hotel_filters: criteria.hotelFilters } : {}),
    ...(criteria.customSort ? { customsort: criteria.customSort } : {}),
  };
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
    const timeoutId = setTimeout(() => controller.abort(), resolvePackageTransportTimeoutMs(criteria));
    // console.log( 'vyspaRequest', vyspaRequest)
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
    const { results, meta } = transformPackageSearchResponse(vyspaResponse);

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
