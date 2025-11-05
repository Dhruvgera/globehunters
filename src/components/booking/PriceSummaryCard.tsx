"use client";

import { useState } from "react";

interface PriceSummaryCardProps {
  flightFare: number;
  taxesAndFees: number;
  adults: number;
  isSticky?: boolean;
}

export function PriceSummaryCard({
  flightFare,
  taxesAndFees,
  adults,
  isSticky = true,
}: PriceSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const total = flightFare + taxesAndFees;

  return (
    <div
      className={`bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6 order-2 lg:order-none ${
        isSticky ? "lg:sticky lg:top-20" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          Price Summary
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden text-[#3754ED] text-sm font-medium"
        >
          {isExpanded ? "Hide Details" : "Show Details"}
        </button>
      </div>

      {/* Breakdown - Hidden on mobile unless expanded, always visible on desktop */}
      <div
        className={`flex-col gap-2 ${
          isExpanded ? "flex" : "hidden lg:flex"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#010D50]">
            Traveler: {adults} Adult{adults > 1 ? "s" : ""}
          </span>
          <span className="text-sm font-medium text-[#010D50]">
            £{total.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#3A478A]">Flight fare</span>
          <span className="text-sm text-[#3A478A]">
            £{flightFare.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#3A478A]">Tax, fees and charges</span>
          <span className="text-sm text-[#3A478A]">
            £{taxesAndFees.toLocaleString()}
          </span>
        </div>
      </div>

      <div
        className={`border-t border-[#DFE0E4] ${
          isExpanded ? "block" : "hidden lg:block"
        }`}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          Trip Total
        </span>
        <span className="text-sm font-semibold text-[#010D50]">
          £{total.toLocaleString()}.00
        </span>
      </div>
    </div>
  );
}
