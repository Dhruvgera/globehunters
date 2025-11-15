"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

type FareType = "value" | "classic" | "flex";

interface FareDetail {
  feature: string;
  value: boolean | string;
  classic: boolean | string;
  flex: boolean | string;
}

interface FareDetailsGridProps {
  selectedFare: FareType;
}


export function FareDetailsGrid({ selectedFare }: FareDetailsGridProps) {
  const t = useTranslations('flightInfo.fareDetails');
  
  const fareDetails: FareDetail[] = [
    {
      feature: t('checkedBaggage'),
      value: "1 piece",
      classic: "2 pieces",
      flex: "2 pieces",
    },
    {
      feature: t('cabinBaggage'),
      value: "1 piece",
      classic: "1 piece",
      flex: "1 piece",
    },
    {
      feature: t('seatSelection'),
      value: false,
      classic: true,
      flex: true,
    },
    {
      feature: t('flexibleTickets'),
      value: false,
      classic: false,
      flex: true,
    },
    {
      feature: t('cancellation'),
      value: false,
      classic: false,
      flex: true,
    },
  ];
  
  const renderValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <X className="w-4 h-4 text-red-600" />
      );
    }
    return <span className="text-sm text-[#010D50]">{value}</span>;
  };

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
      <span className="text-sm font-semibold text-[#010D50]">
        {t('whatsIncluded')}
      </span>
      <div className="flex flex-col gap-2">
        {fareDetails.map((detail, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-[#DFE0E4] last:border-0"
          >
            <span className="text-sm text-[#3A478A]">{detail.feature}</span>
            <div className="flex items-center gap-4">
              {renderValue(detail[selectedFare])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
