"use client";

import { Flight } from "@/types/flight";
import FlightCard from "@/components/flights/FlightCard";
import { Button } from "@/components/ui/button";

interface FlightsListProps {
  flights: Flight[];
  displayCount: number;
  onLoadMore: () => void;
}

export function FlightsList({
  flights,
  displayCount,
  onLoadMore,
}: FlightsListProps) {
  const displayedFlights = flights.slice(0, displayCount);
  const hasMore = displayCount < flights.length;

  return (
    <div className="flex-1 flex flex-col gap-2">
      {displayedFlights.map((flight) => (
        <FlightCard key={flight.id} flight={flight} />
      ))}

      {/* Show More Results Button */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="bg-white hover:bg-[#F5F7FF] text-[#3754ED] border-[#3754ED] rounded-full px-8 py-2 h-auto text-sm font-medium"
          >
            Show More Results
          </Button>
        </div>
      )}
    </div>
  );
}
