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
  global: {
    basic: 0.08,
    premium: 0.10,
    all: 0.15,
  },
} as const;

export const REFUND_SHIELD_PRICING = {
  rate: 0.1,
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

import type { FilterState } from '@/types/flight';

export const DEFAULT_FILTER_STATE: FilterState = {
  stops: [],
  priceRange: [0, 2000],
  departureTimeOutbound: [0, 24],
  departureTimeInbound: [0, 24],
  arrivalTimeOutbound: [0, 24],
  arrivalTimeInbound: [0, 24],
  timeFilterMode: 'takeoff',
  journeyTimeOutbound: [0, 35],
  journeyTimeInbound: [0, 35],
  departureAirports: [],
  arrivalAirports: [],
  airlines: [],
  extras: [],
};
