"use client";

import { Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

interface PassengersSelectorProps {
  passengers: Passengers;
  travelClass: string;
  onPassengersChange: (passengers: Passengers) => void;
  onTravelClassChange: (travelClass: string) => void;
}

export function PassengersSelector({
  passengers,
  travelClass,
  onPassengersChange,
  onTravelClassChange,
}: PassengersSelectorProps) {
  const totalPassengers =
    passengers.adults + passengers.children + passengers.infants;

  const updatePassengers = (
    type: keyof Passengers,
    delta: number,
    min: number = 0
  ) => {
    onPassengersChange({
      ...passengers,
      [type]: Math.max(min, passengers[type] + delta),
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 rounded-[40px] px-0 hover:bg-transparent h-auto"
        >
          <Users className="w-5 h-5 text-[#010D50]" />
          <span className="text-sm font-medium text-[#010D50]">
            {totalPassengers} Adult{totalPassengers > 1 ? "s" : ""},{" "}
            {travelClass}
          </span>
          <ChevronDown className="w-5 h-5 text-[#010D50]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-4">
          {/* Adults */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Adults</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("adults", -1, 1)}
              >
                -
              </Button>
              <span className="w-8 text-center">{passengers.adults}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("adults", 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Children (2-11)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("children", -1)}
              >
                -
              </Button>
              <span className="w-8 text-center">{passengers.children}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("children", 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Infants */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Infants (&lt;2)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("infants", -1)}
              >
                -
              </Button>
              <span className="w-8 text-center">{passengers.infants}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("infants", 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Travel Class */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Travel Class</p>
            <div className="flex flex-col gap-2">
              {["Economy", "Premium Economy", "Business", "First"].map(
                (cls) => (
                  <Button
                    key={cls}
                    variant={travelClass === cls ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => onTravelClassChange(cls)}
                  >
                    {cls}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
