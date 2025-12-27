"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [isOpen, setIsOpen] = useState(false);

  // Close popover on scroll to prevent it from overlapping the navbar
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => setIsOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);
  
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
    setIsOpen(false); // Close the popover
    
    // If switching TO round-trip, trigger the callback to open date picker
    if (type === "round-trip" && wasNotRoundTrip && onRoundTripSelected) {
      // Small delay to allow the dropdown to close first
      setTimeout(() => {
        onRoundTripSelected();
      }, 100);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 rounded-[40px] px-0 hover:bg-transparent h-auto"
        >
          <ArrowLeftRight className="w-5 h-5 text-[#010D50]" />
          <span className="text-sm font-medium text-[#010D50]">
            {getTripTypeLabel(tripType)}
          </span>
          <ChevronDown className="w-5 h-5 text-[#010D50]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(12rem,calc(100vw-32px))] max-h-[calc(100vh-120px)] overflow-auto overscroll-contain"
        side="bottom"
        sideOffset={8}
        align="start"
        avoidCollisions={true}
        collisionPadding={{ top: 80, bottom: 16, left: 16, right: 16 }}
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => handleSelect("round-trip")}
          >
            {t('roundTrip')}
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => handleSelect("one-way")}
          >
            {t('oneWay')}
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => handleSelect("multi-city")}
          >
            {t('multiCity')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
