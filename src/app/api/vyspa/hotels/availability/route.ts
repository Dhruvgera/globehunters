import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';
import { normalizeVyspaAvailabilityPayload } from '@/lib/vyspa/hotelsAvailability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AvailabilityBody = unknown[] | Record<string, unknown>;

function shouldHideNoImageResults(): boolean {
  const value = String(process.env.VYSPA_HIDE_NO_IMAGE || process.env.HOTELBEDS_HIDE_NO_IMAGE || '')
    .trim()
    .toLowerCase();
  return value === 'true';
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as AvailabilityBody | null;

  if (!body) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Missing request body' },
      { status: 400 }
    );
  }

  const rawPayload = Array.isArray(body) ? body : [body];

  if (!Array.isArray(rawPayload) || rawPayload.length === 0) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Payload must be a non-empty array' },
      { status: 400 }
    );
  }

  const vyspaPayload = normalizeVyspaAvailabilityPayload(rawPayload);
  const result = await vyspaRestFetch('/rest/v4/accommodationAvailabilityV3/', vyspaPayload);

  // Debug logging to track Vyspa API response
  const rawResults = (result.data as any)?.Results || [];
  const validResults = rawResults.filter(
    (r: unknown) => r && typeof r === 'object' && !Array.isArray(r) && ((r as Record<string, unknown>).hotel_id || (r as Record<string, unknown>).hotelId || (r as Record<string, unknown>).id)
  );
  console.log('[Hotels Availability] Vyspa Raw Results Count:', rawResults.length);
  console.log('[Hotels Availability] Valid Hotel Objects Count:', validResults.length);
  console.log('[Hotels Availability] Request payload:', JSON.stringify(vyspaPayload, null, 2));

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

  const rawResults = Array.isArray((result.data as any)?.Results) ? (result.data as any).Results : [];
  const filteredResults = shouldHideNoImageResults()
    ? rawResults.filter((r: any) => typeof r?.image_name === 'string' && r.image_name.trim())
    : rawResults;

  return NextResponse.json(
    {
      ...(result.data as any),
      Results: filteredResults,
    },
    { status: 200 }
  );
}


