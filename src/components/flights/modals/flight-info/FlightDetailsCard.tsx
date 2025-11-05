"use client";

import { Plane } from "lucide-react";

interface FlightSegment {
  departure: {
    airport: string;
    code: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    code: string;
    time: string;
    date: string;
  };
  duration: string;
  airline: string;
  stops?: number;
}

interface FlightDetailsCardProps {
  segment: FlightSegment;
}

export function FlightDetailsCard({ segment }: FlightDetailsCardProps) {
  return (
    <div className="bg-[#F5F7FF] rounded-xl p-4 flex flex-col gap-4">
      {/* Route Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {segment.departure.airport} to {segment.arrival.airport}
        </span>
        <span className="text-xs text-[#3A478A]">{segment.duration}</span>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[#3A478A]">{segment.departure.code}</span>
          <span className="text-sm font-semibold text-[#010D50]">
            {segment.departure.time}
          </span>
          <span className="text-xs text-[#3A478A]">{segment.departure.date}</span>
        </div>

        <div className="flex-1 flex items-center relative">
          <div className="w-full h-0.5 bg-[#010D50]" />
          <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#010D50]" />
        </div>

        <div className="flex flex-col gap-1 items-end">
          <span className="text-xs text-[#3A478A]">{segment.arrival.code}</span>
          <span className="text-sm font-semibold text-[#010D50]">
            {segment.arrival.time}
          </span>
          <span className="text-xs text-[#3A478A]">{segment.arrival.date}</span>
        </div>
      </div>

      {/* Airline */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#DA0E29] rounded flex items-center justify-center">
          <Plane className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-[#010D50]">
          {segment.airline}
        </span>
      </div>
    </div>
  );
}
