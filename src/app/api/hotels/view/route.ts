/**
 * Hotel View (Accommodation View) API Route
 * Endpoint: GET /api/hotels/view?key={encryptedKey}
 *
 * Uses Vyspa API: GET /rest/v4/accommodationView/{encryptedKey} (Api-Version: 1)
 *
 * Retrieves full hotel details + room options using an encrypted deeplink key
 * from the search response. Self-contained — no session/searchCriteriaId needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type { AccommodationViewResponse } from '@/types/holidayPackage';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getVyspaBaseUrl(): string {
  return VYSPA_CONFIG.apiUrl.replace(/\/anon\.php\/?$/, '').replace(/\/+$/, '');
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');

    if (!key || !key.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameter: key' },
        { status: 400 }
      );
    }

    const url = `${getVyspaBaseUrl()}/rest/v4/accommodationView/${encodeURIComponent(key.trim())}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildBasicAuthHeader(),
        'Api-Version': '1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Vyspa API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const vyspaResponse = (await response.json()) as AccommodationViewResponse;

    return NextResponse.json(vyspaResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
