/**
 * GDS / supplier normalization helpers.
 *
 * Upstream APIs sometimes return one-letter GDS codes (e.g. "G", "X").
 * Our CMS/Portal expects human-readable names in `booked_via`.
 */

export type CanonicalGds = 'Galileo' | 'Sabre';

function mapGdsToken(tokenRaw: string): string {
  const token = tokenRaw.trim();
  const upper = token.toUpperCase();

  if (upper === 'G' || upper === 'GALILEO') return 'Galileo';

  // Common misspelling "Saber" appears occasionally; normalize it too.
  if (upper === 'X' || upper === 'SABRE' || upper === 'SABER') return 'Sabre';

  return token;
}

/**
 * Normalize a GDS label that may be:
 * - One-letter code: "G" | "X"
 * - Name: "Galileo" | "Sabre" (or "Saber")
 * - Composite "GDS-SUPPLIER": "G-GALNEW", "Galileo-GALNEW", etc
 */
export function normalizeGdsLabel(raw?: string): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';

  const firstDash = s.indexOf('-');
  if (firstDash === -1) return mapGdsToken(s);

  const head = s.slice(0, firstDash);
  const tail = s.slice(firstDash + 1); // keep original tail as-is
  const mappedHead = mapGdsToken(head);
  return tail ? `${mappedHead}-${tail}` : mappedHead;
}

/**
 * Return ONLY the canonical GDS name (no supplier suffix).
 * Examples:
 * - "G" -> "Galileo"
 * - "Galileo-GALNEW" -> "Galileo"
 * - "X-SABNEW" -> "Sabre"
 */
export function canonicalizeGdsName(raw?: string): '' | CanonicalGds | string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const head = s.split('-')[0] ?? '';
  return mapGdsToken(head);
}


