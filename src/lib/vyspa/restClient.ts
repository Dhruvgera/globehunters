import { VYSPA_CONFIG } from '@/config/vyspa';

export type VyspaRestMethod = 'GET' | 'POST';

export interface VyspaRestRequestOptions {
  method?: VyspaRestMethod;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${basicAuth}`;
}

export function getVyspaRestBaseUrl(): string {
  // Note: existing code uses VYSPA_API_URL as-is and appends `/rest/v4/...`.
  // Keep consistent with `src/lib/vyspa/client.ts` + `/api/vyspa/add-to-folder`.
  return VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
}

export async function vyspaRestFetch<T = unknown>(
  path: string,
  body: unknown,
  options: VyspaRestRequestOptions = {}
): Promise<{ ok: boolean; status: number; data: T; rawText?: string }> {
  const method = options.method ?? 'POST';
  const timeoutMs = options.timeoutMs ?? VYSPA_CONFIG.defaults.timeout;
  const baseUrl = getVyspaRestBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuthHeader(),
        'Api-Version': VYSPA_CONFIG.apiVersion,
        ...(options.headers ?? {}),
      },
      body: method === 'GET' ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text().catch(() => '');
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = rawText as any;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      rawText,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        data: { error: 'TIMEOUT', message: `Request timed out after ${timeoutMs}ms` } as any,
      };
    }
    return {
      ok: false,
      status: 500,
      data: { error: 'UNKNOWN_ERROR', message: error?.message || 'Unknown error' } as any,
    };
  }
}




