"use client";

import { Minus, Plus, Package } from "lucide-react";

interface BaggageCounterProps {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  title: string;
  description: string;
  priceText: string;
}

export function BaggageCounter({
  count,
  onIncrement,
  onDecrement,
  title,
  description,
  priceText,
}: BaggageCounterProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between w-full">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-[#010D50] shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#010D50]">{title}</span>
            <span className="text-sm text-[#3A478A]">{description}</span>
          </div>
        </div>
      </div>

      {/* Price and Counter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-2 pl-0 lg:pl-9">
        <span className="text-sm font-semibold text-[#010D50]">{priceText}</span>
        <div className="bg-[rgba(55,84,237,0.12)] rounded-full px-4 py-3 flex items-center gap-2">
          <button
            onClick={onDecrement}
            className="text-[#3754ED] hover:text-[#2A3FB8]"
            aria-label="Decrease baggage count"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-[#3754ED] min-w-[20px] text-center">
            {count}
          </span>
          <button
            onClick={onIncrement}
            className="text-[#3754ED] hover:text-[#2A3FB8]"
            aria-label="Increase baggage count"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
