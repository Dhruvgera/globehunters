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
