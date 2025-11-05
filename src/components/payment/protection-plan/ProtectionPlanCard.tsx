"use client";

import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ProtectionPlanCardProps {
  planType: "basic" | "premium" | "all";
  title: string;
  price: string;
  features: string[];
  isSelected: boolean;
  onSelect: () => void;
}

export function ProtectionPlanCard({
  planType,
  title,
  price,
  features,
  isSelected,
  onSelect,
}: ProtectionPlanCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-[#3754ED] bg-[#F5F7FF]"
          : "border-[#DFE0E4] bg-white"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#010D50]">{title}</h3>
          <p className="text-lg font-bold text-[#3754ED] mt-1">{price}</p>
        </div>
        <Checkbox checked={isSelected} />
      </div>
      <div className="flex flex-col gap-2">
        {features.map((feature, i) => (
          <div key={i} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#008234] shrink-0 mt-0.5" />
            <span className="text-xs text-[#010D50]">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
