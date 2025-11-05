"use client";

import { Slider } from "@/components/ui/slider";

interface JourneyTimeFilterProps {
  outboundDuration: [number, number];
  inboundDuration: [number, number];
  onOutboundChange: (duration: [number, number]) => void;
  onInboundChange: (duration: [number, number]) => void;
}

export function JourneyTimeFilter({
  outboundDuration,
  inboundDuration,
  onOutboundChange,
  onInboundChange,
}: JourneyTimeFilterProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Outbound */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#3A478A]">Outbound</span>
        <div className="flex flex-col gap-2">
          <Slider
            value={outboundDuration}
            onValueChange={(value) =>
              onOutboundChange(value as [number, number])
            }
            min={0}
            max={35}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {outboundDuration[0]} Hours
            </span>
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {outboundDuration[1]} Hours
            </span>
          </div>
        </div>
      </div>

      {/* Inbound */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#3A478A]">Inbound</span>
        <div className="flex flex-col gap-2">
          <Slider
            value={inboundDuration}
            onValueChange={(value) =>
              onInboundChange(value as [number, number])
            }
            min={0}
            max={35}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {inboundDuration[0]} Hours
            </span>
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {inboundDuration[1]} Hours
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
