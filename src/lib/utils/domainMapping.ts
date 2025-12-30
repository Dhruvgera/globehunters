/**
 * Domain-based API Configuration Mapping
 * Maps domains to appropriate API credentials and settings
 */

interface DomainConfig {
  username: string;
  currency: string;
  region: string;
}

/**
 * Domain to API configuration mapping
 */
const DOMAIN_CONFIG_MAP: Record<string, DomainConfig> = {
  // UK domain - returns prices in GBP
  'globehunters.co.uk': {
    username: 'FlightsUK',
    currency: 'GBP',
    region: 'UK',
  },
  // US domain - returns prices in USD
  'globehunters.com': {
    username: 'FlightsUS',
    currency: 'USD',
    region: 'US',
  },
  // AU domain - returns prices in AUD
  'globehunters.com.au': {
    username: 'FlightsAU', // Assuming this based on pattern
    currency: 'AUD',
    region: 'AU',
  },
};

/**
 * Default configuration (UK)
 */
const DEFAULT_CONFIG: DomainConfig = {
  username: 'FlightsUK',
  currency: 'GBP',
  region: 'UK',
};

/**
 * Get region based on hostname (server-side friendly if hostname provided)
 */
export function getRegionFromHost(hostname: string): string {
  // Allow overriding domain via env var for testing
  const simulatedDomain = process.env.SIMULATE_DOMAIN;
  const targetHost = simulatedDomain || hostname;

  // Check for exact domain match
  if (DOMAIN_CONFIG_MAP[targetHost]) {
    return DOMAIN_CONFIG_MAP[targetHost].region;
  }
  
  // Check for partial domain match
  for (const [domain, config] of Object.entries(DOMAIN_CONFIG_MAP)) {
    if (targetHost.includes(domain)) {
      return config.region;
    }
  }
  
  // Default to UK region
  return DEFAULT_CONFIG.region;
}

/**
 * Get API username based on current domain
 * @returns Username for API authentication (FlightsUK or FlightsUS)
 */
export function getApiUsername(): string {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    return getDomainConfigFromHost(window.location.hostname).username;
  }
  
  // Default to UK for localhost and unknown domains
  return DEFAULT_CONFIG.username;
}

/**
 * Get expected currency based on current domain
 * @returns Currency code (GBP or USD)
 */
export function getExpectedCurrency(): string {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    return getDomainConfigFromHost(window.location.hostname).currency;
  }
  
  // Default to UK currency
  return DEFAULT_CONFIG.currency;
}

/**
 * Get region based on current domain
 * @returns Region code (UK or US)
 */
export function getRegion(): string {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    return getRegionFromHost(window.location.hostname);
  }
  
  // Default to UK region
  return DEFAULT_CONFIG.region;
}

/**
 * Get full domain configuration from hostname
 */
export function getDomainConfigFromHost(hostname: string): DomainConfig {
  // Check for exact domain match
  if (DOMAIN_CONFIG_MAP[hostname]) {
    return DOMAIN_CONFIG_MAP[hostname];
  }
  
  // Check for partial domain match
  for (const [domain, config] of Object.entries(DOMAIN_CONFIG_MAP)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Get full domain configuration
 * @returns Complete domain configuration object
 */
export function getDomainConfig(): DomainConfig {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    return getDomainConfigFromHost(window.location.hostname);
  }
  
  // Default to UK configuration
  return DEFAULT_CONFIG;
}
