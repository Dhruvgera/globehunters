"use client";

import { Button } from "@/components/ui/button";

interface FlightLegTabsProps {
  selectedLeg: "outbound" | "inbound";
  onSelectLeg: (leg: "outbound" | "inbound") => void;
}

export function FlightLegTabs({ selectedLeg, onSelectLeg }: FlightLegTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-[#F5F5F5] rounded-lg">
      <Button
        variant="ghost"
        onClick={() => onSelectLeg("outbound")}
        className={`flex-1 rounded-md text-sm font-medium h-9 ${
          selectedLeg === "outbound"
            ? "bg-white text-[#010D50] shadow-sm"
            : "text-[#3A478A] hover:bg-white/50"
        }`}
      >
        Outbound
      </Button>
      <Button
        variant="ghost"
        onClick={() => onSelectLeg("inbound")}
        className={`flex-1 rounded-md text-sm font-medium h-9 ${
          selectedLeg === "inbound"
            ? "bg-white text-[#010D50] shadow-sm"
            : "text-[#3A478A] hover:bg-white/50"
        }`}
      >
        Inbound
      </Button>
    </div>
  );
}
