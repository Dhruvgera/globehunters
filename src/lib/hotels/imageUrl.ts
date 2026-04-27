/**
 * Some Vyspa/Stuba API responses return malformed image URLs where the slash
 * between the hostname and path is missing, e.g.:
 *   http://api.stuba.comRXLImages/1163/...  (broken)
 * instead of:
 *   http://api.stuba.com/RXLImages/1163/... (correct)
 *
 * This utility detects and repairs such URLs so next/image can resolve the hostname.
 */
const STUBA_MALFORMED_RE = /^(https?:\/\/api\.stuba\.com)(?!\/)(.+)/i;

export function fixStubaImageUrl(url: unknown): string {
  const s = String(url || '').trim();
  if (!s) return s;
  return s.replace(STUBA_MALFORMED_RE, '$1/$2');
}

const GIATA_PREFIX = 'https://photos.hotelbeds.com/giata/';
const GIATA_SIZE_RE = /^(small|medium|bigger|xl|xxl|original)\//;

export function ensureGiataImageUrl(url: unknown, size: 'small' | 'medium' | 'bigger' | 'xl' | 'xxl' | 'original' = 'bigger'): unknown {
  if (typeof url !== 'string') return url;
  if (!url.startsWith(GIATA_PREFIX)) return url;
  const rest = url.slice(GIATA_PREFIX.length);
  if (GIATA_SIZE_RE.test(rest)) return url;
  return `${GIATA_PREFIX}${size}/${rest}`;
}

export function fixResultsImageUrls(results: unknown[]): unknown[] {
  for (const r of results) {
    if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      if (typeof row.image_name === 'string') {
        row.image_name = ensureGiataImageUrl(row.image_name);
      }
    }
  }
  return results;
}

function checkImageHead(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  return fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
    .then((res) => {
      clearTimeout(timeout);
      return res.ok || res.type === 'opaque';
    })
    .catch(() => {
      clearTimeout(timeout);
      return false;
    });
}

export async function filterReachableImageUrls(urls: string[]): Promise<string[]> {
  if (typeof window === 'undefined' || urls.length === 0) return urls;

  const results = await Promise.all(
    urls.map(async (url) => {
      const ok = await checkImageHead(url);
      return ok ? url : '';
    })
  );

  return results.filter(Boolean) as string[];
}
