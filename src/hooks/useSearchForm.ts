import { useState, useEffect } from "react";

type TripType = "round-trip" | "one-way" | "multi-city";

interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

export function useSearchForm() {
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState<Passengers>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [travelClass, setTravelClass] = useState("Economy");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

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
      from,
      to,
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
