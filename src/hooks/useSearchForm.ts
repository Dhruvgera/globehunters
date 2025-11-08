import { useState, useEffect } from "react";
import type { Airport } from "@/types/airport";
import { useBookingStore } from "@/store/bookingStore";

type TripType = "round-trip" | "one-way" | "multi-city";

interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

export function useSearchForm() {
  const searchParamsFromStore = useBookingStore((state) => state.searchParams);
  
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [from, setFrom] = useState<Airport | null>(null);
  const [to, setTo] = useState<Airport | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState<Passengers>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [travelClass, setTravelClass] = useState("Economy");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Sync with store on mount (for page refresh)
  useEffect(() => {
    if (searchParamsFromStore) {
      // Create Airport objects from codes (minimal info, will be enriched by autocomplete)
      if (searchParamsFromStore.from) {
        setFrom({ 
          code: searchParamsFromStore.from, 
          city: searchParamsFromStore.from, 
          country: '', 
          countryCode: '' 
        });
      }
      if (searchParamsFromStore.to) {
        setTo({ 
          code: searchParamsFromStore.to, 
          city: searchParamsFromStore.to, 
          country: '', 
          countryCode: '' 
        });
      }
      if (searchParamsFromStore.departureDate) {
        setDepartureDate(searchParamsFromStore.departureDate);
      }
      if (searchParamsFromStore.returnDate) {
        setReturnDate(searchParamsFromStore.returnDate);
      }
      if (searchParamsFromStore.passengers) {
        setPassengers(searchParamsFromStore.passengers);
      }
      if (searchParamsFromStore.class) {
        setTravelClass(searchParamsFromStore.class);
      }
      if (searchParamsFromStore.tripType) {
        setTripType(searchParamsFromStore.tripType as TripType);
      }
    }
  }, []); // Only on mount

  // Auto-close date picker when dates are selected
  useEffect(() => {
    if (
      tripType === "round-trip" &&
      returnDate &&
      departureDate &&
      isDatePickerOpen
    ) {
      setTimeout(() => setIsDatePickerOpen(false), 200);
    }
    if (
      (tripType === "one-way" || tripType === "multi-city") &&
      departureDate &&
      isDatePickerOpen
    ) {
      setTimeout(() => setIsDatePickerOpen(false), 200);
    }
  }, [returnDate, departureDate, tripType, isDatePickerOpen]);

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const getSearchParams = () => {
    return {
      from: from?.code || "",
      to: to?.code || "",
      departureDate: departureDate?.toISOString() || "",
      returnDate: returnDate?.toISOString() || "",
      adults: passengers.adults.toString(),
      children: passengers.children.toString(),
      infants: passengers.infants.toString(),
      class: travelClass,
      tripType,
    };
  };

  return {
    // State
    tripType,
    from,
    to,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    isDatePickerOpen,
    // Setters
    setTripType,
    setFrom,
    setTo,
    setDepartureDate,
    setReturnDate,
    setPassengers,
    setTravelClass,
    setIsDatePickerOpen,
    // Helpers
    swapLocations,
    getSearchParams,
  };
}
