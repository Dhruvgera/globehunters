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

    if (!body.requestData || body.requestData.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing requestData (items to add)' },
        { status: 400 }
      );
    }

    if (!body.foldcur) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing foldcur (currency)' },
        { status: 400 }
      );
    }

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
      passengers: body.passengers,
      requestData: body.requestData,
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
