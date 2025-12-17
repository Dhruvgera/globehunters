"use client";

import { Briefcase, ShoppingBag, Luggage } from "lucide-react";
import { useTranslations } from "next-intl";
import { BaggageItem } from "./baggage/BaggageItem";
import { BaggageCounter } from "./baggage/BaggageCounter";

interface BaggageSectionProps {
  additionalBaggage: number;
  onUpdateBaggage: (count: number) => void;
  baggageDescription?: string;
  /** Maximum number of bags allowed (typically adults + children count) */
  maxBaggageCount?: number;
  /** Price per bag for additional baggage (default: 90) */
  baggagePrice?: number;
  /** Currency symbol (default: £) */
  currencySymbol?: string;
}

export function BaggageSection({
  additionalBaggage,
  onUpdateBaggage,
  baggageDescription,
  maxBaggageCount = 10,
  baggagePrice = 90,
  currencySymbol = "£",
}: BaggageSectionProps) {
  const t = useTranslations('payment.baggage');

  // Check if baggage is NOT included - matches: "no", "none", "0", "0p", "0 pc", "0 piece", "0 pieces", "0 kg", "0kg", etc.
  // Also treat "cabin" or "cabin only" or "cabin bag only" or "cabin baggage" as not having checked baggage
  const hasCheckedIncluded = !!baggageDescription &&
    !/^no$|^none$|^0\s*(p|pc|pcs|piece|pieces|kg|lb|lbs)?$|^cabin\s*(bag)?\s*(only|baggage)?$/i.test(baggageDescription.trim());

  // Format the price text for additional baggage
  const formattedPriceText = `(${currencySymbol}${baggagePrice.toFixed(2)} per person each way)`;

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

        {/* Checked bags */}
        <BaggageItem
          icon={Luggage}
          title={t('checkedBags')}
          description={hasCheckedIncluded ? (baggageDescription || t('checkedBagsDesc')) : t('checkedBagsDesc')}
          included={hasCheckedIncluded}
          includedText={t('included')}
          notIncludedText={t('notIncluded')}
        />

        {/* Add Additional Baggage - Only show if baggage NOT included */}
        {!hasCheckedIncluded && (
          <BaggageCounter
            count={additionalBaggage}
            onIncrement={() => onUpdateBaggage(Math.min(additionalBaggage + 1, maxBaggageCount))}
            onDecrement={() => onUpdateBaggage(Math.max(0, additionalBaggage - 1))}
            maxCount={maxBaggageCount}
            title={t('addBaggage')}
            description={t('addBaggageDesc')}
            priceText={formattedPriceText}
          />
        )}
      </div>
    </div>
  );
}
