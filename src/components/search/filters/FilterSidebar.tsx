"use client";

import { FilterSection } from "./FilterSection";
import { StopsFilter } from "./StopsFilter";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { TimeFilter } from "./TimeFilter";
import { JourneyTimeFilter } from "./JourneyTimeFilter";
import { AirportFilter } from "./AirportFilter";
import { AirlineFilter } from "./AirlineFilter";
import { FilterState } from "@/types/flight";

interface Airport {
  code: string;
  name: string;
  minPrice: number;
}

interface Airline {
  code: string;
  name: string;
  minPrice: number;
}

interface AvailableFilters {
  airlines: Airline[];
  departureAirports: Airport[];
  arrivalAirports: Airport[];
  minPrice: number;
  maxPrice: number;
}

interface FilterSidebarProps {
  filterState: FilterState;
  filters: AvailableFilters;
  expandedFilters: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  onToggleStop: (stops: number) => void;
  onToggleAirline: (name: string) => void;
  onToggleAllAirlines: () => void;
  onToggleDepartureAirport: (code: string) => void;
  onToggleArrivalAirport: (code: string) => void;
  onUpdatePrice: (range: [number, number]) => void;
  onUpdateDepartureTime: (type: "outbound" | "inbound", range: [number, number]) => void;
  onUpdateJourneyTime: (type: "outbound" | "inbound", range: [number, number]) => void;
  resultCount: number;
}

export function FilterSidebar({
  filterState,
  filters,
  expandedFilters,
  onToggleExpand,
  onToggleStop,
  onToggleAirline,
  onToggleAllAirlines,
  onToggleDepartureAirport,
  onToggleArrivalAirport,
  onUpdatePrice,
  onUpdateDepartureTime,
  onUpdateJourneyTime,
  resultCount,
}: FilterSidebarProps) {
  return (
    <div className="w-full lg:w-72 flex flex-col gap-4">
      {/* Filter Header */}
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-[#010D50]">
          Filters By
        </span>
        <span className="text-xs text-[#3A478A]">
          Showing {resultCount} results
        </span>
      </div>

      {/* Number of Stops */}
      <FilterSection
        title="Number of Stops"
        isExpanded={expandedFilters.stops}
        onToggle={() => onToggleExpand("stops")}
      >
        <StopsFilter
          selectedStops={filterState.stops}
          onToggle={onToggleStop}
        />
      </FilterSection>

      {/* Price Filter */}
      <FilterSection
        title="Price"
        isExpanded={expandedFilters.price}
        onToggle={() => onToggleExpand("price")}
      >
        <PriceRangeFilter
          priceRange={filterState.priceRange}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onPriceChange={onUpdatePrice}
        />
      </FilterSection>

      {/* Time Filter */}
      <FilterSection
        title="Time"
        isExpanded={expandedFilters.time}
        onToggle={() => onToggleExpand("time")}
      >
        <TimeFilter
          outboundTime={filterState.departureTimeOutbound}
          inboundTime={filterState.departureTimeInbound}
          onOutboundChange={(range) =>
            onUpdateDepartureTime("outbound", range)
          }
          onInboundChange={(range) =>
            onUpdateDepartureTime("inbound", range)
          }
        />
      </FilterSection>

      {/* Journey Time Filter */}
      <FilterSection
        title="Journey Time"
        isExpanded={expandedFilters.journey}
        onToggle={() => onToggleExpand("journey")}
      >
        <JourneyTimeFilter
          outboundDuration={filterState.journeyTimeOutbound}
          inboundDuration={filterState.journeyTimeInbound}
          onOutboundChange={(range) => onUpdateJourneyTime("outbound", range)}
          onInboundChange={(range) => onUpdateJourneyTime("inbound", range)}
        />
      </FilterSection>

      {/* Departure Airport Filter */}
      <FilterSection
        title="Departure Airport"
        isExpanded={expandedFilters.departure}
        onToggle={() => onToggleExpand("departure")}
      >
        <AirportFilter
          type="departure"
          airports={filters.departureAirports}
          selectedAirports={filterState.departureAirports}
          onToggle={onToggleDepartureAirport}
        />
      </FilterSection>

      {/* Arrival Airport Filter */}
      <FilterSection
        title="Arrival Airport"
        isExpanded={expandedFilters.arrival}
        onToggle={() => onToggleExpand("arrival")}
      >
        <AirportFilter
          type="arrival"
          airports={filters.arrivalAirports}
          selectedAirports={filterState.arrivalAirports}
          onToggle={onToggleArrivalAirport}
        />
      </FilterSection>

      {/* Airlines Filter */}
      <FilterSection
        title="Airlines"
        isExpanded={expandedFilters.airlines}
        onToggle={() => onToggleExpand("airlines")}
      >
        <AirlineFilter
          airlines={filters.airlines}
          selectedAirlines={filterState.airlines}
          onToggle={onToggleAirline}
          onToggleAll={onToggleAllAirlines}
        />
      </FilterSection>
    </div>
  );
}
