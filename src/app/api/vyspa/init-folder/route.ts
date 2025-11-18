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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InitFolderRequestBody;
    const { passengers, currency, pswResultId, destinationAirportCode, departureDate, fareSelectedPrice } = body;

    if (!Array.isArray(passengers) || passengers.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing passengers' },
        { status: 400 }
      );
    }

    if (!currency || !pswResultId || !destinationAirportCode || !departureDate || !fareSelectedPrice) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing required booking data' },
        { status: 400 }
      );
    }

    const lead = passengers[0];
    const apiUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
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
        branch_code: 'HQ',
        zip_code: lead.postalCode || '',
        des_airport_code: destinationAirportCode,
        departuredate: departureDate,
        staff_code: 'SYS',
        owned_by: 'SYS',
      },
    ];

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

    if (!createFolderResponse.ok) {
      const errorText = await createFolderResponse.text().catch(() => '');
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `CreateApiCustomerFolder2 failed with HTTP ${createFolderResponse.status}`,
          details: errorText.substring(0, 500),
        },
        { status: createFolderResponse.status }
      );
    }

    const createFolderJson: any = await createFolderResponse.json().catch(() => ({}));
    const folderRecord = Array.isArray(createFolderJson) ? createFolderJson[0] : createFolderJson;

    const folderNumberRaw = folderRecord?.folder_no ?? folderRecord?.folderNumber;
    const folderNumber = folderNumberRaw != null ? String(folderNumberRaw) : '';
    const customerId = folderRecord?.customer_id ?? null;
    const emailAddress = folderRecord?.email_address ?? lead.email;

    if (!folderNumber) {
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

    if (!addToFolderResponse.ok) {
      const errorText = await addToFolderResponse.text().catch(() => '');
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

    const addToFolderJson: any = await addToFolderResponse.json().catch(() => ({}));

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
    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: error?.message || 'Unknown error occurred while initialising folder',
      },
      { status: 500 }
    );
  }
}
