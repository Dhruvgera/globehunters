/**
 * FlightView API Route
 * Fetches flight details from Skyscanner/meta channel deeplink keys
 * 
 * This endpoint is used to retrieve flight information when users arrive
 * from meta channel deeplinks (e.g., Skyscanner) with a pre-selected flight key.
 */

import { NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import { transformFlightViewResponse, FlightViewResponse, TransformedFlightViewResult } from '@/services/api/flightViewService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface FlightViewRequest {
  key: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key } = body as FlightViewRequest;

    // Validate key parameter
    if (!key || typeof key !== 'string' || key.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Missing or invalid flight key',
          userMessage: 'Invalid flight link. Please try searching for flights.',
        },
        { status: 400 }
      );
    }

    // Build API URL and auth header
    const basicAuth = Buffer.from(
      `${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
    ).toString('base64');
    
    // Use the staging URL for FlightView as per the user's curl example
    const apiUrl = process.env.VYSPA_FLIGHTVIEW_URL || 'https://a1.stagev4.vyspa.net/anon.php';
    const endpoint = `${apiUrl}/rest/v4/FlightView`;

    // Prepare request body
    const requestBody: FlightViewRequest[] = [{ key: key.trim() }];

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FlightView API error:', response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: 'API_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          userMessage: 'Unable to retrieve flight details. Please try again or search for flights.',
          details: { status: response.status, errorText: errorText.substring(0, 200) },
        },
        { status: response.status }
      );
    }

    const data: FlightViewResponse = await response.json();

    // Validate response structure
    if (!data.Total || !data.Segments || data.Segments.length === 0) {
      console.error('FlightView invalid response:', data);
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_RESPONSE',
          message: 'Flight data is incomplete or expired',
          userMessage: 'This flight offer may have expired. Please search for flights again.',
        },
        { status: 404 }
      );
    }

    // Transform the response to our internal Flight type
    const result: TransformedFlightViewResult = transformFlightViewResponse(data);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT_ERROR',
          message: 'Request timed out',
          userMessage: 'The request is taking too long. Please try again.',
        },
        { status: 504 }
      );
    }

    console.error('FlightView route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: error?.message || 'Unknown error occurred',
        userMessage: 'Unable to retrieve flight details. Please search for flights.',
      },
      { status: 500 }
    );
  }
}

