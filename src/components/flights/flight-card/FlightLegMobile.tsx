"use client";

interface Airport {
  code: string;
  city: string;
}

interface FlightLeg {
  date: string;
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

export function FlightLegMobile({ leg }: FlightLegMobileProps) {
  return (
    <div className="sm:hidden bg-white rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#010D50]">{leg.date}</span>
        <span className="text-sm font-semibold text-[#010D50]">
          {leg.departureTime} → {leg.arrivalTime}
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
