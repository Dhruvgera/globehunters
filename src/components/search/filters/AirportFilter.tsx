"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface Airport {
  code: string;
  name: string;
  minPrice: number;
}

interface AirportFilterProps {
  type: "departure" | "arrival";
  airports: Airport[];
  selectedAirports: string[];
  onToggle: (code: string) => void;
}

export function AirportFilter({
  airports,
  selectedAirports,
  onToggle,
}: AirportFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      {airports.map((airport) => (
        <div
          key={airport.code}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedAirports.includes(airport.code)}
              onCheckedChange={() => onToggle(airport.code)}
            />
            <span className="text-sm text-[#010D50]">{airport.name}</span>
          </div>
          <span className="text-sm font-medium text-[#010D50]">
            £{airport.minPrice}
          </span>
        </div>
      ))}
    </div>
  );
}
