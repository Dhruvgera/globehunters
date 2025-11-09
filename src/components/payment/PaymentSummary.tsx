"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";

interface PaymentSummaryProps {
  baseFare: number;
  protectionPlanCost: number;
  protectionPlanName: string;
  baggageCost: number;
  baggageCount: number;
  discountPercent: number;
  discountAmount: number;
  tripTotal: number;
  isSticky?: boolean;
  currency: string;
}

export function PaymentSummary({
  baseFare,
  protectionPlanCost,
  protectionPlanName,
  baggageCost,
  baggageCount,
  discountPercent,
  discountAmount,
  tripTotal,
  isSticky = true,
  currency,
}: PaymentSummaryProps) {
  const t = useTranslations('payment');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6 order-2 lg:order-none ${
        isSticky ? "lg:sticky lg:top-20" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {t('priceSummary')}
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden text-[#3754ED] text-sm font-medium hidden"
        >
          {isExpanded ? t('hideDetails') : t('showDetails')}
        </button>
      </div>

      {/* Hide breakdown and add-ons – show Trip Total only */}
      {false && (
        <>
          <div
            className={`flex-col gap-2 ${isExpanded ? "flex" : "hidden lg:flex"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#010D50]">
                {t('traveler')}: 1 {t('adult')}
              </span>
              <span className="text-sm font-medium text-[#010D50]">
                {formatPrice(baseFare, currency)}
              </span>
            </div>
          </div>

          <div
            className={`border-t border-[#DFE0E4] ${isExpanded ? "block" : "hidden lg:block"}`}
          />

          <div
            className={`flex items-center justify-between ${isExpanded ? "flex" : "hidden lg:flex"}`}
          >
            <span className="text-sm text-[#3A478A]">
              iAssure Protection Plan ({protectionPlanName})
            </span>
            <span className="text-sm text-[#3A478A]">
              {formatPrice(protectionPlanCost, currency)}
            </span>
          </div>

          <div
            className={`border-t border-[#DFE0E4] ${isExpanded ? "block" : "hidden lg:block"}`}
          />

          <div
            className={`flex items-center justify-between ${isExpanded ? "flex" : "hidden lg:flex"}`}
          >
            <span className="text-sm text-[#3A478A]">
              {t('additionalBaggage')} ({baggageCount} {t('bags')})
            </span>
            <span className="text-sm text-[#3A478A]">
              {formatPrice(baggageCost, currency)}
            </span>
          </div>

          <div
            className={`border-t border-[#DFE0E4] ${isExpanded ? "block" : "hidden lg:block"}`}
          />

          <div
            className={`flex items-center justify-between ${isExpanded ? "flex" : "hidden lg:flex"}`}
          >
            <span className="text-sm text-[#3A478A]">
              {t('discountCode')} (-{discountPercent * 100}%)
            </span>
            <span className="text-sm text-[#3A478A]">
              -{formatPrice(discountAmount, currency)}
            </span>
          </div>

          <div
            className={`border-t border-[#DFE0E4] ${isExpanded ? "block" : "hidden lg:block"}`}
          />
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {t('tripTotal')}
        </span>
        <span className="text-sm font-semibold text-[#010D50]">
          {formatPrice(tripTotal, currency)}
        </span>
      </div>
    </div>
  );
}
