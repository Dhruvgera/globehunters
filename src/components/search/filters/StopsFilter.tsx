"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

interface StopsFilterProps {
  selectedStops: number[];
  onToggle: (stops: number) => void;
  /** Count of flights available for each stop category */
  availableStops?: Record<number, number>;
}

export function StopsFilter({ selectedStops, onToggle, availableStops }: StopsFilterProps) {
  const t = useTranslations('search.filters');
  
  // Check if a stop option has available flights
  const hasFlights = (stops: number) => {
    if (!availableStops) return true; // Show all if no data
    return (availableStops[stops] || 0) > 0;
  };
  
  return (
    <div className="flex flex-col gap-2">
      {hasFlights(0) && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedStops.includes(0)}
            onCheckedChange={() => onToggle(0)}
          />
          <span className="text-sm text-[#010D50]">
            {t('direct')}
            {availableStops && availableStops[0] > 0 && (
              <span className="text-xs text-[#6B7280] ml-1">({availableStops[0]})</span>
            )}
          </span>
        </div>
      )}
      {hasFlights(1) && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedStops.includes(1)}
            onCheckedChange={() => onToggle(1)}
          />
          <span className="text-sm text-[#010D50]">
            {t('oneStop')}
            {availableStops && availableStops[1] > 0 && (
              <span className="text-xs text-[#6B7280] ml-1">({availableStops[1]})</span>
            )}
          </span>
        </div>
      )}
      {hasFlights(2) && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedStops.includes(2)}
            onCheckedChange={() => onToggle(2)}
          />
          <span className="text-sm text-[#010D50]">
            {t('twoPlus')}
            {availableStops && availableStops[2] > 0 && (
              <span className="text-xs text-[#6B7280] ml-1">({availableStops[2]})</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
