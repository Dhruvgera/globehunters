"use client";

import { useRouter } from "next/navigation";
import { useSearchForm } from "@/hooks/useSearchForm";
import { TripTypeSelector } from "./search-bar/TripTypeSelector";
import { PassengersSelector } from "./search-bar/PassengersSelector";
import { AirportAutocomplete } from "./search-bar/AirportAutocomplete";
import { SwapLocationsButton } from "./search-bar/SwapLocationsButton";
import { DateSelector } from "./search-bar/DateSelector";
import { SearchButton } from "./search-bar/SearchButton";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

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
    multiCitySegments,
    setTripType,
    setFrom,
    setTo,
    setDepartureDate,
    setReturnDate,
    setPassengers,
    setTravelClass,
    setIsDatePickerOpen,
    swapLocations,
    addMultiCitySegment,
    removeMultiCitySegment,
    updateMultiCitySegment,
    getSearchParams,
  } = useSearchForm();

  // Validation: Check if all required fields are filled
  const isSearchValid = () => {
    if (tripType === "multi-city") {
      const filledSegments = multiCitySegments.filter(
        (seg) => seg.from && seg.to && seg.departureDate
      );
      if (filledSegments.length < 2) return false;
      return filledSegments.every(
        (seg) => seg.from && seg.to && seg.departureDate
      );
    }
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
      {tripType !== "multi-city" ? (
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
      ) : (
        <div className="flex flex-col gap-3">
          {multiCitySegments.map((segment, index) => (
            <div
              key={index}
              className="flex flex-col md:flex-row items-stretch md:items-center gap-3"
            >
              <AirportAutocomplete
                value={segment.from}
                onChange={(airport) =>
                  updateMultiCitySegment(index, { from: airport })
                }
              />
              <AirportAutocomplete
                value={segment.to}
                onChange={(airport) =>
                  updateMultiCitySegment(index, { to: airport })
                }
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 flex-1 border-[#D3D3D3] rounded-xl px-3 py-2.5 h-auto justify-start hover:bg-transparent hover:border-[#D3D3D3]"
                  >
                    <Calendar className="w-5 h-5 text-[#010D50]" />
                    <span className="text-sm font-medium text-[#010D50]">
                      {segment.departureDate
                        ? format(segment.departureDate, "EEE, dd MMM yyyy")
                        : "Select date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-white border shadow-lg max-w-[calc(100vw-16px)]"
                  align="start"
                >
                  <DatePicker
                    startDate={segment.departureDate}
                    onStartDateChange={(date) =>
                      updateMultiCitySegment(index, { departureDate: date })
                    }
                    onDone={() => {
                      // Popover will close automatically on outside click; no-op here
                    }}
                  />
                </PopoverContent>
              </Popover>
              {multiCitySegments.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="md:w-10 md:h-10 w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeMultiCitySegment(index)}
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Remove segment</span>
                </Button>
              )}
            </div>
          ))}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-center border-dashed"
              onClick={addMultiCitySegment}
              disabled={multiCitySegments.length >= 6}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add flight
            </Button>
            <SearchButton onClick={handleSearch} disabled={!isSearchValid()} />
          </div>
        </div>
      )}
    </div>
  );
}
