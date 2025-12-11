/**
 * Booking-related Types
 */

import { Flight } from './flight';

export type PassengerTitle = 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr';
export type PassengerType = 'adult' | 'child' | 'infant';

export interface Passenger {
  id?: string;
  title: PassengerTitle;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  email: string;
  phone: string;
  countryCode?: string; // Phone country code e.g., "+44"
  type: PassengerType;
  // Optional fields for international travel
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  frequentFlyerNumber?: string;
}

export interface AddOns {
  protectionPlan?: 'basic' | 'premium' | 'all';
  additionalBaggage: number; // Number of extra bags
  meals?: MealPreference[];
  seatSelection?: SeatSelection[];
}

export interface MealPreference {
  passengerId: string;
  segmentId: string;
  mealType: 'vegetarian' | 'vegan' | 'kosher' | 'halal' | 'gluten-free' | 'standard';
}

export interface SeatSelection {
  passengerId: string;
  segmentId: string;
  seatNumber: string;
  seatType: 'window' | 'aisle' | 'middle';
  price: number;
}

export interface ProtectionPlanDetails {
  type: 'basic' | 'premium' | 'all';
  name: string;
  price: number;
  currency: string;
  features: string[];
  coverage: {
    cancellation: boolean;
    medicalEmergency: boolean;
    baggageLoss: boolean;
    flightDelay: boolean;
    tripInterruption: boolean;
    covidCoverage: boolean;
  };
}

export interface BookingRequest {
  flightId: string;
  passengers: Passenger[];
  contactInfo: {
    email: string;
    phone: string;
    alternatePhone?: string;
  };
  fareType: 'Eco Value' | 'Eco Classic' | 'Eco Flex';
  addOns: AddOns;
  specialRequests?: string;
}

export interface BookingResponse {
  bookingId: string;
  webReference: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  flight: Flight;
  passengers: Passenger[];
  pricing: BookingPricing;
  createdAt: string;
  expiresAt?: string; // Booking hold expiration
}

export interface BookingPricing {
  baseFare: number;
  taxes: number;
  fees: number;
  protectionPlan: number;
  baggageFees: number;
  seatFees: number;
  mealFees: number;
  subtotal: number;
  discount: number;
  discountPercent: number;
  total: number;
  currency: string;
  priceBreakdown: {
    label: string;
    amount: number;
  }[];
}

export interface BookingConfirmation {
  bookingId: string;
  webReference: string;
  confirmationNumber: string;
  status: 'confirmed';
  ticketNumbers: string[];
  pnr: string; // Passenger Name Record
  eTickets: {
    passengerId: string;
    ticketNumber: string;
    downloadUrl: string;
  }[];
}

/**
 * Form validation types
 */
export interface PassengerFormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  passportNumber?: string;
  passportExpiry?: string;
}

export interface BookingFormState {
  passengers: Passenger[];
  contactEmail: string;
  contactPhone: string;
  selectedFareType: 'Eco Value' | 'Eco Classic' | 'Eco Flex';
  addOns: AddOns;
  errors: {
    passengers: PassengerFormErrors[];
    contactEmail?: string;
    contactPhone?: string;
  };
}
