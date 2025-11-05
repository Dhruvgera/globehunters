"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlightActionsProps {
  currency: string;
  pricePerPerson: number;
  showTicketOptions: boolean;
  onViewFlightInfo: () => void;
  onToggleTicketOptions: () => void;
}

export function FlightActions({
  currency,
  pricePerPerson,
  showTicketOptions,
  onViewFlightInfo,
  onToggleTicketOptions,
}: FlightActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <span className="text-lg font-medium text-[#010D50]">
        {currency}
        {pricePerPerson} /per person
      </span>

      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
        <Button
          variant="ghost"
          className="bg-[rgba(55,84,237,0.12)] hover:bg-[rgba(55,84,237,0.2)] text-[#3754ED] rounded-full px-4 py-2 h-auto text-xs font-medium"
          onClick={onViewFlightInfo}
        >
          View Flight Info
        </Button>
        <Button
          variant="outline"
          className="rounded-lg px-6 py-2 h-auto text-xs font-medium border-none hover:bg-gray-100"
          onClick={onToggleTicketOptions}
        >
          Ticket Options
          {showTicketOptions ? (
            <ChevronUp className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-1" />
          )}
        </Button>
      </div>
    </div>
  );
}
