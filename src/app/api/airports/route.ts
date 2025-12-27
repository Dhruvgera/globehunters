/**
 * Airport API Route
 * Serves static airport data from cache (JSON file)
 */

import { NextRequest, NextResponse } from 'next/server';
import { airportCache } from '@/lib/cache/airportCache';
import { searchAirports } from '@/lib/utils/airportSearch';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || undefined;

    const allAirports = await airportCache.getAirports();
    
    let result = allAirports;
    
    if (query) {
      // Filter locally using search utility
      const searchResults = searchAirports(allAirports, query, 100);
      
      // Map back to Airport type (remove search metadata)
      result = searchResults.map(({ matchScore, matchedFields, ...airport }) => airport);
    }
    
    return NextResponse.json(result, {
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




