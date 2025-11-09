"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange?: (date: Date | undefined) => void;
  onEndDateChange?: (date: Date | undefined) => void;
  onDone?: () => void;
  className?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  let firstDayOfWeek = firstDay.getDay();
  // Convert to Monday-based (0 = Monday, 6 = Sunday)
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const prevDate = new Date(year, month, 1 - (firstDayOfWeek - i));
    days.push(prevDate);
  }

  // Add all days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Add empty cells to complete the last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

function isSameDay(date1?: Date, date2?: Date): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function isInRange(date: Date, start?: Date, end?: Date): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

function MonthCalendar({
  year,
  month,
  onMonthChange,
  selectedStart,
  selectedEnd,
  onDateSelect,
  label,
  isStartCalendar,
}: {
  year: number;
  month: number;
  onMonthChange: (delta: number) => void;
  selectedStart?: Date;
  selectedEnd?: Date;
  onDateSelect: (date: Date) => void;
  label: string;
  isStartCalendar?: boolean;
}) {
  const days = getDaysInMonth(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Label */}
      <div className="text-sm font-medium text-[#010D50]">{label}</div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(-1)}
          className="h-8 w-8 rounded-full hover:bg-[#F5F7FF]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold text-[#010D50]">
          {MONTHS[month]} {year}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(1)}
          className="h-8 w-8 rounded-full hover:bg-[#F5F7FF]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-[#3A478A] py-2"
          >
            {day}
          </div>
        ))}

        {/* Date Cells */}
        {days.map((date, index) => {
          const isCurrentMonth = date.getMonth() === month;
          const isToday = isSameDay(date, today);
          const isStart = isSameDay(date, selectedStart);
          const isEnd = isSameDay(date, selectedEnd);
          
          // Only show as selected if it's the relevant date for this calendar
          const isSelected = isStartCalendar ? isStart : isEnd;
          
          // Only show range if both dates are selected
          const inRange = selectedStart && selectedEnd ? isInRange(date, selectedStart, selectedEnd) : false;
          const isPast = date < today;

          return (
            <button
              key={index}
              onClick={() => {
                if (!isPast && isCurrentMonth) {
                  onDateSelect(date);
                }
              }}
              disabled={isPast || !isCurrentMonth}
              className={cn(
                "aspect-square flex items-center justify-center text-sm rounded-lg transition-colors relative",
                isCurrentMonth ? "text-[#010D50]" : "text-[#D3D3D3]",
                !isPast && isCurrentMonth && "hover:bg-[#F5F7FF] cursor-pointer",
                isPast && "opacity-40 cursor-not-allowed",
                isSelected && "bg-[#3754ED] text-white hover:bg-[#3754ED] font-semibold",
                !isSelected && inRange && "bg-[#E8ECFF]",
                isToday && !isSelected && "border border-[#3754ED]"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDone,
  className,
}: DatePickerProps) {
  const today = new Date();
  const [startMonth, setStartMonth] = React.useState(today.getMonth());
  const [startYear, setStartYear] = React.useState(today.getFullYear());
  
  // Initialize end calendar to next month
  const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
  const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const [endMonth, setEndMonth] = React.useState(nextMonth);
  const [endYear, setEndYear] = React.useState(nextYear);

  const handleStartMonthChange = (delta: number) => {
    let newMonth = startMonth + delta;
    let newYear = startYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setStartMonth(newMonth);
    setStartYear(newYear);
  };

  const handleEndMonthChange = (delta: number) => {
    let newMonth = endMonth + delta;
    let newYear = endYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setEndMonth(newMonth);
    setEndYear(newYear);
  };

  const handleStartDateSelect = (date: Date) => {
    onStartDateChange?.(date);
    // If end date is before start date, clear it
    if (endDate && date > endDate) {
      onEndDateChange?.(undefined);
    }
  };

  const handleEndDateSelect = (date: Date) => {
    // Only allow selecting end date if start date is set
    if (startDate) {
      if (date >= startDate) {
        onEndDateChange?.(date);
      }
    }
  };

  return (
    <div className={cn("p-4", className)}>
      <div className="flex flex-col md:flex-row gap-6">
        <MonthCalendar
          year={startYear}
          month={startMonth}
          onMonthChange={handleStartMonthChange}
          selectedStart={startDate}
          selectedEnd={endDate}
          onDateSelect={handleStartDateSelect}
          label="Start date*"
          isStartCalendar={true}
        />
        {onEndDateChange && (
          <MonthCalendar
            year={endYear}
            month={endMonth}
            onMonthChange={handleEndMonthChange}
            selectedStart={startDate}
            selectedEnd={endDate}
            onDateSelect={handleEndDateSelect}
            label="End date*"
            isStartCalendar={false}
          />
        )}
      </div>

      {/* Done Button */}
      {onDone && (
        <div className="flex justify-center pt-3 border-t border-[#DFE0E4] mt-4">
          <Button
            onClick={onDone}
            size="sm"
            className="bg-[#3754ED] hover:bg-[#2942D1] text-white rounded-full px-4 py-1.5 h-auto text-xs font-medium"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
