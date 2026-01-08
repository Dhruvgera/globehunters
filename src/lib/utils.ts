import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize cabin class code/name to a display-friendly format
 * Handles various formats from API: codes (Y, C, F, W), full names, or undefined
 */
export function normalizeCabinClass(cabinClass?: string | null): string {
  if (!cabinClass) return 'Economy';
  
  const normalized = String(cabinClass).trim().toUpperCase();
  
  // Handle common cabin codes
  switch (normalized) {
    case 'Y':
    case 'M':
    case 'ECONOMY':
    case 'ECO':
      return 'Economy';
    case 'W':
    case 'S':
    case 'PREMIUM ECONOMY':
    case 'PREMIUM':
    case 'PREMIUMECONOMY':
      return 'Premium Economy';
    case 'C':
    case 'J':
    case 'BUSINESS':
    case 'BUS':
      return 'Business';
    case 'F':
    case 'P':
    case 'A':
    case 'FIRST':
    case 'FIRSTCLASS':
      return 'First';
    case 'NOT SPECIFIED':
    case 'NOTSPECIFIED':
    case '':
      return 'Economy';
    default:
      // If it looks like a readable class name, use it; otherwise default to Economy
      if (normalized.includes('ECONOMY')) return 'Economy';
      if (normalized.includes('BUSINESS')) return 'Business';
      if (normalized.includes('FIRST')) return 'First';
      if (normalized.includes('PREMIUM')) return 'Premium Economy';
      return 'Economy';
  }
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

