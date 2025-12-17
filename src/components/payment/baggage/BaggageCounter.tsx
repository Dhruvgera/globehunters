"use client";

import { Minus, Plus, Luggage } from "lucide-react";

interface BaggageCounterProps {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  maxCount?: number;
  title: string;
  description: string;
  priceText: string;
}

export function BaggageCounter({
  count,
  onIncrement,
  onDecrement,
  maxCount = 10,
  title,
  description,
  priceText,
}: BaggageCounterProps) {
  const isAtMax = count >= maxCount;
  const isAtMin = count <= 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <Luggage className="w-6 h-6 text-[#010D50] shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#010D50]">{title}</span>
          </div>
        </div>

        {/* Counter moved to top row */}
        <div className="bg-[rgba(55,84,237,0.12)] rounded-full px-4 py-2 flex items-center gap-2 scale-90 sm:scale-100 origin-right">
          <button
            onClick={onDecrement}
            disabled={isAtMin}
            className={`${isAtMin ? 'text-gray-300 cursor-not-allowed' : 'text-[#3754ED] hover:text-[#2A3FB8]'}`}
            aria-label="Decrease baggage count"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-[#3754ED] min-w-[20px] text-center">
            {count}
          </span>
          <button
            onClick={onIncrement}
            disabled={isAtMax}
            className={`${isAtMax ? 'text-gray-300 cursor-not-allowed' : 'text-[#3754ED] hover:text-[#2A3FB8]'}`}
            aria-label="Increase baggage count"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Description and Price */}
      <div className="flex flex-col gap-1 pl-9">
        <span className="text-sm text-[#3A478A]">{description}</span>
        <span className="text-sm font-semibold text-[#010D50]">{priceText}</span>
      </div>
    </div>
  );
}
