"use client";

interface Airline {
  name: string;
  code: string;
}

interface AirlineHeaderProps {
  airline: Airline;
}

export function AirlineHeader({ airline }: AirlineHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-[#DA0E29] rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">{airline.code}</span>
        </div>
        <span className="text-sm font-semibold text-[#010D50]">
          {airline.name}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="text-[#FF3800]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M12 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}
