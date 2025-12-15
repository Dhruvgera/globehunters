"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const hasUpgrades = !!(priceOptions && priceOptions.some((opt) => opt.isUpgrade));

  const chips = useMemo(() => {
    if (hasUpgrades) {
      return priceOptions.map((opt) => ({
        id: opt.id,
        label: prettify(opt.cabinClassDisplay),
        // Always show the actual total fare, not the price difference
        suffix: formatPrice(opt.totalPrice, opt.currency),
      }));
    }
    return ticketOptions.map((opt) => ({
      id: opt.type,
      label: opt.type,
      suffix: formatPrice(opt.price, currency),
    }));
  }, [hasUpgrades, priceOptions, ticketOptions, currency]);

  // Check if we have price data but no upgrades - show Book button only
  const hasDataNoUpgrades = !!(priceOptions && priceOptions.length > 0 && !hasUpgrades);

  return (
    <div className="mt-4 pt-4 border-t border-[#EEEEEE] pb-2 animate-fadeIn w-full max-w-full overflow-hidden">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-[#3754ED]" />
          <p className="mt-2 text-sm text-[#3A478A]">Loading fare options...</p>
        </div>
      ) : hasDataNoUpgrades ? (
        // No upgrades available - show just the Book button
        <div className="flex items-center gap-3">
          <Button
            className="bg-[#3754ED] hover:bg-[#2a42c9] text-white rounded-full px-6 py-2.5 h-auto text-sm font-semibold"
            onClick={onViewFlightInfo}
          >
            {t("book")}
          </Button>
          <span className="text-xs text-[#3A478A]">
            {t("noUpgradesAvailable")}
          </span>
        </div>
      ) : (
        <>
          <div className="mt-2 relative w-full">
            <div
              ref={scrollRef}
              className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin"
            >
              {chips.map((chip) => (
                <Button
                  key={chip.id}
                  variant="outline"
                  className="snap-start flex flex-col items-start justify-between bg-white text-[#010D50] border border-[#EEEEEE] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] hover:bg-white rounded-lg px-2.5 sm:px-4 py-2 sm:py-3 h-auto text-left min-w-[110px] sm:min-w-[140px] md:min-w-[160px] max-w-[130px] sm:max-w-[160px] md:max-w-[180px] shrink-0"
                  onClick={() => {
                    if (hasUpgrades && onViewFlightInfo) {
                      // Persist selected upgrade before opening details
                      const selected = priceOptions.find((p) => p.id === chip.id);
                      if (selected) {
                        setSelectedUpgrade(selected);
                      }
                      onViewFlightInfo();
                      return;
                    }
                    if (onViewFlightInfo) {
                      onViewFlightInfo();
                      return;
                    }
                    if (onSelectFlight) {
                      onSelectFlight(chip.label);
                    }
                  }}
                >
                  <span className="text-[10px] sm:text-xs font-medium leading-tight">{chip.label}</span>
                  {chip.suffix && (
                    <span className="mt-0.5 text-sm sm:text-base font-semibold text-[#010D50]">
                      {chip.suffix}
                    </span>
                  )}
                  <span className="mt-1.5 sm:mt-2 inline-flex w-full items-center justify-center rounded-full border border-[#3754ED] bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-medium text-[#3754ED] text-center leading-tight whitespace-nowrap">
                    View
                  </span>
                </Button>
              ))}
            </div>
            {chips.length > 3 && (
              <button
                type="button"
                aria-label="Scroll ticket options"
                className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#EEEEEE] shadow-[0px_2px_8px_rgba(0,0,0,0.12)] absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  const scrollAmount = el.clientWidth * 0.6;
                  el.scrollBy({ left: scrollAmount, behavior: "smooth" });
                }}
              >
                <ChevronRight className="w-4 h-4 text-[#3754ED]" />
              </button>
            )}
          </div>
          {!hasUpgrades && (
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

