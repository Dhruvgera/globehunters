import { NextResponse } from 'next/server';
import { AFFILIATE_DATA } from '@/data/affiliates';

/**
 * GET /api/affiliates
 * Returns affiliate data from static source (no external API call)
 */
export async function GET() {
  return NextResponse.json(AFFILIATE_DATA, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
