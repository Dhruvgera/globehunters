"use client";

import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";

interface TimeFilterProps {
  outboundTime: [number, number];
  inboundTime: [number, number];
  outboundArrivalTime?: [number, number];
  inboundArrivalTime?: [number, number];
  onOutboundChange: (time: [number, number]) => void;
  onInboundChange: (time: [number, number]) => void;
  onOutboundArrivalChange?: (time: [number, number]) => void;
  onInboundArrivalChange?: (time: [number, number]) => void;
  showInbound?: boolean;
  /** Departure airport code for outbound leg (e.g., "DEL") */
  outboundAirport?: string;
  /** Departure airport code for inbound/return leg (e.g., "YYZ") */
  inboundAirport?: string;
  /** Arrival airport code for outbound leg (e.g., "YYZ") */
  outboundArrivalAirport?: string;
  /** Arrival airport code for inbound/return leg (e.g., "DEL") */
  inboundArrivalAirport?: string;
  /** Full name of departure airport for outbound leg */
  outboundAirportName?: string;
  /** Full name of departure airport for inbound/return leg */
  inboundAirportName?: string;
  /** Full name of arrival airport for outbound leg */
  outboundArrivalAirportName?: string;
  /** Full name of arrival airport for inbound/return leg */
  inboundArrivalAirportName?: string;
  /** Current time filter mode */
  timeType?: "takeoff" | "landing";
  /** Callback when time type mode changes */
  onTimeTypeChange?: (type: "takeoff" | "landing") => void;
  /** Time bounds for sliders */
  timeBounds?: {
    outboundDeparture?: { min: number; max: number };
    outboundArrival?: { min: number; max: number };
    inboundDeparture?: { min: number; max: number };
    inboundArrival?: { min: number; max: number };
  };
}

export function TimeFilter({
  outboundTime,
  inboundTime,
  outboundArrivalTime = [0, 24],
  inboundArrivalTime = [0, 24],
  onOutboundChange,
  onInboundChange,
  onOutboundArrivalChange,
  onInboundArrivalChange,
  showInbound = true,
  outboundAirport,
  inboundAirport,
  outboundArrivalAirport,
  inboundArrivalAirport,
  outboundAirportName,
  inboundAirportName,
  outboundArrivalAirportName,
  inboundArrivalAirportName,
  timeType = "takeoff",
  onTimeTypeChange,
  timeBounds,
}: TimeFilterProps) {
  const t = useTranslations('search.filters');
  
  // Handle time type toggle
  const handleTimeTypeChange = (newType: "takeoff" | "landing") => {
    if (onTimeTypeChange) {
      onTimeTypeChange(newType);
    }
  };
  
  const formatTime = (hour: number) => {
    if (hour === 24) return "23:59";
    return `${String(hour).padStart(2, "0")}:00`;
  };

  // Determine which values and handlers to use based on time type
  const outboundValue = timeType === "landing" ? outboundArrivalTime : outboundTime;
  const inboundValue = timeType === "landing" ? inboundArrivalTime : inboundTime;
  const outboundHandler = timeType === "landing" 
    ? (onOutboundArrivalChange || onOutboundChange) 
    : onOutboundChange;
  const inboundHandler = timeType === "landing" 
    ? (onInboundArrivalChange || onInboundChange) 
    : onInboundChange;
  
  // Get bounds based on mode
  const outboundBounds = timeType === "landing" 
    ? (timeBounds?.outboundArrival || { min: 0, max: 24 })
    : (timeBounds?.outboundDeparture || { min: 0, max: 24 });
  const inboundBounds = timeType === "landing"
    ? (timeBounds?.inboundArrival || { min: 0, max: 24 })
    : (timeBounds?.inboundDeparture || { min: 0, max: 24 });
  
  // Airport labels based on mode - prefer full names, fallback to codes
  const outboundLabel = timeType === "takeoff" 
    ? (outboundAirportName || outboundAirport || '') 
    : (outboundArrivalAirportName || outboundArrivalAirport || '');
  const inboundLabel = timeType === "takeoff" 
    ? (inboundAirportName || inboundAirport || '') 
    : (inboundArrivalAirportName || inboundArrivalAirport || '');

  return (
    <div className="flex flex-col gap-3">
      {/* Take-off / Landing toggle */}
      <div className="inline-flex w-full rounded-lg border border-[#DFE0E4] bg-white p-1">
        <button
          type="button"
          onClick={() => handleTimeTypeChange("takeoff")}
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
          onClick={() => handleTimeTypeChange("landing")}
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
          {outboundLabel}
        </span>
        <div className="flex flex-col gap-2">
          <Slider
            value={outboundValue}
            onValueChange={(value) => outboundHandler(value as [number, number])}
            min={outboundBounds.min}
            max={outboundBounds.max}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#6B7280] mb-0.5">From</span>
              <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {formatTime(outboundValue[0])}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#6B7280] mb-0.5">To</span>
              <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {formatTime(outboundValue[1])}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inbound slider (if round trip) */}
      {showInbound && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#3A478A]">
            {timeType === "takeoff" ? t('takeOffFrom') : t('landingAt')}{' '}
            {inboundLabel}
          </span>
          <div className="flex flex-col gap-2">
            <Slider
              value={inboundValue}
              onValueChange={(value) => inboundHandler(value as [number, number])}
              min={inboundBounds.min}
              max={inboundBounds.max}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-[#6B7280] mb-0.5">From</span>
                <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                  {formatTime(inboundValue[0])}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-[#6B7280] mb-0.5">To</span>
                <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                  {formatTime(inboundValue[1])}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
