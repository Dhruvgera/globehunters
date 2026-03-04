import crypto from 'crypto';
import type { HotelTaxBreakdown, HotelBedsTaxItem } from '@/types/hotel';

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function extractTaxBreakdown(rate: any): HotelTaxBreakdown | null {
  const taxesNode = rate?.taxes;
  if (!taxesNode || typeof taxesNode !== 'object') return null;
  const items: HotelBedsTaxItem[] = [];
  const rawItems = Array.isArray(taxesNode.taxes) ? taxesNode.taxes : [];
  for (const t of rawItems) {
    if (!t || typeof t !== 'object') continue;
    items.push({
      included: !!t.included,
      amount: String(t.amount ?? '0'),
      currency: String(t.currency ?? ''),
      type: String(t.type ?? ''),
      subType: t.subType ? String(t.subType) : undefined,
      clientAmount: t.clientAmount ? String(t.clientAmount) : undefined,
      clientCurrency: t.clientCurrency ? String(t.clientCurrency) : undefined,
    });
  }
  if (items.length === 0) return null;
  return { allIncluded: !!taxesNode.allIncluded, taxes: items };
}

// Note: some properties don't have an `xl/` variant (403), while `bigger/` typically exists.
export function buildHotelbedsImageUrl(imagePath: string, size: 'xl' | 'bigger' | 'original' | '' = 'bigger'): string {
  const clean = String(imagePath || '').replace(/^\/+/, '');
  if (!clean) return '';
  const prefix = size ? `${size}/` : '';
  return `https://photos.hotelbeds.com/giata/${prefix}${clean}`;
}

export function parseStarRating(categoryName: unknown): number {
  const s = String(categoryName || '').toUpperCase();
  const m = s.match(/(\d)\s*STAR/);
  if (m?.[1]) return clampInt(Number(m[1]), 1, 5);
  const m2 = s.match(/(\d)/);
  if (m2?.[1]) return clampInt(Number(m2[1]), 1, 5);
  return 3;
}

export function stableRateId(rateKey: string): string {
  return crypto.createHash('sha1').update(rateKey).digest('hex').slice(0, 12);
}

export function hotelbedsHotelToVyspaResult(
  h: any,
  enrich?: {
    imageUrl?: string;
    address1?: string;
    address2?: string;
    cityName?: string;
    countryName?: string;
    amenities?: string[];
  }
): any {
  const code = h?.code != null ? String(h.code) : '';
  const currency = String(h?.currency || '');
  const minRate = h?.minRate != null ? Number(h.minRate) : null;
  const maxRate = h?.maxRate != null ? Number(h.maxRate) : null;

  const boardNames: string[] = [];
  const rooms = Array.isArray(h?.rooms) ? h.rooms : [];
  for (const r of rooms) {
    const rates = Array.isArray(r?.rates) ? r.rates : [];
    for (const rate of rates) {
      const bn = String(rate?.boardName || '').trim();
      if (bn && !boardNames.includes(bn)) boardNames.push(bn);
      if (boardNames.length >= 6) break;
    }
    if (boardNames.length >= 6) break;
  }

  // Extract a "cheapest room" snapshot for result cards (Booking.com-style summary).
  let cheapest: any = null;
  for (const room of rooms) {
    const roomName = String(room?.name || '').trim();
    const rates = Array.isArray(room?.rates) ? room.rates : [];
    for (const rate of rates) {
      const net = rate?.net != null ? Number(rate.net) : NaN;
      if (!Number.isFinite(net) || net <= 0) continue;
      if (!cheapest || net < cheapest.net) {
        cheapest = {
          net,
          roomName: roomName || 'Room',
          boardName: String(rate?.boardName || '').trim() || undefined,
          rateClass: String(rate?.rateClass || '').trim() || undefined,
          paymentType: String(rate?.paymentType || '').trim() || undefined,
          rateKey: String(rate?.rateKey || '').trim() || undefined,
          refundable: String(rate?.rateClass || '').toUpperCase() !== 'NRF',
          taxes: extractTaxBreakdown(rate),
        };
      }
    }
  }

  return {
    id: code, // used as srId in current UI
    hotel_id: code,
    hotel_name: h?.name || 'Hotel',
    hotel_rating: parseStarRating(h?.categoryName),
    image_name: enrich?.imageUrl || undefined,
    address1: enrich?.address1 || undefined,
    address2: enrich?.address2 || undefined,
    cityName: enrich?.cityName || undefined,
    countryName: enrich?.countryName || undefined,
    amenities: Array.isArray(enrich?.amenities) ? enrich.amenities : [],
    minPrice: minRate ?? undefined,
    maxPrice: maxRate ?? undefined,
    SellCur: currency || undefined,
    MealPlans: boardNames,
    geo_loc_latitude: h?.latitude != null ? Number(h.latitude) : undefined,
    geo_loc_longitude: h?.longitude != null ? Number(h.longitude) : undefined,
    suppliers: ['hotelbeds'],
    provider: 'hotelbeds',
    providerHotelCode: code,
    _hotelbeds: {
      cheapest,
    },
  };
}

export function hotelbedsHotelToVyspaRoomsResponse(
  h: any,
  input: {
    nights: number;
    imageUrl?: string;
    address1?: string;
    address2?: string;
    cityName?: string;
    countryName?: string;
  }
): any {
  const code = h?.code != null ? String(h.code) : '';
  const currency = String(h?.currency || '');

  const room1options: any[] = [];
  const rooms = Array.isArray(h?.rooms) ? h.rooms : [];
  for (const room of rooms) {
    const roomCode = room?.code != null ? String(room.code) : '';
    const roomName = room?.name || 'Room';
    const rates = Array.isArray(room?.rates) ? room.rates : [];
    for (const rate of rates) {
      const rateKey = String(rate?.rateKey || '');
      if (!rateKey) continue;
      const net = rate?.net != null ? Number(rate.net) : 0;
      const taxes = extractTaxBreakdown(rate);
      room1options.push({
        id: stableRateId(rateKey),
        room_code: roomCode || undefined,
        room_name: roomName,
        meal_name: rate?.boardName || rate?.boardCode || '',
        MealPlan: rate?.boardCode || undefined,
        net_price: net,
        days_spent: input.nights,
        sell_currency_code: currency || undefined,
        nonRef: String(rate?.rateClass || '').toUpperCase() === 'NRF' ? 1 : 0,
        rateKey,
        hotelBedsTaxes: taxes,
        _hotelbeds: {
          rateKey,
          rateClass: rate?.rateClass,
          boardName: rate?.boardName,
          boardCode: rate?.boardCode,
          cancellationPolicies: rate?.cancellationPolicies,
          paymentType: rate?.paymentType,
          promotions: rate?.promotions,
          offers: rate?.offers,
          allotment: rate?.allotment,
          taxes,
        },
      });
    }
  }

  return {
    hotel_id: code ? Number(code) : undefined,
    hotel_name: h?.name || 'Hotel',
    hotel_rating: parseStarRating(h?.categoryName),
    image_name: input.imageUrl || undefined,
    address1: input.address1 || undefined,
    address2: input.address2 || undefined,
    cityName: input.cityName || undefined,
    countryName: input.countryName || undefined,
    SellCur: currency || undefined,
    geo_loc_latitude: h?.latitude != null ? Number(h.latitude) : undefined,
    geo_loc_longitude: h?.longitude != null ? Number(h.longitude) : undefined,
    rooms: {
      room1options,
    },
  };
}
