/**
 * Holiday Package Details API Route
 * Endpoint: POST /api/packages/details
 * 
 * Returns full details of the selected package: hotel details, activities, price breakdown, terms & conditions, etc.
 * Uses Vyspa API: POST /rest/v4/holiday_detail/
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import { fixStubaImageUrl } from '@/lib/hotels/imageUrl';
import { parsePackageHotelContent, sanitizePackageHotelText } from '@/lib/package/hotelContent';
import type { HolidayDetailRequest } from '@/types/holidayPackage';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${basicAuth}`;
}

/** Request body for the package details endpoint */
interface PackageDetailsRequestBody {
  /** Selected/default flight result ID */
  flightResultId: string;
  /** Selected room IDs (array of IDs) */
  hotelResultRoomIds: string[];
}

/**
 * Transform frontend request to Vyspa API request format
 */
function buildVyspaRequest(body: PackageDetailsRequestBody): HolidayDetailRequest {
  return {
    FlightResultId: body.flightResultId,
    HotelResultRoomIds: body.hotelResultRoomIds,
  };
}

/** Transformed package details for frontend */
interface TransformedPackageDetails {
  /** Quote ID */
  quoteId?: number;
  /** Formatted package price */
  packagePrice?: string;
  /** Hotel details */
  hotel?: {
    id: number;
    hotelId: number;
    name: string;
    description?: string;
    imageUrl?: string;
    starRating?: number;
    amenities?: string[];
    nearby?: Array<{
      name: string;
      distanceKm?: number;
      distanceMi?: number;
      kind: 'landmark' | 'airport';
    }>;
    policyHighlights?: string[];
    checkOutDate?: string;
    visaInfo?: string;
    countryRemarks?: string[];
    vendorRemarks?: string[];
    rooms?: Array<{
      id: number;
      name?: string;
      nights?: number;
      checkIn?: string;
      checkOut?: string;
      price?: number;
      netPrice?: number;
      mealCode?: string;
      mealName?: string;
      currency?: string;
      nonRefundable?: boolean;
      remarks?: string;
    }>;
  };
  /** Cancellation policies */
  cancellationPolicies?: Array<{
    id: number;
    roomName?: string;
    effectiveDate?: string;
    endEffectiveDate?: string;
    policy?: string;
    chargeType?: string;
    penalty?: number;
    penaltyCurrency?: string;
  }>;
  /** Flight details */
  flight?: {
    pswResultId?: number;
    origin?: string;
    destination?: string;
    totalFare?: number;
    baseFare?: number;
    tax?: number;
    currency?: string;
    fareCategory?: string;
    lastTicketDate?: string;
    validatingCarrier?: string;
    refundable?: boolean;
    passengers?: Array<{
      type: string;
      count: number;
      baseFare: number;
      totalFare: number;
      tax: number;
    }>;
    brandOptions?: Array<{
      brandId?: number;
      name?: string;
      total: number;
      base: number;
      tax: number;
      currency?: string;
      cabinClass?: string;
      selected?: boolean;
    }>;
  };
  /** Success flag */
  success: boolean;
}

/**
 * Transform Vyspa response to frontend format
 */
