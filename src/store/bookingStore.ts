/**
 * Booking State Management Store (Zustand)
 * Manages global state for flight selection, booking, and payment flow
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Flight, SearchParams } from '@/types/flight';
import { Passenger, AddOns, BookingResponse } from '@/types/booking';
import { PaymentDetails } from '@/types/payment';

interface BookingState {
  // Search state
  searchParams: SearchParams | null;
  setSearchParams: (params: SearchParams) => void;

  // Selected flight
  selectedFlight: Flight | null;
  selectedFareType: 'Eco Value' | 'Eco Classic' | 'Eco Flex';
  setSelectedFlight: (flight: Flight, fareType?: 'Eco Value' | 'Eco Classic' | 'Eco Flex') => void;
  clearSelectedFlight: () => void;

  // Passengers
  passengers: Passenger[];
  addPassenger: (passenger: Passenger) => void;
  updatePassenger: (index: number, passenger: Passenger) => void;
  removePassenger: (index: number) => void;
  clearPassengers: () => void;

  // Contact information
  contactEmail: string;
  contactPhone: string;
  setContactInfo: (email: string, phone: string) => void;

  // Add-ons
  addOns: AddOns;
  setProtectionPlan: (plan: 'basic' | 'premium' | 'all' | undefined) => void;
  setAdditionalBaggage: (count: number) => void;
  updateAddOns: (addOns: Partial<AddOns>) => void;

  // Booking information
  booking: BookingResponse | null;
  setBooking: (booking: BookingResponse) => void;

  // Payment information
  paymentDetails: PaymentDetails | null;
  setPaymentDetails: (details: PaymentDetails) => void;

  // Workflow state
  currentStep: 'search' | 'booking' | 'payment' | 'confirmation';
  setCurrentStep: (step: 'search' | 'booking' | 'payment' | 'confirmation') => void;

  // Reset entire booking flow
  resetBooking: () => void;
}

const initialState = {
  searchParams: null,
  selectedFlight: null,
  selectedFareType: 'Eco Classic' as const,
  passengers: [],
  contactEmail: '',
  contactPhone: '',
  addOns: {
    protectionPlan: undefined,
    additionalBaggage: 0,
  },
  booking: null,
  paymentDetails: null,
  currentStep: 'search' as const,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      ...initialState,

      // Search params
      setSearchParams: (params) => set({ searchParams: params }),

      // Selected flight
      setSelectedFlight: (flight, fareType = 'Eco Classic') =>
        set({
          selectedFlight: flight,
          selectedFareType: fareType,
          currentStep: 'booking',
        }),

      clearSelectedFlight: () =>
        set({
          selectedFlight: null,
          selectedFareType: 'Eco Classic',
        }),

      // Passengers
      addPassenger: (passenger) =>
        set((state) => ({
          passengers: [...state.passengers, passenger],
        })),

      updatePassenger: (index, passenger) =>
        set((state) => ({
          passengers: state.passengers.map((p, i) => (i === index ? passenger : p)),
        })),

      removePassenger: (index) =>
        set((state) => ({
          passengers: state.passengers.filter((_, i) => i !== index),
        })),

      clearPassengers: () => set({ passengers: [] }),

      // Contact info
      setContactInfo: (email, phone) =>
        set({
          contactEmail: email,
          contactPhone: phone,
        }),

      // Add-ons
      setProtectionPlan: (plan) =>
        set((state) => ({
          addOns: { ...state.addOns, protectionPlan: plan },
        })),

      setAdditionalBaggage: (count) =>
        set((state) => ({
          addOns: { ...state.addOns, additionalBaggage: count },
        })),

      updateAddOns: (addOns) =>
        set((state) => ({
          addOns: { ...state.addOns, ...addOns },
        })),

      // Booking
      setBooking: (booking) =>
        set({
          booking,
          currentStep: 'payment',
        }),

      // Payment
      setPaymentDetails: (details) =>
        set({ paymentDetails: details }),

      // Workflow
      setCurrentStep: (step) => set({ currentStep: step }),

      // Reset
      resetBooking: () => set(initialState),
    }),
    {
      name: 'globehunters-booking-storage', // Storage key
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage instead of localStorage
      // Only persist certain fields
      partialize: (state) => ({
        searchParams: state.searchParams,
        selectedFlight: state.selectedFlight,
        selectedFareType: state.selectedFareType,
        passengers: state.passengers,
        contactEmail: state.contactEmail,
        contactPhone: state.contactPhone,
        addOns: state.addOns,
        booking: state.booking,
        currentStep: state.currentStep,
        // Don't persist payment details for security
      }),
    }
  )
);

/**
 * Selectors for commonly used derived state
 */
export const useSelectedFlight = () => useBookingStore((state) => state.selectedFlight);
export const usePassengers = () => useBookingStore((state) => state.passengers);
export const useAddOns = () => useBookingStore((state) => state.addOns);
export const useBooking = () => useBookingStore((state) => state.booking);
export const useCurrentStep = () => useBookingStore((state) => state.currentStep);
