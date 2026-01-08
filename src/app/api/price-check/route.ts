import { NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type { PriceCheckRequest, PriceCheckResponse, PriceCheckResult } from '@/types/priceCheck';
import { transformPriceCheckResponse, createPriceCheckError } from '@/services/api/priceCheckService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

		// Determine how to call price check:
		// - If flightKey is provided, use it directly with the "key" parameter (no FlightView needed)
		// - Otherwise fall back to segmentResultId (V1 flow)
		let requestBody: any[];

		if (flightKeyStr && flightKeyStr !== 'undefined' && flightKeyStr !== 'null') {
			// Direct key flow: Use flightKey directly with price check API
			console.log('🔍 Using direct key flow: flightKey -> PriceCheck');
			requestBody = [{ key: flightKeyStr }];
		} else {
			// V1 flow: Use segmentResultId directly
			console.log('🔍 Using V1 flow: Direct PriceCheck with segment_psw_result1');

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

			requestBody = [{
				segment_psw_result1: parseInt(segmentIdStr, 10)
			}];
		}

		const endpoint = `${apiUrl}/rest/v4/price_check/`;

		console.log('🔍 Price Check API Call:', {
			endpoint,
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



