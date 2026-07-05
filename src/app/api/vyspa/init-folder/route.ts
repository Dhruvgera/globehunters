import { NextResponse } from 'next/server';
import { VYSPA_PORTAL_CONFIG, getPortalRegionConfig } from '@/config/vyspaPortal';
import { getMarketSourceMapping } from '@/lib/utils/affiliateMapping';
import { getRegionFromHost } from '@/lib/utils/domainMapping';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface InitFolderPassenger {
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  type: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  countryCode?: string;
}

interface FlightSegmentData {
  type: string;
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  arrivalDate: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  cabinClass?: string;
}

// Per-passenger pricing breakdown from price check
interface PassengerPricing {
  paxType: 'ADT' | 'CHD' | 'INF';
  count: number;
  baseFare: number;       // Base fare per passenger of this type
  taxes: number;          // Taxes per passenger of this type
  totalFare: number;      // Total fare per passenger of this type
}

interface InitFolderRequestBody {
  passengers: InitFolderPassenger[];
  currency: string;
  pswResultId: string | number;
  destinationAirportCode: string;
  departureDate: string;
  fareSelectedPrice: number;
  cabinClass?: string;
  affiliateCode?: string;
  flightSegments?: FlightSegmentData[];
  originAirportCode?: string;
  airlineCode?: string;
  airlineName?: string;
  // New fields for Portal API integration
  markupIds?: string;         // Markup IDs for rate_note field (format: "id1|id2")
  moduleId?: string;          // Module ID from price check
  cabinClassCode?: string;    // Booking/fare class code (e.g., 'T', 'O', 'V', 'H', 'Z')
  selectedBrandName?: string; // Brand name (e.g., "ECONOMY LIGHT")
  baggageInfo?: string;       // Baggage allowance info
  refundableInfo?: string;    // Refund/cancellation policy
  baseFare?: number;          // Base fare amount (total for all passengers - fallback)
  taxes?: number;             // Tax amount (total for all passengers - fallback)
  galileoNotes?: string[];    // Notes tags for Galileo (MealOrBeverage / Seat Assignment / Rebooking)
  gds?: string;               // Supplier/GDS from price check (e.g. "Galileo")
  chooseSupplier?: string;    // Supplier code from price check (e.g. "GALNEW")
  // Per-passenger pricing from price check (for separate TKT segments per passenger)
  passengerPricing?: PassengerPricing[];
  priceDifference?: number | null;
  additionalComments?: string[];
}

function extractFolderResponseMeta(payload: unknown): {
  folderNumber: string | number | null;
  customerId: string | number | null;
} {
  const seen = new Set<unknown>();
  const queue: unknown[] = [payload];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const record = current as Record<string, unknown>;
    const folderNumber = record.folder_no ?? record.folderNumber ?? record.fold_no ?? null;
    const customerId = record.customer_id ?? record.cust_id ?? null;

    if (folderNumber != null) {
      return { folderNumber: folderNumber as string | number, customerId: customerId as string | number | null };
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') queue.push(value);
    }
  }

  return { folderNumber: null, customerId: null };
}

function mapPassengerType(type: string): 'ADT' | 'CHD' | 'INF' {
  const t = type.toLowerCase();
  if (t === 'child') return 'CHD';
  if (t === 'infant') return 'INF';
  return 'ADT';
}

function mapGenderFromTitle(title: string): 'M' | 'F' {
  const t = title.toLowerCase();
  if (t === 'mr' || t === 'mstr') return 'M';
  return 'F';
}

