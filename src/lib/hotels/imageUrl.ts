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

export function ensureBiggerGiataImageUrl(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  if (!url.startsWith(GIATA_PREFIX)) return url;
  const rest = url.slice(GIATA_PREFIX.length);
  if (GIATA_SIZE_RE.test(rest)) return url;
  return `${GIATA_PREFIX}bigger/${rest}`;
}

export function fixResultsImageUrls(results: unknown[]): unknown[] {
  for (const r of results) {
    if (r && typeof r === 'object') {
      const row = r as Record<string, unknown>;
      if (typeof row.image_name === 'string') {
        row.image_name = ensureBiggerGiataImageUrl(row.image_name);
      }
    }
  }
  return results;
}
