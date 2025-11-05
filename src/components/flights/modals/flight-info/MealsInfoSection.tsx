"use client";

import { Utensils } from "lucide-react";

interface MealsInfoSectionProps {
  mealsIncluded: boolean;
  description?: string;
}

export function MealsInfoSection({
  mealsIncluded,
  description = "Complimentary meals and refreshments",
}: MealsInfoSectionProps) {
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Utensils className="w-5 h-5 text-[#010D50]" />
        <span className="text-sm font-semibold text-[#010D50]">
          Meals & Refreshments
        </span>
      </div>
      <p className="text-sm text-[#3A478A]">
        {mealsIncluded ? description : "No meals included"}
      </p>
    </div>
  );
}