function normaliseDepartureDateForVyspa(input: string): string {
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const match = input.match(/^[A-Za-z]{3},\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
  if (match) {
    const [, d, monStr, y] = match;
    const day = d.padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = monthNames.indexOf(monStr.toUpperCase());
    const month = monthIndex >= 0 ? String(monthIndex + 1).padStart(2, '0') : '01';
    let yearNum = parseInt(y, 10);
    if (yearNum < 100) yearNum += 2000;
    return `${yearNum}-${month}-${day}`;
  }
  return input;
}

import { formatDateToPortal } from '@/lib/utils/dateFormat';

// Parse duration string like "9h 35m" or "575" to minutes
function parseDurationToMinutes(duration: string): string {
  if (!duration) return '';
  // If already a number, return as-is
  if (/^\d+$/.test(duration)) return duration;

  // Parse "9h 35m" format
  const match = duration.match(/(\d+)h\s*(\d+)?m?/);
  if (match) {
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return String(hours * 60 + minutes);
  }
  return '';
}

// Map cabin class to Portal cc_class_code
function mapCabinClass(cabinClass?: string): string {
  const cc = cabinClass?.toLowerCase() || '';
  if (cc.includes('first')) return 'F';
  if (cc.includes('business')) return 'C';
  if (cc.includes('premium')) return 'W';
  return 'Y'; // Economy
}

import { FOLDER_STATUS_CODES } from '@/types/portal';
import { canonicalizeGdsName } from '@/lib/utils/gdsMapping';

function normalizeDialCode(code?: string): string {
  if (!code) return '';
  const trimmed = code.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/[^\d]/g, '')}`;
  return `+${trimmed.replace(/[^\d]/g, '')}`;
}

function normalizePhoneWithCountryCode(countryCode: string | undefined, phone: string | undefined): string {
  const rawPhone = (phone || '').trim();
  const dial = normalizeDialCode(countryCode);
  if (!rawPhone) return dial || '';

  if (rawPhone.startsWith('+')) return `+${rawPhone.slice(1).replace(/[^\d]/g, '')}`;
  if (rawPhone.startsWith('00')) return `+${rawPhone.slice(2).replace(/[^\d]/g, '')}`;

  const digits = rawPhone.replace(/[^\d]/g, '');
  const dialDigits = dial.replace(/[^\d]/g, '');
  if (!digits) return dial || '';

  // If already includes dial code (but missing '+')
  if (dialDigits && digits.startsWith(dialDigits)) return `+${digits}`;

  // Strip leading trunk 0s when adding dial code
  const national = digits.replace(/^0+/, '');
  return dialDigits ? `+${dialDigits}${national}` : `+${national}`;
}

function resolveBookedVia(gds?: string, chooseSupplier?: string): string {
  const gRaw = String(gds || '').trim();

  // IMPORTANT: CMS expects ONLY the GDS name (no supplier suffix).
  // Map one-letter codes:
  // - "G" -> "Galileo"
  // - "X" -> "Sabre"
  const gdsName = canonicalizeGdsName(gRaw);
  if (gdsName) return gdsName;

  // Ignore chooseSupplier entirely per requirement (no second word).
  // Fall back to default (also canonicalized to strip any suffix).
  return canonicalizeGdsName(VYSPA_PORTAL_CONFIG.defaultBookedVia) || VYSPA_PORTAL_CONFIG.defaultBookedVia;
}

export async function POST(req: Request) {
  const { apiUrl, credentials, timeout } = VYSPA_PORTAL_CONFIG;

  try {
    const body = (await req.json()) as InitFolderRequestBody;
    console.log('📨 Portal init-folder request body received', {
      passengerCount: Array.isArray(body.passengers) ? body.passengers.length : null,
      hasCurrency: !!body.currency,
      hasPswResultId: !!body.pswResultId,
      destinationAirportCode: body.destinationAirportCode,
      departureDate: body.departureDate,
      fareSelectedPrice: body.fareSelectedPrice,
      flightSegmentCount: body.flightSegments?.length || 0,
      originAirportCode: body.originAirportCode,
      airlineCode: body.airlineCode,
      passengerPricingCount: body.passengerPricing?.length || 0,
      galileoNotesCount: body.galileoNotes?.length || 0,
    });

    const {
      passengers, currency, pswResultId, destinationAirportCode, departureDate, fareSelectedPrice,
      cabinClass, affiliateCode, flightSegments, originAirportCode, airlineCode,
      // New Portal API fields
      markupIds, moduleId, cabinClassCode, selectedBrandName, baggageInfo, refundableInfo, baseFare, taxes,
      galileoNotes,
      gds,
      chooseSupplier,
      priceDifference,
      additionalComments,
    } = body;

    if (!Array.isArray(passengers) || passengers.length === 0) {
      console.error('❌ Portal init-folder validation failed: missing passengers');
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing passengers' },
        { status: 400 }
      );
    }

    if (!currency || !destinationAirportCode || !departureDate || !fareSelectedPrice) {
      console.error('❌ Portal init-folder validation failed: missing required booking data');
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing required booking data' },
        { status: 400 }
      );
    }

    const lead = passengers[0];
    const vyspaDepartureDate = normaliseDepartureDateForVyspa(departureDate);
    const portalDateFormat = formatDateToPortal(vyspaDepartureDate);
    
    // Determine region from request host
    const host = req.headers.get('host') || 'globehunters.com';
    const region = getRegionFromHost(host);
    const regionConfig = getPortalRegionConfig(region);
    const regionCode = regionConfig.branchCode === 'UK' ? 'UK' : regionConfig.branchCode;
    
    const { sourceId: marketSourceId, subSourceId: marketSubSourceId } = getMarketSourceMapping(
      affiliateCode,
      regionCode,
      cabinClass || 'Economy'
    );
    // Use the booking class code from the selected fare if available, otherwise fall back to mapped cabin class
    const ccClassCode = cabinClassCode || mapCabinClass(cabinClass);
    const bookedVia = resolveBookedVia(gds, chooseSupplier);

    const mealNote =
      Array.isArray(galileoNotes)
        ? galileoNotes.find((n) => String(n).toLowerCase().includes('type: mealorbeverage'))
        : undefined;
    const seatNote =
      Array.isArray(galileoNotes)
        ? galileoNotes.find((n) => String(n).toLowerCase().includes('tag: seat assignment'))
        : undefined;

    console.log('🔧 Portal init-folder config', {
      apiUrl,
      hasUsername: !!credentials.username,
      regionConfig,
      marketSourceId,
      marketSubSourceId,
      vyspaDepartureDate,
      portalDateFormat,
      // New Portal API fields
      markupIds: markupIds || '(none)',
      moduleId: moduleId || '(none)',
      ccClassCode,
      selectedBrandName: selectedBrandName || '(none)',
    });

    // Map passengers to Portal format
    const portalPassengers = passengers.map((p, index) => ({
      pId: '',
      pax_no: String(index + 1),
      pax_type: mapPassengerType(p.type),
      title: p.title,
      first_name: p.firstName,
      last_name: p.lastName,
      api_gender: mapGenderFromTitle(p.title),
      email: p.email,
      telephone: normalizePhoneWithCountryCode(p.countryCode, p.phone),
      api_document_expiry_date: '',
      api_document_number: '',
      api_document_type: '',
      api_first_name: '',
      api_last_name: '',
      api_middle_name: p.middleName || '',
      api_nationality: '',
      birth_date: p.dateOfBirth,
    }));

    // Build manual_items with AIR segments + TKT segment
    const manualItems: any[] = [];
    let linkIdCounter = 0;

    // Add AIR segments if provided
    if (flightSegments && flightSegments.length > 0) {
      for (const seg of flightSegments) {
        const segDepDate = formatDateToPortal(normaliseDepartureDateForVyspa(seg.departureDate));
        const segArrDate = formatDateToPortal(normaliseDepartureDateForVyspa(seg.arrivalDate || seg.departureDate));

        manualItems.push({
          Segment: {
            fi_type: 'AIR',
            airline_code: seg.airlineCode || airlineCode || '',
            route_no: seg.flightNumber?.replace(/\D/g, '') || '', // Extract numeric part
            start_point_code: seg.departureAirport || '',
            end_point_code: seg.arrivalAirport || '',
            start_date_time_dt: segDepDate,
            end_date_time_dt: segArrDate,
            start_date_time_tm: seg.departureTime || '00:00',
            end_date_time_tm: seg.arrivalTime || '23:59',
            status: 'QU',
            operating_airline_code: '',
            air_craft_type: '',
            start_point_loc: '',
            end_point_loc: '',
            journey_time: parseDurationToMinutes(seg.duration),
            journey_dist: '',
            num_stop: '0',
            booking_ref: '',
            conf_no: '',
            booked_via: bookedVia,
            cc_class_code: ccClassCode,
            baggage_allow: '',
            meal_note: mealNote ? String(mealNote).trim().slice(0, 250) : '',
            seat_note: seatNote ? String(seatNote).trim().slice(0, 250) : '',
            fare_basis: '',
            link_id_key: linkIdCounter === 0 ? 'null' : String(linkIdCounter - 1),
            gds_pax_type_code: 'ADT',
            num_bum: String(passengers.length),
          },
        });
        linkIdCounter++;
      }
    }

    // Get first and last segment info for TKT
    const firstSeg = flightSegments?.[0];
    const lastSeg = flightSegments?.[flightSegments.length - 1];
    const tktStartDate = formatDateToPortal(normaliseDepartureDateForVyspa(firstSeg?.departureDate || departureDate));
    const tktEndDate = lastSeg ? formatDateToPortal(normaliseDepartureDateForVyspa(lastSeg.arrivalDate || lastSeg.departureDate)) : tktStartDate;

    // Add TKT segments - one per passenger with individual pricing
    // If passengerPricing is provided, create separate TKT for each passenger.
    // IMPORTANT: Map TKT pax_no to the actual passenger ordering (not grouped by pax type),
    // otherwise CMS can attach the wrong ticket/pricing to passengers when user input order varies.
    // Otherwise fallback to single TKT with total pricing.
    if (body.passengerPricing && body.passengerPricing.length > 0) {
      const pricingByType = new Map<string, { baseFare: number; taxes: number; totalFare: number; count: number }>();
      for (const p of body.passengerPricing) {
        pricingByType.set(p.paxType, {
          baseFare: Number(p.baseFare) || 0,
          taxes: Number(p.taxes) || 0,
          totalFare: Number(p.totalFare) || 0,
          count: Number(p.count) || 0,
        });
      }

      // Validate counts (best-effort). If mismatch, we still proceed but log a warning.
      const paxCountsFromPassengers = portalPassengers.reduce<Record<string, number>>((acc, p) => {
        const t = p.pax_type;
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});
      const paxCountsFromPricing = body.passengerPricing.reduce<Record<string, number>>((acc, p) => {
        const t = p.paxType;
        acc[t] = (acc[t] || 0) + (Number(p.count) || 0);
        return acc;
      }, {});
      const hasCountMismatch = (['ADT', 'CHD', 'INF'] as const).some((t) => (paxCountsFromPassengers[t] || 0) !== (paxCountsFromPricing[t] || 0));
      if (hasCountMismatch) {
        console.warn('⚠️ Portal init-folder passengerPricing count mismatch; mapping TKT by passenger order', {
          paxCountsFromPassengers,
          paxCountsFromPricing,
        });
      }

      for (let idx = 0; idx < portalPassengers.length; idx++) {
        const pax = portalPassengers[idx];
        const paxType = pax.pax_type;
        const pricing = pricingByType.get(paxType);

        // If pricing is missing for a pax type, fall back to 0 (CMS will still get a per-pax TKT entry).
        const baseFarePerPax = pricing?.baseFare ?? 0;
        const taxesPerPax = pricing?.taxes ?? 0;

        manualItems.push({
          Segment: {
            fi_type: 'TKT',
            airline_code: airlineCode || firstSeg?.airlineCode || '',
            finan_vend_id: 0,
            route_no: '',
            start_point_code: originAirportCode || firstSeg?.departureAirport || '',
            end_point_code: destinationAirportCode,
            start_date_time_dt: tktStartDate,
            end_date_time_dt: tktEndDate,
            start_date_time_tm: firstSeg?.departureTime || '00:00',
            end_date_time_tm: lastSeg?.arrivalTime || '23:59',
            status: 'QU',
            rate_note: markupIds || '', // Markup IDs from price check (format: "id1|id2")
            operating_airline_code: '',
            air_craft_type: '',
            start_point_loc: '',
            end_point_loc: '',
            journey_time: '',
            journey_dist: '',
            num_stop: '',
            booking_ref: '',
            conf_no: '',
            booked_via: bookedVia,
            cc_class_code: ccClassCode,
            baggage_allow: '',
            meal_note: '',
            seat_note: '',
            fare_basis: '',
            link_id_key: '0',
            gds_pax_type_code: paxType,
            num_bum: '1', // One passenger per TKT segment
            pax_no: String(idx + 1),
          },
          FolderPricings: [
            {
              tot_net_amt: String(baseFarePerPax),
              tot_sell_amt: String(baseFarePerPax),
              desc: 'Fare',
              fi_type: 'TKT',
              cu_curr_code: currency,
            },
            ...(taxesPerPax > 0
              ? [
                  {
                    tot_net_amt: String(taxesPerPax),
                    tot_sell_amt: String(taxesPerPax),
                    desc: 'Tax',
                    fi_type: 'TKT',
                    cu_curr_code: currency,
                  },
                ]
              : []),
          ],
        });
      }
    } else {
      // Fallback: Single TKT segment with total pricing (legacy behavior)
      manualItems.push({
        Segment: {
          fi_type: 'TKT',
          airline_code: airlineCode || firstSeg?.airlineCode || '',
          finan_vend_id: 0,
          route_no: '',
          start_point_code: originAirportCode || firstSeg?.departureAirport || '',
          end_point_code: destinationAirportCode,
          start_date_time_dt: tktStartDate,
          end_date_time_dt: tktEndDate,
          start_date_time_tm: firstSeg?.departureTime || '00:00',
          end_date_time_tm: lastSeg?.arrivalTime || '23:59',
          status: 'QU',
          rate_note: markupIds || '',  // Markup IDs from price check (format: "id1|id2")
          operating_airline_code: '',
          air_craft_type: '',
          start_point_loc: '',
          end_point_loc: '',
          journey_time: '',
          journey_dist: '',
          num_stop: '',
          booking_ref: '',
          conf_no: '',
          booked_via: bookedVia,
          cc_class_code: ccClassCode,
          baggage_allow: '',
          meal_note: '',
          seat_note: '',
          fare_basis: '',
          link_id_key: '0',
          gds_pax_type_code: 'ADT',
          num_bum: String(passengers.length),
          pax_no: '1',
        },
        FolderPricings: [
          {
            tot_net_amt: String(baseFare || fareSelectedPrice),
            tot_sell_amt: String(baseFare || fareSelectedPrice),
            desc: 'Fare',
            fi_type: 'TKT',
            cu_curr_code: currency,
          },
          ...(taxes ? [{
            tot_net_amt: String(taxes),
            tot_sell_amt: String(taxes),
            desc: 'Tax',
            fi_type: 'TKT',
            cu_curr_code: currency,
          }] : []),
        ],
      });
    }

    // Build comments array with booking metadata
    const bookingComments: string[] = [];
    if (markupIds) {
      bookingComments.push(`Markup ID: ${markupIds}`);
    }
    if (moduleId) {
      bookingComments.push(`Module ID: ${moduleId}`);
    }
    if (selectedBrandName) {
      bookingComments.push(`Fare Type: ${selectedBrandName}`);
    }
    if (baggageInfo) {
      bookingComments.push(`Baggage: ${baggageInfo}`);
    }
    if (refundableInfo) {
      bookingComments.push(`Cancellation: ${refundableInfo}`);
    }
    if (priceDifference && priceDifference > 0) {
      bookingComments.push(`Price Adjustment: Fare discount applied (${currency}${priceDifference.toFixed(2)}). Customer charged original search price.`);
    }
    if (ccClassCode) {
      bookingComments.push(`Booking Class: ${ccClassCode}`);
    }

    const normalizedAdditionalComments = Array.isArray(additionalComments)
      ? additionalComments
          .map((note) => String(note || '').trim())
          .filter(Boolean)
      : [];
    const isAiPackageCommentSync =
      normalizedAdditionalComments.length > 0 &&
      normalizedAdditionalComments.every((note) => note.startsWith('[AI_PACKAGE]'));

    if (normalizedAdditionalComments.length > 0) {
      for (const note of normalizedAdditionalComments) {
        const normalized = String(note || '').trim();
        if (normalized) bookingComments.push(normalized);
      }
    }

    // Galileo tag notes (requested)
    if (Array.isArray(galileoNotes) && galileoNotes.length > 0) {
      for (const note of galileoNotes) {
        const n = String(note || '').trim();
        if (n) bookingComments.push(n);
      }
    }

    if (normalizedAdditionalComments.length > 0) {
      manualItems.push({
        Segment: {
          fi_type: 'OTH',
          start_date_time_dt: portalDateFormat,
          end_date_time_dt: portalDateFormat,
          status: 'OK',
          finan_vend_id: 0,
          itin_vend_id: 0,
          num_bum: '1',
          pax_no: '1',
          desc: 'AI Package Notes',
          printing_note: normalizedAdditionalComments.join(' | '),
        },
        FolderPricings: [
          {
            tot_net_amt: '0.00',
            tot_sell_amt: '0.00',
            desc: 'AI Package Notes',
            cu_curr_code: currency,
          },
        ],
      });
    }

    // Build the saveBasketToFolder request
    const folderComments = isAiPackageCommentSync ? normalizedAdditionalComments : bookingComments;
    const combinedBookingNotes = folderComments.join('\n').trim();
    const createFolderPayload = [{
      SaveBasketToFolder: 'True',
      CartSessionKey: '',
      fromApi: 'True',
      folderNumber: '0',
      itineraryNumber: '0',
      website_name: regionConfig.websiteName,
      brand: regionConfig.brand,
      branch_code: regionConfig.branchCode,
      booker: `${lead.firstName} ${lead.lastName}`,
      departuredate: vyspaDepartureDate,
      folder_status: FOLDER_STATUS_CODES.BASKET,
      customer_type: 'C',
      sell_curr_code: currency,
      foldcur: currency,
      des_airport_code: destinationAirportCode,
      agencyReference: pswResultId ? String(pswResultId) : '',
      marketsource: marketSourceId,
      marketsubsource: marketSubSourceId,
      comments: bookingComments,
      itinerary_remark: combinedBookingNotes,
      non_printing_notes: combinedBookingNotes,
      matchAllContacts: 'True', // Required for customer creation/matching
      passengers: portalPassengers,
      manual_items: manualItems,
    }];

    const tktSegmentsCount = manualItems.filter(m => m.Segment?.fi_type === 'TKT').length;
    
    console.log('➡️ Calling Portal saveBasketToFolder (create folder)', {
      segmentCount: manualItems.length,
      airSegments: manualItems.filter(m => m.Segment?.fi_type === 'AIR').length,
      tktSegments: tktSegmentsCount,
    });

    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    formData.append('token', credentials.token);
    formData.append('method', 'saveBasketToFolder');
    formData.append('params', JSON.stringify(createFolderPayload));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();
    console.log('📦 Portal saveBasketToFolder raw response', {
      status: response.status,
      rawText: rawText.substring(0, 3000),
    });

    let result: any = null;
    try {
      result = JSON.parse(rawText);
      console.log('✅ Portal saveBasketToFolder parsed response', JSON.stringify(result, null, 2));
    } catch {
      console.log('⚠️ Portal saveBasketToFolder response is not JSON', rawText.substring(0, 500));
      result = { raw: rawText };
    }

    // Handle matchAllContacts flow - if profiles matched, retry with customer_id
    if (result?.status === 'error' && result?.profile_records?.length > 0) {
      console.log('🔄 Profile matches found, selecting best match and retrying...');

      // Find exact match first (by email), otherwise use first match
      const exactMatch = result.profile_records.find((p: any) =>
        p.contacts?.toLowerCase().includes(lead.email.toLowerCase())
      );
      const selectedProfile = exactMatch || result.profile_records[0];
      const selectedCustomerId = selectedProfile?.customer_id;

      console.log('👤 Selected customer profile', {
        customerId: selectedCustomerId,
        firstName: selectedProfile?.first_name,
        lastName: selectedProfile?.last_name,
        contacts: selectedProfile?.contacts,
        matchType: exactMatch ? 'exact (email)' : 'first available',
      });

      if (selectedCustomerId) {
        // Retry with customer_id - remove matchAllContacts, add customer_id
        const retryPayload = [{
          ...createFolderPayload[0],
          matchAllContacts: undefined,
          customer_id: String(selectedCustomerId),
        }];
        delete (retryPayload[0] as any).matchAllContacts;

        console.log('➡️ Retrying Portal saveBasketToFolder with customer_id', {
          customerId: selectedCustomerId,
        });

        const retryFormData = new URLSearchParams();
        retryFormData.append('username', credentials.username);
        retryFormData.append('password', credentials.password);
        retryFormData.append('token', credentials.token);
        retryFormData.append('method', 'saveBasketToFolder');
        retryFormData.append('params', JSON.stringify(retryPayload));

        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);

        const retryResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: retryFormData.toString(),
          signal: retryController.signal,
        });

        clearTimeout(retryTimeoutId);

        const retryRawText = await retryResponse.text();
        console.log('📦 Portal saveBasketToFolder RETRY raw response', {
          status: retryResponse.status,
          rawText: retryRawText.substring(0, 3000),
        });

        try {
          result = JSON.parse(retryRawText);
          console.log('✅ Portal saveBasketToFolder RETRY parsed response', JSON.stringify(result, null, 2));
        } catch {
          console.log('⚠️ Portal saveBasketToFolder RETRY response is not JSON', retryRawText.substring(0, 500));
          result = { raw: retryRawText };
        }

        const retryFolderMeta = extractFolderResponseMeta(result);

        if (!retryResponse.ok && !retryFolderMeta.folderNumber) {
          console.error('❌ Portal saveBasketToFolder RETRY failed', {
            status: retryResponse.status,
            response: retryRawText.substring(0, 500),
          });
          return NextResponse.json(
            {
              error: 'API_ERROR',
              message: `saveBasketToFolder retry failed with HTTP ${retryResponse.status}`,
              details: retryRawText.substring(0, 500),
            },
            { status: retryResponse.status }
          );
        }
      }
    }

    const folderMeta = extractFolderResponseMeta(result);

    if (!response.ok && !folderMeta.folderNumber) {
      console.error('❌ Portal saveBasketToFolder failed', {
        status: response.status,
        response: rawText.substring(0, 500),
      });
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `saveBasketToFolder failed with HTTP ${response.status}`,
          details: rawText.substring(0, 500),
        },
        { status: response.status }
      );
    }

    // Extract folder number and customer ID
    const folderNumber = folderMeta.folderNumber;
    const customerId = folderMeta.customerId;
    const emailAddress = lead.email;

    if (!folderNumber) {
      console.error('❌ Portal saveBasketToFolder response missing folder number', { rawResponse: result });
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: 'saveBasketToFolder response missing folder number',
          details: result,
        },
        { status: 502 }
      );
    }

    let commentSync: { attempted: boolean; ok: boolean; status?: number; raw?: unknown; error?: string } = {
      attempted: false,
      ok: false,
    };

    if (folderComments.length > 0) {
      commentSync.attempted = true;
      try {
        const commentsFormData = new URLSearchParams();
        commentsFormData.append('username', credentials.username);
        commentsFormData.append('password', credentials.password);
        commentsFormData.append('token', credentials.token);
        commentsFormData.append('method', 'api_update_folder_status');
        commentsFormData.append(
          'params',
          JSON.stringify([
            {
              folder_no: String(folderNumber),
              new_folder_status_code: FOLDER_STATUS_CODES.BASKET,
              comments: folderComments,
            },
          ])
        );

        console.log('➡️ Calling Portal api_update_folder_status for folder notes', {
          folderNumber,
          commentsCount: folderComments.length,
          aiPackageOnly: isAiPackageCommentSync,
        });

        const commentsResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: commentsFormData.toString(),
        });

        const commentsRawText = await commentsResponse.text();
        let commentsResult: unknown = { raw: commentsRawText };
        try {
          commentsResult = JSON.parse(commentsRawText);
        } catch {}

        commentSync = {
          attempted: true,
          ok: commentsResponse.ok,
          status: commentsResponse.status,
          raw: commentsResult,
        };

        if (!commentsResponse.ok) {
          console.error('❌ Portal api_update_folder_status note sync failed', {
            folderNumber,
            status: commentsResponse.status,
            response: commentsRawText.substring(0, 1000),
          });
        }
      } catch (commentError) {
        commentSync = {
          attempted: true,
          ok: false,
          error: commentError instanceof Error ? commentError.message : 'Unknown note sync error',
        };
        console.error('❌ Portal api_update_folder_status note sync error', {
          folderNumber,
          error: commentError,
        });
      }
    }

    // Fetch folder details for verification
    let folderDetails = null;
    try {
      const fdFormData = new URLSearchParams();
      fdFormData.append('username', credentials.username);
      fdFormData.append('password', credentials.password);
      fdFormData.append('token', credentials.token);
      fdFormData.append('method', 'getFolderDetails');
      fdFormData.append('params', JSON.stringify([{ fold_no: String(folderNumber) }]));

      console.log('➡️ Fetching folder details to verify folder creation');

      const fdResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: fdFormData.toString(),
      });

      const fdRawText = await fdResponse.text();
      console.log('📁 getFolderDetails raw response', {
        status: fdResponse.status,
        rawText: fdRawText.substring(0, 2000),
      });

      try {
        folderDetails = JSON.parse(fdRawText);
        console.log('📁 FOLDER DATA AFTER CREATION:');
        console.log(JSON.stringify(folderDetails, null, 2));
      } catch {
        folderDetails = { raw: fdRawText };
      }
    } catch (fdError) {
      console.error('❌ getFolderDetails error:', fdError);
    }

    console.log('✅ Portal init-folder success', {
      folderNumber,
      customerId,
      emailAddress,
    });

    return NextResponse.json(
      {
        folderNumber: String(folderNumber),
        customerId,
        emailAddress,
        createFolderRaw: result,
        commentSync,
        folderDetails,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Portal init-folder timeout');
      return NextResponse.json(
        { error: 'TIMEOUT', message: 'Request timed out' },
        { status: 504 }
      );
    }

    console.error('💥 Portal init-folder unhandled error', error);
    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: error?.message || 'Unknown error occurred while initialising folder',
      },
      { status: 500 }
    );
  }
}
