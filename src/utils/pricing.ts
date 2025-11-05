/**
 * Pricing Utility Functions
 */

import { BookingPricing } from '@/types/booking';

/**
 * Calculate total trip price with all add-ons and discounts
 */
export function calculateTripTotal(
  baseFare: number,
  protectionPlan: number,
  baggageCost: number,
  seatCost: number = 0,
  mealCost: number = 0,
  discountPercent: number = 0
): number {
  const subtotal = baseFare + protectionPlan + baggageCost + seatCost + mealCost;
  const discount = subtotal * discountPercent;
  return subtotal - discount;
}

/**
 * Format price with currency symbol and locale
 */
export function formatPrice(
  price: number,
  currency: string = '₹',
  locale: string = 'en-IN',
  options?: Intl.NumberFormatOptions
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  const formattedNumber = price.toLocaleString(locale, defaultOptions);

  // For rupee symbol or other non-standard symbols
  if (currency === '₹') {
    return `₹${formattedNumber}`;
  }

  // For standard currency codes (GBP, USD, EUR, etc.)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === '£' ? 'GBP' : currency,
    ...defaultOptions,
  }).format(price);
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  subtotal: number,
  discountPercent: number
): number {
  return subtotal * discountPercent;
}

/**
 * Calculate tax/VAT
 */
export function calculateTax(
  amount: number,
  taxRate: number
): number {
  return amount * taxRate;
}

/**
 * Parse price string to number
 * Handles different formats like "£899", "₹94,353", "$1,234.56"
 */
export function parsePrice(priceString: string): number {
  // Remove currency symbols and commas, then parse
  const cleaned = priceString.replace(/[£₹$€,\s]/g, '');
  return parseFloat(cleaned);
}

/**
 * Calculate price per person
 */
export function calculatePricePerPerson(
  totalPrice: number,
  numberOfPassengers: number
): number {
  return totalPrice / numberOfPassengers;
}

/**
 * Format booking pricing breakdown
 */
export function formatPricingBreakdown(pricing: BookingPricing): string[] {
  return [
    `Base Fare: ${formatPrice(pricing.baseFare, pricing.currency)}`,
    `Taxes: ${formatPrice(pricing.taxes, pricing.currency)}`,
    `Fees: ${formatPrice(pricing.fees, pricing.currency)}`,
    ...(pricing.protectionPlan > 0
      ? [`Protection Plan: ${formatPrice(pricing.protectionPlan, pricing.currency)}`]
      : []),
    ...(pricing.baggageFees > 0
      ? [`Additional Baggage: ${formatPrice(pricing.baggageFees, pricing.currency)}`]
      : []),
    ...(pricing.seatFees > 0
      ? [`Seat Selection: ${formatPrice(pricing.seatFees, pricing.currency)}`]
      : []),
    ...(pricing.mealFees > 0
      ? [`Meals: ${formatPrice(pricing.mealFees, pricing.currency)}`]
      : []),
    `Subtotal: ${formatPrice(pricing.subtotal, pricing.currency)}`,
    ...(pricing.discount > 0
      ? [`Discount (${(pricing.discountPercent * 100).toFixed(0)}%): -${formatPrice(pricing.discount, pricing.currency)}`]
      : []),
    `Total: ${formatPrice(pricing.total, pricing.currency)}`,
  ];
}

/**
 * Compare prices and return difference
 */
export function comparePrices(
  price1: number,
  price2: number
): { difference: number; percentage: number; cheaper: 1 | 2 } {
  const difference = Math.abs(price1 - price2);
  const cheaper = price1 < price2 ? 1 : 2;
  const basePrice = cheaper === 1 ? price1 : price2;
  const percentage = (difference / basePrice) * 100;

  return { difference, percentage, cheaper };
}

/**
 * Round price to nearest integer or specified decimal places
 */
export function roundPrice(price: number, decimals: number = 0): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(price * multiplier) / multiplier;
}
