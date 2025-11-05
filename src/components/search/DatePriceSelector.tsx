"use client";

import { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatePrice {
  date: string;
  price: number;
}

interface DatePriceSelectorProps {
  dates: DatePrice[];
  selectedIndex: number;
  onSelectDate: (index: number) => void;
}

export function DatePriceSelector({
  dates,
  selectedIndex,
  onSelectDate,
}: DatePriceSelectorProps) {
  const dateStripRef = useRef<HTMLDivElement>(null);

  const scrollDatesBy = (dir: 1 | -1) => {
    const el = dateStripRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  useEffect(() => {
    const el = dateStripRef.current;
    if (!el) return;
    const child = el.children[selectedIndex] as HTMLElement | undefined;
    if (child) {
      const childLeft = child.offsetLeft;
      const childRight = childLeft + child.offsetWidth;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (childLeft < viewLeft)
        el.scrollTo({ left: childLeft - 8, behavior: "smooth" });
      else if (childRight > viewRight)
        el.scrollTo({ left: childRight - el.clientWidth + 8, behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6 mt-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-[#DFE0E4] shrink-0"
          onClick={() => scrollDatesBy(-1)}
        >
          <ChevronDown className="w-6 h-6 rotate-90" />
        </Button>

        <div
          ref={dateStripRef}
          className="flex-1 flex items-stretch gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory"
        >
          {dates.map((datePrice, index) => {
            const active = index === selectedIndex;
            return (
              <button
                type="button"
                key={index}
                onClick={() => onSelectDate(index)}
                className={`snap-start flex flex-col items-center justify-between gap-2 p-3 border rounded-lg min-w-[110px] sm:min-w-[120px] lg:min-w-[140px] transition-colors outline-none focus-visible:ring-0 ${
                  active
                    ? "bg-[#F5F7FF] border-[#3754ED]"
                    : "bg-white border-[#DFE0E4] hover:bg-gray-50"
                }`}
              >
                <span className="text-xs text-center text-[#010D50] truncate max-w-[120px]">
                  {datePrice.date}
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-[#3A478A]">From</span>
                  <span className="text-sm font-medium text-[#010D50]">
                    £{datePrice.price}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-[#DFE0E4] shrink-0"
          onClick={() => scrollDatesBy(1)}
        >
          <ChevronDown className="w-6 h-6 -rotate-90" />
        </Button>
      </div>
    </div>
  );
}
