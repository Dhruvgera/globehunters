"use client";

import { useRef, useEffect, useCallback } from "react";
import { ChevronDown, CalendarDays, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";

interface DatePrice {
  date: string;
  price: number;
}

interface DatePriceSelectorProps {
  departureDates: DatePrice[];
  returnDates?: DatePrice[];
  selectedDepartureIndex: number;
  selectedReturnIndex?: number;
  onSelectDepartureDate: (index: number) => void;
  onSelectReturnDate?: (index: number) => void;
  currency?: string;
  loadingIndices?: Set<number>;
  onDateInView?: (index: number, type: 'departure' | 'return') => void;
}

function DateSlider({
  label,
  icon: Icon,
  dates,
  selectedIndex,
  onSelectDate,
  currency = 'GBP',
  loadingIndices = new Set(),
  onDateInView,
  type,
}: {
  label: string;
  icon: typeof CalendarDays;
  dates: DatePrice[];
  selectedIndex: number;
  onSelectDate: (index: number) => void;
  currency?: string;
  loadingIndices?: Set<number>;
  onDateInView?: (index: number, type: 'departure' | 'return') => void;
  type: 'departure' | 'return';
}) {
  const t = useTranslations('search.flights');
  const dateStripRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const dateRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const scrollDatesBy = (dir: 1 | -1) => {
    const el = dateStripRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!onDateInView || typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            onDateInView(index, type);
          }
        });
      },
      {
        root: dateStripRef.current,
        threshold: 0.5,
      }
    );

    dateRefs.current.forEach((ref) => {
      if (ref) {
        observerRef.current?.observe(ref);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [dates.length, onDateInView, type]);

  useEffect(() => {
    const el = dateStripRef.current;
    const selectedButton = dateRefs.current[selectedIndex];
    
    if (!el || !selectedButton) return;
    
    // Use setTimeout to ensure DOM has settled and layout is complete
    const timeoutId = setTimeout(() => {
      // Use scrollIntoView with center alignment for more reliable centering
      selectedButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [selectedIndex, dates.length]);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 px-1">
        <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-[#3754ED]" />
        <span className="text-xs sm:text-sm font-medium text-[#010D50]">{label}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-[#DFE0E4] shrink-0 h-8 w-8 sm:h-10 sm:w-10"
          onClick={() => scrollDatesBy(-1)}
        >
          <ChevronDown className="w-4 h-4 sm:w-6 sm:h-6 rotate-90" />
        </Button>

        <div
          ref={dateStripRef}
          className="flex-1 flex items-stretch gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory min-w-0"
        >
          {dates.map((datePrice, index) => {
            const active = index === selectedIndex;
            const isLoading = loadingIndices.has(index);
            return (
              <button
                type="button"
                key={index}
                ref={(el) => {
                  dateRefs.current[index] = el;
                }}
                data-index={index}
                onClick={() => onSelectDate(index)}
                className={`snap-center flex flex-col items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-3 border rounded-lg min-w-[90px] sm:min-w-[110px] md:min-w-[120px] lg:min-w-[130px] transition-colors outline-none focus-visible:ring-0 ${
                  active
                    ? "bg-[#F5F7FF] border-[#3754ED]"
                    : "bg-white border-[#DFE0E4] hover:bg-gray-50"
                }`}
              >
                <span className="text-[10px] sm:text-xs text-center text-[#010D50] truncate max-w-full px-1">
                  {datePrice.date}
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-xs text-[#3A478A]">{t('from')}</span>
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-[#3754ED]" />
                  ) : (
                    <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                      {formatPrice(datePrice.price, currency)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-[#DFE0E4] shrink-0 h-8 w-8 sm:h-10 sm:w-10"
          onClick={() => scrollDatesBy(1)}
        >
          <ChevronDown className="w-4 h-4 sm:w-6 sm:h-6 -rotate-90" />
        </Button>
      </div>
    </div>
  );
}

export function DatePriceSelector({
  departureDates,
  returnDates,
  selectedDepartureIndex,
  selectedReturnIndex = 0,
  onSelectDepartureDate,
  onSelectReturnDate,
  currency = 'GBP',
  loadingIndices,
  onDateInView,
}: DatePriceSelectorProps) {
  const t = useTranslations('search.dateSelector');

  const handleDateInView = useCallback((index: number, type: 'departure' | 'return') => {
    if (onDateInView) {
      onDateInView(index, type);
    }
  }, [onDateInView]);

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 mb-4 sm:mb-6 mt-4 sm:mt-6">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 min-w-0">
        {/* Departure Dates */}
        <div className="flex-1 min-w-0">
          <DateSlider
            label={t('departureDate')}
            icon={CalendarDays}
            dates={departureDates}
            selectedIndex={selectedDepartureIndex}
            onSelectDate={onSelectDepartureDate}
            currency={currency}
            loadingIndices={loadingIndices}
            onDateInView={handleDateInView}
            type="departure"
          />
        </div>

        {/* Return Dates (if round trip) */}
        {returnDates && onSelectReturnDate && (
          <div className="flex-1 min-w-0">
            <DateSlider
              label={t('returnDate')}
              icon={CalendarClock}
              dates={returnDates}
              selectedIndex={selectedReturnIndex}
              onSelectDate={onSelectReturnDate}
              currency={currency}
              loadingIndices={loadingIndices}
              onDateInView={handleDateInView}
              type="return"
            />
          </div>
        )}
      </div>
    </div>
  );
}
