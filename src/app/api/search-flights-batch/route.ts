import { NextResponse } from 'next/server';
import { searchFlightsVyspa } from '@/lib/vyspa/client';
import { transformVyspaResponse } from '@/lib/vyspa/transformers';
import { validateSearchParams } from '@/lib/vyspa/validators';
import { applyBusinessRules } from '@/lib/vyspa/rules';
import type { FlightSearchRequest } from '@/types/vyspa';
import type { SearchParams } from '@/types/flight';
import type { FlightSearchResponse } from '@/services/api/flightService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface BatchSearchItem {
	key: string; // client cache key to echo back
	type: 'departure' | 'return';
	params: SearchParams;
}

interface BatchSearchResult {
	key: string;
	type: 'departure' | 'return';
	minPrice: number | null;
	success: boolean;
	error?: string;
	response?: FlightSearchResponse;
}

function formatDate(date: Date): string {
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	return `${day}/${month}/${year}`;
}

function coerceDate(value: any): Date {
	if (value instanceof Date) return value;
	if (typeof value === 'string') {
		// Try ISO first
		const iso = new Date(value);
		if (!isNaN(iso.getTime())) return iso;
		// Try DD/MM/YYYY
		const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
		if (m) {
			const [_, dd, mm, yyyy] = m;
			return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
		}
	}
	if (typeof value === 'number') {
		const d = new Date(value);
		if (!isNaN(d.getTime())) return d;
	}
	// Fallback: now
	return new Date();
}

function sanitizeParams(raw: any): SearchParams {
	function normalizeCabinClass(value: any): SearchParams['class'] {
		const v = String(value || 'Economy');
		if (v === 'Economy' || v === 'Premium Economy' || v === 'Business' || v === 'First') {
			return v as SearchParams['class'];
		}
		return 'Economy';
	}
	function normalizeTripType(value: any, hasReturnDate: boolean): SearchParams['tripType'] {
		const v = String(value || (hasReturnDate ? 'round-trip' : 'one-way'));
		return v === 'round-trip' ? 'round-trip' : 'one-way';
	}

	return {
		from: String(raw.from),
		to: String(raw.to),
		departureDate: coerceDate(raw.departureDate),
		returnDate: raw.returnDate ? coerceDate(raw.returnDate) : undefined,
		passengers: {
			adults: Number(raw.passengers?.adults ?? 1),
			children: Number(raw.passengers?.children ?? 0),
			infants: Number(raw.passengers?.infants ?? 0),
		},
		class: normalizeCabinClass(raw.class),
		tripType: normalizeTripType(raw.tripType, !!raw.returnDate),
	};
}

function mapCabinClass(cabinClass: string): string {
	const classMap: Record<string, string> = {
		'Economy': '1',
		'Premium Economy': '2',
		'Business': '3',
		'First': '4',
	};
	return classMap[cabinClass] || '1';
}

function toVyspaRequest(params: SearchParams): FlightSearchRequest {
	return {
		origin1: params.from,
		destinationid: params.to,
		fr: formatDate(params.departureDate),
		to: params.returnDate ? formatDate(params.returnDate) : undefined,
		adt1: String(params.passengers.adults),
		chd1: String(params.passengers.children),
		inf1: String(params.passengers.infants || 0),
		ow: params.tripType === 'one-way' ? '1' : '0',
		dir: '0',
		cl: mapCabinClass(params.class),
	};
}

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		const items: BatchSearchItem[] = Array.isArray(body) ? body : body?.items;

		// Debug: Log shape for diagnostics
		console.log('[api/search-flights-batch] Incoming items type:', Array.isArray(body) ? 'array' : typeof body, 'count:', Array.isArray(items) ? items.length : 0);

		if (!Array.isArray(items) || items.length === 0) {
			return NextResponse.json([], { status: 200 });
		}

		const tasks = items.map(async (item): Promise<BatchSearchResult> => {
			try {
				const vyspaParams = toVyspaRequest(sanitizeParams(item.params));
				const validationResult = validateSearchParams(vyspaParams);
				if (!validationResult.valid) {
					return {
						key: item.key,
						type: item.type,
						minPrice: null,
						success: false,
						error: `Invalid parameters: ${validationResult.errors.join(', ')}`,
					};
				}

				const vyspaResponse = await searchFlightsVyspa(vyspaParams);
				if (vyspaResponse.error) {
					return {
						key: item.key,
						type: item.type,
						minPrice: null,
						success: false,
						error: `Vyspa API error: ${vyspaResponse.error}`,
					};
				}

				if (!vyspaResponse.Results || vyspaResponse.Results.length === 0) {
					return {
						key: item.key,
						type: item.type,
						minPrice: null,
						success: true,
					};
				}

				const transformedData = transformVyspaResponse(vyspaResponse);
				const finalData: FlightSearchResponse = await applyBusinessRules(
					transformedData,
					toVyspaRequest(sanitizeParams(item.params))
				);

				let minPrice: number | null = null;
				if (finalData.flights && finalData.flights.length > 0) {
					const minFlight = finalData.flights.reduce((min, flight) =>
						flight.pricePerPerson < min.pricePerPerson ? flight : min
					, finalData.flights[0]);
					minPrice = Math.round(minFlight.pricePerPerson);
				}

				return {
					key: item.key,
					type: item.type,
					minPrice,
					success: true,
					response: finalData,
				};
			} catch (err: any) {
				return {
					key: item.key,
					type: item.type,
					minPrice: null,
					success: false,
					error: err?.message || 'Unknown error',
				};
			}
		});

		const settled = await Promise.allSettled(tasks);
		const results: BatchSearchResult[] = settled.map((r, idx) => {
			if (r.status === 'fulfilled') return r.value;
			return {
				key: items[idx].key,
				type: items[idx].type,
				minPrice: null,
				success: false,
				error: (r as any).reason?.message || 'Unknown error',
			};
		});

		console.log('[api/search-flights-batch] Returning results:', results.length);
		return NextResponse.json(results, { status: 200 });
	} catch (error: any) {
		return NextResponse.json({ error: error?.message || 'Failed to process batch' }, { status: 500 });
	}
}


