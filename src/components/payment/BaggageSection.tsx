"use client";

import { Briefcase, Package, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { BaggageItem } from "./baggage/BaggageItem";
import { BaggageCounter } from "./baggage/BaggageCounter";

interface BaggageSectionProps {
  additionalBaggage: number;
  onUpdateBaggage: (count: number) => void;
  baggageDescription?: string;
}

export function BaggageSection({
  additionalBaggage,
  onUpdateBaggage,
  baggageDescription,
}: BaggageSectionProps) {
  const t = useTranslations('payment.baggage');

  const hasCheckedIncluded = !!baggageDescription && !/^no$|^none$/i.test(baggageDescription.trim());

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="bg-[#F5F7FF] rounded-full px-4 py-3">
          <span className="text-sm font-semibold text-[#010D50]">{t('title')}</span>
        </div>
        <div className="bg-[#F5F7FF] rounded-full px-3 py-1.5">
          <span className="text-sm font-medium text-[#3754ED]">
            {t('callForInfo')}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Personal item */}
        <BaggageItem
          icon={ShoppingBag}
          title={t('personalItem')}
          description={t('personalItemDesc')}
          included={true}
          includedText={t('included')}
          notIncludedText={t('notIncluded')}
        />

        {/* Carry-on bag */}
        <BaggageItem
          icon={Briefcase}
          title={t('carryOn')}
          description={t('carryOnDimensions')}
          included={true}
          includedText={t('included')}
          notIncludedText={t('notIncluded')}
        />

        {/* Checked bags - Not Included */}
        <BaggageItem
          icon={Package}
          title={t('checkedBags')}
          description={baggageDescription || t('checkedBagsDesc')}
          included={hasCheckedIncluded}
          includedText={t('included')}
          notIncludedText={t('notIncluded')}
        />

        {/* Add Additional Baggage */}
        <BaggageCounter
          count={additionalBaggage}
          onIncrement={() => onUpdateBaggage(additionalBaggage + 1)}
          onDecrement={() => onUpdateBaggage(Math.max(0, additionalBaggage - 1))}
          title={t('addBaggage')}
          description={t('addBaggageDesc')}
          priceText={t('baggagePrice')}
        />
      </div>
    </div>
  );
}
