import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GetCitiesBody =
  | unknown[]
  | {
      location: string;
      json_format?: boolean;
      options?: unknown[];
    };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as GetCitiesBody | null;

  if (!body) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Missing request body' }, { status: 400 });
  }

  // Even when HotelBeds is the active provider, we keep Vyspa city lookup to power the UI autocomplete.
  const vyspaPayload = Array.isArray(body)
    ? body
    : [body.location, body.json_format ?? true, ...(body.options ? [body.options] : [])];

  if (!Array.isArray(vyspaPayload) || typeof vyspaPayload[0] !== 'string' || !vyspaPayload[0].trim()) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'location must be a non-empty string' }, { status: 400 });
  }

  const result = await vyspaRestFetch('/rest/v4/get_cities/', vyspaPayload);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `get_cities failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}

