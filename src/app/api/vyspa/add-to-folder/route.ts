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
      const birthDate = (p as any)?.birth_date;
      if ((paxType === 'CHD' || paxType === 'INF') && !birthDate) {
        throw new Error(`Passenger ${idx + 1} (${paxType}) is missing date of birth (birth_date).`);
      }
      const phone = (p as any)?.phone || (p as any)?.telephone || '';
      return {
        ...p,
        pax_no: (p as any)?.pax_no ?? idx + 1,
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

    console.log('✅ Add to folder success', {
      folderNumber: body.folderNumber,
      response: addToFolderData,
    });

    // Fetch folder details to verify the items were added
    let folderDetails = null;
    try {
      const folderDetailsPayload = [{
        fold_no: body.folderNumber,
      }];

      console.log('➡️ Calling Vyspa getFolderDetails to verify');

      const folderDetailsResponse = await fetch(`${apiUrl}/rest/v4/getFolderDetails/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'Api-Version': VYSPA_CONFIG.apiVersion,
        },
        body: JSON.stringify(folderDetailsPayload),
      });

      folderDetails = await folderDetailsResponse.json().catch(() => null);

      console.log('📁 Vyspa getFolderDetails response:', {
        ok: folderDetailsResponse.ok,
        status: folderDetailsResponse.status,
        data: folderDetails,
      });
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
