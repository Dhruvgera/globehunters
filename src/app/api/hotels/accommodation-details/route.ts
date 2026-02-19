import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';
import { getHotelProvider } from '@/lib/hotels/provider';
import { decodeHotelSearchToken } from '@/lib/hotels/searchToken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AccommodationDetailsBody = unknown[];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as AccommodationDetailsBody | null;

  if (!body || !Array.isArray(body) || body.length === 0) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Expected non-empty array payload' },
      { status: 400 }
    );
  }

  const provider = getHotelProvider();
  const tokenCandidate = (() => {
    const first = body[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) return '';
    const row = first as Record<string, unknown>;
    const token = row.searchCriteriaId ?? row.SearchCriteriaId;
    return typeof token === 'string' ? token : '';
  })();
  const isHotelbedsContext = Boolean(tokenCandidate && decodeHotelSearchToken(tokenCandidate));

  if (provider === 'hotelbeds' || isHotelbedsContext) {
    return NextResponse.json({}, { status: 200 });
  }

  const result = await vyspaRestFetch('/rest/v4/accommodationDetails/', body, {
    headers: { 'Api-Version': '1' },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `accommodationDetails failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}
