"use client";

import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TripType = "round-trip" | "one-way" | "multi-city";

interface TripTypeSelectorProps {
  tripType: TripType;
  onTripTypeChange: (type: TripType) => void;
}

export function TripTypeSelector({
  tripType,
  onTripTypeChange,
}: TripTypeSelectorProps) {
  const getTripTypeLabel = (type: TripType) => {
    switch (type) {
      case "round-trip":
        return "Round Trip";
      case "one-way":
        return "One Way";
      case "multi-city":
        return "Multi City";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 rounded-[40px] px-0 hover:bg-transparent h-auto"
        >
          <ArrowLeftRight className="w-5 h-5 text-[#010D50]" />
          <span className="text-sm font-medium text-[#010D50]">
            {getTripTypeLabel(tripType)}
          </span>
          <ChevronDown className="w-5 h-5 text-[#010D50]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => onTripTypeChange("round-trip")}
          >
            Round Trip
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => onTripTypeChange("one-way")}
          >
            One Way
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => onTripTypeChange("multi-city")}
          >
            Multi City
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
