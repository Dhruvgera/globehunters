"use client";

import { Flight } from "@/types/flight";
import FlightCard from "@/components/flights/FlightCard";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface FlightsListProps {
  flights: Flight[];
  displayCount?: number;
  onLoadMore?: () => void;
  onSelect?: (flight: Flight) => void;
  isPackageMode?: boolean;
  currency?: string;
}

export function FlightsList({
  flights,
  displayCount,
  onLoadMore,
  onSelect,
  isPackageMode = false,
  currency = "£",
}: FlightsListProps) {
  const t = useTranslations('search.flights');
  const displayedFlights = displayCount ? flights.slice(0, displayCount) : flights;
  const hasMore = displayCount ? displayCount < flights.length : false;

  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      {displayedFlights.map((flight) => (
        <FlightCard 
          key={flight.id} 
          flight={flight} 
          onSelect={onSelect ? () => onSelect(flight) : undefined}
          isPackageMode={isPackageMode}
        />
      ))}

      {/* Show More Results Button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="bg-white hover:bg-[#F5F7FF] text-[#3754ED] border-[#3754ED] rounded-full px-8 py-2 h-auto text-sm font-medium"
          >
            {t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
