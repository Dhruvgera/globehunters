"use client";

import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";

interface JourneyTimeFilterProps {
  outboundDuration: [number, number];
  inboundDuration: [number, number];
  onOutboundChange: (duration: [number, number]) => void;
  onInboundChange: (duration: [number, number]) => void;
  outboundMin?: number;
  outboundMax?: number;
  inboundMin?: number;
  inboundMax?: number;
  showInbound?: boolean;
}

export function JourneyTimeFilter({
  outboundDuration,
  inboundDuration,
  onOutboundChange,
  onInboundChange,
  outboundMin = 0,
  outboundMax = 35,
  inboundMin = 0,
  inboundMax = 35,
  showInbound = true,
}: JourneyTimeFilterProps) {
  const t = useTranslations('search.filters');
  
  // Ensure values are clamped within bounds
  // The lower bound (left slider) can be adjusted, but the upper bound (right slider)
  // can never go below the minimum journey time
  const handleOutboundChange = (value: number[]) => {
    const [low, high] = value as [number, number];
    // Ensure low bound is at least outboundMin
    const clampedLow = Math.max(outboundMin, low);
    // Ensure high bound is at least the minimum journey time (can't filter out all flights)
    const clampedHigh = Math.max(outboundMin, high);
    onOutboundChange([clampedLow, clampedHigh]);
  };
  
  const handleInboundChange = (value: number[]) => {
    const [low, high] = value as [number, number];
    const clampedLow = Math.max(inboundMin, low);
    const clampedHigh = Math.max(inboundMin, high);
    onInboundChange([clampedLow, clampedHigh]);
  };
  
  // Ensure displayed values are within bounds
  const displayOutbound: [number, number] = [
    Math.max(outboundMin, outboundDuration[0]),
    Math.max(outboundMin, outboundDuration[1])
  ];
  const displayInbound: [number, number] = [
    Math.max(inboundMin, inboundDuration[0]),
    Math.max(inboundMin, inboundDuration[1])
  ];
  
  return (
    <div className="flex flex-col gap-3">
      {/* Outbound */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#3A478A]">{t('outbound')}</span>
        <div className="flex flex-col gap-2">
          <Slider
            value={displayOutbound}
            onValueChange={handleOutboundChange}
            min={outboundMin}
            max={outboundMax}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {displayOutbound[0]} {t('hours')}
            </span>
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {displayOutbound[1]} {t('hours')}
            </span>
          </div>
        </div>
      </div>

      {showInbound && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#3A478A]">{t('inbound')}</span>
          <div className="flex flex-col gap-2">
            <Slider
              value={displayInbound}
              onValueChange={handleInboundChange}
              min={inboundMin}
              max={inboundMax}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {displayInbound[0]} {t('hours')}
              </span>
              <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {displayInbound[1]} {t('hours')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
