import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';
import { getHotelProvider } from '@/lib/hotels/provider';
import { decodeHotelSearchToken } from '@/lib/hotels/searchToken';
import { hotelbedsBookingPost } from '@/lib/hotelbeds/client';
import { hotelbedsContentGet } from '@/lib/hotelbeds/client';
import { buildHotelbedsImageUrl, hotelbedsHotelToVyspaRoomsResponse } from '@/lib/hotelbeds/mappers';
import { buildHotelbedsOccupancy } from '@/lib/hotelbeds/occupancy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RoomsBody =
  | unknown[]
  | {
      SearchCriteriaId: number | string;
      hotelIds?: string | number;
      srIds?: string | number;
    };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RoomsBody | null;

  if (!body) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Missing request body' }, { status: 400 });
  }

  const provider = getHotelProvider();
  const payload = Array.isArray(body) ? body : [body];
  const first = payload[0] as any;

  if (!first || typeof first !== 'object' || (!('SearchCriteriaId' in first) && !('searchCriteriaId' in first))) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'SearchCriteriaId is required' }, { status: 400 });
  }

  if (!('hotelIds' in first) && !('srIds' in first)) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'hotelIds or srIds is required' }, { status: 400 });
  }

  if (provider === 'vyspa') {
    if (typeof first.SearchCriteriaId !== 'number') {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'SearchCriteriaId (number) is required' }, { status: 400 });
    }
    const result = await vyspaRestFetch('/rest/v4/getRoomsV3/', payload);
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

  const token = String(first.SearchCriteriaId ?? first.searchCriteriaId ?? '');
  const decoded = decodeHotelSearchToken(token);
  if (!decoded) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Invalid SearchCriteriaId for HotelBeds search session' },
      { status: 400 }
    );
  }

  const rawHotelId = first.hotelIds ?? first.srIds;
  const hotelCode = String(rawHotelId || '').split(',')[0]?.trim();
  if (!hotelCode || !/^\d+$/.test(hotelCode)) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'hotelIds/srIds must contain a numeric HotelBeds code' }, { status: 400 });
  }

  const hbPayload = {
    stay: { checkIn: decoded.checkIn, checkOut: decoded.checkOut },
    occupancies: [buildHotelbedsOccupancy({ rooms: decoded.rooms, adults: decoded.adults, children: decoded.children })],
    hotels: { hotel: [Number(hotelCode)] },
  };

  let hbRes: { ok: boolean; status: number; data: any };
  try {
    hbRes = await hotelbedsBookingPost<any>('/hotels', hbPayload);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'CONFIG_ERROR', message: e?.message || 'HotelBeds request failed' },
      { status: 500 }
    );
  }
  if (!hbRes.ok) {
    return NextResponse.json(
      { error: 'API_ERROR', message: `HotelBeds /hotels failed with HTTP ${hbRes.status}`, details: hbRes.data },
      { status: hbRes.status }
    );
  }

  const hotels = Array.isArray(hbRes.data?.hotels?.hotels) ? hbRes.data.hotels.hotels : [];
  const firstHotel = hotels[0];
  if (!firstHotel) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Hotel not found in availability response' }, { status: 404 });
  }

  const nights = Math.max(
    1,
    Math.round((new Date(decoded.checkOut).getTime() - new Date(decoded.checkIn).getTime()) / (1000 * 60 * 60 * 24))
  );

  let enrich: { imageUrl?: string; address1?: string; cityName?: string; countryName?: string } | undefined;
  try {
    const contentRes = await hotelbedsContentGet<any>(`/hotels/${encodeURIComponent(hotelCode)}/details?language=ENG`);
    if (contentRes.ok) {
      const hotel = (contentRes.data as any)?.hotel ?? (contentRes.data as any);
      const images = Array.isArray(hotel?.images) ? hotel.images : [];
      const firstImage = images.find((x: any) => x?.path) || images[0];
      const imagePath = firstImage?.path ? String(firstImage.path) : '';
      const address1 =
        (hotel?.address?.content ? String(hotel.address.content) : '') ||
        (hotel?.address ? String(hotel.address) : '') ||
        '';
      const cityName =
        (hotel?.city?.content ? String(hotel.city.content) : '') ||
        (hotel?.city?.name ? String(hotel.city.name) : '') ||
        (hotel?.city ? String(hotel.city) : '') ||
        '';
      const countryName =
        (hotel?.country?.description?.content ? String(hotel.country.description.content) : '') ||
        (hotel?.country?.name ? String(hotel.country.name) : '') ||
        (hotel?.country ? String(hotel.country) : '') ||
        '';
      enrich = {
        imageUrl: imagePath ? buildHotelbedsImageUrl(imagePath, 'bigger') : undefined,
        address1: address1 || undefined,
        cityName: cityName || undefined,
        countryName: countryName || undefined,
      };
    }
  } catch {
    // ignore
  }

  return NextResponse.json(
    hotelbedsHotelToVyspaRoomsResponse(firstHotel, { nights, ...(enrich ?? {}) }),
    { status: 200 }
  );
}
