"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

interface StopsFilterProps {
  selectedStops: number[];
  onToggle: (stops: number) => void;
}

export function StopsFilter({ selectedStops, onToggle }: StopsFilterProps) {
  const t = useTranslations('search.filters');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedStops.includes(0)}
          onCheckedChange={() => onToggle(0)}
        />
        <span className="text-sm text-[#010D50]">{t('direct')}</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedStops.includes(1)}
          onCheckedChange={() => onToggle(1)}
        />
        <span className="text-sm text-[#010D50]">{t('oneStop')}</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedStops.includes(2)}
          onCheckedChange={() => onToggle(2)}
        />
        <span className="text-sm text-[#010D50]">{t('twoPlus')}</span>
      </div>
    </div>
  );
}
