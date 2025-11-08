/**
 * Currency Conversion Service
 * Handles currency conversion with live rates and fallback static rates
 */

// Static fallback exchange rates (relative to USD)
const STATIC_RATES: Record<string, number> = {
  'USD': 1.0,
  'GBP': 0.79,
  'EUR': 0.92,
  'INR': 83.12,
  'AED': 3.67,
  'SAR': 3.75,
  'CAD': 1.36,
  'AUD': 1.53,
  'JPY': 149.50,
  'CNY': 7.24,
};

// Cache for live exchange rates
interface RateCache {
  rates: Record<string, number>;
  timestamp: number;
  ttl: number; // 24 hours in milliseconds
}

let rateCache: RateCache | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get exchange rates (try live, fallback to static)
 */
async function getExchangeRates(): Promise<Record<string, number>> {
  // Check cache
  if (rateCache && (Date.now() - rateCache.timestamp) < rateCache.ttl) {
    //console.log('💱 Using cached exchange rates');
    return rateCache.rates;
  }

  // Try to fetch live rates from API
  try {
    // Using exchangerate-api.com (free tier: 1500 requests/month)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    if (response.ok) {
      const data = await response.json();
      const rates = data.rates || {};
      
      // Cache the rates
      rateCache = {
        rates,
        timestamp: Date.now(),
        ttl: CACHE_TTL,
      };
      
      console.log('✅ Fetched live exchange rates');
      return rates;
    }
  } catch (error) {
    console.warn('⚠️  Failed to fetch live rates, using static fallback:', error);
  }

  // Fallback to static rates
  console.log('📊 Using static exchange rates');
  return STATIC_RATES;
}

/**
 * Convert amount from one currency to another
 * @param amount Amount to convert
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @returns Converted amount rounded to 2 decimals
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // No conversion needed if same currency
  if (fromCurrency === toCurrency) {
    return Math.round(amount * 100) / 100;
  }

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Get exchange rates
  const rates = await getExchangeRates();

  // Get rates for both currencies
  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    console.warn(`⚠️  Missing exchange rate for ${from} or ${to}, returning original amount`);
    return Math.round(amount * 100) / 100;
  }

  // Convert: amount in fromCurrency → USD → toCurrency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;

  return Math.round(convertedAmount * 100) / 100;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'INR': '₹',
    'AED': 'د.إ',
    'SAR': 'ر.س',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CNY': '¥',
  };

  return symbols[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // For some currencies, symbol goes after
  if (['AED', 'SAR'].includes(currencyCode.toUpperCase())) {
    return `${formatted} ${symbol}`;
  }

  return `${symbol}${formatted}`;
}

/**
 * Determine target currency based on domain/user preference
 * For now, defaulting to GBP for globehunters.co.uk
 */
export function getTargetCurrency(): string {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Domain-based currency detection
    if (hostname.includes('.co.uk') || hostname.includes('globehunters')) {
      return 'GBP';
    }
    if (hostname.includes('.com')) {
      return 'USD';
    }
    if (hostname.includes('.in')) {
      return 'INR';
    }
    if (hostname.includes('.ae')) {
      return 'AED';
    }
  }

  // Default to GBP for GlobeHunters
  return 'GBP';
}
