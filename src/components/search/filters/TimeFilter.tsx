"use client";

import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";

interface TimeFilterProps {
  outboundTime: [number, number];
  inboundTime: [number, number];
  onOutboundChange: (time: [number, number]) => void;
  onInboundChange: (time: [number, number]) => void;
}

export function TimeFilter({
  outboundTime,
  inboundTime,
  onOutboundChange,
  onInboundChange,
}: TimeFilterProps) {
  const t = useTranslations('search.filters');
  
  const formatTime = (hour: number) => {
    if (hour === 24) return "23:59";
    return `${String(hour).padStart(2, "0")}:00`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Outbound */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#3A478A]">{t('outbound')}</span>
        <div className="flex flex-col gap-2">
          <Slider
            value={outboundTime}
            onValueChange={(value) =>
              onOutboundChange(value as [number, number])
            }
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

      {/* Inbound */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#3A478A]">{t('inbound')}</span>
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
    </div>
  );
}
