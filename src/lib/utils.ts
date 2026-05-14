import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export { normalizeCabinClass } from './utils/cabinClass';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format cabin/fare labels for UI without collapsing them to broad cabin buckets.
 * Examples:
 * - "PremiumEconomy" -> "Premium Economy"
 * - "ECONOMY FLEX" -> "Economy Flex"
 * - "Eco Flex" -> "Economy Flex"
 */
export function formatFareLabel(label?: string | null): string {
  if (!label) return 'Economy';

  let s = String(label).trim();
  if (!s) return 'Economy';

  // Filter out non-informative API values like "Not Specified"
  if (/^not\s*specified$/i.test(s)) return 'Economy';

  // Normalize separators
  s = s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Handle known concatenations / prefixes
  const prefixMap: Array<[RegExp, string]> = [
    [/^PremiumEconomy$/i, 'Premium Economy'],
    [/^Eco\s+/i, 'Economy '],
    [/^Prem\s+/i, 'Premium '],
    [/^Bus\s+/i, 'Business '],
    [/^First\s*Class$/i, 'First'],
  ];
  for (const [re, repl] of prefixMap) {
    if (re.test(s)) {
      s = s.replace(re, repl);
      break;
    }
  }

  // Insert spaces for simple camelCase/PascalCase labels (if there are no spaces)
  if (!/\s/.test(s) && /[a-z][A-Z]/.test(s)) {
    s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // If all uppercase, convert to Title Case
  if (s === s.toUpperCase()) {
    s = s
      .toLowerCase()
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  return s;
}

