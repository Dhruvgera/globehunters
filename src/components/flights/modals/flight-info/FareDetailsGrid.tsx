"use client";

import { Check, X } from "lucide-react";

type FareType = "value" | "classic" | "flex";

interface FareDetail {
  feature: string;
  value: boolean | string;
  classic: boolean | string;
  flex: boolean | string;
}

interface FareDetailsGridProps {
  selectedFare: FareType;
}

const fareDetails: FareDetail[] = [
  {
    feature: "Checked baggage",
    value: "1 x 23kg",
    classic: "2 x 23kg",
    flex: "2 x 23kg",
  },
  {
    feature: "Cabin baggage",
    value: "1 x 7kg",
    classic: "1 x 7kg",
    flex: "1 x 7kg",
  },
  {
    feature: "Seat selection",
    value: false,
    classic: true,
    flex: true,
  },
  {
    feature: "Flexible tickets",
    value: false,
    classic: false,
    flex: true,
  },
  {
    feature: "Cancellation",
    value: false,
    classic: false,
    flex: true,
  },
];

export function FareDetailsGrid({ selectedFare }: FareDetailsGridProps) {
  const renderValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <X className="w-4 h-4 text-red-600" />
      );
    }
    return <span className="text-sm text-[#010D50]">{value}</span>;
  };

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
      <span className="text-sm font-semibold text-[#010D50]">
        What&apos;s included
      </span>
      <div className="flex flex-col gap-2">
        {fareDetails.map((detail, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-[#DFE0E4] last:border-0"
          >
            <span className="text-sm text-[#3A478A]">{detail.feature}</span>
            <div className="flex items-center gap-4">
              {renderValue(detail[selectedFare])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
