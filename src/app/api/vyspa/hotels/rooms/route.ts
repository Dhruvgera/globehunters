import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RoomsBody =
  | unknown[]
  | {
      SearchCriteriaId: number;
      hotelIds?: string | number;
      srIds?: string | number;
    };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RoomsBody | null;

  if (!body) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Missing request body' },
      { status: 400 }
    );
  }

  const vyspaPayload = Array.isArray(body) ? body : [body];
  const first = vyspaPayload[0] as any;

  if (!first || typeof first !== 'object' || typeof first.SearchCriteriaId !== 'number') {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'SearchCriteriaId (number) is required' },
      { status: 400 }
    );
  }

  if (!('hotelIds' in first) && !('srIds' in first)) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'hotelIds or srIds is required' },
      { status: 400 }
    );
  }

  const result = await vyspaRestFetch('/rest/v4/getRoomsV3/', vyspaPayload);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `getRoomsV3 failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}




