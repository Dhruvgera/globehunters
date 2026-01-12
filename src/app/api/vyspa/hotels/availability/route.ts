import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AvailabilityBody = unknown[] | Record<string, unknown>;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as AvailabilityBody | null;

  if (!body) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Missing request body' },
      { status: 400 }
    );
  }

  const vyspaPayload = Array.isArray(body) ? body : [body];

  if (!Array.isArray(vyspaPayload) || vyspaPayload.length === 0) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Payload must be a non-empty array' },
      { status: 400 }
    );
  }

  const result = await vyspaRestFetch('/rest/v4/accommodationAvailabilityV3/', vyspaPayload);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `accommodationAvailabilityV3 failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}




