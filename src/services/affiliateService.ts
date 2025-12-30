/**
 * Affiliate Service
 * Handles affiliate data fetching and caching (10 minutes TTL)
 */

export interface Affiliate {
  Aff_ID: number;
  Aff_TrackingCode: string;
  Aff_CookieLength: number;
  Aff_Name: string;
  Aff_TelNo: string;
  Details?: string;
}

interface CacheEntry {
  data: Affiliate[];
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

import { AFFILIATE_DATA } from '@/data/affiliates';

/**
 * Fetch affiliates from local data
 */
export async function fetchAffiliates(): Promise<Affiliate[]> {
  // Use local data instead of API call
  return AFFILIATE_DATA;
}

/**
 * Get affiliate by tracking code
 */
export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  const affiliates = await fetchAffiliates();
  return affiliates.find(
    (aff) => aff.Aff_TrackingCode.toLowerCase() === code.toLowerCase()
  ) || null;
}

/**
 * Get affiliate phone number by tracking code
 * Returns default phone if no affiliate found
 */
export async function getAffiliatePhone(code: string | null): Promise<string> {
  const DEFAULT_PHONE = '020 4502 2984';
  
  if (!code) {
    return DEFAULT_PHONE;
  }

  const affiliate = await getAffiliateByCode(code);
  return affiliate?.Aff_TelNo || DEFAULT_PHONE;
}

/**
 * Clear the affiliate cache (useful for testing or forced refresh)
 */
export function clearAffiliateCache(): void {
  affiliateCache = null;
}
