import { NextResponse } from 'next/server';
import { getHotelProvider } from '@/lib/hotels/provider';
import { VYSPA_PORTAL_CONFIG } from '@/config/vyspaPortal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SubmitBody =
  | {
      provider?: 'vyspa' | 'hotelbeds';
      folderNumber: number;
      currency: string;
      hotel: {
        hotelId: string;
        hotelName: string;
      };
      stay: {
        checkIn: string; // YYYY-MM-DD
        checkOut: string; // YYYY-MM-DD
        rooms: number;
        adults: number;
        children: number;
      };
      passengers?: Array<{
        pax_no?: number;
        title?: string;
        first_name: string;
        middle_name?: string;
        last_name: string;
        birth_date?: string;
        pax_type: 'ADT' | 'CHD' | 'INF';
        api_gender?: 'M' | 'F';
        email?: string;
        phone?: string;
        telephone?: string;
      }>;
      selection: {
        total: number;
        nightly?: number;
        rateKey?: string;
        boardName?: string;
        refundable?: boolean;
      };
    };

function formatDateForPortal(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return dateStr;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Missing request body' }, { status: 400 });
  }

  const provider = body.provider || getHotelProvider();
  if (provider === 'vyspa') {
    return NextResponse.json(
      { error: 'NOT_SUPPORTED', message: 'Vyspa submit is handled via ApiAddToFolder in the client flow.' },
      { status: 400 }
    );
  }

  if (!body.folderNumber || !body.currency || !body.hotel?.hotelName || !body.stay?.checkIn || !body.stay?.checkOut) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Missing required fields' }, { status: 400 });
  }

  // HotelBeds selection is saved into the Vyspa folder as a manual itinerary item (CRM capture).
  const { apiUrl, credentials, timeout } = VYSPA_PORTAL_CONFIG;

  const descLines = [
    `HOTELBEDS HOTEL REQUEST`,
    `Hotel: ${body.hotel.hotelName} (HB code: ${body.hotel.hotelId})`,
    `Stay: ${body.stay.checkIn} to ${body.stay.checkOut}`,
    `Guests: ${body.stay.adults} ADT, ${body.stay.children} CHD, Rooms: ${body.stay.rooms}`,
    body.selection?.boardName ? `Board: ${body.selection.boardName}` : null,
    body.selection?.refundable != null ? `Refundable: ${body.selection.refundable ? 'Yes' : 'No'}` : null,
    body.selection?.rateKey ? `RateKey: ${body.selection.rateKey}` : null,
  ].filter(Boolean) as string[];

  const manualItem = {
    Segment: {
      fi_type: 'OTH',
      start_date_time_dt: formatDateForPortal(body.stay.checkIn),
      end_date_time_dt: formatDateForPortal(body.stay.checkOut),
      status: 'OK',
      finan_vend_id: 0,
      itin_vend_id: 0,
      num_bum: '1',
      pax_no: '1',
      desc: body.hotel.hotelName,
      printing_note: descLines.join(' | '),
    },
    FolderPricings: [
      {
        tot_net_amt: String(Number(body.selection.total || 0).toFixed(2)),
        tot_sell_amt: String(Number(body.selection.total || 0).toFixed(2)),
        desc: 'Hotel (HotelBeds)',
        cu_curr_code: body.currency,
      },
    ],
  };

  const params = [
    {
      SaveBasketToFolder: true,
      fromApi: true,
      folderNumber: body.folderNumber,
      itineraryNumber: '1',
      customer_type: 'C',
      passengers: (body.passengers || []).map((p, idx) => {
        const paxNo = String(p?.pax_no ?? idx + 1);
        const telephone = p?.telephone || p?.phone || '';
        return {
          pId: '',
          pax_no: paxNo,
          pax_type: p?.pax_type || 'ADT',
          title: p?.title || 'Mr',
          first_name: String(p?.first_name || '').toUpperCase(),
          middle_name: String(p?.middle_name || ''),
          last_name: String(p?.last_name || '').toUpperCase(),
          api_gender: p?.api_gender || 'M',
          email: p?.email || '',
          telephone,
          birth_date: p?.birth_date || '',
        };
      }),
      manual_items: [manualItem],
    },
  ];

  const formData = new URLSearchParams();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);
  formData.append('token', credentials.token);
  formData.append('method', 'saveBasketToFolder');
  formData.append('params', JSON.stringify(params));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text().catch(() => '');
    let parsed: unknown = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = { raw: rawText };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'API_ERROR', message: `saveBasketToFolder failed with HTTP ${response.status}`, details: parsed },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, result: parsed }, { status: 200 });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === 'AbortError') {
      return NextResponse.json({ error: 'TIMEOUT', message: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'UNKNOWN_ERROR', message: e?.message || 'Unknown error' }, { status: 500 });
  }
}
