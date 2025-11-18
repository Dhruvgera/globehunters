"use client";

import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ProtectionPlanTableProps {
  features: string[];
  basicPrice: string;
  premiumPrice: string;
  allPrice: string;
  basicLabel: string;
  premiumLabel: string;
  allLabel: string;
  selectedPlan?: "basic" | "premium" | "all";
  onSelectPlan: (plan: "basic" | "premium" | "all") => void;
}

export function ProtectionPlanTable({
  features,
  basicPrice,
  premiumPrice,
  allPrice,
  basicLabel,
  premiumLabel,
  allLabel,
  selectedPlan,
  onSelectPlan,
}: ProtectionPlanTableProps) {
  return (
    <div className="hidden lg:flex flex-col gap-1">
      {/* Price Row */}
      <div className="flex items-center justify-between bg-[#F5F7FF] rounded-lg p-3">
        <span className="w-[524px] text-sm font-medium text-[#010D50] opacity-0">
          Price
        </span>
        <div className="flex items-center gap-0">
          <div className="w-[109px] text-center py-0.5">
            <span className="text-sm font-medium text-[#010D50]">
              {basicPrice}
            </span>
          </div>
          <div className="w-[109px] text-center py-0.5">
            <span className="text-sm font-medium text-[#010D50]">
              {premiumPrice}
            </span>
          </div>
          <div className="w-[109px] text-center py-0.5">
            <span className="text-sm font-medium text-[#010D50]">{allPrice}</span>
          </div>
        </div>
      </div>

      {/* Features */}
      {features.map((feature, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 border-b border-[#F5F7FF]"
        >
          <span className="w-[524px] text-sm font-medium text-[#010D50]">
            {feature}
          </span>
          <div className="flex items-center gap-0">
            <div className="w-[109px] flex items-center justify-center">
              <Check className="w-4 h-4 text-[#008234]" />
            </div>
            <div className="w-[109px] flex items-center justify-center">
              <Check className="w-4 h-4 text-[#008234]" />
            </div>
            <div className="w-[109px] flex items-center justify-center">
              <Check className="w-4 h-4 text-[#008234]" />
            </div>
          </div>
        </div>
      ))}

      {/* Plan Selection Row */}
      <div className="flex items-center justify-between p-3">
        <span className="w-[524px] opacity-0">Select</span>
        <div className="flex items-center gap-0">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectPlan("basic")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPlan("basic");
              }
            }}
            className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
          >
            <Checkbox checked={selectedPlan === "basic"} />
            <span className="text-xs font-medium text-[#010D50]">
              {basicLabel}
            </span>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectPlan("premium")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPlan("premium");
              }
            }}
            className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
          >
            <Checkbox checked={selectedPlan === "premium"} />
            <span className="text-xs font-medium text-[#010D50]">
              {premiumLabel}
            </span>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectPlan("all")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPlan("all");
              }
            }}
            className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
          >
            <Checkbox checked={selectedPlan === "all"} />
            <span className="text-xs font-medium text-[#010D50]">
              {allLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
