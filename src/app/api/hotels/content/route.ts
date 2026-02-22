import { NextResponse } from 'next/server';
import { getHotelProvider } from '@/lib/hotels/provider';
import { hotelbedsContentGet } from '@/lib/hotelbeds/client';
import { extractHotelbedsContentDetails, extractHotelbedsContentEnrichment } from '@/lib/hotelbeds/contentExtract';
import { buildHotelbedsImageUrl } from '@/lib/hotelbeds/mappers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cache = new Map<string, { at: number; data: any }>();
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get('code') || '').trim();
  const provider = getHotelProvider();

  if (provider === 'vyspa') {
    return NextResponse.json({ error: 'NOT_ENABLED', message: 'HotelBeds provider not enabled' }, { status: 400 });
  }

  if (!code || !/^\d+$/.test(code)) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'code must be a numeric hotel code' }, { status: 400 });
  }

  const cached = cache.get(code);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json({ ok: true, ...cached.data }, { status: 200 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await hotelbedsContentGet<any>(`/hotels/${encodeURIComponent(code)}/details?language=ENG`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'API_ERROR', message: `Content lookup failed (HTTP ${res.status})` }, { status: res.status });
    }

    const extractedBasic = extractHotelbedsContentEnrichment(res.data as any);
    const extractedDetails = extractHotelbedsContentDetails(res.data as any);

    const data = {
      imageUrl: extractedBasic.imagePath ? buildHotelbedsImageUrl(extractedBasic.imagePath, 'bigger') : null,
      address1: extractedBasic.address1 || null,
      cityName: extractedBasic.cityName || null,
      countryName: extractedBasic.countryName || null,
      categoryName: extractedDetails.categoryName || extractedBasic.categoryName || null,
      description: extractedDetails.description || null,
      amenities: extractedDetails.amenities || [],
      hotelImages: extractedDetails.hotelImages.map((p) => buildHotelbedsImageUrl(p, 'bigger')),
      roomImages: Object.fromEntries(
        Object.entries(extractedDetails.roomImages).map(([roomCode, paths]) => [
          roomCode,
          paths.map((p) => buildHotelbedsImageUrl(p, 'bigger')),
        ])
      ),
    };

    cache.set(code, { at: Date.now(), data });
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return NextResponse.json({ error: 'TIMEOUT', message: 'Content lookup timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'UNKNOWN_ERROR', message: e?.message || 'Unknown error' }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
