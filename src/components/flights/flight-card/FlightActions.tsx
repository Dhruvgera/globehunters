"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/share-button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import { Flight } from "@/types/flight";

interface FlightActionsProps {
  flight: Flight;
  currency: string;
  pricePerPerson: number;
  showTicketOptions: boolean;
  onViewFlightInfo: () => void;
  onToggleTicketOptions: () => void;
  onPrefetchOptions?: () => void;
}

export function FlightActions({
  flight,
  currency,
  pricePerPerson,
  showTicketOptions,
  onViewFlightInfo,
  onToggleTicketOptions,
  onPrefetchOptions,
}: FlightActionsProps) {
  const t = useTranslations('search.flights');
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <span className="text-lg font-medium text-[#010D50]">
        {formatPrice(pricePerPerson, currency)} {t('perPerson')}
      </span>

      <div className="flex items-center gap-2 flex-shrink-0">
        <ShareButton flight={flight} />
        <Button
          variant="ghost"
          className="bg-[rgba(55,84,237,0.12)] hover:bg-[rgba(55,84,237,0.2)] text-[#3754ED] rounded-full px-4 py-2 h-auto text-xs font-medium"
          onClick={onViewFlightInfo}
          onMouseEnter={onPrefetchOptions}
        >
          {t('viewFlightInfo')}
        </Button>
        <Button
          variant="outline"
          className="rounded-lg px-6 py-2 h-auto text-xs font-medium border-none hover:bg-gray-100"
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
