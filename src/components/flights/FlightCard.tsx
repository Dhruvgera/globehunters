"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flight } from "@/types/flight";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";

interface FlightCardProps {
  flight: Flight;
  showReturn?: boolean;
}

export default function FlightCard({ flight, showReturn = true }: FlightCardProps) {
  const router = useRouter();
  const [showTicketOptions, setShowTicketOptions] = useState(false);
  const [showFlightInfo, setShowFlightInfo] = useState(false);

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Flight Details */}
      <div className="flex flex-col gap-4">
        {/* Airline Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#DA0E29] rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {flight.airline.code}
              </span>
            </div>
            <span className="text-sm font-semibold text-[#010D50]">
              {flight.airline.name}
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

        {/* Outbound Flight */}
        <div className="bg-white rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Departure */}
          <div className="flex flex-col gap-1 w-full sm:w-36">
            <span className="text-xs text-[#010D50]">
              {flight.outbound.date}
            </span>
            <span className="text-lg font-semibold text-[#010D50]">
              {flight.outbound.departureTime}
            </span>
            <span className="text-sm font-medium text-[#010D50]">
              {flight.outbound.departureAirport.code} -{" "}
              {flight.outbound.departureAirport.city}
            </span>
          </div>

          {/* Flight Path */}
          <div className="flex flex-col items-center justify-center flex-1 gap-1">
            <div className="flex items-center w-full">
              <div className="flex-1 border-t border-dashed border-[#010D50]" />
              <div className="px-3 py-0">
                <span className="text-xs font-medium text-[#008234]">
                  {flight.outbound.stopDetails}
                </span>
              </div>
              <div className="flex-1 border-t border-dashed border-[#010D50]" />
            </div>
            <span className="text-xs font-medium text-[#010D50]">
              {flight.outbound.duration}
            </span>
          </div>

          {/* Arrival */}
          <div className="flex flex-col sm:items-end gap-1 w-full sm:w-36">
            <span className="text-xs text-[#010D50]">
              {flight.outbound.date}
            </span>
            <span className="text-lg font-semibold text-[#010D50]">
              {flight.outbound.arrivalTime}
            </span>
            <span className="text-sm font-medium text-[#010D50]">
              {flight.outbound.arrivalAirport.code} -{" "}
              {flight.outbound.arrivalAirport.city}
            </span>
          </div>
        </div>

        {/* Return Flight */}
        {showReturn && flight.inbound && (
          <div className="bg-white rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Arrival (Return) */}
            <div className="flex flex-col gap-1 w-full sm:w-36">
              <span className="text-xs text-[#010D50]">
                {flight.inbound.date}
              </span>
              <span className="text-lg font-semibold text-[#010D50]">
                {flight.inbound.departureTime}
              </span>
              <span className="text-sm font-medium text-[#010D50]">
                {flight.inbound.departureAirport.code} -{" "}
                {flight.inbound.departureAirport.city}
              </span>
            </div>

            {/* Flight Path */}
            <div className="flex flex-col items-center justify-center flex-1 gap-1">
              <div className="flex items-center w-full">
                <div className="flex-1 border-t border-dashed border-[#010D50]" />
                <div className="px-3 py-0">
                  <span className="text-xs font-medium text-[#008234]">
                    {flight.inbound.stopDetails}
                  </span>
                </div>
                <div className="flex-1 border-t border-dashed border-[#010D50]" />
              </div>
              <span className="text-xs font-medium text-[#010D50]">
                {flight.inbound.duration}
              </span>
            </div>

            {/* Departure (Return) */}
            <div className="flex flex-col sm:items-end gap-1 w-full sm:w-36">
              <span className="text-xs text-[#010D50]">
                {flight.inbound.date}
              </span>
              <span className="text-lg font-semibold text-[#010D50]">
                {flight.inbound.arrivalTime}
              </span>
              <span className="text-sm font-medium text-[#010D50]">
                {flight.inbound.arrivalAirport.code} -{" "}
                {flight.inbound.arrivalAirport.city}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-[#DAE0FF] my-4" />

      {/* Price and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <span className="text-lg font-medium text-[#010D50]">
          {flight.currency}
          {flight.pricePerPerson} /per person
        </span>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button
            variant="ghost"
            className="bg-[rgba(55,84,237,0.12)] hover:bg-[rgba(55,84,237,0.2)] text-[#3754ED] rounded-full px-4 py-2 h-auto text-xs font-medium"
            onClick={() => setShowFlightInfo(!showFlightInfo)}
          >
            View Flight Info
          </Button>
          <Button
            variant="outline"
            className="rounded-lg px-6 py-2 h-auto text-xs font-medium border-none hover:bg-gray-100"
            onClick={() => setShowTicketOptions(!showTicketOptions)}
          >
            Ticket Options
            {showTicketOptions ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Ticket Options */}
      {showTicketOptions && flight.ticketOptions && (
        <div className="mt-4 pt-4 border-t border-[#EEEEEE]">
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory">
            {flight.ticketOptions.map((option) => (
              <div
                key={option.type}
                className="min-w-[220px] sm:min-w-0 flex-1 border border-[#EEEEEE] rounded-lg p-3 flex flex-col gap-3 snap-start"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#010D50]">
                    {option.type}
                  </span>
                  <span className="text-lg font-medium text-[#010D50]">
                    {flight.currency}
                    {option.price}
                  </span>
                </div>
                <Button 
                  onClick={() => router.push("/booking")}
                  className="w-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white border border-[#3754ED] rounded-full py-2 h-auto text-xs font-medium"
                >
                  View {option.type.split(" ")[1]}
                </Button>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-[#F5F5F5] rounded-lg relative">
            <div
              className="absolute left-0 top-0 h-full bg-[#010D50] rounded-lg"
              style={{ width: "20%" }}
            />
          </div>
        </div>
      )}

      {/* Flight Info Modal */}
      <FlightInfoModal
        flight={flight}
        open={showFlightInfo}
        onOpenChange={setShowFlightInfo}
      />
    </div>
  );
}

