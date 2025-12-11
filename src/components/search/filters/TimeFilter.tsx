"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";

interface TimeFilterProps {
  outboundTime: [number, number];
  inboundTime: [number, number];
  onOutboundChange: (time: [number, number]) => void;
  onInboundChange: (time: [number, number]) => void;
  showInbound?: boolean;
  /** Departure airport code for outbound leg (e.g., "DEL") */
  outboundAirport?: string;
  /** Departure airport code for inbound/return leg (e.g., "YYZ") */
  inboundAirport?: string;
}

export function TimeFilter({
  outboundTime,
  inboundTime,
  onOutboundChange,
  onInboundChange,
  showInbound = true,
  outboundAirport,
  inboundAirport,
}: TimeFilterProps) {
  const t = useTranslations('search.filters');
  const [timeType, setTimeType] = useState<"takeoff" | "landing">("takeoff");
  
  const formatTime = (hour: number) => {
    if (hour === 24) return "23:59";
    return `${String(hour).padStart(2, "0")}:00`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Take-off / Landing toggle */}
      <div className="inline-flex w-full rounded-lg border border-[#DFE0E4] bg-white p-1">
        <button
          type="button"
          onClick={() => setTimeType("takeoff")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            timeType === "takeoff"
              ? "bg-[#010D50] text-white"
              : "text-[#3A478A] hover:bg-[#F3F4F6]"
          }`}
        >
          {t('takeOff')}
        </button>
        <button
          type="button"
          onClick={() => setTimeType("landing")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            timeType === "landing"
              ? "bg-[#010D50] text-white"
              : "text-[#3A478A] hover:bg-[#F3F4F6]"
          }`}
        >
          {t('landing')}
        </button>
      </div>

      {/* Outbound slider */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#3A478A]">
          {timeType === "takeoff" ? t('takeOffFrom') : t('landingAt')}{' '}
          {outboundAirport || ''}
        </span>
        <div className="flex flex-col gap-2">
          <Slider
            value={outboundTime}
            onValueChange={(value) => onOutboundChange(value as [number, number])}
            min={0}
            max={24}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {formatTime(outboundTime[0])}
            </span>
            <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {formatTime(outboundTime[1])}
            </span>
          </div>
        </div>
      </div>

      {/* Inbound slider (if round trip) */}
      {showInbound && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#3A478A]">
            {timeType === "takeoff" ? t('takeOffFrom') : t('landingAt')}{' '}
            {inboundAirport || ''}
          </span>
          <div className="flex flex-col gap-2">
            <Slider
              value={inboundTime}
              onValueChange={(value) => onInboundChange(value as [number, number])}
              min={0}
              max={24}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {formatTime(inboundTime[0])}
              </span>
              <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {formatTime(inboundTime[1])}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
