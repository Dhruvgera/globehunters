"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

type TripType = "round-trip" | "one-way" | "multi-city";

interface DateSelectorProps {
  tripType: TripType;
  departureDate?: Date;
  returnDate?: Date;
  onDepartureDateChange: (date: Date | undefined) => void;
  onReturnDateChange: (date: Date | undefined) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DateSelector({
  tripType,
  departureDate,
  returnDate,
  onDepartureDateChange,
  onReturnDateChange,
  isOpen,
  onOpenChange,
}: DateSelectorProps) {
  const t = useTranslations('search.datePicker');
  
  const getDateLabel = () => {
    if (tripType === "round-trip") {
      if (departureDate && returnDate) {
        return `${format(departureDate, "dd MMM")} - ${format(
          returnDate,
          "dd MMM yyyy"
        )}`;
      }
      if (departureDate) {
        return format(departureDate, "dd MMM yyyy");
      }
      return t('departureReturn');
    } else {
      return departureDate
        ? format(departureDate, "EEE, dd MMM yyyy")
        : t('departure');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 flex-1 border-[#D3D3D3] rounded-xl px-3 py-2.5 h-auto justify-start hover:bg-transparent hover:border-[#D3D3D3]"
        >
          <Calendar className="w-5 h-5 text-[#010D50]" />
          <span className="text-sm font-medium text-[#010D50]">
            {getDateLabel()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-white border shadow-lg"
        align="start"
      >
        {tripType === "round-trip" ? (
          <DatePicker
            startDate={departureDate}
            endDate={returnDate}
            onStartDateChange={onDepartureDateChange}
            onEndDateChange={onReturnDateChange}
          />
        ) : (
          <DatePicker
            startDate={departureDate}
            onStartDateChange={onDepartureDateChange}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
