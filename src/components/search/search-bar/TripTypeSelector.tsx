"use client";

import { useTranslations } from "next-intl";

type TripType = "round-trip" | "one-way" | "multi-city";

interface TripTypeSelectorProps {
  tripType: TripType;
  onTripTypeChange: (type: TripType) => void;
  onRoundTripSelected?: () => void; // Callback when switching to round-trip
}

export function TripTypeSelector({
  tripType,
  onTripTypeChange,
  onRoundTripSelected,
}: TripTypeSelectorProps) {
  const t = useTranslations('search.tripType');
  
  const getTripTypeLabel = (type: TripType) => {
    switch (type) {
      case "round-trip":
        return t('roundTrip');
      case "one-way":
        return t('oneWay');
      case "multi-city":
        return t('multiCity');
    }
  };

  const handleSelect = (type: TripType) => {
    const wasNotRoundTrip = tripType !== "round-trip";
    onTripTypeChange(type);
    
    // If switching TO round-trip, trigger the callback to open date picker
    if (type === "round-trip" && wasNotRoundTrip && onRoundTripSelected) {
      // Small delay to allow the dropdown to close first
      setTimeout(() => {
        onRoundTripSelected();
      }, 100);
    }
  };

  return (
    <div className="inline-flex items-center rounded-full bg-[#F5F7FF] p-1">
      {([
        { key: "round-trip" as const, label: t('roundTrip') },
        { key: "one-way" as const, label: t('oneWay') },
        { key: "multi-city" as const, label: t('multiCity') },
      ]).map((opt) => {
        const active = tripType === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => handleSelect(opt.key)}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-white text-[#010D50] shadow-sm" : "text-[#010D50]/80 hover:text-[#010D50]",
            ].join(" ")}
          >
            <span
              className={[
                "w-4 h-4 rounded-full border flex items-center justify-center",
                active ? "border-[#3754ED]" : "border-[#010D50]/30",
              ].join(" ")}
              aria-hidden="true"
            >
              <span className={active ? "w-2 h-2 rounded-full bg-[#3754ED]" : "w-2 h-2 rounded-full bg-transparent"} />
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
