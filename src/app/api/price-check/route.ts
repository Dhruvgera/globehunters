import { NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';
import type { PriceCheckRequest, PriceCheckResponse, PriceCheckResult } from '@/types/priceCheck';
import { transformPriceCheckResponse, createPriceCheckError } from '@/services/api/priceCheckService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
	try {
		const { segmentResultId } = await req.json();
		const segmentIdStr = String(segmentResultId ?? '').trim();
		if (!segmentIdStr || segmentIdStr === 'undefined' || segmentIdStr === 'null' || !/^\d+$/.test(segmentIdStr)) {
			const err = createPriceCheckError(
				'VALIDATION_ERROR',
				'Invalid segment result ID',
				'Unable to check price. Please try searching again.',
				{ segmentResultId }
			);
			return NextResponse.json(err, { status: 400 });
		}

		const requestBody: PriceCheckRequest[] = [{
			segment_psw_result1: parseInt(segmentIdStr, 10)
		}];

		// Build API URL and auth header
		const basicAuth = Buffer.from(
			`${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
		).toString('base64');
		const apiUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
		const endpoint = `${apiUrl}/rest/v4/price_check/`;

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

		if (!response.ok) {
			const errorText = await response.text();
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
		if (!data.success || !data.priceCheck) {
			const err = createPriceCheckError(
				'API_ERROR',
				'Invalid API response: missing success or priceCheck',
				'Unable to verify pricing. Please try again.',
				{ response: data }
			);
			return NextResponse.json(err, { status: 502 });
		}
		if (!data.priceCheck.flight_data || !data.priceCheck.flight_data.result) {
			const err = createPriceCheckError(
				'API_ERROR',
				'Invalid API response: missing flight data',
				'Flight information is incomplete. Please search again.',
				{ priceCheck: data.priceCheck }
			);
			return NextResponse.json(err, { status: 502 });
		}

		const result: PriceCheckResult = await transformPriceCheckResponse(data);
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



