"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Plane } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/currency";

interface Airline {
  code: string;
  name: string;
  minPrice: number;
}

interface AirlineFilterProps {
  airlines: Airline[];
  selectedAirlines: string[];
  onToggle: (name: string) => void;
  onToggleAll: () => void;
}

function AirlineLogo({ code, name }: { code: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = `https://images.kiwi.com/airlines/64/${code}.png`;

  if (imgError) {
    return (
      <div className="w-6 h-6 bg-[#DA0E29] rounded flex items-center justify-center">
        <Plane className="w-3 h-3 text-white" />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 relative flex items-center justify-center">
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={24}
        height={24}
        className="object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

export function AirlineFilter({
  airlines,
  selectedAirlines,
  onToggle,
  onToggleAll,
}: AirlineFilterProps) {
  const t = useTranslations('search.filters');
  const allSelected = selectedAirlines.length === airlines.length;

  return (
    <div className="flex flex-col gap-2">
      {/* Select All */}
      <div className="flex items-center gap-2">
        <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
        <span className="text-sm text-[#010D50]">{t('selectAll')}</span>
      </div>

      {/* Individual Airlines */}
      {airlines.map((airline) => (
        <div key={airline.code} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedAirlines.includes(airline.name)}
              onCheckedChange={() => onToggle(airline.name)}
            />
            <div className="flex items-center gap-2">
              <AirlineLogo code={airline.code} name={airline.name} />
              <span className="text-sm text-[#010D50]">{airline.name}</span>
            </div>
          </div>
          <span className="text-sm font-medium text-[#010D50]">
            {formatPrice(airline.minPrice, 'GBP')}
          </span>
        </div>
      ))}
    </div>
  );
}
