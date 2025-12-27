/**
 * Airport API Route
 * Proxies airport requests to Vyspa API with server-side credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAirportsFromVyspa } from '@/lib/vyspa/airports';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || undefined;

    const airports = await fetchAirportsFromVyspa(query);
    
    return NextResponse.json(airports, {
      status: 200,
      headers: {
        // Cache for 24 hours
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('Error fetching airports:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch airports' },
      { status: 500 }
    );
  }
}



