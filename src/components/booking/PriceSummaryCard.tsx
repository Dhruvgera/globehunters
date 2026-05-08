"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TransformedPriceOption } from "@/types/priceCheck";
import { formatPrice } from "@/lib/currency";

interface PriceSummaryCardProps {
  baseTripTotal: number;
  selectedUpgrade?: TransformedPriceOption | null;
  passengerBreakdown?: {
    type: string;
    count: number;
    basePrice: number;
    totalPrice: number;
    taxesPerPerson: number;
  }[];
  isSticky?: boolean;
  currency: string;
}

export function PriceSummaryCard({
  baseTripTotal,
  selectedUpgrade,
  passengerBreakdown = [],
  isSticky = true,
  currency,
}: PriceSummaryCardProps) {
  const t = useTranslations('booking.priceSummary');
  const [isExpanded, setIsExpanded] = useState(false);
  const total = selectedUpgrade ? selectedUpgrade.totalPrice : baseTripTotal;
  const hasBreakdown = passengerBreakdown.length > 0;

  const formatPaxLabel = (type: string, count: number) => {
    if (type === 'ADT') return `${count}x ${count > 1 ? t('adults') : t('adult')}`;
    if (type === 'CHD') return `${count}x ${count > 1 ? t('children') : t('child')}`;
    if (type === 'INF') return `${count}x ${count > 1 ? t('infants') : t('infant')}`;
    return `${count}x ${type}`;
  };

  return (
    <div
      className={`bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6 order-2 lg:order-none z-2 ${isSticky ? "lg:sticky lg:top-20" : ""
        }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {t('title')}
        </span>
        {hasBreakdown && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden text-[#3754ED] text-sm font-medium"
          >
            {isExpanded ? t('hideDetails') : t('showDetails')}
          </button>
        )}
      </div>

      {hasBreakdown && (
        <div
          className={`flex-col gap-2 ${isExpanded ? "flex" : "hidden lg:flex"
            }`}
        >
          {passengerBreakdown.map((pax, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#010D50]">
                {formatPaxLabel(pax.type, pax.count)}
              </span>
              <span className="text-sm font-medium text-[#010D50]">
                {formatPrice(pax.totalPrice, currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasBreakdown && (
        <div
          className={`border-t border-[#DFE0E4] ${isExpanded ? "block" : "hidden lg:block"
            }`}
        />
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {t('tripTotal')}
        </span>
        <span className="text-sm font-semibold text-[#010D50]">
          {formatPrice(total, currency)}
        </span>
      </div>
    </div>
  );
}
