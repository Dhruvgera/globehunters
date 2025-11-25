"use client";

interface Airport {
  code: string;
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
  duration: string;
}

interface FlightLegMobileProps {
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

export function FlightLegMobile({ leg }: FlightLegMobileProps) {
  const dayDiff = getDayDifference(leg.date, leg.arrivalDate);
  
  return (
    <div className="sm:hidden bg-white rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#010D50]">{leg.date}</span>
        <span className="text-sm font-semibold text-[#010D50]">
          {leg.departureTime} → {leg.arrivalTime}
          {dayDiff > 0 && (
            <sup className="text-[9px] text-[#E53935] font-medium ml-0.5">+{dayDiff}</sup>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-10 text-left">
          <div className="text-sm font-medium text-[#010D50] leading-5">
            {leg.departureAirport.code}
          </div>
          {leg.departureAirport.city !== leg.departureAirport.code && (
            <div className="text-[11px] text-[#5A6184] leading-4 truncate">
              {leg.departureAirport.city}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center w-full">
            <div className="flex-1 border-t border-dashed border-[#010D50]" />
            <div className="px-2 py-0">
              <span className="text-[11px] font-medium text-[#008234]">
                {leg.stopDetails || "Direct"}
              </span>
            </div>
            <div className="flex-1 border-t border-dashed border-[#010D50]" />
          </div>
          <span className="text-[11px] font-medium text-[#010D50] mt-0.5">
            {leg.duration}
          </span>
        </div>
        <div className="min-w-10 text-right">
          <div className="text-sm font-medium text-[#010D50] leading-5">
            {leg.arrivalAirport.code}
          </div>
          {leg.arrivalAirport.city !== leg.arrivalAirport.code && (
            <div className="text-[11px] text-[#5A6184] leading-4 truncate">
              {leg.arrivalAirport.city}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
