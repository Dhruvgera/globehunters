"use client";

import { useState, useEffect } from "react";
import { Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "next-intl";

interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

interface PassengersSelectorProps {
  passengers: Passengers;
  travelClass: string;
  onPassengersChange: (passengers: Passengers) => void;
  onTravelClassChange: (travelClass: string) => void;
}

export function PassengersSelector({
  passengers,
  travelClass,
  onPassengersChange,
  onTravelClassChange,
}: PassengersSelectorProps) {
  const t = useTranslations('search.passengers');
  const tPrice = useTranslations('booking.priceSummary');
  const [open, setOpen] = useState(false);

  // Close popover on scroll to prevent it from overlapping the navbar
  useEffect(() => {
    if (!open) return;

    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open]);

  const totalPassengers =
    passengers.adults + passengers.children + passengers.infants;

  const summaryLabel = (() => {
    const parts: string[] = [];
    if (passengers.adults > 0) {
      parts.push(
        `${passengers.adults} ${passengers.adults === 1 ? tPrice('adult') : tPrice('adults')
        }`
      );
    }
    if (passengers.children > 0) {
      parts.push(
        `${passengers.children} ${passengers.children === 1 ? tPrice('child') : tPrice('children')
        }`
      );
    }
    if (passengers.infants > 0) {
      parts.push(
        `${passengers.infants} ${passengers.infants === 1 ? tPrice('infant') : tPrice('infants')
        }`
      );
    }
    // Fallback to adults if somehow all are 0
    if (parts.length === 0) {
      return `1 ${tPrice('adult')}`;
    }
    return parts.join(', ');
  })();

  const updatePassengers = (
    type: keyof Passengers,
    delta: number,
    min: number = 0
  ) => {
    onPassengersChange({
      ...passengers,
      [type]: Math.max(min, passengers[type] + delta),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 rounded-[40px] px-0 hover:bg-transparent h-auto"
        >
          <Users className="w-5 h-5 text-[#010D50]" />
          <span className="text-sm font-medium text-[#010D50]">
            {summaryLabel}, {travelClass}
          </span>
          <ChevronDown className="w-5 h-5 text-[#010D50]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(20rem,calc(100vw-32px))] max-h-[calc(100vh-120px)] overflow-auto overscroll-contain"
        side="bottom"
        sideOffset={8}
        align="start"
        avoidCollisions={true}
        collisionPadding={{ top: 80, bottom: 16, left: 16, right: 16 }}
      >
        <div className="flex flex-col gap-4">
          {/* Adults */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('adults')}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("adults", -1, 1)}
              >
                -
              </Button>
              <span className="w-8 text-center">{passengers.adults}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("adults", 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('children')}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("children", -1)}
              >
                -
              </Button>
              <span className="w-8 text-center">{passengers.children}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("children", 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Infants */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('infants')}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("infants", -1)}
              >
                -
              </Button>
              <span className="w-8 text-center">{passengers.infants}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePassengers("infants", 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Travel Class */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">{t('travelClass')}</p>
            <div className="flex flex-col gap-2">
              {[
                { key: 'Economy', label: t('economy') },
                { key: 'Premium Economy', label: t('premiumEconomy') },
                { key: 'Business', label: t('business') },
                { key: 'First', label: t('first') }
              ].map((cls) => (
                <Button
                  key={cls.key}
                  variant={travelClass === cls.key ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => onTravelClassChange(cls.key)}
                >
                  {cls.label}
                </Button>
              )
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
