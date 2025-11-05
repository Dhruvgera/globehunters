/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

export const API_CONFIG = {
  // Base URL - will be replaced with actual API URL
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',

  // Request timeout in milliseconds
  timeout: 30000,

  // API endpoints
  endpoints: {
    flights: {
      search: '/v1/flights/search',
      details: '/v1/flights',
      pricing: '/v1/flights/pricing',
      datePrice: '/v1/flights/date-pricing',
    },
    bookings: {
      create: '/v1/bookings',
      get: '/v1/bookings',
      update: '/v1/bookings',
      confirm: '/v1/bookings/confirm',
    },
    payments: {
      process: '/v1/payments/process',
      validate: '/v1/payments/validate',
      methods: '/v1/payments/methods',
    },
    addOns: {
      protectionPlans: '/v1/add-ons/protection-plans',
      baggage: '/v1/add-ons/baggage',
    },
  },
};

/**
 * Helper to build full URL
 */
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.baseURL}${endpoint}`;
}
