"use client";

interface Airport {
  code: string;
  name?: string;
  city: string;
}

interface FlightLeg {
  date: string;
  arrivalDate?: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  stopDetails?: string;
  duration: string; // Flying time only (excluding layovers)
  totalJourneyTime?: string; // Total time including layovers
  stops: number;
  layovers?: Array<{
    viaAirport: string;
    duration: string;
  }>;
}

interface FlightLegDesktopProps {
  leg: FlightLeg;
}

// Calculate day difference between departure and arrival dates
function getDayDifference(departureDate: string, arrivalDate?: string): number {
  if (!arrivalDate || arrivalDate === departureDate) return 0;
  
  // Parse dates from format like "SUN, 30 NOV 25" or "MON, 1 DEC 25"
  const parseDate = (dateStr: string): Date | null => {
    const months: Record<string, number> = {
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
      'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    };
    // Match patterns like "SUN, 30 NOV 25" or "30 NOV 25"
    const match = dateStr.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{2,4})/i);
    if (!match) return null;
    const day = parseInt(match[1]);
    const month = months[match[2].toUpperCase()];
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  };
  
  const depDate = parseDate(departureDate);
  const arrDate = parseDate(arrivalDate);
  
  if (!depDate || !arrDate) return 0;
  
  const diffTime = arrDate.getTime() - depDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function FlightLegDesktop({ leg }: FlightLegDesktopProps) {
  const dayDiff = getDayDifference(leg.date, leg.arrivalDate);
  
  return (
    <div className="hidden sm:flex bg-white rounded-xl p-3 flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
      {/* Departure */}
      <div className="flex flex-col gap-1 w-full sm:w-36">
        <span className="text-xs text-[#010D50]">{leg.date}</span>
        <span className="text-lg font-semibold text-[#010D50]">
          {leg.departureTime}
        </span>
        <span className="text-sm font-medium text-[#010D50]">
          {leg.departureAirport.code}
        </span>
        {leg.departureAirport.name && leg.departureAirport.name !== leg.departureAirport.code && (
          <span className="text-xs text-[#5A6184] truncate" title={leg.departureAirport.name}>
            {leg.departureAirport.name}
          </span>
        )}
      </div>

      {/* Flight Path */}
      <div className="flex flex-col items-center justify-center flex-1 gap-1">
        <div className="flex items-center w-full">
          <div className="flex-1 border-t border-dashed border-[#010D50]" />
          <div className="px-3 py-0">
            <span className="text-xs font-medium text-[#008234]">
              {leg.stopDetails || "Direct"}
            </span>
          </div>
          <div className="flex-1 border-t border-dashed border-[#010D50]" />
        </div>
        {/* Show total journey time for flights with stops, otherwise just duration */}
        {leg.stops > 0 && leg.totalJourneyTime ? (
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-[#010D50]">
              {leg.totalJourneyTime}
            </span>
            {leg.layovers && leg.layovers.length > 0 ? (
              <span className="text-[10px] text-[#6B7280]">
                ({leg.layovers.map(l => l.duration).join(' + ')} layover)
              </span>
            ) : (
              <span className="text-[10px] text-[#6B7280]">
                ({leg.duration} flying)
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs font-medium text-[#010D50]">
            {leg.duration}
          </span>
        )}
      </div>

      {/* Arrival */}
      <div className="flex flex-col sm:items-end gap-1 w-full sm:w-36">
        <span className="text-xs text-[#010D50]">{leg.arrivalDate || leg.date}</span>
        <span className="text-lg font-semibold text-[#010D50]">
          {leg.arrivalTime}
          {dayDiff > 0 && (
            <sup className="text-[10px] text-[#E53935] font-medium ml-0.5">+{dayDiff}</sup>
          )}
        </span>
        <span className="text-sm font-medium text-[#010D50]">
          {leg.arrivalAirport.code}
        </span>
        {leg.arrivalAirport.name && leg.arrivalAirport.name !== leg.arrivalAirport.code && (
          <span className="text-xs text-[#5A6184] truncate" title={leg.arrivalAirport.name}>
            {leg.arrivalAirport.name}
          </span>
        )}
      </div>
    </div>
  );
}
