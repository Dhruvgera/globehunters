"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations('booking.priceSummary');
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
          {t('title')}
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden text-[#3754ED] text-sm font-medium"
        >
          {isExpanded ? t('hideDetails') : t('showDetails')}
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
            {t('traveler')}: {adults} {adults > 1 ? t('adults') : t('adult')}
          </span>
          <span className="text-sm font-medium text-[#010D50]">
            £{total.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#3A478A]">{t('flightFare')}</span>
          <span className="text-sm text-[#3A478A]">
            £{flightFare.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#3A478A]">{t('taxesAndFees')}</span>
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
          {t('tripTotal')}
        </span>
        <span className="text-sm font-semibold text-[#010D50]">
          £{total.toLocaleString()}.00
        </span>
      </div>
    </div>
  );
}
