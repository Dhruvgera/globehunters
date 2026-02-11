import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ConfirmBody =
  | {
      folderNumber: number;
      itineraryNumber: number | string;
      validateOnly: boolean;
    }
  | Array<{
      folderNumber: number;
      itineraryNumber: number | string;
      validateOnly: boolean;
    }>;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ConfirmBody | null;
  if (!body) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Missing request body' }, { status: 400 });
  }

  const payload = Array.isArray(body) ? body : [body];
  const first = payload[0];
  if (!first?.folderNumber || first?.itineraryNumber == null || typeof first?.validateOnly !== 'boolean') {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'folderNumber, itineraryNumber, validateOnly are required' },
      { status: 400 }
    );
  }

  const result = await vyspaRestFetch('/rest/v4/confirmItinerary/', payload);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `confirmItinerary failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}

