"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface ExtrasFilterProps {
  selectedExtras: string[];
  onToggle: (extra: string) => void;
}

export function ExtrasFilter({ selectedExtras, onToggle }: ExtrasFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedExtras.includes("refundable")}
          onCheckedChange={() => onToggle("refundable")}
        />
        <span className="text-sm text-[#010D50]">Refundable</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedExtras.includes("meals")}
          onCheckedChange={() => onToggle("meals")}
        />
        <span className="text-sm text-[#010D50]">Meals</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedExtras.includes("baggage")}
          onCheckedChange={() => onToggle("baggage")}
        />
        <span className="text-sm text-[#010D50]">Baggage</span>
      </div>
    </div>
  );
}
