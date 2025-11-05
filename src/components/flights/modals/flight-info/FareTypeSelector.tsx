"use client";

import { Button } from "@/components/ui/button";

type FareType = "value" | "classic" | "flex";

interface FareTypeSelectorProps {
  selectedFare: FareType;
  onSelectFare: (fare: FareType) => void;
  prices: {
    value: number;
    classic: number;
    flex: number;
  };
}

export function FareTypeSelector({
  selectedFare,
  onSelectFare,
  prices,
}: FareTypeSelectorProps) {
  const fares: { type: FareType; label: string; price: number }[] = [
    { type: "value", label: "Eco Value", price: prices.value },
    { type: "classic", label: "Eco Classic", price: prices.classic },
    { type: "flex", label: "Eco Flex", price: prices.flex },
  ];

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-[#010D50]">
        Choose your fare
      </span>
      <div className="flex gap-2">
        {fares.map((fare) => (
          <Button
            key={fare.type}
            variant="ghost"
            onClick={() => onSelectFare(fare.type)}
            className={`flex-1 flex flex-col items-center gap-1 h-auto py-3 rounded-xl ${
              selectedFare === fare.type
                ? "bg-[#F5F7FF] border-2 border-[#3754ED] text-[#010D50]"
                : "bg-white border border-[#DFE0E4] text-[#3A478A] hover:bg-[#F5F7FF]"
            }`}
          >
            <span className="text-xs font-medium">{fare.label}</span>
            <span className="text-sm font-bold">£{fare.price}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
