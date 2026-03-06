/**
 * Add to Folder API Route
 * Adds travel components (flights, hotels, transfers, cars) to an existing folder
 * 
 * This endpoint wraps the Vyspa ApiAddToFolder API
 */

import { NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type { AddToFolderRequest } from '@/types/folder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractBusinessErrors(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const parsed = payload as {
    error?: unknown;
    errors?: unknown;
    message?: unknown;
    status?: unknown;
  };

  const messages: string[] = [];

  const collect = (value: unknown) => {
    if (!value) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) messages.push(trimmed);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === 'object') {
      for (const entry of Object.values(value as Record<string, unknown>)) {
        collect(entry);
      }
    }
  };

  collect(parsed.error);
  collect(parsed.errors);

  if (typeof parsed.status === 'string' && parsed.status.toLowerCase() === 'error' && typeof parsed.message === 'string') {
    collect(parsed.message);
  }

  return Array.from(new Set(messages));
}

type FolderEntry = {
  fiType: string;
  description: string;
  pricingDescriptions: string[];
  accommodationBookingId: string;
};

function extractFolderEntries(folderDetails: unknown): FolderEntry[] {
  const root = folderDetails as { pagedata?: unknown[]; items?: unknown[]; folderItems?: unknown[] } | null;
  const entries = [
    ...(Array.isArray(root?.pagedata) ? root!.pagedata : []),
    ...(Array.isArray(root?.items) ? root!.items : []),
    ...(Array.isArray(root?.folderItems) ? root!.folderItems : []),
  ];

  return entries.map((item) => {
    const current = item as {
      Segment?: { fi_type?: unknown; desc?: unknown; textdesc?: unknown };
      FolderItem?: { fi_type?: unknown; description?: unknown };
      FolderPricing?: { desc?: unknown };
      SegmentPricing?: Array<{ FolderPricing?: { desc?: unknown } }>;
      AccommodationBooking?: { id?: unknown; confirmationNumber?: unknown };
      description?: unknown;
      fi_type?: unknown;
    };

    const fiType = String(
      current?.Segment?.fi_type ??
        current?.FolderItem?.fi_type ??
        current?.fi_type ??
        ''
    ).trim();

    const description = String(
      current?.Segment?.desc ??
        current?.Segment?.textdesc ??
        current?.FolderItem?.description ??
        current?.FolderPricing?.desc ??
        current?.description ??
        ''
    ).trim();

    const pricingDescriptions = Array.isArray(current?.SegmentPricing)
      ? current.SegmentPricing
          .map((segmentPricing) => String(segmentPricing?.FolderPricing?.desc ?? '').trim())
          .filter(Boolean)
      : [];

    const accommodationBookingId = String(
      current?.AccommodationBooking?.id ?? current?.AccommodationBooking?.confirmationNumber ?? ''
    ).trim();

    return {
      fiType,
      description,
      pricingDescriptions,
      accommodationBookingId,
    };
  });
}

function entryLooksHotel(entry: FolderEntry): boolean {
  const fiType = entry.fiType.toUpperCase();
  if (fiType === 'HTL' || fiType === 'HOT') return true;
  if (entry.accommodationBookingId) return true;

  const haystack = [entry.description, ...entry.pricingDescriptions].join(' ').toLowerCase();
  return haystack.includes('hotel') || haystack.includes('accommodation');
}

