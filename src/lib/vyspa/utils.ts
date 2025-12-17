/**
 * Vyspa API Utility Functions
 * Helper functions for date conversion, price parsing, formatting, etc.
 */

import { VYSPA_CONFIG } from '@/config/vyspa';

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD format
 * @param dateStr Date string in DD/MM/YYYY format
 * @returns Date string in YYYY-MM-DD format
 */
export function convertDateFormat(dateStr: string): string {
  try {
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Convert from DD/MM/YYYY to YYYY-MM-DD
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) {
      throw new Error('Invalid date format');
    }

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error('Date conversion error:', error);
    return dateStr; // Return as-is if conversion fails
  }
}

/**
 * Generate child ages array (default to 9 years for all children)
 * @param numChildren Number of children
 * @returns Array of age strings
 */
export function generateChildAges(numChildren: number): string[] {
  return numChildren > 0
    ? Array(numChildren).fill(VYSPA_CONFIG.defaults.defaultChildAge)
    : [];
}

/**
 * Parse price value from various formats
 * Handles: numbers, strings with currency symbols, comma/dot separators
 * @param value Price value in any format
 * @param fallback Fallback value if parsing fails
 * @returns Parsed price as number, rounded to 2 decimal places
 */
export function parsePriceValue(value: any, fallback: number = 0.0): number {
  try {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    // Direct conversion for numeric types
    if (typeof value === 'number') {
      return Math.round(value * 100) / 100;
    }

    // For strings, clean and convert
    let str = String(value).trim();

    // Remove currency symbols, spaces, and keep only digits, comma, dot, minus
    str = str.replace(/[^0-9,.\-]/g, '');

    if (!str) {
      return fallback;
    }

    // Handle thousand separators vs decimal separators
    if (str.includes(',') && str.includes('.')) {
      // Format like 1,234.56 - comma is thousand separator
      str = str.replace(/,/g, '');
    } else if (str.includes(',') && !str.includes('.')) {
      // Format like 1234,56 - comma is decimal separator
      str = str.replace(',', '.');
    }

    const result = parseFloat(str);

    if (isNaN(result)) {
      return fallback;
    }

    return Math.round(result * 100) / 100;
  } catch (error) {
    console.error('Price parsing error for value:', value, error);
    return fallback;
  }
}

/**
 * Format time from HHMM to HH:MM
 * Accepts number or string, tolerates already formatted values
 * @param time Time in HHMM or HH:MM
 * @returns Time string in HH:MM format
 */
export function formatTime(time: string | number | null | undefined): string {
  if (time === null || time === undefined || time === '') {
    return '';
  }
  let str = String(time).trim();
  if (str === '') return '';
  // Already formatted
  if (str.includes(':')) return str;
  // Keep only digits
  str = str.replace(/\D/g, '');
  if (str.length === 0) return '';
  // Normalize to 4 digits (HHMM)
  if (str.length > 4) {
    // Use the last 4 digits to preserve minutes
    str = str.slice(-4);
  }
  const padded = str.padStart(4, '0');
  return `${padded.substring(0, 2)}:${padded.substring(2, 4)}`;
}

/**
 * Parse integer value safely
 * @param value Value to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed integer or fallback
 */
export function parseIntSafe(value: any, fallback: number = 0): number {
  try {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? fallback : parsed;
  } catch (error) {
    return fallback;
  }
}

/**
 * Calculate duration between two date-times in minutes
 * @param departureDate Departure date (YYYY-MM-DD)
 * @param departureTime Departure time (HH:MM or HHMM)
 * @param arrivalDate Arrival date (YYYY-MM-DD)
 * @param arrivalTime Arrival time (HH:MM or HHMM)
 * @returns Duration in minutes
 */
export function calculateDuration(
  departureDate: string,
  departureTime: string,
  arrivalDate: string,
  arrivalTime: string
): number {
  try {
    const depTime = formatTime(departureTime);
    const arrTime = formatTime(arrivalTime);

    const departure = new Date(`${departureDate}T${depTime}:00`);
    const arrival = new Date(`${arrivalDate}T${arrTime}:00`);

    const durationMs = arrival.getTime() - departure.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    return durationMinutes > 0 ? durationMinutes : 0;
  } catch (error) {
    console.error('Duration calculation error:', error);
    return 0;
  }
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted string (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Check if a value is a valid airport code (3 letters)
 * @param code Airport code to validate
 * @returns True if valid airport code format
 */
export function isValidAirportCode(code: string): boolean {
  return /^[A-Z]{3}$/i.test(code);
}

/**
 * Check if a date string is in DD/MM/YYYY format
 * @param dateStr Date string to validate
 * @returns True if valid format
 */
export function isValidDateFormat(dateStr: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
}

/**
 * Parse price breakdown string format
 * Format: "ADT~2~143.00~252.92~0.00~0.00~395.92~0,CHD~1~107.00~162.92~0.00~0.00~269.92~0"
 * @param bdownStr Breakdown string
 * @returns Array of parsed breakdown entries
 */
export function parsePriceBreakdownString(bdownStr: string): Array<{
  paxType: string;
  count: number;
  totalPrice: number;
  pricePerPerson: number;
}> {
  try {
    if (!bdownStr) return [];

    const results: Array<{
      paxType: string;
      count: number;
      totalPrice: number;
      pricePerPerson: number;
    }> = [];

    // Split by comma for different passenger types
    const entries = bdownStr.split(',');

    for (const entry of entries) {
      const parts = entry.split('~');
      if (parts.length >= 7) {
        const paxType = parts[0];
        const count = parseIntSafe(parts[1], 0);
        const totalPrice = parsePriceValue(parts[6], 0);
        const pricePerPerson = count > 0 ? totalPrice / count : totalPrice;

        results.push({
          paxType,
          count,
          totalPrice,
          pricePerPerson,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error parsing breakdown string:', error);
    return [];
  }
}

/**
 * Sanitize and normalize airport code
 * @param code Airport code
 * @returns Normalized airport code (uppercase, trimmed)
 */
export function normalizeAirportCode(code: string): string {
  if (!code) return '';
  return String(code).trim().toUpperCase();
}

/**
 * Shorten airport name by replacing common words and removing "Airport"
 * @param name Full airport name
 * @returns Shortened airport name
 */
export function shortenAirportName(name: string): string {
  if (!name) return '';

  return name
    .replace(/\bInternational\b/gi, 'Intl')
    .replace(/\bAirport\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a unique search ID
 * @returns Unique ID string
 */
export function generateSearchId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
