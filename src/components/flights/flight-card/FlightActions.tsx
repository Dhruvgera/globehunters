"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";

interface FlightActionsProps {
  currency: string;
  pricePerPerson: number;
  showTicketOptions: boolean;
  onViewFlightInfo: () => void;
  onToggleTicketOptions: () => void;
  onPrefetchOptions?: () => void;
}

export function FlightActions({
  currency,
  pricePerPerson,
  showTicketOptions,
  onViewFlightInfo,
  onToggleTicketOptions,
  onPrefetchOptions,
}: FlightActionsProps) {
  const t = useTranslations('search.flights');
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
      <span className="text-lg font-medium text-[#010D50]">
        {formatPrice(pricePerPerson, currency)} {t('perPerson')}
      </span>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
        <Button
          variant="ghost"
          className="bg-[rgba(55,84,237,0.12)] hover:bg-[rgba(55,84,237,0.2)] text-[#3754ED] rounded-full px-3 sm:px-4 py-1.5 sm:py-2 h-auto text-[10px] sm:text-xs font-medium whitespace-nowrap"
          onClick={onViewFlightInfo}
          onMouseEnter={onPrefetchOptions}
        >
          {t('viewFlightInfo')}
        </Button>
        <Button
          variant="outline"
          className="rounded-lg px-3 sm:px-6 py-1.5 sm:py-2 h-auto text-[10px] sm:text-xs font-medium border-none hover:bg-gray-100 whitespace-nowrap"
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
      </div>
    </div>
  );
}
