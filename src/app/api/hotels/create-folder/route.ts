import { NextResponse } from 'next/server';
import { vyspaRestFetch } from '@/lib/vyspa/restClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown[] | null;

  if (!body || !Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Payload must be a non-empty array' }, { status: 400 });
  }

  // Folder creation is currently a Vyspa CRM concept and remains unchanged regardless of provider.
  // Vyspa REST: createApiCustomerFolder (create_customer_folder is not available on stage and returns 501)
  const result = await vyspaRestFetch('/rest/v4/createApiCustomerFolder/', body);
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
