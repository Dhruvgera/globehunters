/**
 * Vyspa Portal API Configuration
 * Configuration for the portal.globehunters.com API
 * Uses separate credentials from the main Vyspa API
 */

import { getRegion } from '@/lib/utils/domainMapping';
import { getCabinClassSubsource } from '@/lib/utils/cabinClass';

// Portal API uses its own credentials (different from main Vyspa API)
export const VYSPA_PORTAL_CONFIG = {
    apiUrl: process.env.VYSPA_PORTAL_URL || 'https://portal.globehunters.com/jsonserver.php',
    credentials: {
        username: process.env.VYSPA_PORTAL_USERNAME || '',
        password: process.env.VYSPA_PORTAL_PASSWORD || '',
        token: process.env.VYSPA_PORTAL_TOKEN || '',
    },
    timeout: 60000, // 60 seconds (Portal API can be slow)

    // Fixed vendor IDs for iAssure insurance
    iAssureVendorId: 138,

    // GDS booking info
    defaultBookedVia: 'Galileo-GALNEW',
} as const;

// Validate portal configuration on module load (development only)
if (process.env.NODE_ENV === 'development') {
    if (!process.env.VYSPA_PORTAL_URL) {
        console.warn('⚠️  VYSPA_PORTAL_URL is not configured, using default');
    }
    if (!process.env.VYSPA_PORTAL_USERNAME) {
        console.warn('⚠️  VYSPA_PORTAL_USERNAME is not configured');
    }
    if (!process.env.VYSPA_PORTAL_PASSWORD) {
        console.warn('⚠️  VYSPA_PORTAL_PASSWORD is not configured');
    }
    if (!process.env.VYSPA_PORTAL_TOKEN) {
        console.warn('⚠️  VYSPA_PORTAL_TOKEN is not configured');
    }
}

/**
 * Get region-specific configuration for Portal API
 */
export function getPortalRegionConfig(overrideRegion?: string) {
    const region = overrideRegion || getRegion();

    const regionConfigs: Record<string, {
        websiteName: string;
        brand: string;
        branchCode: string;
        currency: string;
    }> = {
        'AU': {
            websiteName: 'CMS_AU',
            brand: 'globehunters.com.au',
            branchCode: 'AU',
            currency: 'AUD',
        },
        'UK': {
            websiteName: 'CMS_UK',
            brand: 'globehunters.co.uk',
            branchCode: 'UK',
            currency: 'GBP',
        },
        'US': {
            websiteName: 'CMS_US',
            brand: 'globehunters.com',
            branchCode: 'US',
            currency: 'USD',
        },
        'global': {
            websiteName: 'CMS_UK',
            brand: 'globehunters.com',
            branchCode: 'UK',
            currency: 'GBP',
        },
    };

    return regionConfigs[region] || regionConfigs['UK'];
}

export { getCabinClassSubsource } from '@/lib/utils/cabinClass';

/**
 * Contact type codes for CustomerNumber array
 */
export const CONTACT_TYPES = {
    PHONE: '2',
    EMAIL: '3',
} as const;

export type VyspaPortalConfig = typeof VYSPA_PORTAL_CONFIG;
