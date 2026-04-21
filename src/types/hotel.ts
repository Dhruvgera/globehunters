export type HotelAmenity =
  | "Pet-friendly"
  | "Airport shuttle included"
  | "Breakfast included"
  | "Free cancellation"
  | "Reserve without a credit card";

export interface HotelRoomOption {
  name: string; // e.g. "Deluxe Room · 1 Queen Bed"
  highlights: string[]; // e.g. ["Free cancellation till 24 hrs before check-in"]
}

export interface HotelReviewSummary {
  score: number; // e.g. 9.3
  label: string; // e.g. "Exceptional"
  count: number; // e.g. 900
}

export interface HotelBedsTaxItem {
  included: boolean;
  amount: string;
  currency: string;
  type: string;          // "TAX" | "FEE" | "TAXESANDFEES"
  subType?: string;      // e.g. "City Tax", "Resort Fee", "VAT"
  clientAmount?: string;
  clientCurrency?: string;
}

export interface HotelTaxBreakdown {
  allIncluded: boolean;
  taxes: HotelBedsTaxItem[];
}

export interface HotelPriceSummary {
  currency: string; // e.g. "$"
  nightly: number;
  total: number;
  perPerson?: number;
  nights: number;
  rooms: number;
}

export interface Hotel {
  id: string;
  /** TrustYou hotel ID (UUID) when resolved */
  tyId?: string;
  name: string;
  distanceLabel: string; // e.g. "15.11 mi from Hong Kong Intl. (HKG)"
  neighborhood?: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  amenities: HotelAmenity[];
  room: HotelRoomOption;
  reviews: HotelReviewSummary;
  price: HotelPriceSummary;
  imageSrc: string;
  /** Short hotel description from initial search */
  description?: string;
  /** City name, e.g. "Dubai" */
  cityName?: string;
  /** Country name, e.g. "United Arab Emirates" */
  countryName?: string;
  /** Meal plan codes, e.g. ["Room Only", "Bed and Breakfast"] */
  mealPlans?: string[];
  /** Property-level refundable signal when available from provider list response */
  refundable?: boolean | null;
  /** Raw provider search row for debug rendering on listing/detail pages */
  rawSearchResult?: unknown;
  /** Check-in date from package search response (YYYY-MM-DD) */
  checkInDate?: string;
  /** Check-out date from package search response (YYYY-MM-DD) */
  checkOutDate?: string;
}
