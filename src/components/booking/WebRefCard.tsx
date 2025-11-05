"use client";

import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";

interface WebRefCardProps {
  refNumber: string;
  phoneNumber: string;
  isMobile?: boolean;
}

export function WebRefCard({
  refNumber,
  phoneNumber,
  isMobile = false,
}: WebRefCardProps) {
  const t = useTranslations('booking.webRef');
  const tNav = useTranslations('common.navigation.phone');
  if (isMobile) {
    return (
      <div className="lg:hidden bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
        <span className="text-base font-semibold text-[#3754ED]">
          {t('title')}: {refNumber}
        </span>
        <div className="flex items-center gap-3 bg-[rgba(55,84,237,0.12)] rounded-full px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-[#0B229E] flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[#010D50] text-sm font-bold">
              {phoneNumber}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex bg-white border border-[#DFE0E4] rounded-xl p-4 flex-col gap-4">
      <span className="text-base font-semibold text-[#3754ED]">
        {t('title')}: {refNumber}
      </span>
      <p className="text-sm text-[#3A478A]">
        {t('message')}
      </p>
      <div className="flex items-center gap-3 bg-[rgba(55,84,237,0.12)] rounded-full px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-[#0B229E] flex items-center justify-center">
          <Phone className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[#010D50] text-[8px] font-medium leading-tight">
            {tNav('label')}
          </span>
          <span className="text-[#010D50] text-sm font-bold">{phoneNumber}</span>
        </div>
      </div>
    </div>
  );
}
