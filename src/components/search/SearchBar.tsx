"use client";

import { useRouter } from "next/navigation";
import { useSearchForm } from "@/hooks/useSearchForm";
import { TripTypeSelector } from "./search-bar/TripTypeSelector";
import { PassengersSelector } from "./search-bar/PassengersSelector";
import { AirportAutocomplete } from "./search-bar/AirportAutocomplete";
import { SwapLocationsButton } from "./search-bar/SwapLocationsButton";
import { DateSelector } from "./search-bar/DateSelector";
import { SearchButton } from "./search-bar/SearchButton";

interface SearchBarProps {
  compact?: boolean;
}

export default function SearchBar({ compact = false }: SearchBarProps) {
  const router = useRouter();
  const {
    tripType,
    from,
    to,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    isDatePickerOpen,
    setTripType,
    setFrom,
    setTo,
    setDepartureDate,
    setReturnDate,
    setPassengers,
    setTravelClass,
    setIsDatePickerOpen,
    swapLocations,
    getSearchParams,
  } = useSearchForm();

  // Validation: Check if all required fields are filled
  const isSearchValid = () => {
    return (
      from !== null &&         // Origin selected
      to !== null &&           // Destination selected
      departureDate !== undefined && // Departure date selected
      (tripType === 'one-way' || returnDate !== undefined) // Return date if round-trip
    );
  };

  const handleSearch = () => {
    if (!isSearchValid()) {
      return; // Don't search if validation fails
    }
    const params = new URLSearchParams(getSearchParams());
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div
      className={`w-full bg-white rounded-[24px] ${
        compact ? "p-3 shadow-sm" : "p-5 border border-[#DFE0E4] shadow-md"
      }`}
    >
      {/* Top Row - Trip Type and Passengers */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4">
        <TripTypeSelector tripType={tripType} onTripTypeChange={setTripType} />
        <PassengersSelector
          passengers={passengers}
          travelClass={travelClass}
          onPassengersChange={setPassengers}
          onTravelClassChange={setTravelClass}
        />
      </div>

      {/* Main Search Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <AirportAutocomplete value={from} onChange={setFrom} />
        <SwapLocationsButton onSwap={swapLocations} />
        <AirportAutocomplete value={to} onChange={setTo} />
        <DateSelector
          tripType={tripType}
          departureDate={departureDate}
          returnDate={returnDate}
          onDepartureDateChange={setDepartureDate}
          onReturnDateChange={setReturnDate}
          isOpen={isDatePickerOpen}
          onOpenChange={setIsDatePickerOpen}
        />
        <SearchButton onClick={handleSearch} disabled={!isSearchValid()} />
      </div>
    </div>
  );
}
