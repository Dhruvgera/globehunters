"use client";

import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

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
  airlineCode?: string;
}

interface FlightSummaryCardProps {
  leg: FlightLeg;
  passengers: string;
  onViewDetails: () => void;
  cabinLabel?: string;
}

export function FlightSummaryCard({
  leg,
  passengers,
  onViewDetails,
  cabinLabel,
}: FlightSummaryCardProps) {
  const t = useTranslations('booking.flightSummary');
  const [imgError, setImgError] = useState(false);
  const logoUrl = leg.airlineCode ? `https://images.kiwi.com/airlines/64/${leg.airlineCode}.png` : undefined;
  return (
    <div className="bg-[#F5F7FF] rounded-xl p-4 flex flex-col gap-4 overflow-hidden">
      {/* Airline header (mobile and desktop) with real logo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {logoUrl && !imgError ? (
            <div className="w-10 h-10 relative flex items-center justify-center">
              <Image
                src={logoUrl}
                alt={`${leg.airline} logo`}
                width={40}
                height={40}
                className="object-contain"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#010D50]">
              {leg.airline}
            </span>
            <span className="text-xs text-[#3A478A] lg:hidden">
              {leg.from} {t('to')} {leg.to}
            </span>
          </div>
        </div>
        {/* Desktop: passengers and cabin */}
        <div className="hidden lg:flex items-center gap-3 text-sm text-[#010D50]">
          <span>{cabinLabel || t('economy')}</span>
          <div className="w-1 h-1 rounded-full bg-[#010D50]" />
          <span>{passengers}</span>
        </div>
      </div>

      {/* Mobile: Compact layout */}
      <div className="flex lg:hidden items-center justify-between mt-1">
        <div className="flex items-center gap-2"></div>
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

      {/* Desktop: Full layout - stretch across full width */}
      <div className="hidden lg:flex flex-col gap-6 w-full">
        <span className="text-sm font-semibold text-[#010D50]">
          {leg.from} {t('to')} {leg.to}
        </span>
        <div className="flex flex-col gap-3 w-full">
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

      {/* Desktop: Actions aligned to the right */}
      <div className="hidden lg:flex items-center justify-end">
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
