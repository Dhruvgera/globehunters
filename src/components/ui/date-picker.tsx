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

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  let firstDayOfWeek = firstDay.getDay();
  // Convert to Monday-based (0 = Monday, 6 = Sunday)
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Add null cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Only add cells to complete the current week (not full 6 rows)
  const remainingCells = days.length % 7;
  if (remainingCells > 0) {
    for (let i = 0; i < (7 - remainingCells); i++) {
      days.push(null);
    }
  }

  return days;
}

function isSameDay(date1?: Date | null, date2?: Date | null): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function isInRange(date: Date, start?: Date, end?: Date): boolean {
  if (!start || !end) return false;
  const dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return dateTime > startTime && dateTime < endTime;
}

function isRangeStart(date: Date, start?: Date): boolean {
  return isSameDay(date, start);
}

function isRangeEnd(date: Date, end?: Date): boolean {
  return isSameDay(date, end);
}

// Check if this date is the start of a week (Monday) or first day of month
function isWeekStart(date: Date, index: number): boolean {
  return index % 7 === 0;
}

// Check if this date is the end of a week (Sunday) or last day of month
function isWeekEnd(date: Date, index: number): boolean {
  return index % 7 === 6;
}

function MonthCalendar({
  year,
  month,
  selectedStart,
  selectedEnd,
  onDateSelect,
  showNavigation,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: {
  year: number;
  month: number;
  selectedStart?: Date;
  selectedEnd?: Date;
  onDateSelect: (date: Date) => void;
  showNavigation?: "left" | "right" | "both" | "none";
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
}) {
  const days = getDaysInMonth(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col w-full min-w-0 lg:min-w-[252px]">
      {/* Month Navigation Header - Skyscanner style */}
      <div className="flex items-center justify-between mb-2 h-8">
        {/* Left arrow */}
        <div className="w-7 flex justify-start">
          {(showNavigation === "left" || showNavigation === "both") && (
            <button
              onClick={onPrev}
              disabled={!canGoPrev}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                canGoPrev 
                  ? "hover:bg-[#F5F7FF] text-[#010D50]" 
                  : "text-[#D3D3D3] cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Month Year - centered */}
        <div className="text-sm font-semibold text-[#010D50]">
          {MONTHS[month]} {year}
        </div>
        
        {/* Right arrow */}
        <div className="w-7 flex justify-end">
          {(showNavigation === "right" || showNavigation === "both") && (
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                canGoNext 
                  ? "hover:bg-[#F5F7FF] text-[#010D50]" 
                  : "text-[#D3D3D3] cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-[#68778D] py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - Skyscanner continuous range style */}
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="h-8" />;
          }

          const isToday = isSameDay(date, today);
          const isStart = isRangeStart(date, selectedStart);
          const isEnd = isRangeEnd(date, selectedEnd);
          const inRange = selectedStart && selectedEnd ? isInRange(date, selectedStart, selectedEnd) : false;
          const isPast = date < today;
          const isSelected = isStart || isEnd;
          
          // Determine position for range highlighting
          const isAtWeekStart = isWeekStart(date, index);
          const isAtWeekEnd = isWeekEnd(date, index);
          
          // Check if prev/next day is in range for continuous highlighting
          const prevDate = index > 0 ? days[index - 1] : null;
          const nextDate = index < days.length - 1 ? days[index + 1] : null;
          const prevInRange = prevDate && selectedStart && selectedEnd 
            ? (isInRange(prevDate, selectedStart, selectedEnd) || isSameDay(prevDate, selectedStart))
            : false;
          const nextInRange = nextDate && selectedStart && selectedEnd 
            ? (isInRange(nextDate, selectedStart, selectedEnd) || isSameDay(nextDate, selectedEnd))
            : false;

          return (
            <div
              key={index}
              className="relative h-8 flex items-center justify-center"
            >
              {/* Range background - Skyscanner style continuous highlight */}
              {(inRange || (isStart && nextInRange) || (isEnd && prevInRange)) && (
                <div
                  className={cn(
                    "absolute inset-y-0 bg-[#E8ECFF]",
                    // Start date - round left, extend right
                    isStart && !isEnd && "left-1/2 right-0",
                    // End date - extend left, round right
                    isEnd && !isStart && "left-0 right-1/2",
                    // Both start and end (same day) - no background extension
                    isStart && isEnd && "hidden",
                    // In range - full width with edge handling
                    inRange && !isStart && !isEnd && (
                      isAtWeekStart ? "left-0 right-0 rounded-l-full" :
                      isAtWeekEnd ? "left-0 right-0 rounded-r-full" :
                      "left-0 right-0"
                    ),
                    // Range continuation at week boundaries
                    inRange && isAtWeekStart && "rounded-l-full",
                    inRange && isAtWeekEnd && "rounded-r-full"
                  )}
                />
              )}
              
              {/* Date button */}
              <button
                onClick={() => {
                  if (!isPast) {
                    onDateSelect(date);
                  }
                }}
                disabled={isPast}
                className={cn(
                  "relative z-10 w-8 h-8 flex items-center justify-center text-xs transition-all",
                  // Default state
                  "text-[#010D50]",
                  // Hover state
                  !isPast && !isSelected && "hover:bg-[#F5F7FF] hover:rounded-full",
                  // Past dates
                  isPast && "text-[#C8C8C8] cursor-not-allowed",
                  // Selected dates - Skyscanner circular style
                  isSelected && "bg-[#3754ED] text-white rounded-full font-medium",
                  // Today indicator (when not selected)
                  isToday && !isSelected && "font-semibold"
                )}
              >
                {date.getDate()}
                {/* Today dot indicator */}
                {isToday && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#3754ED] rounded-full" />
                )}
              </button>
            </div>
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
  
  // Skyscanner-style: unified navigation - both months move together
  const [baseMonth, setBaseMonth] = React.useState(today.getMonth());
  const [baseYear, setBaseYear] = React.useState(today.getFullYear());
  
  // Calculate second month (always baseMonth + 1)
  const secondMonth = baseMonth === 11 ? 0 : baseMonth + 1;
  const secondYear = baseMonth === 11 ? baseYear + 1 : baseYear;
  
  // Check if we can go back (don't go before current month)
  const canGoPrev = baseYear > today.getFullYear() || 
    (baseYear === today.getFullYear() && baseMonth > today.getMonth());
  
  // Allow going forward up to 12 months
  const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), 1);
  const canGoNext = new Date(secondYear, secondMonth, 1) < maxDate;

  const handlePrev = () => {
    if (!canGoPrev) return;
    let newMonth = baseMonth - 1;
    let newYear = baseYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setBaseMonth(newMonth);
    setBaseYear(newYear);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    let newMonth = baseMonth + 1;
    let newYear = baseYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setBaseMonth(newMonth);
    setBaseYear(newYear);
  };

  // Unified date selection logic - works on both calendars like Skyscanner
  const handleDateSelect = (date: Date) => {
    // If no start date, set this as start date
    if (!startDate) {
      onStartDateChange?.(date);
      return;
    }

    // If start date exists but no end date
    if (!endDate) {
      // If clicked date is before start date, make it the new start date
      if (date < startDate) {
        onStartDateChange?.(date);
      } else if (isSameDay(date, startDate)) {
        // Clicking same date - no change
        return;
      } else {
        // Date is after start date, set as end date
        onEndDateChange?.(date);
      }
      return;
    }

    // Both dates are already selected - start fresh with new selection
    onStartDateChange?.(date);
    onEndDateChange?.(undefined);
  };

  const isRangeMode = !!onEndDateChange;

  return (
    <div className={cn("p-3 lg:p-4 bg-white rounded-2xl w-full max-w-[580px]", className)}>
      {/* Selected dates header - Skyscanner style */}
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-[#E8E8E8]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[#68778D] mb-0.5">Depart</div>
          <div className={cn(
            "text-xs font-medium truncate",
            startDate ? "text-[#010D50]" : "text-[#68778D]"
          )}>
            {startDate 
              ? startDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              : "Select date"
            }
          </div>
        </div>
        
        {isRangeMode && (
          <>
            <div className="w-6 h-[1px] bg-[#D3D3D3] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#68778D] mb-0.5">Return</div>
              <div className={cn(
                "text-xs font-medium truncate",
                endDate ? "text-[#010D50]" : "text-[#68778D]"
              )}>
                {endDate 
                  ? endDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                  : "Select date"
                }
              </div>
            </div>
          </>
        )}
      </div>

      {/* Calendars - Skyscanner side-by-side with unified navigation */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
        <MonthCalendar
          year={baseYear}
          month={baseMonth}
          selectedStart={startDate}
          selectedEnd={endDate}
          onDateSelect={handleDateSelect}
          showNavigation="both"
          onPrev={handlePrev}
          onNext={handleNext}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />
        
        {isRangeMode && (
          <div className="hidden lg:block">
            <MonthCalendar
              year={secondYear}
              month={secondMonth}
              selectedStart={startDate}
              selectedEnd={endDate}
              onDateSelect={handleDateSelect}
              showNavigation="right"
              onNext={handleNext}
              canGoNext={canGoNext}
            />
          </div>
        )}
      </div>

      {/* Done Button - Skyscanner style */}
      {onDone && (
        <div className="flex justify-end mt-3 pt-2 border-t border-[#E8E8E8]">
          <Button
            onClick={onDone}
            className="bg-[#3754ED] hover:bg-[#2942D1] text-white rounded-lg px-6 py-1.5 h-auto text-xs font-medium"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
