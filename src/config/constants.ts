/**
 * Application Constants
 * Centralized constants that may become dynamic via API
 */

export const CONTACT_INFO = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '020 4502 2984',
  email: 'service@globehunters.co.uk',
  supportHours: 'Mon-Fri 9:00 AM - 6:00 PM GMT',
};

export const DEFAULT_CURRENCY = '£';
export const DEFAULT_CURRENCY_CODE = 'GBP';

export const TRIP_TYPES = {
  ROUND_TRIP: 'round-trip',
  ONE_WAY: 'one-way',
  MULTI_CITY: 'multi-city',
} as const;

export const TRAVEL_CLASSES = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
} as const;

export const FARE_TYPES = {
  ECO_VALUE: 'Eco Value',
  ECO_CLASSIC: 'Eco Classic',
  ECO_FLEX: 'Eco Flex',
} as const;

export const PROTECTION_PLANS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  ALL: 'all',
} as const;

export const PASSENGER_TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr'] as const;

export const PASSENGER_TYPES = {
  ADULT: 'adult',
  CHILD: 'child',
  INFANT: 'infant',
} as const;

// Price configurations (these would eventually come from API)
export const PRICING_CONFIG = {
  // Default discount percentage
  defaultDiscount: 0.20,

  // Additional baggage price per bag in GBP (will be dynamic from API)
  baggagePrice: 90,

  // VAT/Tax rate
  taxRate: 0.05,
};

// iAssure protection plan pricing configuration
export const IASSURE_PRICING = {
  // Global configuration (FlightsUS and other non-UK regions)
  global: {
    // Percentages of base fare
    basic: 0.08, // 8%
    premium: 0.10, // 10%
    all: 0.12, // 12%
  },
  // UK-specific configuration with slabs by booking amount
  uk: {
    slabs: [
      // 0 - 650
      { max: 650, basic: 0.07, premium: 0.12, all: 0.22 },
      // 651 - 999
      { max: 999, basic: 0.06, premium: 0.11, all: 0.21 },
      // 1000 - 1499
      { max: 1499, basic: 0.05, premium: 0.09, all: 0.20 },
      // 1500+
      { max: Number.POSITIVE_INFINITY, basic: 0.04, premium: 0.08, all: 0.18 },
    ],
  },
} as const;

// Filter constraints
export const FILTER_CONSTRAINTS = {
  maxPrice: 2000,
  minPrice: 0,
  maxStops: 3,
  maxTimeRange: 24, // hours
  maxJourneyTime: 48, // hours
};

// Pagination
export const PAGINATION = {
  defaultPageSize: 5,
  incrementSize: 5,
};
