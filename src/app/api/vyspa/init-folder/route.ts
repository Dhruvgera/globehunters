import { NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';

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
}

interface InitFolderRequestBody {
  passengers: InitFolderPassenger[];
  currency: string;
  pswResultId: string | number;
  destinationAirportCode: string;
  departureDate: string;
  fareSelectedPrice: number;
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
  // Try native Date parsing first
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback for formats like "SUN, 30 NOV 25"
  const match = input.match(/^[A-Za-z]{3},\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
  if (match) {
    const [, d, monStr, y] = match;
    const day = d.padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = monthNames.indexOf(monStr.toUpperCase());
    const month = monthIndex >= 0 ? String(monthIndex + 1).padStart(2, '0') : '01';

    let yearNum = parseInt(y, 10);
    if (yearNum < 100) {
      // Assume 2000+ for 2-digit years
      yearNum += 2000;
    }

    return `${yearNum}-${month}-${day}`;
  }

  // As a last resort, return the original string so we at least send something
  return input;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InitFolderRequestBody;
    console.log('📨 Vyspa init-folder request body received', {
      passengerCount: Array.isArray(body.passengers) ? body.passengers.length : null,
      hasCurrency: !!body.currency,
      hasPswResultId: !!body.pswResultId,
      destinationAirportCode: body.destinationAirportCode,
      departureDate: body.departureDate,
      fareSelectedPrice: body.fareSelectedPrice,
    });

    const { passengers, currency, pswResultId, destinationAirportCode, departureDate, fareSelectedPrice } = body;

    if (!Array.isArray(passengers) || passengers.length === 0) {
      console.error('❌ Vyspa init-folder validation failed: missing passengers');
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing passengers' },
        { status: 400 }
      );
    }

