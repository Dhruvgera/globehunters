"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface StopoverInfoProps {
  duration: string;
  airport: string;
  requiresRecheck?: boolean;
}

export function StopoverInfo({
  duration,
  airport,
  requiresRecheck = false,
}: StopoverInfoProps) {
  const t = useTranslations('flightInfo.stopover');
  return (
    <div className="bg-[#FFF5EA] border border-[#FFD699] rounded-xl p-3 flex items-start gap-2">
      <Info className="w-4 h-4 text-[#E98E03] shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[#E98E03]">
          {duration} {t('stopoverIn')} {airport}
        </p>
        {requiresRecheck && (
          <p className="text-xs text-[#E98E03]">
            {t('recheckBaggage')}
          </p>
        )}
      </div>
    </div>
  );
}
