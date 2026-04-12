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

export interface FilterContentProps {
  filterState: FilterState;
  filters: AvailableFilters;
  showInboundLeg: boolean;
  journeyTimeBounds: {
    outbound: { min: number; max: number };
    inbound: { min: number; max: number };
  };
  timeBounds?: {
    outboundDeparture?: { min: number; max: number };
    outboundArrival?: { min: number; max: number };
    inboundDeparture?: { min: number; max: number };
    inboundArrival?: { min: number; max: number };
  };
  originAirport?: string;
  destinationAirport?: string;
  originAirportName?: string;
  destinationAirportName?: string;
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
}

export function FilterContent({
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
}: FilterContentProps) {
  const t = useTranslations('search.filters');

  return (
    <>
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
    </>
  );
}
