"use client";

import { useMemo, useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import type { TransformedPriceOption } from "@/types/priceCheck";
import { useBookingStore } from "@/store/bookingStore";

/** Debug component to display raw API response */
function RawResponseDebug({ rawResponse, title }: { rawResponse: any; title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-semibold text-yellow-800 w-full"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>🔧 {title}</span>
      </button>
      {isExpanded && (
        <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-900 overflow-auto max-h-80 whitespace-pre-wrap break-all">
          {JSON.stringify(rawResponse, null, 2)}
        </pre>
      )}
    </div>
  );
}

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
  rawResponse?: any;
}

function prettify(name: string) {
  if (!name) return "";
  const m: Record<string, string> = { PremiumEconomy: "Premium Economy" };
  if (m[name]) return m[name];
  
  // If it's all uppercase (like "ECONOMY LIGHT" or "PREMIUM"), convert to Title Case
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function TicketOptionsPanel({
  ticketOptions = [],
  currency,
  priceOptions = [],
  isLoading = false,
  onSelectFlight,
  onViewFlightInfo,
  rawResponse,
}: TicketOptionsPanelProps) {
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_FLIGHT_IDS === 'true';
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
          {/* Debug: Raw Price Check Response */}
          {isDebugMode && rawResponse && (
            <RawResponseDebug rawResponse={rawResponse} title="Price Check Raw Response" />
          )}
        </>
      )}
    </div>
  );
}

