import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DetailsBody = unknown[];

function isNumericLike(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return /^\d+$/.test(value.trim());
  return false;
}

function normalizeGetHotelDetailsPayload(body: unknown[]): unknown[] | null {
  if (!Array.isArray(body) || body.length === 0) return null;

  if (body.length === 1 && isNumericLike(body[0])) {
    return [String(body[0]).trim()];
  }

  if (
    body.length >= 2 &&
    Number(body[0]) === 0 &&
    body[1] &&
    typeof body[1] === 'object' &&
    !Array.isArray(body[1]) &&
    isNumericLike((body[1] as Record<string, unknown>).vMapId)
  ) {
    return [0, { vMapId: Number((body[1] as Record<string, unknown>).vMapId) }];
  }

  const first = body[0];
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    const row = first as Record<string, unknown>;
    const hotelId = row.hotel_id ?? row.hotelId ?? row.id;
    if (isNumericLike(hotelId)) return [String(hotelId).trim()];
    const vMapId = row.VmapId ?? row.vMapId ?? row.vmapid;
    if (isNumericLike(vMapId)) return [0, { vMapId: Number(vMapId) }];
  }

  return null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as DetailsBody | null;

  if (!body || !Array.isArray(body) || body.length === 0) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Expected non-empty array payload' },
      { status: 400 }
    );
  }

  const getHotelDetailsPayload = normalizeGetHotelDetailsPayload(body);

  let result: Awaited<ReturnType<typeof vyspaRestFetch>>;
  if (getHotelDetailsPayload) {
    result = await vyspaRestFetch('/rest/v4/get_hotel_details/', getHotelDetailsPayload, {
      // get_hotel_details is stable on v2; v3 can return 501 in live environments.
      headers: { 'Api-Version': '2' },
    });
  } else {
    result = await vyspaRestFetch('/rest/v4/hotel_search_details/', body);
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `${getHotelDetailsPayload ? 'get_hotel_details' : 'hotel_search_details'} failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}


