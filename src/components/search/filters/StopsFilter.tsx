"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface StopsFilterProps {
  selectedStops: number[];
  onToggle: (stops: number) => void;
}

export function StopsFilter({ selectedStops, onToggle }: StopsFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedStops.includes(0)}
          onCheckedChange={() => onToggle(0)}
        />
        <span className="text-sm text-[#010D50]">Direct</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedStops.includes(1)}
          onCheckedChange={() => onToggle(1)}
        />
        <span className="text-sm text-[#010D50]">1 Stop</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedStops.includes(2)}
          onCheckedChange={() => onToggle(2)}
        />
        <span className="text-sm text-[#010D50]">2+ Stops</span>
      </div>
    </div>
  );
}
