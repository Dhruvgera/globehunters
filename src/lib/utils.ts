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

