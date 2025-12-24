import { NextResponse } from 'next/server';
import { VYSPA_PORTAL_CONFIG, getPortalRegionConfig, getCabinClassSubsource } from '@/config/vyspaPortal';

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

// Convert YYYY-MM-DD to DD/MM/YYYY format for Portal API
function formatDateForPortal(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  // Try parsing as date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

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
    });

    const { passengers, currency, pswResultId, destinationAirportCode, departureDate, fareSelectedPrice, cabinClass, affiliateCode, flightSegments, originAirportCode, airlineCode } = body;

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
    const portalDateFormat = formatDateForPortal(vyspaDepartureDate);
    const regionConfig = getPortalRegionConfig();
    const cabinSubsource = getCabinClassSubsource(cabinClass || 'Economy');
    const ccClassCode = mapCabinClass(cabinClass);

    console.log('🔧 Portal init-folder config', {
      apiUrl,
      hasUsername: !!credentials.username,
      regionConfig,
      cabinSubsource,
      vyspaDepartureDate,
      portalDateFormat,
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
      telephone: p.phone,
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
        const segDepDate = formatDateForPortal(normaliseDepartureDateForVyspa(seg.departureDate));
        const segArrDate = formatDateForPortal(normaliseDepartureDateForVyspa(seg.arrivalDate || seg.departureDate));

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
            booked_via: VYSPA_PORTAL_CONFIG.defaultBookedVia,
            cc_class_code: ccClassCode,
            baggage_allow: '',
            meal_note: '',
            seat_note: '',
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
    const tktStartDate = formatDateForPortal(normaliseDepartureDateForVyspa(firstSeg?.departureDate || departureDate));
    const tktEndDate = lastSeg ? formatDateForPortal(normaliseDepartureDateForVyspa(lastSeg.arrivalDate || lastSeg.departureDate)) : tktStartDate;

    // Add TKT segment with pricing
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
        rate_note: '',
        operating_airline_code: '',
        air_craft_type: '',
        start_point_loc: '',
        end_point_loc: '',
        journey_time: '',
        journey_dist: '',
        num_stop: '',
        booking_ref: '',
        conf_no: '',
        booked_via: VYSPA_PORTAL_CONFIG.defaultBookedVia,
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
          tot_net_amt: String(fareSelectedPrice),
          tot_sell_amt: String(fareSelectedPrice),
          desc: 'Fare',
          fi_type: 'TKT',
          cu_curr_code: currency,
        },
      ],
    });

    // Build the saveBasketToFolder request
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
      folder_status: 'Basket',
      customer_type: 'C',
      sell_curr_code: currency,
      foldcur: currency,
      des_airport_code: destinationAirportCode,
      agencyReference: pswResultId ? String(pswResultId) : '',
      marketsource: affiliateCode || '117',
      marketsubsource: cabinSubsource,
      comments: [],
      matchAllContacts: 'True', // Required for customer creation/matching
      passengers: portalPassengers,
      manual_items: manualItems,
    }];

    console.log('➡️ Calling Portal saveBasketToFolder (create folder)', {
      segmentCount: manualItems.length,
      airSegments: manualItems.filter(m => m.Segment?.fi_type === 'AIR').length,
      payload: JSON.stringify(createFolderPayload, null, 2),
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

        if (!retryResponse.ok && !result?.folder_no && !result?.folderNumber && !result?.fold_no) {
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

    if (!response.ok && !result?.folder_no && !result?.folderNumber && !result?.fold_no) {
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
    const folderData = Array.isArray(result) ? result[0] : result;
    const folderNumber = folderData?.folder_no || folderData?.folderNumber || folderData?.fold_no || null;
    const customerId = folderData?.customer_id || folderData?.cust_id || null;
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
