import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ContactType = { type: string; contact: string };

export interface CreateApiCustomerFolderPayload {
  customer_type: 'C' | 'A' | string;
  title: string;
  last_name: string;
  first_name: string;
  address?: string;
  contact_types?: ContactType[];
  branch_code?: string;
  zip_code?: string;
  des_airport_code?: string;
  departuredate?: string; // YYYY-MM-DD
  staff_code?: string;
  owned_by?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateApiCustomerFolderPayload | CreateApiCustomerFolderPayload[] | null;

  if (!body) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Missing request body' },
      { status: 400 }
    );
  }

  const vyspaPayload = Array.isArray(body) ? body : [body];
  const first = vyspaPayload[0];

  if (!first?.customer_type || !first?.title || !first?.first_name || !first?.last_name) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'customer_type, title, first_name, last_name are required' },
      { status: 400 }
    );
  }

  const result = await vyspaRestFetch('/rest/v4/createApiCustomerFolder/', vyspaPayload);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'API_ERROR',
        message: `createApiCustomerFolder failed with HTTP ${result.status}`,
        details: typeof result.data === 'string' ? result.data.slice(0, 500) : result.data,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}




