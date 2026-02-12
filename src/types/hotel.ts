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

export interface HotelPriceSummary {
  currency: string; // e.g. "$"
  nightly: number;
  total: number;
  nights: number;
  rooms: number;
}

export interface Hotel {
  id: string;
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
}

