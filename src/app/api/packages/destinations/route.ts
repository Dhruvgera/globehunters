/**
 * GET /api/packages/destinations?location={location}
 * Proxies Vyspa's holiday destination autocomplete.
 */
import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_CONFIG } from '@/config/vyspa';

function upstreamError(reason: string, diagnostics: object) {
  console.error('[PackageDestinations] Upstream failure', { reason, ...diagnostics });
  return NextResponse.json({ error: 'Destination lookup is unavailable' }, { status: 502 });
}

export async function GET(request: NextRequest) {
  const location = new URL(request.url).searchParams.get('location')?.trim();
  if (!location || location.length < 2) {
    return NextResponse.json(
      { error: 'Location parameter is required and must be at least 2 characters' },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  const region = process.env.VERCEL_REGION;
  try {
    const baseUrl = (process.env.VYSPA_PACKAGE_DESTINATIONS_API_URL || VYSPA_CONFIG.apiUrl).replace(/\/+$/, '');
    const url = new URL(`${baseUrl}/rest/v4/holiday_destinations_autocomplete/${encodeURIComponent(location)}/1`);
    const { username, password } = VYSPA_CONFIG.credentials;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Api-Version': '1',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(VYSPA_CONFIG.defaults.timeout),
    });

    const redirect = response.headers.get('location');
    const redirectUrl = redirect ? URL.parse(redirect, url) : null;
    const diagnostics = {
      region,
      upstreamOrigin: url.origin,
      upstreamBasePath: new URL(baseUrl).pathname,
      upstreamStatus: response.status,
      contentType: response.headers.get('content-type'),
      redirectOrigin: redirectUrl?.origin,
      redirectsToSignIn: Boolean(redirectUrl && /(?:auth|login|sign[-_]?in)/i.test(redirectUrl.pathname)),
      durationMs: Date.now() - startedAt,
    };

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return upstreamError(response.status >= 300 && response.status < 400 ? 'redirect' : 'http', diagnostics);
    }

    const data: unknown = await response.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) return null;
      throw error;
    });
    if (!Array.isArray(data)) return upstreamError('unexpected response format', diagnostics);

    console.info('[PackageDestinations] Lookup succeeded', { ...diagnostics, count: data.length });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const timedOut = errorName === 'TimeoutError';
    console.error('[PackageDestinations] Request failed', { region, errorName, durationMs: Date.now() - startedAt });
    return NextResponse.json(
      { error: timedOut ? 'Destination lookup timed out' : 'Destination lookup is unavailable' },
      { status: timedOut ? 504 : 502 },
    );
  }
}
