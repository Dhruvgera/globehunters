"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";

interface FlightActionsProps {
  currency: string;
  pricePerPerson: number;
  primaryPriceLabel?: string;
  secondaryPriceLabel?: string;
  showTicketOptions: boolean;
  showTicketOptionsToggle?: boolean;
  onViewFlightInfo: () => void;
  onToggleTicketOptions: () => void;
  onPrefetchOptions?: () => void;
  onBook?: () => void;
}

export function FlightActions({
  currency,
  pricePerPerson,
  primaryPriceLabel,
  secondaryPriceLabel,
  showTicketOptions,
  showTicketOptionsToggle = true,
  onViewFlightInfo,
  onToggleTicketOptions,
  onPrefetchOptions,
  onBook,
}: FlightActionsProps) {
  const t = useTranslations('search.flights');
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
      <span className="text-lg font-medium text-[#010D50]">
        {primaryPriceLabel || `${formatPrice(pricePerPerson, currency)} ${t('perPerson')}`}
      </span>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
        {secondaryPriceLabel ? (
          <span className="text-xs text-[#3A478A] whitespace-nowrap">{secondaryPriceLabel}</span>
        ) : null}
        <Button
          variant="ghost"
          className="bg-[rgba(55,84,237,0.12)] hover:bg-[rgba(55,84,237,0.2)] text-[#3754ED] rounded-full px-3 sm:px-4 py-1.5 sm:py-2 h-auto text-[10px] sm:text-xs font-medium whitespace-nowrap"
          onClick={onViewFlightInfo}
          onMouseEnter={onPrefetchOptions}
        >
          {t('viewFlightInfo')}
        </Button>
        {onBook ? (
          <Button
            className="rounded-full px-3 sm:px-4 py-1.5 sm:py-2 h-auto text-[10px] sm:text-xs font-semibold whitespace-nowrap bg-[#3754ED] hover:bg-[#2A3FB8] text-white"
            onClick={onBook}
            onMouseEnter={onPrefetchOptions}
          >
            {t('book')}
          </Button>
        ) : null}
        {showTicketOptionsToggle ? (
          <Button
            variant="outline"
            className="hidden rounded-lg px-3 sm:px-6 py-1.5 sm:py-2 h-auto text-[10px] sm:text-xs font-medium border-none hover:bg-gray-100 whitespace-nowrap"
            onClick={onToggleTicketOptions}
            onMouseEnter={onPrefetchOptions}
          >
            {t('ticketOptions')}
            {showTicketOptions ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
        ) : null}

      </div>
    </div>
  );
}
