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

interface FlightLegDesktopProps {
  leg: FlightLeg;
}

export function FlightLegDesktop({ leg }: FlightLegDesktopProps) {
  return (
    <div className="hidden sm:flex bg-white rounded-xl p-3 flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
      {/* Departure */}
      <div className="flex flex-col gap-1 w-full sm:w-36">
        <span className="text-xs text-[#010D50]">{leg.date}</span>
        <span className="text-lg font-semibold text-[#010D50]">
          {leg.departureTime}
        </span>
        <span className="text-sm font-medium text-[#010D50]">
          {leg.departureAirport.code} - {leg.departureAirport.city}
        </span>
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
        <span className="text-xs font-medium text-[#010D50]">
          {leg.duration}
        </span>
      </div>

      {/* Arrival */}
      <div className="flex flex-col sm:items-end gap-1 w-full sm:w-36">
        <span className="text-xs text-[#010D50]">{leg.date}</span>
        <span className="text-lg font-semibold text-[#010D50]">
          {leg.arrivalTime}
        </span>
        <span className="text-sm font-medium text-[#010D50]">
          {leg.arrivalAirport.code} - {leg.arrivalAirport.city}
        </span>
      </div>
    </div>
  );
}
