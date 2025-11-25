/**
 * Vyspa API Configuration
 * Contains all configuration constants for Vyspa flight search API
 */

import { getApiUsername } from '@/lib/utils/domainMapping';

export const VYSPA_CONFIG = {
  apiUrl: process.env.VYSPA_API_URL || '',
  apiVersion: process.env.VYSPA_API_VERSION || '1',
  branchCode: process.env.VYSPA_BRANCH_CODE || 'HQ',
  credentials: {
    // Username is determined by domain mapping (FlightsUK for .co.uk, FlightsUS for .com)
    // Falls back to env var if domain mapping returns empty
    get username(): string {
      const domainUsername = getApiUsername();
      return domainUsername || process.env.VYSPA_USERNAME || '';
    },
    password: process.env.VYSPA_PASSWORD || '',
    token: process.env.VYSPA_TOKEN || '',
  },
  defaults: {
    version: '2' as const,
    method: 'flights_availability_search' as const,
    timeout: 30000, // 30 seconds
    defaultChildAge: '9',
  },
  validation: {
    minAdults: 1,
    maxAdults: 9,
    maxChildren: 9,
    maxInfants: 9,
    maxTotalPassengers: 9,
  },
} as const;

// Validate configuration on module load (development only)
if (process.env.NODE_ENV === 'development') {
  if (!VYSPA_CONFIG.apiUrl) {
    console.warn('⚠️  VYSPA_API_URL is not configured');
  }
  if (!VYSPA_CONFIG.credentials.username) {
    console.warn('⚠️  VYSPA_USERNAME is not configured');
  }
  if (!VYSPA_CONFIG.credentials.password) {
    console.warn('⚠️  VYSPA_PASSWORD is not configured');
  }
  if (!VYSPA_CONFIG.credentials.token) {
    console.warn('⚠️  VYSPA_TOKEN is not configured');
  }
}

export type VyspaConfig = typeof VYSPA_CONFIG;