    if (!currency || !pswResultId || !destinationAirportCode || !departureDate || !fareSelectedPrice) {
      console.error('❌ Vyspa init-folder validation failed: missing required booking data', {
        hasCurrency: !!currency,
        hasPswResultId: !!pswResultId,
        hasDestinationAirportCode: !!destinationAirportCode,
        hasDepartureDate: !!departureDate,
        hasFareSelectedPrice: !!fareSelectedPrice,
      });
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing required booking data' },
        { status: 400 }
      );
    }

    const lead = passengers[0];
    const apiUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const vyspaDepartureDate = normaliseDepartureDateForVyspa(departureDate);
    console.log('🗓️ Vyspa init-folder departure date mapping', {
      originalDepartureDate: departureDate,
      vyspaDepartureDate,
    });
    console.log('🔧 Vyspa init-folder config', {
      apiUrl,
      apiVersion: VYSPA_CONFIG.apiVersion,
      hasUsername: !!VYSPA_CONFIG.credentials.username,
      hasPassword: !!VYSPA_CONFIG.credentials.password,
      branchCode: VYSPA_CONFIG.branchCode,
      timeoutMs: VYSPA_CONFIG.defaults.timeout,
    });
    const basicAuth = Buffer.from(
      `${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
    ).toString('base64');

    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), VYSPA_CONFIG.defaults.timeout);

    const createFolderPayload = [
      {
        customer_type: 'C',
        title: lead.title,
        last_name: lead.lastName,
        first_name: lead.firstName,
        address: lead.address || '',
        contact_types: [
          { type: 'EMAILTO', contact: lead.email },
          { type: 'HOME', contact: lead.phone },
        ],
        branch_code: VYSPA_CONFIG.branchCode,
        zip_code: lead.postalCode || '',
        des_airport_code: destinationAirportCode,
        departuredate: vyspaDepartureDate,
        staff_code: 'SYS',
        owned_by: 'SYS',
      },
    ];

    console.log('➡️ Calling Vyspa createApiCustomerFolder2');
    const createFolderResponse = await fetch(`${apiUrl}/rest/v4/createApiCustomerFolder2/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
      body: JSON.stringify(createFolderPayload),
      signal: controller1.signal,
    });

    clearTimeout(timeout1);
    console.log('⬅️ Vyspa createApiCustomerFolder2 response', {
      ok: createFolderResponse.ok,
      status: createFolderResponse.status,
    });

    if (!createFolderResponse.ok) {
      const errorText = await createFolderResponse.text().catch(() => '');
      console.error('❌ Vyspa createApiCustomerFolder2 failed', {
        status: createFolderResponse.status,
        errorSnippet: errorText.substring(0, 500),
      });
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `CreateApiCustomerFolder2 failed with HTTP ${createFolderResponse.status}`,
          details: errorText.substring(0, 500),
        },
        { status: createFolderResponse.status }
      );
    }

    const createFolderJson: any = await createFolderResponse.json().catch((jsonError) => {
      console.error('❌ Vyspa createApiCustomerFolder2 JSON parse failed', jsonError);
      return {};
    });
    const folderRecord = Array.isArray(createFolderJson) ? createFolderJson[0] : createFolderJson;

    const folderNumberRaw = folderRecord?.folder_no ?? folderRecord?.folderNumber;
    const folderNumber = folderNumberRaw != null ? String(folderNumberRaw) : '';
    const customerId = folderRecord?.customer_id ?? null;
    const emailAddress = folderRecord?.email_address ?? lead.email;

    if (!folderNumber) {
      console.error('❌ Vyspa createApiCustomerFolder2 response missing folder number', {
        rawResponse: createFolderJson,
      });
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: 'CreateApiCustomerFolder2 response missing folder number',
          details: createFolderJson,
        },
        { status: 502 }
      );
    }

    const mappedPassengers = passengers.map((p, index) => ({
      pax_no: index + 1,
      title: p.title,
      first_name: p.firstName,
      middle_name: p.middleName || '',
      last_name: p.lastName,
      birth_date: p.dateOfBirth,
      pax_type: mapPassengerType(p.type),
      api_gender: mapGenderFromTitle(p.title),
    }));

    const passengerIndices = mappedPassengers.map((p) => p.pax_no).join(',');

    const addToFolderPayload = [
      {
        folderNumber: parseInt(folderNumber, 10),
        itineraryNumber: '1',
        foldcur: currency,
        travelPurpose: 'Holiday',
        comments: [],
        set_as_preferred_itinerary: true,
        passengers: mappedPassengers,
        requestData: [
          {
            type: 'flight',
            psw_result_id: typeof pswResultId === 'string' ? parseInt(pswResultId, 10) : pswResultId,
            passengers: passengerIndices,
            fare_selected_price: Number(fareSelectedPrice).toFixed(2),
            brandid: 0,
          },
        ],
      },
    ];

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), VYSPA_CONFIG.defaults.timeout);

    console.log('➡️ Calling Vyspa ApiAddToFolder', {
      folderNumber,
      passengerCount: mappedPassengers.length,
      passengerIndices,
    });

    const addToFolderResponse = await fetch(`${apiUrl}/rest/v4/ApiAddToFolder/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
      body: JSON.stringify(addToFolderPayload),
      signal: controller2.signal,
    });

    clearTimeout(timeout2);
    console.log('⬅️ Vyspa ApiAddToFolder response', {
      ok: addToFolderResponse.ok,
      status: addToFolderResponse.status,
    });

    if (!addToFolderResponse.ok) {
      const errorText = await addToFolderResponse.text().catch(() => '');
      console.error('❌ Vyspa ApiAddToFolder failed', {
        status: addToFolderResponse.status,
        errorSnippet: errorText.substring(0, 500),
        folderNumber,
        customerId,
        emailAddress,
      });
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `ApiAddToFolder failed with HTTP ${addToFolderResponse.status}`,
          details: errorText.substring(0, 500),
          folderNumber,
          customerId,
          emailAddress,
        },
        { status: addToFolderResponse.status }
      );
    }

    const addToFolderJson: any = await addToFolderResponse.json().catch((jsonError) => {
      console.error('❌ Vyspa ApiAddToFolder JSON parse failed', jsonError);
      return {};
    });

    // Debug-only: fetch folder details to verify folder creation
    try {
      const folderDetailsPayload = [
        {
          fold_no: parseInt(folderNumber, 10),
        },
      ];

      const folderDetailsResponse = await fetch(`${apiUrl}/rest/v4/getFolderDetails/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
          'Api-Version': VYSPA_CONFIG.apiVersion,
        },
        body: JSON.stringify(folderDetailsPayload),
      });

      const folderDetailsJson: any = await folderDetailsResponse.json().catch(() => ({}));
      console.log('📁 Vyspa getFolderDetails response:', {
        ok: folderDetailsResponse.ok,
        status: folderDetailsResponse.status,
        data: folderDetailsJson,
      });
    } catch (fdError) {
      console.error('❌ Vyspa getFolderDetails error:', fdError);
    }

    // Debug-only: fetch booking history for the client email to verify booking linkage
    try {
      if (emailAddress) {
        const bookingHistoryPayload = [
          emailAddress,
          1,
          '',
          1,
          1,
        ];

        const bookingHistoryResponse = await fetch(`${apiUrl}/rest/v4/get_booking_history/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
            'Api-Version': VYSPA_CONFIG.apiVersion,
          },
          body: JSON.stringify(bookingHistoryPayload),
        });

        const bookingHistoryJson: any = await bookingHistoryResponse.json().catch(() => ({}));
        console.log('📘 Vyspa get_booking_history response:', {
          ok: bookingHistoryResponse.ok,
          status: bookingHistoryResponse.status,
          data: bookingHistoryJson,
        });
      }
    } catch (bhError) {
      console.error('❌ Vyspa get_booking_history error:', bhError);
    }

    console.log('✅ Vyspa init-folder success', {
      folderNumber,
      customerId,
      emailAddress,
    });

    return NextResponse.json(
      {
        folderNumber,
        customerId,
        emailAddress,
        createFolderRaw: createFolderJson,
        addToFolderRaw: addToFolderJson,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('💥 Vyspa init-folder unhandled error', error);
    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: error?.message || 'Unknown error occurred while initialising folder',
      },
      { status: 500 }
    );
  }
}
