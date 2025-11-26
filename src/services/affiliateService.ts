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
}

interface CacheEntry {
  data: Affiliate[];
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Module-level cache
let affiliateCache: CacheEntry | null = null;

/**
 * Fetch affiliates via our API route (avoids CORS issues)
 */
export async function fetchAffiliates(): Promise<Affiliate[]> {
  // Check cache first
  if (affiliateCache && Date.now() - affiliateCache.timestamp < CACHE_TTL_MS) {
    console.log('✅ Using cached affiliate data');
    return affiliateCache.data;
  }

  try {
    console.log('🌐 Fetching affiliate data via API route...');
    // Use our own API route to avoid CORS issues
    const response = await fetch('/api/affiliates');

    if (!response.ok) {
      throw new Error(`Failed to fetch affiliates: ${response.status}`);
    }

    const data: Affiliate[] = await response.json();
    
    // Update cache
    affiliateCache = {
      data,
      timestamp: Date.now(),
    };

    console.log(`✅ Fetched ${data.length} affiliates`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching affiliates:', error);
    // Return cached data if available (even if stale), otherwise empty array
    return affiliateCache?.data || [];
  }
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
