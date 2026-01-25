/**
 * Vyspa liveProperties API Service
 * 
 * NOTE: These endpoints require specific permissions from Vyspa.
 * As of 2026-01-22, the FlightsUK account returns null/empty data.
 * Contact Vyspa to enable liveProperties access for your account.
 * 
 * Endpoints:
 * - GET /rest/v4/liveProperties/?limit=500 - List all properties with pagination
 * - GET /rest/v4/liveProperties/{propertyId} - Get full supplier content for a property
 */

import { VYSPA_CONFIG } from '@/config/vyspa';

// Types for liveProperties API responses
export interface LivePropertyBasic {
  id: number | string;
  name?: string;
  // Add more fields as they become available from API
  [key: string]: unknown;
}

export interface LivePropertyDetails {
  id: number | string;
  name?: string;
  description?: string;
  shortDescription?: string;
  address?: {
    address1?: string;
    address2?: string;
    city?: string;
    postCode?: string;
    country?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  images?: string[];
  amenities?: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  starRating?: number;
  supplierData?: Record<string, unknown>;
  // Add more fields as they become available from API
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

function getBaseUrl(): string {
  // liveProperties uses direct API URL without /anon.php
  return VYSPA_CONFIG.apiUrl.replace(/\/anon\.php\/?$/, '').replace(/\/+$/, '');
}

function buildBasicAuthHeader(): string {
  const username = VYSPA_CONFIG.credentials.username;
  const password = VYSPA_CONFIG.credentials.password;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${basicAuth}`;
}

/**
 * Fetch all live properties with pagination
 * Follows next links until all properties are fetched
 * 
 * @param maxPages Maximum number of pages to fetch (default: unlimited)
 * @param limit Number of properties per page (default: 500)
 */
export async function fetchAllLiveProperties(
  maxPages: number = Infinity,
  limit: number = 500
): Promise<LivePropertyBasic[]> {
  const allProperties: LivePropertyBasic[] = [];
  let nextUrl: string | null = `/rest/v4/liveProperties/?limit=${limit}`;
  let pageCount = 0;

  while (nextUrl && pageCount < maxPages) {
    pageCount++;
    
    const url: string = nextUrl.startsWith('http')
      ? nextUrl
      : `${getBaseUrl()}${nextUrl}`;

    console.log(`📥 Fetching liveProperties page ${pageCount}: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuthHeader(),
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
    });

    if (!response.ok) {
      console.error(`❌ liveProperties fetch failed: ${response.status}`);
      break;
    }

    const data = await response.json();
    
    // Handle different response structures
    if (data?.results && Array.isArray(data.results)) {
      allProperties.push(...data.results);
      nextUrl = data.next;
    } else if (Array.isArray(data)) {
      allProperties.push(...data);
      nextUrl = null;
    } else if (data === null) {
      console.warn('⚠️ liveProperties returned null - check account permissions');
      break;
    } else {
      console.warn('⚠️ Unknown response structure from liveProperties');
      break;
    }

    console.log(`   Found ${allProperties.length} properties so far`);
  }

  return allProperties;
}

/**
 * Get full supplier content for a single property
 * 
 * @param propertyId The property ID (typically hotel_id or VmapId)
 */
export async function getLivePropertyDetails(
  propertyId: string | number
): Promise<LivePropertyDetails | null> {
  const url = `${getBaseUrl()}/rest/v4/liveProperties/${propertyId}`;
  
  console.log(`📥 Fetching liveProperty details: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': buildBasicAuthHeader(),
      'Api-Version': VYSPA_CONFIG.apiVersion,
    },
  });

  if (!response.ok) {
    console.error(`❌ liveProperty details fetch failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  
  // Check for API error responses
  if (data?.error) {
    console.warn(`⚠️ liveProperty ${propertyId}: ${data.error} - ${data.message}`);
    return null;
  }

  return data as LivePropertyDetails;
}

/**
 * Build a local cache/map of property details for quick lookup
 * This can be used to supplement hotel search results with full descriptions
 * 
 * @param propertyIds Array of property IDs to fetch
 * @param concurrency Number of parallel requests (default: 5)
 */
export async function buildPropertyDetailsCache(
  propertyIds: (string | number)[],
  concurrency: number = 5
): Promise<Map<string, LivePropertyDetails>> {
  const cache = new Map<string, LivePropertyDetails>();
  
  // Process in batches for controlled concurrency
  for (let i = 0; i < propertyIds.length; i += concurrency) {
    const batch = propertyIds.slice(i, i + concurrency);
    const promises = batch.map(async (id) => {
      const details = await getLivePropertyDetails(id);
      if (details) {
        cache.set(String(id), details);
      }
    });
    
    await Promise.all(promises);
    console.log(`   Cached ${cache.size}/${propertyIds.length} properties`);
  }
  
  return cache;
}

/**
 * Supplement a hotel search result with data from liveProperties
 * Call this after getting results from accommodationAvailabilityV3
 */
export function supplementHotelWithLiveData(
  hotel: Record<string, unknown>,
  liveData: LivePropertyDetails | null
): Record<string, unknown> {
  if (!liveData) return hotel;

  return {
    ...hotel,
    // Supplement missing description
    description: hotel.description || liveData.description,
    quickDescription: hotel.quickDescription || liveData.shortDescription,
    
    // Supplement missing address
    address1: hotel.address1 || liveData.address?.address1,
    address2: hotel.address2 || liveData.address?.address2,
    post_code: hotel.post_code || liveData.address?.postCode,
    
    // Supplement missing coordinates
    geo_loc_latitude: hotel.geo_loc_latitude || liveData.location?.latitude,
    geo_loc_longitude: hotel.geo_loc_longitude || liveData.location?.longitude,
    
    // Supplement missing amenities
    attributes: (hotel.attributes as unknown[])?.length ? hotel.attributes : liveData.amenities,
    
    // Supplement missing images (if available)
    gallery_images: liveData.images || [],
    
    // Mark that this was supplemented
    _supplementedFromLiveProperties: true,
  };
}
