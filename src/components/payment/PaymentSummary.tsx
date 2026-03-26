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
  totalSubtext?: string;
  rows?: Array<{
    label: string;
    value: string;
    valueClassName?: string;
  }>;
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
  totalSubtext,
  rows,
}: PaymentSummaryProps) {
  const t = useTranslations("payment");
  const [isExpanded, setIsExpanded] = useState(false);

  const fallbackRows = [
    {
      label: `${t("traveler")}: 1 ${t("adult")}`,
      value: formatPrice(baseFare, currency),
      valueClassName: "text-sm font-medium text-[#010D50]",
    },
    ...(protectionPlanCost > 0
      ? [
          {
            label: `iAssure Protection Plan (${protectionPlanName})`,
            value: formatPrice(protectionPlanCost, currency),
          },
        ]
      : []),
    ...(baggageCost > 0
      ? [
          {
            label: `${t("additionalBaggage")} (${baggageCount} ${t("bags")})`,
            value: formatPrice(baggageCost, currency),
          },
        ]
      : []),
    ...(discountAmount > 0
      ? [
          {
            label: `${t("discountCode")} (-${discountPercent * 100}%)`,
            value: `-${formatPrice(discountAmount, currency)}`,
          },
        ]
      : []),
  ];

  const summaryRows = rows && rows.length > 0 ? rows : fallbackRows;

  return (
    <div
      className={`bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6 order-2 lg:order-none ${
        isSticky ? "lg:sticky lg:top-20" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">{t("priceSummary")}</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden text-[#3754ED] text-sm font-medium lg:hidden"
        >
          {isExpanded ? t("hideDetails") : t("showDetails")}
        </button>
      </div>

      {summaryRows.length > 0 ? (
        <>
          <div className={`flex-col gap-3 ${isExpanded ? "flex" : "hidden lg:flex"}`}>
            {summaryRows.map((row) => (
              <div key={`${row.label}-${row.value}`} className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#3A478A]">{row.label}</span>
                <span className={row.valueClassName || "text-sm font-medium text-[#010D50]"}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div className={`border-t border-[#DFE0E4] ${isExpanded ? "block" : "hidden lg:block"}`} />
        </>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">{t("tripTotal")}</span>
        <div className="text-right">
          <div className="text-sm font-semibold text-[#010D50]">{formatPrice(tripTotal, currency)}</div>
          {totalSubtext ? <div className="text-xs text-[#3A478A]">{totalSubtext}</div> : null}
        </div>
      </div>
    </div>
  );
}
