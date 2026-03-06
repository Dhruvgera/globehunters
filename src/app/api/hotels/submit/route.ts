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
      comments?: string[];
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

function isPortalSuccess(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const parsed = payload as { success?: unknown; status?: unknown; errors?: unknown; error?: unknown };

  if (typeof parsed.success !== 'undefined') {
    if (parsed.success === true || parsed.success === 1 || parsed.success === '1') return true;
    if (parsed.success === false || parsed.success === 0 || parsed.success === '0') return false;
  }

  if (typeof parsed.status === 'string' && parsed.status.toLowerCase() === 'error') return false;
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) return false;
  if (Array.isArray(parsed.error) && parsed.error.length > 0) return false;

  return true;
}

function extractFolderEntries(folderDetails: unknown): Array<{ fiType: string; description: string }> {
  const root = folderDetails as { pagedata?: unknown[]; items?: unknown[]; folderItems?: unknown[] } | null;
  const entries = [
    ...(Array.isArray(root?.pagedata) ? root!.pagedata : []),
    ...(Array.isArray(root?.items) ? root!.items : []),
    ...(Array.isArray(root?.folderItems) ? root!.folderItems : []),
  ];

  return entries.map((item) => {
    const current = item as {
      Segment?: { fi_type?: unknown; desc?: unknown; textdesc?: unknown };
      FolderItem?: { fi_type?: unknown; description?: unknown };
      FolderPricing?: { desc?: unknown };
      description?: unknown;
      fi_type?: unknown;
    };

    const fiType = String(
      current?.Segment?.fi_type ??
        current?.FolderItem?.fi_type ??
        current?.fi_type ??
        ''
    ).trim();

    const description = String(
      current?.Segment?.desc ??
        current?.Segment?.textdesc ??
        current?.FolderItem?.description ??
        current?.FolderPricing?.desc ??
        current?.description ??
        ''
    ).trim();

    return { fiType, description };
  });
}

async function fetchPortalFolderDetails(
  apiUrl: string,
  credentials: { username: string; password: string; token: string },
  folderNumber: number
) {
  const formData = new URLSearchParams();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);
  formData.append('token', credentials.token);
  formData.append('method', 'getFolderDetails');
  formData.append('params', JSON.stringify([{ fold_no: String(folderNumber) }]));

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const rawText = await response.text().catch(() => '');
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = { raw: rawText };
  }

  return {
    ok: response.ok,
    status: response.status,
    data: parsed,
    entries: extractFolderEntries(parsed),
  };
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
  const folderDetailsBefore = await fetchPortalFolderDetails(apiUrl, credentials, Number(body.folderNumber));
  const beforeCount = folderDetailsBefore.entries.length;

  const descLines = [
    `HOTELBEDS HOTEL REQUEST`,
    `Hotel: ${body.hotel.hotelName} (HB code: ${body.hotel.hotelId})`,
    `Stay: ${body.stay.checkIn} to ${body.stay.checkOut}`,
    `Guests: ${body.stay.adults} ADT, ${body.stay.children} CHD, Rooms: ${body.stay.rooms}`,
    body.selection?.boardName ? `Board: ${body.selection.boardName}` : null,
    body.selection?.refundable != null ? `Refundable: ${body.selection.refundable ? 'Yes' : 'No'}` : null,
    body.selection?.rateKey ? `RateKey: ${body.selection.rateKey}` : null,
    ...(Array.isArray(body.comments)
      ? body.comments
          .map((line) => String(line || '').trim())
          .filter(Boolean)
      : []),
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

    const portalSuccess = isPortalSuccess(parsed);

    if (!response.ok || !portalSuccess) {
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: response.ok ? 'Portal API returned business error while adding hotel to folder' : `saveBasketToFolder failed with HTTP ${response.status}`,
          details: parsed,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    let verifiedFolderDetails = folderDetailsBefore.data;
    let hotelPersisted = false;
    let afterCount = beforeCount;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const currentFolderDetails = await fetchPortalFolderDetails(apiUrl, credentials, Number(body.folderNumber));
      verifiedFolderDetails = currentFolderDetails.data;
      afterCount = currentFolderDetails.entries.length;
      hotelPersisted = currentFolderDetails.entries.some((entry) => {
        const description = entry.description.toLowerCase();
        return entry.fiType === 'OTH' && description.includes(String(body.hotel.hotelName || '').trim().toLowerCase());
      });
      if (hotelPersisted && afterCount > beforeCount) {
        break;
      }
    }

    if (!hotelPersisted || afterCount <= beforeCount) {
      return NextResponse.json(
        {
          error: 'VERIFICATION_FAILED',
          message: 'Hotel was not persisted to the folder after saveBasketToFolder completed',
          details: parsed,
          folderDetails: verifiedFolderDetails,
          verification: {
            beforeCount,
            afterCount,
            hotelName: body.hotel.hotelName,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: parsed,
        folderDetails: verifiedFolderDetails,
        verification: {
          beforeCount,
          afterCount,
          hotelPersisted,
          hotelName: body.hotel.hotelName,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === 'AbortError') {
      return NextResponse.json({ error: 'TIMEOUT', message: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'UNKNOWN_ERROR', message: e?.message || 'Unknown error' }, { status: 500 });
  }
}
