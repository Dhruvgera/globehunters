"use client";

import { Slider } from "@/components/ui/slider";

interface PriceRangeFilterProps {
  priceRange: [number, number];
  minPrice?: number;
  maxPrice?: number;
  onPriceChange: (range: [number, number]) => void;
}

export function PriceRangeFilter({
  priceRange,
  minPrice = 0,
  maxPrice = 2000,
  onPriceChange,
}: PriceRangeFilterProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Slider
        value={priceRange}
        onValueChange={(value) => onPriceChange(value as [number, number])}
        min={minPrice}
        max={maxPrice}
        step={50}
        className="w-full"
      />
      <div className="flex items-center justify-between w-full">
        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
          £{priceRange[0]}
        </span>
        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
          £{priceRange[1]}
        </span>
      </div>
    </div>
  );
}
