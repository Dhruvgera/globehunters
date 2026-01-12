import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DetailsBody = unknown[];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as DetailsBody | null;

  if (!body || !Array.isArray(body) || body.length < 2) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Expected payload: [criteria, selection]' },
      { status: 400 }
    );
  }

  const result = await vyspaRestFetch('/rest/v4/hotel_search_details/', body);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `hotel_search_details failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}




