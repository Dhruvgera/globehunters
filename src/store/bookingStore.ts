/**
 * Booking State Management Store (Zustand)
 * Manages global state for flight selection, booking, and payment flow
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Flight, SearchParams } from '@/types/flight';
import { Passenger, AddOns, BookingResponse } from '@/types/booking';
import { PaymentDetails } from '@/types/payment';
import { PriceCheckResult, TransformedPriceOption } from '@/types/priceCheck';
import { normalizeCabinClass } from '@/lib/utils';

interface AffiliateData {
  code: string;
  id?: number;
  name?: string;
  phone?: string;
  // UTM tracking data from meta channel deeplinks
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  cnc?: string;
}

interface BookingState {
  // Search state
  searchParams: SearchParams | null;
  setSearchParams: (params: SearchParams) => void;

  // Affiliate data
  affiliateData: AffiliateData | null;
  setAffiliateData: (data: AffiliateData | null) => void;

  // Deeplink tracking (for meta channel URLs from Skyscanner, etc.)
  isFromDeeplink: boolean;
  setIsFromDeeplink: (isDeeplink: boolean) => void;

  // Selected flight
  selectedFlight: Flight | null;
  selectedFareType: string;
  selectedUpgradeOption: TransformedPriceOption | null;
  priceCheckData: PriceCheckResult | null;
  setSelectedFlight: (flight: Flight, fareType?: string) => void;
  setSelectedUpgrade: (option: TransformedPriceOption) => void;
  setPriceCheckData: (data: PriceCheckResult | null) => void;
  clearSelectedFlight: () => void;

  // Passengers
  passengers: Passenger[];
  addPassenger: (passenger: Passenger) => void;
  updatePassenger: (index: number, passenger: Passenger) => void;
  removePassenger: (index: number) => void;
  clearPassengers: () => void;
  passengersSaved: boolean;
  setPassengersSaved: (saved: boolean) => void;

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

  // Vyspa itinerary/folder information
  vyspaFolderNumber: string | null;
  vyspaCustomerId: number | null;
  vyspaEmailAddress: string | null;
  setVyspaFolderInfo: (info: { folderNumber: string; customerId?: number | null; emailAddress?: string | null }) => void;

  // Search request ID (used as web ref until folder is created)
  searchRequestId: string | null;
  setSearchRequestId: (requestId: string | null) => void;

  // Payment information
  paymentDetails: PaymentDetails | null;
  setPaymentDetails: (details: PaymentDetails) => void;

  // Workflow state
  currentStep: 'search' | 'booking' | 'payment' | 'confirmation';
  setCurrentStep: (step: 'search' | 'booking' | 'payment' | 'confirmation') => void;

  // Reset entire booking flow
  resetBooking: () => void;

  // Clear booking data when starting a new search (preserves affiliate data)
  clearForNewSearch: () => void;
}

const initialState = {
  searchParams: null,
  affiliateData: null,
  isFromDeeplink: false,
  selectedFlight: null,
  selectedFareType: 'Economy',
  selectedUpgradeOption: null,
  priceCheckData: null,
  passengers: [],
  passengersSaved: false,
  contactEmail: '',
  contactPhone: '',
  addOns: {
    protectionPlan: undefined,
    additionalBaggage: 0,
  },
  booking: null,
  paymentDetails: null,
  vyspaFolderNumber: null,
  vyspaCustomerId: null,
  vyspaEmailAddress: null,
  searchRequestId: null,
  currentStep: 'search' as const,
};

// Track hydration status
interface HydrationState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useBookingStore = create<BookingState & HydrationState>()(
  persist(
    (set) => ({
      ...initialState,

      // Hydration tracking
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // Search params
      setSearchParams: (params) => set({ searchParams: params }),

      // Affiliate data
      setAffiliateData: (data) => set({ affiliateData: data }),

      // Deeplink tracking
      setIsFromDeeplink: (isDeeplink) => set({ isFromDeeplink: isDeeplink }),

      // Selected flight
      setSelectedFlight: (flight, fareType = 'Economy') =>
        set({
          selectedFlight: flight,
          selectedFareType: fareType,
          currentStep: 'booking',
        }),

      setSelectedUpgrade: (option) =>
        set({
          selectedUpgradeOption: option,
          selectedFareType: normalizeCabinClass(option.cabinClassDisplay),
        }),

      setPriceCheckData: (data) =>
        set({ priceCheckData: data }),

      clearSelectedFlight: () =>
        set({
          selectedFlight: null,
          selectedFareType: 'Economy',
          selectedUpgradeOption: null,
          priceCheckData: null,
          vyspaFolderNumber: null,
          vyspaCustomerId: null,
          vyspaEmailAddress: null,
          searchRequestId: null,
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

      setPassengersSaved: (saved) =>
        set({ passengersSaved: saved }),

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

      // Vyspa folder info
      setVyspaFolderInfo: (info) =>
        set({
          vyspaFolderNumber: info.folderNumber,
          vyspaCustomerId: info.customerId ?? null,
          vyspaEmailAddress: info.emailAddress ?? null,
        }),

      // Search request ID (web ref before folder creation)
      setSearchRequestId: (requestId) =>
        set({ searchRequestId: requestId }),

      // Payment
      setPaymentDetails: (details) =>
        set({ paymentDetails: details }),

      // Workflow
      setCurrentStep: (step) => set({ currentStep: step }),

      // Reset
      resetBooking: () => set(initialState),

      // Clear booking data when starting a new search (preserves affiliate data, search params, and searchRequestId)
      clearForNewSearch: () =>
        set((state) => ({
          selectedFlight: null,
          selectedFareType: 'Economy',
          selectedUpgradeOption: null,
          priceCheckData: null,
          vyspaFolderNumber: null,
          vyspaCustomerId: null,
          vyspaEmailAddress: null,
          // Clear searchRequestId to ensure new searches generate fresh results
          // (Unless we want to restore specifically, but usually a new search means new ID)
          // However, the previous implementation comment said "Note: searchRequestId is NOT cleared"
          // We need to clear it so that we don't accidentally use an old ID for a new search with changed params
          searchRequestId: null,
          passengers: [],
          passengersSaved: false,
          contactEmail: '',
          contactPhone: '',
          addOns: {
            protectionPlan: undefined,
            additionalBaggage: 0,
          },
          booking: null,
          currentStep: 'search',
          // Preserve these
          affiliateData: state.affiliateData,
          isFromDeeplink: state.isFromDeeplink,
          searchParams: state.searchParams,
          // searchRequestId: state.searchRequestId, // Removed to clear it
        })),
    }),
    {
      name: 'globehunters-booking-storage', // Storage key
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage instead of localStorage
      // Only persist certain fields
      partialize: (state) => ({
        searchParams: state.searchParams,
        affiliateData: state.affiliateData,
        isFromDeeplink: state.isFromDeeplink,
        selectedFlight: state.selectedFlight,
        selectedFareType: state.selectedFareType,
        selectedUpgradeOption: state.selectedUpgradeOption,
        priceCheckData: state.priceCheckData,
        passengers: state.passengers,
        passengersSaved: state.passengersSaved,
        contactEmail: state.contactEmail,
        contactPhone: state.contactPhone,
        addOns: state.addOns,
        booking: state.booking,
        vyspaFolderNumber: state.vyspaFolderNumber,
        vyspaCustomerId: state.vyspaCustomerId,
        vyspaEmailAddress: state.vyspaEmailAddress,
        searchRequestId: state.searchRequestId,
        currentStep: state.currentStep,
        // Don't persist payment details for security
      }),
      // Set hydration state when store is rehydrated
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Hook to check if store has been hydrated from storage
 */
export const useStoreHydration = () => useBookingStore((state) => state._hasHydrated);

/**
 * Selectors for commonly used derived state
 */
export const useSelectedFlight = () => useBookingStore((state) => state.selectedFlight);
export const useSelectedUpgrade = () => useBookingStore((state) => state.selectedUpgradeOption);
export const usePriceCheckData = () => useBookingStore((state) => state.priceCheckData);
export const usePassengers = () => useBookingStore((state) => state.passengers);
export const useAddOns = () => useBookingStore((state) => state.addOns);
export const useBooking = () => useBookingStore((state) => state.booking);
export const useCurrentStep = () => useBookingStore((state) => state.currentStep);
export const useAffiliateData = () => useBookingStore((state) => state.affiliateData);
export const useIsFromDeeplink = () => useBookingStore((state) => state.isFromDeeplink);
