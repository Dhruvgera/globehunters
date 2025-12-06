/**
 * Deeplink Utilities
 * 
 * Helper functions for handling meta channel deeplink URLs from Skyscanner
 * and other affiliate partners.
 */

"use client";

export interface DeeplinkParams {
  key?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  cnc?: string | null;
}

/**
 * Check if URL has deeplink parameters (key param present)
 */
export function hasDeeplinkParams(searchParams: URLSearchParams): boolean {
  return searchParams.has("key") && searchParams.get("key")?.trim() !== "";
}

/**
 * Extract deeplink parameters from URL search params
 */
export function extractDeeplinkParams(searchParams: URLSearchParams): DeeplinkParams {
  return {
    key: searchParams.get("key"),
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),
    cnc: searchParams.get("cnc"),
  };
}

/**
 * Store UTM tracking data in sessionStorage for analytics
 */
export function storeUtmTracking(params: DeeplinkParams): void {
  if (typeof window === "undefined") return;
  
  const trackingData = {
    utm_source: params.utmSource,
    utm_medium: params.utmMedium,
    utm_campaign: params.utmCampaign,
    cnc: params.cnc,
    timestamp: new Date().toISOString(),
  };

  sessionStorage.setItem("deeplink_tracking", JSON.stringify(trackingData));
}

/**
 * Retrieve stored UTM tracking data
 */
export function getStoredUtmTracking(): DeeplinkParams & { timestamp?: string } | null {
  if (typeof window === "undefined") return null;
  
  const stored = sessionStorage.getItem("deeplink_tracking");
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored);
    return {
      utmSource: data.utm_source,
      utmMedium: data.utm_medium,
      utmCampaign: data.utm_campaign,
      cnc: data.cnc,
      timestamp: data.timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a flight key looks valid (base64 encoded)
 */
export function isValidFlightKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== "string") return false;
  
  // Basic validation - key should be non-empty and look like base64
  const trimmed = key.trim();
  if (trimmed.length === 0) return false;
  
  // Check if it looks like base64 encoded string
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  return base64Pattern.test(trimmed);
}
