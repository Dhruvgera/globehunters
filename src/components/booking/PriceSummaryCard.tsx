"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TransformedPriceOption } from "@/types/priceCheck";

interface PriceSummaryCardProps {
  flightFare: number;
  taxesAndFees: number;
  adults: number;
  children?: number;
  selectedUpgrade?: TransformedPriceOption | null;
  isSticky?: boolean;
}

export function PriceSummaryCard({
  flightFare,
  taxesAndFees,
  adults,
  children = 0,
  selectedUpgrade,
  isSticky = true,
}: PriceSummaryCardProps) {
  const t = useTranslations('booking.priceSummary');
  const [isExpanded, setIsExpanded] = useState(false);
  const total = selectedUpgrade ? selectedUpgrade.totalPrice : (flightFare * (adults + children)) + taxesAndFees;

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
          className="lg:hidden text-[#3754ED] text-sm font-medium hidden"
        >
          {isExpanded ? t('hideDetails') : t('showDetails')}
        </button>
      </div>

      {/* Breakdown hidden by design - show only Trip Total */}
      {false && (
        <div
          className={`flex-col gap-2 ${
            isExpanded ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedUpgrade ? (
            <>
              {selectedUpgrade.passengerBreakdown.map((pax, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#010D50]">
                    {pax.count}x {pax.type === 'ADT' ? t('adult') : pax.type === 'CHD' ? 'Child' : 'Infant'}
                  </span>
                  <span className="text-sm font-medium text-[#010D50]">
                    £{pax.totalPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </>
          ) : null}
        </div>
      )}

      {false && (
        <div
          className={`border-t border-[#DFE0E4] ${
            isExpanded ? "block" : "hidden lg:block"
          }`}
        />
      )}

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
