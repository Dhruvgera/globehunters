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
 * Get API username based on current domain
 * @returns Username for API authentication (FlightsUK or FlightsUS)
 */
export function getApiUsername(): string {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Check for exact domain match
    if (DOMAIN_CONFIG_MAP[hostname]) {
      return DOMAIN_CONFIG_MAP[hostname].username;
    }
    
    // Check for partial domain match (e.g., www.globehunters.co.uk)
    for (const [domain, config] of Object.entries(DOMAIN_CONFIG_MAP)) {
      if (hostname.includes(domain)) {
        return config.username;
      }
    }
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
    const hostname = window.location.hostname;
    
    // Check for exact domain match
    if (DOMAIN_CONFIG_MAP[hostname]) {
      return DOMAIN_CONFIG_MAP[hostname].currency;
    }
    
    // Check for partial domain match
    for (const [domain, config] of Object.entries(DOMAIN_CONFIG_MAP)) {
      if (hostname.includes(domain)) {
        return config.currency;
      }
    }
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
    const hostname = window.location.hostname;
    
    // Check for exact domain match
    if (DOMAIN_CONFIG_MAP[hostname]) {
      return DOMAIN_CONFIG_MAP[hostname].region;
    }
    
    // Check for partial domain match
    for (const [domain, config] of Object.entries(DOMAIN_CONFIG_MAP)) {
      if (hostname.includes(domain)) {
        return config.region;
      }
    }
  }
  
  // Default to UK region
  return DEFAULT_CONFIG.region;
}

/**
 * Get full domain configuration
 * @returns Complete domain configuration object
 */
export function getDomainConfig(): DomainConfig {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
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
  }
  
  // Default to UK configuration
  return DEFAULT_CONFIG;
}
