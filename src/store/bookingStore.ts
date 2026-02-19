/**
 * Booking State Management Store (Zustand)
 * Manages global state for flight selection, booking, and payment flow
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { Flight, SearchParams } from '@/types/flight';
import { Passenger, AddOns, BookingResponse } from '@/types/booking';
import { PaymentDetails } from '@/types/payment';
import { PriceCheckResult, TransformedPriceOption } from '@/types/priceCheck';
import { normalizeCabinClass } from '@/lib/utils';
import type { Hotel } from '@/types/hotel';
import type { VyspaCityHotelLookupItem } from '@/types/vyspaHotels';
import type { HotelFiltersState } from '@/components/hotels/HotelFiltersSidebar';
import type {
  PackageSearchCriteria,
  PackageSearchResult,
  PackageResultsMeta,
  SelectedPackage,
  TransformedAlternateFlight,
  HolidayDestination,
} from '@/types/holidayPackage';

type Dateish = Date | string | number | null | undefined;

function reviveDate(value: Dateish): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value;

  // JSON.stringify(Date) -> ISO string, but be liberal in what we accept.
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Handle numeric timestamps stored as strings
    if (/^\d+$/.test(trimmed)) return new Date(Number(trimmed));
    return new Date(trimmed);
  }

  return undefined;
}

function reviveSearchParams(params: any): SearchParams {
  const dep = reviveDate(params?.departureDate) ?? new Date();
  const ret = reviveDate(params?.returnDate);

  const revived: SearchParams = {
    ...params,
    departureDate: dep,
    returnDate: ret,
  };

  if (Array.isArray(params?.segments)) {
    revived.segments = params.segments.map((seg: any) => ({
      ...seg,
      departureDate: reviveDate(seg?.departureDate) ?? dep,
    }));
  }

  return revived;
}

function isQuotaExceededError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }

  return false;
}

function buildPersistedStateFallbacks(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as { state?: Record<string, unknown> };
    const state = parsed?.state;

    if (!state || typeof state !== 'object') return [];

    const createFallback = (mutate: (draft: Record<string, unknown>) => void): string => {
      const draft = { ...state };
      mutate(draft);
      return JSON.stringify({ ...parsed, state: draft });
    };

    const fallbackValues = [
      createFallback((draft) => {
        draft.hotelResultsCache = null;
        draft.hotelResultsMeta = {};
        draft.hotelDetailsCache = {};
        draft.packageResults = null;
        draft.packageResultsMeta = null;
        draft.alternateFlights = null;
      }),
      createFallback((draft) => {
        draft.hotelResultsCache = null;
        draft.hotelResultsMeta = {};
        draft.hotelDetailsCache = {};
        draft.packageResults = null;
        draft.packageResultsMeta = null;
        draft.alternateFlights = null;
        draft.selectedFlight = null;
        draft.selectedUpgradeOption = null;
        draft.priceCheckData = null;
      }),
      createFallback((draft) => {
        draft.hotelSearch = null;
        draft.hotelLocationSelection = null;
        draft.hotelResultsCache = null;
        draft.hotelFiltersCache = null;
        draft.hotelResultsMeta = {};
        draft.selectedHotel = null;
        draft.selectedHotelRoomIds = [];
        draft.hotelDetailsCache = {};
        draft.selectedHotelRoomSummary = null;
        draft.packageSearch = null;
        draft.packageDestination = null;
        draft.packageResults = null;
        draft.packageResultsMeta = null;
        draft.selectedPackage = null;
        draft.selectedPackageRoomIds = [];
        draft.alternateFlights = null;
        draft.selectedFlight = null;
        draft.selectedUpgradeOption = null;
        draft.priceCheckData = null;
        draft.booking = null;
        draft.vyspaFolderNumber = null;
        draft.vyspaCustomerId = null;
        draft.vyspaEmailAddress = null;
        draft.searchRequestId = null;
        draft.currentStep = 'search';
      }),
    ];

    return [...new Set(fallbackValues)].filter((fallback) => fallback !== value);
  } catch {
    return [];
  }
}

function createQuotaSafeStateStorage(storage: Storage): StateStorage {
  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      try {
        storage.setItem(name, value);
        return;
      } catch (error) {
        if (!isQuotaExceededError(error)) throw error;
      }

      for (const fallbackValue of buildPersistedStateFallbacks(value)) {
        try {
          storage.setItem(name, fallbackValue);
          return;
        } catch (error) {
          if (!isQuotaExceededError(error)) throw error;
        }
      }

      storage.removeItem(name);
    },
    removeItem: (name) => storage.removeItem(name),
  };
}

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

  // Hotels (Vyspa) search state
  hotelSearch: {
    provider?: 'vyspa' | 'hotelbeds';
    location: string;
    hidden_id: string;
    hidden_key: string;
    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD
    rooms: number;
    adults: number;
    children: number;
    branches?: string;
    searchCriteriaId?: number | string;
    arrivalPointCode?: string;
  } | null;
  setHotelSearch: (search: BookingState['hotelSearch']) => void;
  clearHotelSearch: () => void;

  // Persisted hotel location selection (for SearchBar hydration like flights)
  hotelLocationSelection: VyspaCityHotelLookupItem | null;
  setHotelLocationSelection: (item: VyspaCityHotelLookupItem | null) => void;

  // Cache the latest hotel results so back-navigation doesn't look empty
  hotelResultsCache: {
    queryKey: string;
    hotels: Hotel[];
    selectedHotelId?: string;
    selectedHotelKey?: string;
    /** Timestamp when results were fetched - used to invalidate stale cache */
    fetchedAt?: number;
  } | null;
  setHotelResultsCache: (cache: BookingState['hotelResultsCache']) => void;
  clearHotelResultsCache: () => void;

  // Cache the latest hotel filters per search query (so back-navigation doesn't reset the UI)
  hotelFiltersCache: {
    queryKey: string;
    filters: HotelFiltersState;
  } | null;
  setHotelFiltersCache: (cache: BookingState['hotelFiltersCache']) => void;
  clearHotelFiltersCache: () => void;

  // Mapping from hotelId to metadata needed for booking
  hotelResultsMeta: Record<
    string,
    {
      hotelId: string;
      hotelName?: string;
      provider?: 'vyspa' | 'hotelbeds';
      searchCriteriaId?: number | string;
      searchResultId?: string; // used as ApiAddToFolder.search_result_id when available
      srId?: string; // some responses call this srId
      vyspaHotelId?: string;
      vMapId?: string;
      imageName?: string;
      address1?: string;
      address2?: string;
      hotelRating?: number;
      rawSearchResult?: unknown;
    }
  >;
  setHotelResultsMeta: (meta: BookingState['hotelResultsMeta']) => void;
  clearHotelResultsMeta: () => void;

  selectedHotel: { hotelId: string; hotelName?: string } | null;
  setSelectedHotel: (hotel: BookingState['selectedHotel']) => void;
  selectedHotelRoomIds: string[];
  setSelectedHotelRoomIds: (roomIds: string[]) => void;

  // Cached hotel details (so back navigation doesn't flash mock content)
  hotelDetailsCache: Record<
    string,
    {
      hotelId: string;
      hotelName?: string;
      hotelRating?: number;
      mainImage?: string;
      address?: string;
      galleryImages?: string[];
      rooms?: any[];
      detailsText?: string;
      cancellationText?: string;
      amenities?: string[];
      fetchedAt: number;
    }
  >;
  setHotelDetailsCache: (hotelId: string, data: BookingState['hotelDetailsCache'][string]) => void;

  // Selected room summary for checkout display
  selectedHotelRoomSummary: {
    hotelId: string;
    roomId: string;
    roomName?: string;
    mealName?: string;
    isRefundable?: boolean;
    currency?: string;
    total?: number;
    nightly?: number;
    hotelbedsRateKey?: string;
  } | null;
  setSelectedHotelRoomSummary: (summary: BookingState['selectedHotelRoomSummary']) => void;

  // Holiday Package state
  packageSearch: PackageSearchCriteria | null;
  setPackageSearch: (search: PackageSearchCriteria | null) => void;
  packageDestination: HolidayDestination | null;
  setPackageDestination: (destination: HolidayDestination | null) => void;
  packageResults: PackageSearchResult[] | null;
  packageResultsMeta: PackageResultsMeta | null;
  setPackageResults: (results: PackageSearchResult[], meta: PackageResultsMeta) => void;
  clearPackageResults: () => void;
  selectedPackage: SelectedPackage | null;
  setSelectedPackage: (pkg: SelectedPackage | null) => void;
  selectedPackageRoomIds: string[];
  setSelectedPackageRoomIds: (roomIds: string[]) => void;
  alternateFlights: TransformedAlternateFlight[] | null;
  setAlternateFlights: (flights: TransformedAlternateFlight[] | null) => void;
  clearPackageState: () => void;

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
  hotelSearch: null,
  hotelLocationSelection: null,
  hotelResultsCache: null,
  hotelFiltersCache: null,
  hotelResultsMeta: {},
  selectedHotel: null,
  selectedHotelRoomIds: [],
  hotelDetailsCache: {},
  selectedHotelRoomSummary: null,
  // Package state
  packageSearch: null,
  packageDestination: null,
  packageResults: null,
  packageResultsMeta: null,
  selectedPackage: null,
  selectedPackageRoomIds: [] as string[],
  alternateFlights: null,
  // End package state
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
      setSearchParams: (params) => set({
        searchParams: reviveSearchParams(params),
        vyspaFolderNumber: null,
        vyspaCustomerId: null,
        vyspaEmailAddress: null,
        searchRequestId: null,
      }),

      // Hotels (Vyspa) search
      setHotelSearch: (search) => set({
        hotelSearch: search,
        vyspaFolderNumber: null,
        vyspaCustomerId: null,
        vyspaEmailAddress: null,
      }),
      clearHotelSearch: () =>
        set({
          hotelSearch: null,
          hotelLocationSelection: null,
          hotelResultsCache: null,
          hotelFiltersCache: null,
          hotelResultsMeta: {},
          selectedHotel: null,
          selectedHotelRoomIds: [],
        }),
      setHotelLocationSelection: (item) => set({ hotelLocationSelection: item }),
      setHotelResultsCache: (cache) => set({ hotelResultsCache: cache }),
      clearHotelResultsCache: () => set({ hotelResultsCache: null }),
      setHotelFiltersCache: (cache) => set({ hotelFiltersCache: cache }),
      clearHotelFiltersCache: () => set({ hotelFiltersCache: null }),
      setHotelResultsMeta: (meta) => set({ hotelResultsMeta: meta }),
      clearHotelResultsMeta: () => set({ hotelResultsMeta: {} }),
      setSelectedHotel: (hotel) => set({
        selectedHotel: hotel,
        // Reset folder info when picking a new hotel
        vyspaFolderNumber: null,
        vyspaCustomerId: null,
        vyspaEmailAddress: null,
      }),
      setSelectedHotelRoomIds: (roomIds) => set({
        selectedHotelRoomIds: roomIds,
        // Reset folder info when changing rooms
        vyspaFolderNumber: null,
        vyspaCustomerId: null,
        vyspaEmailAddress: null,
      }),
      setHotelDetailsCache: (hotelId, data) =>
        set((state) => ({
          hotelDetailsCache: {
            ...state.hotelDetailsCache,
            [hotelId]: data,
          },
        })),
      setSelectedHotelRoomSummary: (summary) => set({ selectedHotelRoomSummary: summary }),

      // Holiday Package state
      setPackageSearch: (search) =>
        set({
          packageSearch: search,
          // Clear folder info when starting a new package search
          vyspaFolderNumber: null,
          vyspaCustomerId: null,
          vyspaEmailAddress: null,
        }),

      setPackageDestination: (destination) => set({ packageDestination: destination }),

      setPackageResults: (results, meta) =>
        set({
          packageResults: results,
          packageResultsMeta: meta,
        }),

      clearPackageResults: () =>
        set({
          packageResults: null,
          packageResultsMeta: null,
        }),

      setSelectedPackage: (pkg) =>
        set({
          selectedPackage: pkg,
          // Clear folder info when selecting a new package
          vyspaFolderNumber: null,
          vyspaCustomerId: null,
          vyspaEmailAddress: null,
        }),

      setSelectedPackageRoomIds: (roomIds) =>
        set({
          selectedPackageRoomIds: roomIds,
          // Clear folder info when changing rooms
          vyspaFolderNumber: null,
          vyspaCustomerId: null,
          vyspaEmailAddress: null,
        }),

      setAlternateFlights: (flights) => set({ alternateFlights: flights }),

      clearPackageState: () =>
        set({
          packageSearch: null,
          packageDestination: null,
          packageResults: null,
          packageResultsMeta: null,
          selectedPackage: null,
          selectedPackageRoomIds: [],
          alternateFlights: null,
        }),

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
          // Reset folder info when picking a new flight
          vyspaFolderNumber: null,
          vyspaCustomerId: null,
          vyspaEmailAddress: null,
        }),

      setSelectedUpgrade: (option) =>
        set({
          selectedUpgradeOption: option,
          // Preserve the raw fare/cabin label so UI can display the selected brand (e.g. "Economy Flex")
          selectedFareType: option.cabinClassDisplay || option.cabinName || 'Economy',
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
          // Also clear any hotel selection when starting a new booking
          selectedHotel: null,
          selectedHotelRoomIds: [],
          selectedHotelRoomSummary: null,
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
          // Clear package state
          packageResults: null,
          packageResultsMeta: null,
          selectedPackage: null,
          selectedPackageRoomIds: [],
          alternateFlights: null,
          // Preserve these
          affiliateData: state.affiliateData,
          isFromDeeplink: state.isFromDeeplink,
          searchParams: state.searchParams,
          packageSearch: state.packageSearch,
          packageDestination: state.packageDestination,
          // searchRequestId: state.searchRequestId, // Removed to clear it
        })),
    }),
    {
      name: 'globehunters-booking-storage', // Storage key
      storage: createJSONStorage(() => createQuotaSafeStateStorage(sessionStorage)), // Use sessionStorage instead of localStorage
      // Only persist certain fields
      partialize: (state) => ({
        // Remove heavy raw payloads before persisting to avoid storage quota issues.
        hotelResultsCache: state.hotelResultsCache
          ? {
            ...state.hotelResultsCache,
            hotels: state.hotelResultsCache.hotels.map((hotel) => ({
              ...hotel,
              rawSearchResult: undefined,
            })),
          }
          : null,
        hotelResultsMeta: Object.fromEntries(
          Object.entries(state.hotelResultsMeta).map(([hotelId, meta]) => [
            hotelId,
            {
              ...meta,
              rawSearchResult: undefined,
            },
          ])
        ),
        hotelDetailsCache: Object.fromEntries(
          Object.entries(state.hotelDetailsCache).map(([hotelId, details]) => [
            hotelId,
            {
              ...details,
              rooms: Array.isArray(details.rooms)
                ? details.rooms.map((room) => {
                  if (!room || typeof room !== 'object') return room;
                  const persistedRoom = { ...(room as Record<string, unknown>) };
                  delete persistedRoom._raw;
                  return persistedRoom;
                })
                : details.rooms,
            },
          ])
        ),
        searchParams: state.searchParams,
        // Hotels: persist so back navigation and refresh behave like flight journey
        hotelSearch: state.hotelSearch,
        hotelLocationSelection: state.hotelLocationSelection,
        hotelFiltersCache: state.hotelFiltersCache,
        selectedHotel: state.selectedHotel,
        selectedHotelRoomIds: state.selectedHotelRoomIds,
        selectedHotelRoomSummary: state.selectedHotelRoomSummary,
        // Packages: persist for back navigation and refresh
        packageSearch: state.packageSearch,
        packageDestination: state.packageDestination,
        packageResults: state.packageResults,
        packageResultsMeta: state.packageResultsMeta,
        selectedPackage: state.selectedPackage,
        selectedPackageRoomIds: state.selectedPackageRoomIds,
        alternateFlights: state.alternateFlights,
        // End packages
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
        // Revive Date objects from persisted JSON (Dates are stored as strings)
        if (state?.searchParams) {
          state.setSearchParams(state.searchParams as any);
        }
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

// Package selectors
export const usePackageSearch = () => useBookingStore((state) => state.packageSearch);
export const usePackageDestination = () => useBookingStore((state) => state.packageDestination);
export const usePackageResults = () => useBookingStore((state) => state.packageResults);
export const usePackageResultsMeta = () => useBookingStore((state) => state.packageResultsMeta);
export const useSelectedPackage = () => useBookingStore((state) => state.selectedPackage);
export const useSelectedPackageRoomIds = () => useBookingStore((state) => state.selectedPackageRoomIds);
export const useAlternateFlights = () => useBookingStore((state) => state.alternateFlights);
