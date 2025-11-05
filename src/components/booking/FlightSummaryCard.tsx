"use client";

import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import { useTranslations } from "next-intl";

interface FlightLeg {
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
  duration: string;
  stops: string;
  airline: string;
}

interface FlightSummaryCardProps {
  leg: FlightLeg;
  passengers: string;
  onViewDetails: () => void;
}

export function FlightSummaryCard({
  leg,
  passengers,
  onViewDetails,
}: FlightSummaryCardProps) {
  const t = useTranslations('booking.flightSummary');
  return (
    <div className="bg-[#F5F7FF] rounded-xl p-4 flex flex-col gap-4 overflow-hidden">
      {/* Mobile: Compact layout */}
      <div className="flex lg:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#010D50]">
              {leg.airline}
            </span>
            <span className="text-xs text-[#3A478A]">
              {leg.from} {t('to')} {leg.to}
            </span>
          </div>
        </div>
      </div>

      <div className="flex lg:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-[#3A478A]">{leg.fromCode}</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {leg.departureTime}
            </span>
          </div>
          <span className="text-xs text-[#3A478A]">→</span>
          <div className="flex flex-col">
            <span className="text-xs text-[#3A478A]">{leg.toCode}</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {leg.arrivalTime}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-[#3A478A]">{t('duration')}</span>
          <span className="text-sm font-semibold text-[#010D50]">
            {leg.duration}
          </span>
        </div>
      </div>

      <Button
        variant="link"
        onClick={onViewDetails}
        className="lg:hidden text-sm font-medium text-[#3754ED] p-0 h-auto w-fit"
      >
        {t('viewDetails')}
      </Button>

      {/* Desktop: Full layout */}
      <div className="hidden lg:flex flex-col gap-6">
        <span className="text-sm font-semibold text-[#010D50]">
          {leg.from} {t('to')} {leg.to}
        </span>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#010D50]">{leg.fromCode}</span>
              <span className="text-sm font-semibold text-[#010D50]">
                {leg.departureTime}
              </span>
            </div>
            <svg width="61" height="5" viewBox="0 0 61 5" fill="none">
              <circle cx="20" cy="2.5" r="2.5" fill="#010D50" />
              <line
                x1="0"
                y1="2.5"
                x2="61"
                y2="2.5"
                stroke="#010D50"
                strokeDasharray="4 4"
              />
            </svg>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#010D50]">
                {leg.arrivalTime}
              </span>
              <span className="text-sm text-[#010D50]">{leg.toCode}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#010D50] flex-wrap">
            <span>{leg.stops}</span>
            <div className="w-1 h-1 rounded-full bg-[#010D50]" />
            <span>{leg.duration}</span>
            <div className="w-1 h-1 rounded-full bg-[#010D50]" />
            <span>{leg.date}</span>
          </div>
        </div>
      </div>

      {/* Desktop: Airline and Actions */}
      <div className="hidden lg:flex items-end justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-[#010D50]">
            {leg.airline}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#010D50]">
          <span>{t('economy')}</span>
          <div className="w-1 h-1 rounded-full bg-[#010D50]" />
          <span>{passengers}</span>
        </div>
        <Button
          variant="link"
          onClick={onViewDetails}
          className="text-sm font-medium text-[#3754ED] p-0 h-auto"
        >
          {t('viewDetails')}
        </Button>
      </div>
    </div>
  );
}
