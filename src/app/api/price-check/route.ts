import { NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type { PriceCheckRequest, PriceCheckResponse, PriceCheckResult } from '@/types/priceCheck';
import { transformPriceCheckResponse, createPriceCheckError } from '@/services/api/priceCheckService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Call FlightView API to get psw_result_id from flight key
 * V3 flow: flightKey -> FlightView -> psw_result_id
 * 
 * NOTE: The Vyspa FlightView API sometimes returns HTTP 500 but still includes
 * valid data with psw_result_id in the response body. We handle this quirk by
 * parsing the body regardless of status code.
 */
async function getFlightView(flightKey: string, basicAuth: string): Promise<number | null> {
	// Use the FlightView-specific URL
	const flightViewUrl = process.env.VYSPA_FLIGHTVIEW_URL || VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
	const endpoint = `${flightViewUrl}/rest/v4/FlightView/`;
	const requestBody = JSON.stringify([{ key: flightKey }]);

	console.log('🔍 FlightView API Call:', {
		endpoint,
		flightKey,
		apiVersion: VYSPA_CONFIG.apiVersion,
		requestBody,
	});

	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Basic ${basicAuth}`,
				'Api-Version': VYSPA_CONFIG.apiVersion,
			},
			body: requestBody,
		});

		const responseText = await response.text();
		console.log('📥 FlightView Raw Response:', {
			status: response.status,
			statusText: response.statusText,
			responseBody: responseText.substring(0, 500),
		});

		// Try to parse JSON even if status is not OK (API returns 500 with valid data sometimes)
		let data: any = null;
		try {
			data = JSON.parse(responseText);
		} catch (parseError) {
			console.error('❌ FlightView JSON Parse Error:', parseError);
			return null;
		}

		// Check if we got a psw_result_id regardless of HTTP status
		if (data && data.psw_result_id) {
			console.log('📥 FlightView Parsed Response (extracted psw_result_id):', {
				Result_id: data.Result_id,
				psw_result_id: data.psw_result_id,
				Total: data.Total,
				httpStatus: response.status,
			});
			return data.psw_result_id;
		}

		// No psw_result_id found
		console.error('❌ FlightView: No psw_result_id in response', {
			status: response.status,
			hasData: !!data,
			dataKeys: data ? Object.keys(data) : [],
		});
		return null;
	} catch (error) {
		console.error('❌ FlightView Error:', error);
		return null;
	}
}

export async function POST(req: Request) {
	try {
		const { segmentResultId, flightKey } = await req.json();
		const segmentIdStr = String(segmentResultId ?? '').trim();
		const flightKeyStr = String(flightKey ?? '').trim();

		console.log('🔍 Price Check Request:', {
			segmentResultId,
			flightKey: flightKeyStr ? flightKeyStr.substring(0, 20) + '...' : 'none',
			timestamp: new Date().toISOString(),
		});

		// Build API URL and auth header
		const basicAuth = Buffer.from(
			`${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
		).toString('base64');
		const apiUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');

		// Determine the psw_result_id to use for price check
		let pswResultId: number | string | null = null;

		// V3 flow: If we have a flightKey, call FlightView first to get psw_result_id
		if (flightKeyStr && flightKeyStr !== 'undefined' && flightKeyStr !== 'null') {
			console.log('🔍 Using V3 flow: FlightKey -> FlightView -> PriceCheck');
			pswResultId = await getFlightView(flightKeyStr, basicAuth);

			if (!pswResultId) {
				console.error('❌ FlightView failed to return psw_result_id');
				const err = createPriceCheckError(
					'API_ERROR',
					'FlightView failed to return psw_result_id',
					'Unable to load flight details. Please try searching again.',
					{ flightKey: flightKeyStr }
				);
				return NextResponse.json(err, { status: 502 });
			}
		} else {
			// V1 flow: Use segmentResultId directly
			console.log('🔍 Using V1 flow: Direct PriceCheck');

			// Validate: must be non-empty and numeric
			const isValidNumeric = /^\d+$/.test(segmentIdStr);

			if (!segmentIdStr || segmentIdStr === 'undefined' || segmentIdStr === 'null' || !isValidNumeric) {
				console.error('❌ Price Check Validation Failed:', { segmentResultId, segmentIdStr });
				const err = createPriceCheckError(
					'VALIDATION_ERROR',
					'Invalid segment result ID and no flight key provided',
					'Unable to check price. Please try searching again.',
					{ segmentResultId }
				);
				return NextResponse.json(err, { status: 400 });
			}

			pswResultId = parseInt(segmentIdStr, 10);
		}

		// Now call price check with the psw_result_id
		const requestBody: PriceCheckRequest[] = [{
			segment_psw_result1: pswResultId
		}] as any;

		const endpoint = `${apiUrl}/rest/v4/price_check/`;

		console.log('🔍 Price Check API Call:', {
			endpoint,
			pswResultId,
			requestBody: JSON.stringify(requestBody),
		});

		// Timeout via AbortController
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout);
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Basic ${basicAuth}`,
				'Api-Version': VYSPA_CONFIG.apiVersion,
			},
			body: JSON.stringify(requestBody),
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		console.log('📥 Price Check Response Status:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('❌ Price Check HTTP Error:', {
				status: response.status,
				statusText: response.statusText,
				errorText: errorText.substring(0, 500),
			});
			const err = createPriceCheckError(
				'API_ERROR',
				`HTTP ${response.status}: ${response.statusText}`,
				'Unable to check price. Please try again.',
				{
					status: response.status,
					statusText: response.statusText,
					errorText: errorText.substring(0, 200),
					segmentId: segmentResultId,
				}
			);
			return NextResponse.json(err, { status: response.status });
		}

		const data: PriceCheckResponse = await response.json();

		console.log('📥 Price Check Raw Response:', {
			success: data.success,
			message: data.message,
			hasFlightData: !!data.priceCheck?.flight_data,
			hasResult: !!data.priceCheck?.flight_data?.result,
			priceDataLength: Array.isArray(data.priceCheck?.price_data) ? data.priceCheck.price_data.length : 'not array',
			sessionId: data.priceCheck?.sessionId,
			pswResultId: data.priceCheck?.psw_result_id,
		});

		if (!data.success || !data.priceCheck) {
			console.error('❌ Price Check API Error: missing success or priceCheck', { data });
			const err = createPriceCheckError(
				'API_ERROR',
				'Invalid API response: missing success or priceCheck',
				'Unable to verify pricing. Please try again.',
				{ response: data }
			);
			return NextResponse.json(err, { status: 502 });
		}
		if (!data.priceCheck.flight_data || !data.priceCheck.flight_data.result) {
			console.error('❌ Price Check API Error: missing flight data', { priceCheck: data.priceCheck });
			const err = createPriceCheckError(
				'API_ERROR',
				'Invalid API response: missing flight data',
				'Flight information is incomplete. Please search again.',
				{ priceCheck: data.priceCheck }
			);
			return NextResponse.json(err, { status: 502 });
		}

		const result: PriceCheckResult = await transformPriceCheckResponse(data);

		console.log('✅ Price Check Success:', {
			flightId: result.flightDetails?.id,
			origin: result.flightDetails?.origin,
			destination: result.flightDetails?.destination,
			refundable: result.flightDetails?.refundable,
			priceOptionsCount: result.priceOptions?.length,
			priceOptions: result.priceOptions?.map(o => ({
				id: o.id,
				cabinClass: o.cabinClassDisplay,
				totalPrice: o.totalPrice,
				currency: o.currency,
				isUpgrade: o.isUpgrade,
			})),
		});

		// Include raw response in debug mode
		if (process.env.NEXT_PUBLIC_DEBUG_FLIGHT_IDS === 'true') {
			result.rawResponse = data;
		}

		return NextResponse.json(result, { status: 200 });
	} catch (error: any) {
		if (error?.name === 'AbortError') {
			const err = createPriceCheckError(
				'TIMEOUT_ERROR',
				`Request timed out after ${VYSPA_CONFIG.defaults.timeout}ms`,
				'The price check is taking longer than expected. Please try again.',
				{ timeout: VYSPA_CONFIG.defaults.timeout }
			);
			return NextResponse.json(err, { status: 504 });
		}
		const err = createPriceCheckError(
			'UNKNOWN_ERROR',
			error?.message || 'Unknown error occurred',
			'Unable to verify pricing. The fare may have expired. Please search again.',
			{ error: String(error) }
		);
		return NextResponse.json(err, { status: 500 });
	}
}



