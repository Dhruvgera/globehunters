"use client";

import { Briefcase } from "lucide-react";
import { useTranslations } from "next-intl";

interface BaggageInfo {
  checkedBaggage: string;
  cabinBaggage: string;
}

interface BaggageInfoSectionProps {
  baggage: BaggageInfo;
}

export function BaggageInfoSection({ baggage }: BaggageInfoSectionProps) {
  const t = useTranslations('flightInfo');
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-[#010D50]" />
        <span className="text-sm font-semibold text-[#010D50]">
          {t('baggage.title')}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#3A478A]">{t('fareDetails.checkedBaggage')}</span>
          <span className="text-sm font-medium text-[#010D50]">
            {baggage.checkedBaggage}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#3A478A]">{t('fareDetails.cabinBaggage')}</span>
          <span className="text-sm font-medium text-[#010D50]">
            {baggage.cabinBaggage}
          </span>
        </div>
      </div>
    </div>
  );
}