async function fetchFolderDetails(apiUrl: string, basicAuth: string, apiVersion: string, folderNumber: number) {
  const response = await fetch(`${apiUrl}/rest/v4/getFolderDetails/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Api-Version': apiVersion,
    },
    body: JSON.stringify([{ fold_no: folderNumber }]),
  });

  const data = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    data,
    entries: extractFolderEntries(data),
  };
}

function approximateBirthDateFromAge(age: unknown): string | undefined {
  const years = Number(age);
  if (!Number.isFinite(years) || years < 0) return undefined;
  const date = new Date();
  date.setFullYear(date.getFullYear() - Math.trunc(years));
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AddToFolderRequest;

    console.log('📨 Add to folder request received', {
      folderNumber: body.folderNumber,
      itineraryNumber: body.itineraryNumber,
      passengerCount: body.passengers?.length,
      itemCount: body.requestData?.length,
    });

    // Validate required fields
    if (!body.folderNumber) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing folderNumber' },
        { status: 400 }
      );
    }

    if (!body.passengers || body.passengers.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing passengers' },
        { status: 400 }
      );
    }

    if (!body.foldcur) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing foldcur (currency)' },
        { status: 400 }
      );
    }

    // Normalize passenger payload for Vyspa:
    // - ensure CHD/INF have birth_date (Vyspa expects DOB)
    // - provide telephone field (some endpoints use telephone vs phone)
    // - keep indices stable (pax_no is optional but preferred)
    const normalizedPassengers = (body.passengers || []).map((p, idx) => {
      const paxType = (p as any)?.pax_type;
      const birthDate = (p as any)?.birth_date || (paxType === 'CHD' ? approximateBirthDateFromAge((p as any)?.age) : undefined);
      if ((paxType === 'CHD' || paxType === 'INF') && !birthDate) {
        throw new Error(`Passenger ${idx + 1} (${paxType}) is missing date of birth (birth_date).`);
      }
      const phone = (p as any)?.phone || (p as any)?.telephone || '';
      return {
        ...p,
        pax_no: (p as any)?.pax_no ?? idx + 1,
        birth_date: birthDate,
        // Support both key names to keep Vyspa compatible.
        phone: phone || undefined,
        telephone: phone || undefined,
      } as any;
    });

    // Normalize hotel request items: ensure roomIds and room->pax mapping are strings.
    const normalizedRequestData = (body.requestData || []).map((item: any) => {
      if (item?.type !== 'hotel') return item;
      const passengers = item?.passengers && typeof item.passengers === 'object' ? item.passengers : {};
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(passengers)) {
        if (!k) continue;
        mapped[String(k)] = typeof v === 'string' ? v : Array.isArray(v) ? v.join(',') : String(v ?? '');
      }
      const roomIds = typeof item?.roomIds === 'string' ? item.roomIds : String(item?.roomIds ?? '');
      const roomCodes = typeof item?.roomCodes === 'string' ? item.roomCodes : roomIds;
      const expectedNetPrice = Array.isArray(item?.expectedNetPrice)
        ? item.expectedNetPrice.map((v: unknown) => String(v))
        : undefined;
      return {
        ...item,
        roomIds,
        roomCodes,
        passengers: mapped,
        expectedNetPrice,
      };
    });

    // Build Vyspa API request
    const apiUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const basicAuth = Buffer.from(
      `${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
    ).toString('base64');

    // Format the request for Vyspa API (expects array)
    const vyspaPayload = [{
      folderNumber: body.folderNumber,
      itineraryNumber: body.itineraryNumber || '1',
      foldcur: body.foldcur,
      travelPurpose: body.travelPurpose || 'Holiday',
      comments: body.comments || [],
      set_as_preferred_itinerary: body.set_as_preferred_itinerary ?? true,
      passengers: normalizedPassengers,
      requestData: normalizedRequestData,
    }];
    const requiresHotelVerification = normalizedRequestData.some((item: any) => item?.type === 'hotel');
    const requiresMutationVerification = normalizedRequestData.length > 0;
    let beforeEntryCount = 0;

    if (requiresMutationVerification) {
      try {
        const beforeResponse = await fetchFolderDetails(apiUrl, basicAuth, VYSPA_CONFIG.apiVersion, body.folderNumber);
        beforeEntryCount = beforeResponse.entries.length;
      } catch (beforeError) {
        console.error('❌ Vyspa getFolderDetails pre-check error:', beforeError);
      }
    }

    console.log('➡️ Calling Vyspa ApiAddToFolder', {
      folderNumber: body.folderNumber,
      passengerCount: body.passengers.length,
      itemTypes: body.requestData.map(item => item.type),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout);

    const response = await fetch(`${apiUrl}/rest/v4/ApiAddToFolder/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
      body: JSON.stringify(vyspaPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('⬅️ Vyspa ApiAddToFolder response', {
      ok: response.ok,
      status: response.status,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ Vyspa ApiAddToFolder failed', {
        status: response.status,
        errorSnippet: errorText.substring(0, 500),
      });
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `ApiAddToFolder failed with HTTP ${response.status}`,
          details: errorText.substring(0, 500),
        },
        { status: response.status }
      );
    }

    const addToFolderData = await response.json().catch((jsonError) => {
      console.error('❌ Vyspa ApiAddToFolder JSON parse failed', jsonError);
      return {};
    });
    const businessErrors = extractBusinessErrors(addToFolderData);

    if (businessErrors.length > 0) {
      console.error('❌ Vyspa ApiAddToFolder business error', {
        folderNumber: body.folderNumber,
        errors: businessErrors,
        response: addToFolderData,
      });
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: businessErrors.join(' | '),
          details: addToFolderData,
        },
        { status: 502 }
      );
    }

    console.log('✅ Add to folder success', {
      folderNumber: body.folderNumber,
      response: addToFolderData,
    });

    // Fetch folder details to verify the items were added
    let folderDetails = null;
    const verification = {
      beforeEntryCount,
      afterEntryCount: 0,
      entriesAdded: false,
      hotelEntryFound: false,
      businessErrors,
    };
    try {
      console.log('➡️ Calling Vyspa getFolderDetails to verify');
      const folderDetailsResponse = await fetchFolderDetails(apiUrl, basicAuth, VYSPA_CONFIG.apiVersion, body.folderNumber);
      folderDetails = folderDetailsResponse.data;
      verification.afterEntryCount = folderDetailsResponse.entries.length;
      verification.entriesAdded = verification.afterEntryCount > beforeEntryCount;
      verification.hotelEntryFound = folderDetailsResponse.entries.some(entryLooksHotel);

      console.log('📁 Vyspa getFolderDetails response:', {
        ok: folderDetailsResponse.ok,
        status: folderDetailsResponse.status,
        data: folderDetails,
        verification,
      });

      if (requiresHotelVerification && (!verification.entriesAdded || !verification.hotelEntryFound)) {
        return NextResponse.json(
          {
            error: 'VERIFICATION_FAILED',
            message: 'Hotel was not added to folder after ApiAddToFolder completed',
            details: addToFolderData,
            folderDetails,
            verification,
          },
          { status: 502 }
        );
      }
    } catch (fdError) {
      console.error('❌ Vyspa getFolderDetails error:', fdError);
    }

    // Fetch booking history to verify the booking appears in customer history
    let bookingHistory = null;
    try {
      // Get lead passenger email from the request
      const leadPassenger = body.passengers[0];
      // Try to find email in passenger data or use a fallback
      const customerEmail = (leadPassenger as any).email || 
                           (leadPassenger as any).email_address || 
                           '';

      if (customerEmail) {
        // Parameters: [email, all_bookings, branch_code, include_client_info, online_booking_only]
        const bookingHistoryPayload = [
          customerEmail,
          1,    // all_bookings = true (include quotes)
          '',   // branch_code (empty = all branches)
          1,    // include_client_information = true
          1,    // online_booking_only = true
        ];

        console.log('➡️ Calling Vyspa get_booking_history', { email: customerEmail });

        const bookingHistoryResponse = await fetch(`${apiUrl}/rest/v4/get_booking_history/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`,
            'Api-Version': VYSPA_CONFIG.apiVersion,
          },
          body: JSON.stringify(bookingHistoryPayload),
        });

        bookingHistory = await bookingHistoryResponse.json().catch(() => null);

        console.log('📘 Vyspa get_booking_history response:', {
          ok: bookingHistoryResponse.ok,
          status: bookingHistoryResponse.status,
          data: bookingHistory,
        });
      } else {
        console.log('⚠️ No email found in passenger data, skipping booking history check');
      }
    } catch (bhError) {
      console.error('❌ Vyspa get_booking_history error:', bhError);
    }

    return NextResponse.json({
      success: true,
      folderNumber: body.folderNumber,
      itineraryNumber: body.itineraryNumber || '1',
      addToFolderResponse: addToFolderData,
      folderDetails: folderDetails,
      verification,
      bookingHistory: bookingHistory,
    });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Vyspa ApiAddToFolder timeout');
      return NextResponse.json(
        { error: 'TIMEOUT', message: 'Request timed out' },
        { status: 504 }
      );
    }

    console.error('💥 Add to folder unhandled error', error);
    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: error?.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
