"use client";

import { FilterSection } from "./FilterSection";
import { StopsFilter } from "./StopsFilter";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { TimeFilter } from "./TimeFilter";
import { JourneyTimeFilter } from "./JourneyTimeFilter";
import { AirportFilter } from "./AirportFilter";
import { AirlineFilter } from "./AirlineFilter";
import { ExtrasFilter } from "./ExtrasFilter";
import { FilterState } from "@/types/flight";
import { useTranslations } from "next-intl";

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
  showInboundLeg: boolean;
  journeyTimeBounds: {
    outbound: { min: number; max: number };
    inbound: { min: number; max: number };
  };
  /** Time bounds for departure and arrival filters */
  timeBounds?: {
    outboundDeparture?: { min: number; max: number };
    outboundArrival?: { min: number; max: number };
    inboundDeparture?: { min: number; max: number };
    inboundArrival?: { min: number; max: number };
  };
  /** Origin airport code (e.g., "DEL") */
  originAirport?: string;
  /** Destination airport code (e.g., "YYZ") */
  destinationAirport?: string;
  /** Full name of origin airport */
  originAirportName?: string;
  /** Full name of destination airport */
  destinationAirportName?: string;
  /** Count of flights for each stop category (0=direct, 1=one stop, 2=two+) */
  availableStops?: Record<number, number>;
  expandedFilters: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  onToggleStop: (stops: number) => void;
  onToggleAirline: (name: string) => void;
  onToggleAllAirlines: () => void;
  onToggleDepartureAirport: (code: string) => void;
  onToggleArrivalAirport: (code: string) => void;
  onUpdatePrice: (range: [number, number]) => void;
  onUpdateDepartureTime: (type: "outbound" | "inbound", range: [number, number]) => void;
  onUpdateArrivalTime: (type: "outbound" | "inbound", range: [number, number]) => void;
  onUpdateJourneyTime: (type: "outbound" | "inbound", range: [number, number]) => void;
  onTimeTypeChange: (type: "takeoff" | "landing") => void;
  onToggleExtra: (extra: string) => void;
  resultCount: number;
}

export function FilterSidebar({
  filterState,
  filters,
  showInboundLeg,
  journeyTimeBounds,
  timeBounds,
  originAirport,
  destinationAirport,
  originAirportName,
  destinationAirportName,
  availableStops,
  expandedFilters,
  onToggleExpand,
  onToggleStop,
  onToggleAirline,
  onToggleAllAirlines,
  onToggleDepartureAirport,
  onToggleArrivalAirport,
  onUpdatePrice,
  onUpdateDepartureTime,
  onUpdateArrivalTime,
  onUpdateJourneyTime,
  onTimeTypeChange,
  onToggleExtra,
  resultCount,
}: FilterSidebarProps) {
  const t = useTranslations('search.filters');
  
  return (
    <div className="w-full lg:w-72 flex flex-col gap-4">
      {/* Filter Header */}
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-[#010D50]">
          {t('filtersBy')}
        </span>
        <span className="text-xs text-[#3A478A]">
          {t('showing')} {resultCount} {t('results')}
        </span>
      </div>

      {/* Number of Stops */}
      <FilterSection
        title={t('numberOfStops')}
        isExpanded={expandedFilters.stops}
        onToggle={() => onToggleExpand("stops")}
      >
        <StopsFilter
          selectedStops={filterState.stops}
          onToggle={onToggleStop}
          availableStops={availableStops}
        />
      </FilterSection>

      {/* Price Filter */}
      <FilterSection
        title={t('price')}
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
        title={t('time')}
        isExpanded={expandedFilters.time}
        onToggle={() => onToggleExpand("time")}
      >
        <TimeFilter
          outboundTime={filterState.departureTimeOutbound}
          inboundTime={filterState.departureTimeInbound}
          outboundArrivalTime={filterState.arrivalTimeOutbound}
          inboundArrivalTime={filterState.arrivalTimeInbound}
          onOutboundChange={(range) =>
            onUpdateDepartureTime("outbound", range)
          }
          onInboundChange={(range) =>
            onUpdateDepartureTime("inbound", range)
          }
          onOutboundArrivalChange={(range) =>
            onUpdateArrivalTime("outbound", range)
          }
          onInboundArrivalChange={(range) =>
            onUpdateArrivalTime("inbound", range)
          }
          showInbound={showInboundLeg}
          outboundAirport={originAirport}
          inboundAirport={destinationAirport}
          outboundArrivalAirport={destinationAirport}
          inboundArrivalAirport={originAirport}
          outboundAirportName={originAirportName}
          inboundAirportName={destinationAirportName}
          outboundArrivalAirportName={destinationAirportName}
          inboundArrivalAirportName={originAirportName}
          timeType={filterState.timeFilterMode}
          onTimeTypeChange={onTimeTypeChange}
          timeBounds={timeBounds}
        />
      </FilterSection>

      {/* Journey Time Filter */}
      <FilterSection
        title={t('journeyTime')}
        isExpanded={expandedFilters.journey}
        onToggle={() => onToggleExpand("journey")}
      >
        <JourneyTimeFilter
          outboundDuration={filterState.journeyTimeOutbound}
          inboundDuration={filterState.journeyTimeInbound}
          onOutboundChange={(range) => onUpdateJourneyTime("outbound", range)}
          onInboundChange={(range) => onUpdateJourneyTime("inbound", range)}
          outboundMin={journeyTimeBounds.outbound.min}
          outboundMax={journeyTimeBounds.outbound.max}
          inboundMin={journeyTimeBounds.inbound.min}
          inboundMax={journeyTimeBounds.inbound.max}
          showInbound={showInboundLeg}
        />
      </FilterSection>

      {/* Departure Airport Filter */}
      <FilterSection
        title={t('departureAirport')}
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
        title={t('arrivalAirport')}
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
        title={t('airlines')}
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

      {/* Extras Filter */}
      <FilterSection
        title={t('extras')}
        isExpanded={expandedFilters.extras}
        onToggle={() => onToggleExpand("extras")}
      >
        <ExtrasFilter
          selectedExtras={filterState.extras}
          onToggle={onToggleExtra}
        />
      </FilterSection>
    </div>
  );
}
