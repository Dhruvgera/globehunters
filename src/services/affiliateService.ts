/**
 * Affiliate Service
 * Handles affiliate data from static source
 */

export interface Affiliate {
  Aff_ID: number;
  Aff_TrackingCode: string;
  Aff_CookieLength: number;
  Aff_Name: string;
  Aff_TelNo: string;
  Details?: string;
}

import { AFFILIATE_DATA } from '@/data/affiliates';

/**
 * Fetch affiliates from local data
 */
export async function fetchAffiliates(): Promise<Affiliate[]> {
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
