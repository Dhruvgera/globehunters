/**
 * Holiday Package Destinations Autocomplete API Route
 * Endpoint: GET /api/packages/destinations?location={location}
 * 
 * Returns an array of destinations based on the given lookup parameter.
 * Uses Vyspa API: GET /rest/v4/holiday_destinations_autocomplete/{location}/1
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type { HolidayDestination } from '@/types/holidayPackage';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${basicAuth}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    if (!location || location.trim().length < 2) {
      return NextResponse.json(
        { error: 'Location parameter is required and must be at least 2 characters' },
        { status: 400 }
      );
    }

    const encodedLocation = encodeURIComponent(location.trim());
    const baseUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    // The second parameter (1) indicates json_format=true
    const url = `${baseUrl}/rest/v4/holiday_destinations_autocomplete/${encodedLocation}/1`;

    console.log('[PackageDestinations] Fetching destinations:', { location, url });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuthHeader(),
        'Api-Version': '1',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[PackageDestinations] Vyspa API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: `Vyspa API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The API returns an array of destinations
    const destinations: HolidayDestination[] = Array.isArray(data) ? data : [];

    console.log('[PackageDestinations] Found destinations:', {
      location,
      count: destinations.length,
    });

    return NextResponse.json(destinations);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    console.error('[PackageDestinations] Error:', {
      message: errorMessage,
      isTimeout,
    });

    if (isTimeout) {
      return NextResponse.json(
        { error: 'Request timeout', message: 'The destination lookup request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}
