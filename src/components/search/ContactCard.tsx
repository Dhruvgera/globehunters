"use client";

import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAffiliatePhone } from "@/lib/AffiliateContext";

interface ContactCardProps {
  /** Reference ID from the flight/hotel search */
  webRef?: string | number;
  isJourneyRef?: boolean;
}

export function ContactCard({ webRef, isJourneyRef = false }: ContactCardProps) {
  const t = useTranslations('search.contact');
  const { phoneNumber } = useAffiliatePhone();
  
  const displayWebRef = webRef ? `${webRef}` : null;
  const refLabel = isJourneyRef ? t('journeyRef') : t('webRef');
  
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3 sticky top-20 z-20 shadow-sm">
      {displayWebRef && (
        <span className="text-base font-semibold text-[#3754ED]">
          {refLabel}: {displayWebRef}
        </span>
      )}
      <p className="text-xs text-[#3A478A]">
        {t('title')}
      </p>
      <a 
        href={`tel:${phoneNumber.replace(/\s/g, '')}`}
        className="flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2 w-fit hover:bg-[rgba(55,84,237,0.18)] transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center">
          <Phone className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[#010D50] text-[8px] font-medium leading-tight">
            {t('tollFree')}
          </span>
          <span className="text-[#010D50] text-sm font-bold">
            {phoneNumber}
          </span>
        </div>
      </a>
    </div>
  );
}