function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function sanitizeText(value: unknown): string {
  return sanitizePackageHotelText(value);
  return String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function collectAmenityLabels(source: unknown, labels: Set<string>): void {
  if (!Array.isArray(source)) return;
  source.forEach((entry) => {
    if (typeof entry === 'string') {
      const normalized = sanitizeText(entry);
      if (normalized) labels.add(normalized);
      return;
    }
    if (!entry || typeof entry !== 'object') return;
    const row = entry as Record<string, unknown>;
    const normalized = sanitizeText(
      row.label ??
      row.name ??
      row.description ??
      row.title ??
      row.Text ??
      row.amenity ??
      row.value
    );
    if (normalized) labels.add(normalized);
  });
}

function extractPackageAmenities(...sources: unknown[]): string[] {
  const labels = new Set<string>();
  sources.forEach((source) => {
    if (!source || typeof source !== 'object') return;
    const row = source as Record<string, unknown>;
    collectAmenityLabels(row.amenities, labels);
    collectAmenityLabels(row.attributes, labels);
    collectAmenityLabels(row.facilities, labels);
    collectAmenityLabels(row.hotelAmenities, labels);
    collectAmenityLabels(row.hotel_facilities, labels);
    collectAmenityLabels(row.Facility, labels);
    collectAmenityLabels(row.HotelFacility, labels);
  });
  return Array.from(labels).slice(0, 24);
}

function transformResponse(vyspaResponse: any): TransformedPackageDetails {
  const packageBlock = asRecord(vyspaResponse?.PackageDetails);
  const hotelBlock = asRecord(vyspaResponse?.HotelDetails);
  const flightBlock = asRecord(vyspaResponse?.FlightDetails);

  const legacyHotel = asRecord(vyspaResponse?.hotels);
  const legacyFlightData = asRecord(vyspaResponse?.flight_data);
  const liveHotel = asRecord(hotelBlock.hotels);
  const hotelSource = Object.keys(liveHotel).length > 0 ? liveHotel : legacyHotel;

  const legacyFlightResult = asRecord(legacyFlightData.result);
  const liveFlightData = asRecord(flightBlock.flight_data);
  const liveFlightResult = asRecord(liveFlightData.result?.FlightPswResult || liveFlightData.result);
  const flightResult = Object.keys(liveFlightResult).length > 0 ? liveFlightResult : legacyFlightResult;

  const result: TransformedPackageDetails = {
    quoteId:
      Number(packageBlock.quoteId ?? hotelBlock.quoteId ?? vyspaResponse?.quoteId) || undefined,
    packagePrice:
      String(packageBlock.packageprice ?? vyspaResponse?.packageprice ?? '').trim() || undefined,
    success:
      Number(packageBlock.success ?? flightBlock.success ?? vyspaResponse?.success ?? 0) === 1,
  };

  if (Object.keys(hotelSource).length > 0) {
    const parsedContent = parsePackageHotelContent(hotelBlock.description || hotelSource.quickDescription);
    const rawRooms = Array.isArray(hotelBlock.rooms)
      ? hotelBlock.rooms
      : Array.isArray(hotelSource.rooms)
        ? hotelSource.rooms
        : [];

    result.hotel = {
      id: Number(hotelSource.id || 0),
      hotelId: Number(hotelSource.hotel_id || 0),
      name: String(hotelSource.hotel_name || 'Selected hotel'),
      description:
        parsedContent.description ||
        sanitizeText(hotelBlock.description || hotelSource.quickDescription) ||
        undefined,
      imageUrl: fixStubaImageUrl(hotelSource.image_name),
      starRating: Number(hotelSource.hotel_rating || 0) || undefined,
      amenities: Array.from(
        new Set([
          ...extractPackageAmenities(hotelBlock, hotelSource, ...rawRooms),
          ...parsedContent.amenities,
        ])
      ).slice(0, 24),
      nearby: parsedContent.nearby,
      policyHighlights: parsedContent.policies,
      checkOutDate: hotelSource.checkOutDate,
      visaInfo: hotelSource.visaInfo,
      countryRemarks: hotelSource.countryRemarks,
      vendorRemarks: hotelSource.vendorRemarks,
      rooms: rawRooms.map((room) => {
        const roomDetail = asRecord(room?.SearchResultRoomDetail || room);
        return {
          id: Number(roomDetail.id || 0),
          selectionKey: String(roomDetail.error || roomDetail.additional_data || '').trim() || undefined,
          name: roomDetail.room_name,
          nights: Number(roomDetail.days_spent || hotelBlock.nights || 0) || undefined,
          checkIn: roomDetail.fromDate || roomDetail.checkInDate,
          checkOut: roomDetail.toDate,
          price: Number(
            roomDetail.room_price ??
              roomDetail.FolderPricing?.cust_tot_sell_amt ??
              roomDetail.FolderPricing?.tot_sell_amt ??
              0
          ) || undefined,
          netPrice: Number(roomDetail.net_price ?? roomDetail.FolderPricing?.cust_tot_net_amt ?? 0) || undefined,
          mealCode: roomDetail.display_meal_code || roomDetail.meal_code,
          mealName: roomDetail.meal_name,
          currency: roomDetail.currency_code || roomDetail.branch_currency,
          nonRefundable: Number(roomDetail.nonRef ?? 0) === 1,
          remarks: roomDetail.non_printing_notes || roomDetail.quote_remarks,
        };
      }),
    };
  }

  const rawCancellationPolicies = Array.isArray(hotelBlock.Cancellation)
    ? hotelBlock.Cancellation
    : Array.isArray(vyspaResponse?.Cancellation)
      ? vyspaResponse.Cancellation
      : [];
  if (rawCancellationPolicies.length > 0) {
    result.cancellationPolicies = rawCancellationPolicies.map((entry: any) => {
      const policy = asRecord(entry?.SearchResultCancellation || entry);
      return {
        id: Number(policy.id || 0),
        roomName: sanitizeText(policy.roomName) || undefined,
        effectiveDate: policy.effectiveDate,
        endEffectiveDate: policy.endEffectiveDate,
        policy: sanitizeText(policy.cancellationPolicy) || undefined,
        chargeType: sanitizeText(policy.chargeType) || undefined,
        penalty: Number(policy.finalRate || policy.remoteRate || 0) || undefined,
        penaltyCurrency: sanitizeText(policy.finalCurrency || policy.remoteCurrency) || undefined,
      };
    });
  }

  if (Object.keys(flightResult).length > 0 || Object.keys(flightBlock).length > 0) {
    const passengers = Array.isArray(flightBlock.passengers)
      ? flightBlock.passengers
      : Array.isArray(legacyFlightData.passengers)
        ? legacyFlightData.passengers
        : [];
    const priceData = Array.isArray(flightBlock.price_data)
      ? flightBlock.price_data
      : Array.isArray(legacyFlightData.price_data)
        ? legacyFlightData.price_data
        : [];

    result.flight = {
      pswResultId: Number(flightBlock.psw_result_id ?? legacyFlightData.psw_result_id ?? 0) || undefined,
      origin: flightResult.Origin,
      destination: flightResult.Destination,
      totalFare: Number(flightResult.total_fare || 0) || undefined,
      baseFare: Number(flightResult.base_fare || 0) || undefined,
      tax: Number(flightResult.tax || 0) || undefined,
      currency: flightResult.iso_currency_code,
      fareCategory: flightResult.FareCat,
      lastTicketDate: flightResult.last_ticket_date || flightBlock.last_ticket_date,
      validatingCarrier: flightResult.validating_carrier,
      refundable: Number(flightResult.refundable || 0) === 1,
      passengers: passengers.map((p: any) => ({
        type: String(p.pax_type || ''),
        count: Number(p.num_pax || 0),
        baseFare: Number(p.base_fare || 0),
        totalFare: Number(p.total_fare || 0),
        tax: Number(p.tax || 0),
      })),
      brandOptions: priceData.map((pd: any) => ({
        brandId: pd.Total_Fare?.BrandId,
        name: pd.Total_Fare?.Name,
        total: Number(pd.Total_Fare?.total || 0),
        base: Number(pd.Total_Fare?.base || 0),
        tax: Number(pd.Total_Fare?.tax || 0),
        currency: pd.Total_Fare?.sellcurr,
        cabinClass: pd.Total_Fare?.CabinClass,
        selected: Number(pd.selected || 0) === 1,
      })),
    };
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PackageDetailsRequestBody;

    // Validate required fields
    if (!body.flightResultId || !body.hotelResultRoomIds || body.hotelResultRoomIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: flightResultId, hotelResultRoomIds' },
        { status: 400 }
      );
    }

    // Build Vyspa request
    const vyspaRequest = buildVyspaRequest(body);

    const baseUrl = VYSPA_CONFIG.apiUrl.replace(/\/anon\.php\/?$/, '').replace(/\/+$/, '');
    const url = `${baseUrl}/rest/v4/holiday_detail/`;

    console.log('[PackageDetails] Fetching package details:', {
      flightResultId: vyspaRequest.FlightResultId,
      hotelResultRoomIds: vyspaRequest.HotelResultRoomIds,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuthHeader(),
        'Api-Version': '2',
      },
      body: JSON.stringify([vyspaRequest]), // API expects array
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[PackageDetails] Vyspa API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: `Vyspa API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const vyspaResponse = await response.json();

    // Transform response to frontend format
    const details = transformResponse(vyspaResponse);

    console.log('[PackageDetails] Package details fetched:', {
      quoteId: details.quoteId,
      hotelName: details.hotel?.name,
      roomCount: details.hotel?.rooms?.length,
      cancellationPolicyCount: details.cancellationPolicies?.length,
      packagePrice: details.packagePrice,
    });

    return NextResponse.json({
      details,
      // Include raw response for debugging (can be removed in production)
      _raw: vyspaResponse,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    console.error('[PackageDetails] Error:', {
      message: errorMessage,
      isTimeout,
    });

    if (isTimeout) {
      return NextResponse.json(
        { error: 'Request timeout', message: 'The package details request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}
