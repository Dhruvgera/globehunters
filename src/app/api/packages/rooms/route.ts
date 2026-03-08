/**
 * Holiday Package Rooms API Route
 * Endpoint: POST /api/packages/rooms
 *
 * Uses Vyspa API: POST /rest/v4/holiday_package_rooms/ (Api-Version: 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getVyspaBaseUrl(): string {
  return VYSPA_CONFIG.apiUrl.replace(/\/anon\.php\/?$/, '').replace(/\/+$/, '');
}

interface PackageRoomsRequestBody {
  hotelResultId: number;
  requestId?: number;
  flightResultId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PackageRoomsRequestBody;

    if (!body.hotelResultId || (!body.requestId && !body.flightResultId)) {
      return NextResponse.json(
        { error: 'Missing required fields: hotelResultId and one of requestId or flightResultId' },
        { status: 400 }
      );
    }

    const url = `${getVyspaBaseUrl()}/rest/v4/holiday_package_rooms/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout * 2);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildBasicAuthHeader(),
        'Api-Version': '2',
      },
      body: JSON.stringify([
        {
          HotelResultId: body.hotelResultId,
          ...(body.requestId ? { RequestId: body.requestId } : {}),
          ...(body.flightResultId ? { FlightResultId: body.flightResultId } : {}),
        },
      ]),
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

    const payload = await response.json();
    const results = Array.isArray(payload?.results)
      ? payload.results
      : payload?.results && typeof payload.results === 'object'
        ? [payload.results]
        : [];
    return NextResponse.json({
      results,
      _raw: payload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    return NextResponse.json(
      {
        error: isTimeout ? 'Request timeout' : 'Internal server error',
        message: isTimeout ? 'The package rooms request timed out' : message,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
