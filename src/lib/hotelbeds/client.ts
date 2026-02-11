import crypto from 'crypto';

export interface HotelbedsClientConfig {
  apiKey: string;
  secret: string;
  bookingBaseUrl: string; // e.g. https://api.hotelbeds.com/hotel-api/1.0
  contentBaseUrl: string; // e.g. https://api.hotelbeds.com/hotel-content-api/1.0
}

export function getHotelbedsConfig(): HotelbedsClientConfig {
  const apiKey = (process.env.HOTELBEDS_API_KEY || '').trim();
  const secret = (process.env.HOTELBEDS_SECRET || '').trim();
  const bookingBaseUrl = (process.env.HOTELBEDS_BOOKING_BASE_URL || 'https://api.hotelbeds.com/hotel-api/1.0').replace(
    /\/+$/,
    ''
  );
  const contentBaseUrl = (process.env.HOTELBEDS_CONTENT_BASE_URL || 'https://api.hotelbeds.com/hotel-content-api/1.0').replace(
    /\/+$/,
    ''
  );

  if (!apiKey || !secret) {
    throw new Error('HotelBeds credentials missing. Set HOTELBEDS_API_KEY and HOTELBEDS_SECRET.');
  }

  return { apiKey, secret, bookingBaseUrl, contentBaseUrl };
}

function generateSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = `${apiKey}${secret}${timestamp}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function hotelbedsFetch<T = unknown>(input: {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; status: number; data: T; rawText?: string }> {
  const cfg = getHotelbedsConfig();
  const method = input.method ?? 'GET';
  const url = `${input.baseUrl}${input.path.startsWith('/') ? '' : '/'}${input.path}`;
  const signature = generateSignature(cfg.apiKey, cfg.secret);

  const resp = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json',
      'Api-key': cfg.apiKey,
      'X-Signature': signature,
    },
    body: method === 'GET' ? undefined : JSON.stringify(input.body ?? {}),
    signal: input.signal,
  });

  const rawText = await resp.text().catch(() => '');
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText as any;
  }

  return { ok: resp.ok, status: resp.status, data, rawText };
}

export async function hotelbedsBookingPost<T = unknown>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const cfg = getHotelbedsConfig();
  const res = await hotelbedsFetch<T>({ baseUrl: cfg.bookingBaseUrl, path, method: 'POST', body });
  return { ok: res.ok, status: res.status, data: res.data };
}

export async function hotelbedsContentGet<T = unknown>(
  path: string,
  options: { signal?: AbortSignal } = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const cfg = getHotelbedsConfig();
  const res = await hotelbedsFetch<T>({ baseUrl: cfg.contentBaseUrl, path, method: 'GET', signal: options.signal });
  return { ok: res.ok, status: res.status, data: res.data };
}
