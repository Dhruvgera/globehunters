"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import type { SummaryRow } from "@/lib/utils/buildSummaryRows";

export type { SummaryRow };

interface CostSummaryCardProps {
  rows?: SummaryRow[];
  total: number;
  currency: string;
  totalSubtext?: string;
  isSticky?: boolean;
  /** Local fees paid at the hotel. When set, the card splits into Pay Now / Pay at check-in / Total. */
  payAtProperty?: number;
}

export function CostSummaryCard({
  rows,
  total,
  currency,
  totalSubtext,
  isSticky = true,
  payAtProperty,
}: CostSummaryCardProps) {
  const t = useTranslations("costSummary");
  const [isExpanded, setIsExpanded] = useState(false);
  const hasRows = rows && rows.length > 0;
  const localFees = payAtProperty && payAtProperty > 0 ? payAtProperty : 0;

  return (
    <div
      className={`bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6 order-2 lg:order-none z-2 ${
        isSticky ? "lg:sticky lg:top-24" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {t("title")}
        </span>
        {hasRows && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden text-[#3754ED] text-sm font-medium"
          >
            {isExpanded ? t("hideDetails") : t("showDetails")}
          </button>
        )}
      </div>

      {hasRows && (
        <>
          <div
            className={`flex-col gap-2 ${
              isExpanded ? "flex" : "hidden lg:flex"
            }`}
          >
            {rows!.map((row, idx) => (
              <div
                key={`${row.label}-${idx}`}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm font-medium text-[#010D50]">{row.label}</span>
                <span
                  className={
                    row.valueClassName || "text-sm font-medium text-[#010D50]"
                  }
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div
            className={`border-t border-[#DFE0E4] ${
              isExpanded ? "block" : "hidden lg:block"
            }`}
          />
        </>
      )}

      {localFees > 0 ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm font-semibold text-[#010D50]">{t("payNow")}</span>
            <div className="text-right">
              <div className="text-xl font-bold text-[#3754ED]">
                {formatPrice(total - localFees, currency)}
              </div>
              {totalSubtext ? (
                <div className="text-xs text-[#3A478A]">{totalSubtext}</div>
              ) : null}
              <div className="text-xs text-[#3A478A]">{t("inclTaxesAndFees")}</div>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[#010D50]">{t("payAtCheckIn")}</div>
              <div className="text-xs text-[#3A478A]">{t("payAtCheckInNote")}</div>
            </div>
            <div className="text-sm font-semibold text-[#010D50]">
              {formatPrice(localFees, currency)}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#DFE0E4] pt-4">
            <span className="text-sm font-semibold text-[#010D50]">{t("total")}</span>
            <span className="text-base font-semibold text-[#010D50]">
              {formatPrice(total, currency)}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#010D50]">
            {t("tripTotal")}
          </span>
          <div className="text-right">
            <div className="text-sm font-semibold text-[#010D50]">
              {formatPrice(total, currency)}
            </div>
            {totalSubtext ? (
              <div className="text-xs text-[#3A478A]">{totalSubtext}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
