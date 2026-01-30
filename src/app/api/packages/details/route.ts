/**
 * Holiday Package Details API Route
 * Endpoint: POST /api/packages/details
 * 
 * Returns full details of the selected package: hotel details, activities, price breakdown, terms & conditions, etc.
 * Uses Vyspa API: POST /rest/v4/holiday_detail/
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type {
  HolidayDetailRequest,
  HolidayDetailResponse,
} from '@/types/holidayPackage';

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${basicAuth}`;
}

/** Request body for the package details endpoint */
interface PackageDetailsRequestBody {
  /** Priced flight result identifier (psw_result_id) */
  pswResultId: number;
  /** Selected room IDs (array of IDs) */
  roomIds: string[] | number[];
}

/**
 * Transform frontend request to Vyspa API request format
 */
function buildVyspaRequest(body: PackageDetailsRequestBody): HolidayDetailRequest {
  // Convert roomIds array to comma-separated string
  const roomidsString = Array.isArray(body.roomIds) 
    ? body.roomIds.map(String).join(',') 
    : String(body.roomIds);

  return {
    psw_result_id: body.pswResultId,
    roomids: roomidsString,
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
function transformResponse(vyspaResponse: HolidayDetailResponse): TransformedPackageDetails {
  const result: TransformedPackageDetails = {
    quoteId: vyspaResponse.quoteId,
    packagePrice: vyspaResponse.packageprice,
    success: vyspaResponse.success === 1,
  };

  // Transform hotel details
  if (vyspaResponse.hotels) {
    const h = vyspaResponse.hotels;
    result.hotel = {
      id: h.id,
      hotelId: h.hotel_id,
      name: h.hotel_name,
      description: h.quickDescription,
      imageUrl: h.image_name,
      starRating: h.hotel_rating,
      checkOutDate: h.checkOutDate,
      visaInfo: h.visaInfo,
      countryRemarks: h.countryRemarks,
      vendorRemarks: h.vendorRemarks,
      rooms: h.rooms?.map(room => ({
        id: room.id,
        name: room.room_name,
        nights: room.days_spent,
        checkIn: room.fromDate || room.checkInDate,
        checkOut: room.toDate,
        price: room.room_price,
        netPrice: room.net_price,
        mealCode: room.display_meal_code,
        mealName: room.meal_name,
        currency: room.currency_code || room.branch_currency,
        nonRefundable: room.nonRef === 1,
        remarks: room.quote_remarks,
      })),
    };
  }

  // Transform cancellation policies
  if (vyspaResponse.Cancellation && vyspaResponse.Cancellation.length > 0) {
    result.cancellationPolicies = vyspaResponse.Cancellation.map(c => ({
      id: c.id,
      roomName: c.roomName,
      effectiveDate: c.effectiveDate,
      endEffectiveDate: c.endEffectiveDate,
      policy: c.cancellationPolicy,
      chargeType: c.chargeType,
      penalty: c.finalRate || c.remoteRate,
      penaltyCurrency: c.finalCurrency || c.remoteCurrency,
    }));
  }

  // Transform flight details
  if (vyspaResponse.flight_data) {
    const f = vyspaResponse.flight_data;
    const flightResult = f.result;
    
    result.flight = {
      pswResultId: f.psw_result_id,
      origin: flightResult?.Origin,
      destination: flightResult?.Destination,
      totalFare: flightResult?.total_fare,
      baseFare: flightResult?.base_fare,
      tax: flightResult?.tax,
      currency: flightResult?.iso_currency_code,
      fareCategory: flightResult?.FareCat,
      lastTicketDate: flightResult?.last_ticket_date,
      validatingCarrier: flightResult?.validating_carrier,
      refundable: flightResult?.refundable === 1,
    };

    // Transform passenger breakdown
    if (f.passengers && f.passengers.length > 0) {
      result.flight.passengers = f.passengers.map(p => ({
        type: p.pax_type,
        count: p.num_pax,
        baseFare: p.base_fare,
        totalFare: p.total_fare,
        tax: p.tax,
      }));
    }

    // Transform brand/price options
    if (f.price_data && f.price_data.length > 0) {
      result.flight.brandOptions = f.price_data.map(pd => ({
        brandId: pd.Total_Fare?.BrandId,
        name: pd.Total_Fare?.Name,
        total: pd.Total_Fare?.total ?? 0,
        base: pd.Total_Fare?.base ?? 0,
        tax: pd.Total_Fare?.tax ?? 0,
        currency: pd.Total_Fare?.sellcurr,
        cabinClass: pd.Total_Fare?.CabinClass,
        selected: pd.selected === 1,
      }));
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PackageDetailsRequestBody;

    // Validate required fields
    if (!body.pswResultId || !body.roomIds || (Array.isArray(body.roomIds) && body.roomIds.length === 0)) {
      return NextResponse.json(
        { error: 'Missing required fields: pswResultId, roomIds' },
        { status: 400 }
      );
    }

    // Build Vyspa request
    const vyspaRequest = buildVyspaRequest(body);

    const baseUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/rest/v4/holiday_detail/`;

    console.log('[PackageDetails] Fetching package details:', {
      psw_result_id: vyspaRequest.psw_result_id,
      roomids: vyspaRequest.roomids,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuthHeader(),
        'Api-Version': '1',
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

    const vyspaResponse = await response.json() as HolidayDetailResponse;

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
