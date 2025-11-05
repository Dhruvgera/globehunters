"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface TicketOption {
  type: string;
  price: number;
}

interface TicketOptionsPanelProps {
  ticketOptions: TicketOption[];
  currency: string;
  onSelectFlight: (fareType: "Eco Value" | "Eco Classic" | "Eco Flex") => void;
}

export function TicketOptionsPanel({
  ticketOptions,
  currency,
  onSelectFlight,
}: TicketOptionsPanelProps) {
  const t = useTranslations('search.flights');
  const optionsRef = useRef<HTMLDivElement>(null);
  const [optionsProgress, setOptionsProgress] = useState(0);

  const handleOptionsScroll = () => {
    const el = optionsRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pct = max > 0 ? (el.scrollLeft / max) * 100 : 0;
    setOptionsProgress(pct);
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#EEEEEE] pb-4 animate-fadeIn">
      <div
        ref={optionsRef}
        onScroll={handleOptionsScroll}
        className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4"
      >
        {ticketOptions.map((option) => (
          <div
            key={option.type}
            className="min-w-[220px] sm:min-w-0 flex-1 border border-[#EEEEEE] rounded-lg flex flex-col snap-start overflow-hidden"
          >
            {/* Scrollable content area */}
            <div className="p-4 flex flex-col gap-3 flex-1">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#010D50]">{option.type}</span>
                <span className="text-lg font-medium text-[#010D50]">
                  {currency}
                  {option.price}
                </span>
              </div>
            </div>

            {/* Sticky price and button section */}
            <div className="sticky bottom-0 bg-white border-t border-[#EEEEEE] p-4 mt-auto">
              <Button
                onClick={() =>
                  onSelectFlight(
                    option.type as "Eco Value" | "Eco Classic" | "Eco Flex"
                  )
                }
                className="w-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white border border-[#3754ED] rounded-full py-2 h-auto text-xs font-medium"
              >
                {t('select')} {option.type.split(" ")[1]}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-2 bg-[#F5F5F5] rounded-lg relative">
        <div
          className="absolute left-0 top-0 h-full bg-[#010D50] rounded-lg transition-[width] duration-150"
          style={{ width: `${optionsProgress}%` }}
        />
      </div>
    </div>
  );
}
