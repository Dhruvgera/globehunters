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
  return (
    <div className="flex flex-col gap-3">
      {/* Outbound */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#3A478A]">{t('outbound')}</span>
        <div className="flex flex-col gap-2">
          <Slider
            value={outboundDuration}
            onValueChange={(value) =>
              onOutboundChange(value as [number, number])
            }
            min={outboundMin}
            max={outboundMax}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {outboundDuration[0]} {t('hours')}
            </span>
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {outboundDuration[1]} {t('hours')}
            </span>
          </div>
        </div>
      </div>

      {showInbound && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#3A478A]">{t('inbound')}</span>
          <div className="flex flex-col gap-2">
            <Slider
              value={inboundDuration}
              onValueChange={(value) =>
                onInboundChange(value as [number, number])
              }
              min={inboundMin}
              max={inboundMax}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {inboundDuration[0]} {t('hours')}
              </span>
              <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                {inboundDuration[1]} {t('hours')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
