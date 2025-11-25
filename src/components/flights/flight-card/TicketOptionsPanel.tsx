"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import type { TransformedPriceOption } from "@/types/priceCheck";
import { useBookingStore } from "@/store/bookingStore";

interface TicketOption {
  type: string;
  price: number;
}

interface TicketOptionsPanelProps {
  ticketOptions?: TicketOption[];
  currency: string;
  priceOptions?: TransformedPriceOption[];
  isLoading?: boolean;
  onSelectFlight?: (fareType: string) => void;
  onViewFlightInfo?: () => void;
}

function prettify(name: string) {
  if (!name) return "";
  const m: Record<string, string> = { PremiumEconomy: "Premium Economy" };
  return m[name] || name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function TicketOptionsPanel({
  ticketOptions = [],
  currency,
  priceOptions = [],
  isLoading = false,
  onSelectFlight,
  onViewFlightInfo,
}: TicketOptionsPanelProps) {
  const t = useTranslations("search.flights");
  const setSelectedUpgrade = useBookingStore((s) => s.setSelectedUpgrade);

  const hasApiOptions = !!(priceOptions && priceOptions.some((opt) => opt.isUpgrade));

  const chips = useMemo(() => {
    if (hasApiOptions) {
      return priceOptions.map((opt) => ({
        id: opt.id,
        label: prettify(opt.cabinClassDisplay),
        suffix:
          opt.isUpgrade && opt.priceDifference
            ? `+${formatPrice(opt.priceDifference, opt.currency)}`
            : undefined,
      }));
    }
    return ticketOptions.map((opt) => ({
      id: opt.type,
      label: opt.type,
      suffix: formatPrice(opt.price, currency),
    }));
  }, [hasApiOptions, priceOptions, ticketOptions, currency]);

  return (
    <div className="mt-4 pt-4 border-t border-[#EEEEEE] pb-2 animate-fadeIn">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-[#3754ED]" />
          <p className="mt-2 text-sm text-[#3A478A]">Loading fare options...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Button
                key={chip.id}
                variant="outline"
                className="bg-[#F5F7FF] text-[#010D50] border-0 hover:bg-[#E0E7FF] rounded-full px-4 py-2.5 h-auto text-sm font-semibold leading-normal whitespace-nowrap"
                onClick={() => {
                  if (hasApiOptions && onViewFlightInfo) {
                    // Persist selected upgrade before opening details
                    const selected = priceOptions.find((p) => p.id === chip.id);
                    if (selected) {
                      setSelectedUpgrade(selected);
                    }
                    onViewFlightInfo();
                  } else if (onSelectFlight) {
                    onSelectFlight(chip.label);
                  }
                }}
              >
                {chip.label}
                {chip.suffix && <span className="ml-2 text-xs opacity-80">{chip.suffix}</span>}
              </Button>
            ))}
          </div>
          {!hasApiOptions && (
            <p className="mt-3 text-xs text-[#3A478A]">
              {t("viewFlightInfo")} to see detailed fare benefits
            </p>
          )}
        </>
      )}
    </div>
  );
}

