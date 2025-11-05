"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Info, Clock, Briefcase, Package, ShoppingBag, XCircle as XIcon, Plane, MapPin, UtensilsCrossed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flight } from "@/types/flight";

interface FlightInfoModalProps {
  flight: Flight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FlightInfoModal({
  flight,
  open,
  onOpenChange,
}: FlightInfoModalProps) {
  const router = useRouter();
  const [selectedLeg, setSelectedLeg] = useState<"outbound" | "inbound">(
    "outbound"
  );
  const [selectedFareType, setSelectedFareType] = useState<
    "value" | "classic" | "flex"
  >("value");

  const currentLeg =
    selectedLeg === "outbound" ? flight.outbound : flight.inbound;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-24px,960px)] max-w-full max-h-[90vh] overflow-y-auto overflow-x-clip p-4 sm:p-6 gap-6 sm:gap-8 [&>button]:hidden bg-white rounded-3xl border-0 box-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Flight information</DialogTitle>
        </DialogHeader>
        {/* Header with Flight Leg Selector */}
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              {/* Flight Leg Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
                <Button
                  variant={selectedLeg === "outbound" ? "default" : "outline"}
                  className={`${
                    selectedLeg === "outbound"
                      ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D0D7EF]"
                      : "bg-[#F6F6F6] text-[#3754ED] border-[#3754ED] hover:bg-[#EEEEEE]"
                  } rounded-full px-3 sm:px-4 py-2.5 h-auto text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 leading-normal`}
                  onClick={() => setSelectedLeg("outbound")}
                >
                  <span className="hidden sm:inline">
                    {flight.outbound.departureAirport.city} -{" "}
                    {flight.outbound.arrivalAirport.city} -{" "}
                    {flight.outbound.date}
                  </span>
                  <span className="sm:hidden">
                    {flight.outbound.departureAirport.code} - {flight.outbound.arrivalAirport.code}
                  </span>
                </Button>
                {flight.inbound && (
                  <Button
                    variant={selectedLeg === "inbound" ? "default" : "outline"}
                    className={`${
                      selectedLeg === "inbound"
                        ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D0D7EF]"
                        : "bg-[#F6F6F6] text-[#3754ED] border-[#3754ED] hover:bg-[#EEEEEE]"
                    } rounded-full px-3 sm:px-4 py-2.5 h-auto text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 leading-normal`}
                    onClick={() => setSelectedLeg("inbound")}
                  >
                    <span className="hidden sm:inline">
                      {flight.inbound.departureAirport.city} -{" "}
                      {flight.inbound.arrivalAirport.city} - {flight.inbound.date}
                    </span>
                    <span className="sm:hidden">
                      {flight.inbound.departureAirport.code} - {flight.inbound.arrivalAirport.code}
                    </span>
                  </Button>
                )}
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full h-6 w-6"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Flight Details */}
            {currentLeg && (
              <div className="flex flex-col gap-6">
                {/* Flight Header */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-[#3A478A]">
                    {selectedLeg === "outbound" ? "Flight 1 of 2" : "Flight 2 of 2"}
                  </span>

                  {/* Flight Card */}
                  <div className="bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-4 sm:gap-6 max-w-full overflow-hidden">
                    {/* Airline Info */}
                    <div className="flex flex-col justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
                          <Plane className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-[#010D50]">
                          {flight.airline.name}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-[#3A478A]">
                        <span>AT555 - Economy</span>
                        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#010D50]" />
                        <span>6009 km</span>
                        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#010D50]" />
                        <span>Airbus A330-200</span>
                      </div>
                    </div>

                    {/* Flight Route */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-8">
                      {/* Route Details */}
                      <div className="flex items-center flex-1 gap-4 min-w-0">
                        {/* Visual Timeline with Location Icons */}
                        <div className="flex flex-col items-center justify-between self-stretch py-1">
                          <MapPin className="w-3 h-3 text-[#010D50]" />
                          <div className="flex-1 w-px border-l-2 border-dashed border-[#010D50] my-2" />
                          <div className="w-3 h-3 bg-[#010D50] rounded-full" />
                        </div>

                        {/* Airport Info */}
                        <div className="flex flex-col justify-between flex-1 gap-6 md:gap-12 min-w-0">
                          {/* Departure */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs sm:text-sm font-semibold text-[#010D50] break-words">
                              {currentLeg.departureAirport.city} (
                              {currentLeg.departureAirport.code})
                            </span>
                            <span className="text-xs sm:text-sm text-[#3A478A]">
                              Terminal 3
                            </span>
                          </div>

                          {/* Travel Time */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-[#3A478A] shrink-0" />
                            <span className="text-xs sm:text-sm text-[#3A478A]">
                              Travel time: {currentLeg.duration}
                            </span>
                          </div>

                          {/* Arrival */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs sm:text-sm font-semibold text-[#010D50] break-words">
                              {currentLeg.arrivalAirport.city} (
                              {currentLeg.arrivalAirport.code})
                            </span>
                            <span className="text-xs sm:text-sm text-[#3A478A]">
                              Terminal 3
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Times */}
                      <div className="flex flex-row md:flex-col justify-between md:justify-between gap-4 md:gap-12 shrink-0">
                        {/* Departure Time */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm sm:text-base font-semibold text-[#010D50]">
                            {currentLeg.departureTime}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-[#3A478A] whitespace-nowrap">
                            {currentLeg.date}
                          </span>
                        </div>

                        {/* Arrival Time */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm sm:text-base font-semibold text-[#010D50]">
                            {currentLeg.arrivalTime}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-[#3A478A] whitespace-nowrap">
                            {currentLeg.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segment Baggage & Meals */}
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Included with this segment
                  </span>
                  <div className="flex flex-col md:flex-row gap-3">
                    {/* Baggage for this segment */}
                    <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex flex-col gap-3">
                      <span className="text-sm font-medium text-[#010D50]">Baggage Allowance</span>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <ShoppingBag className="w-5 h-5 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#010D50]">1 personal item</span>
                            <span className="text-xs text-[#3A478A]">Fits under seat</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-5 h-5 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#010D50]">1 carry-on bag</span>
                            <span className="text-xs text-[#3A478A]">Max 10kg</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Package className="w-5 h-5 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#010D50]">2 checked bags</span>
                            <span className="text-xs text-[#3A478A]">Max 23kg each</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meals for this segment */}
                    <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex flex-col gap-3">
                      <span className="text-sm font-medium text-[#010D50]">Meals & Refreshments</span>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <UtensilsCrossed className="w-5 h-5 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#010D50]">Complimentary meal</span>
                            <span className="text-xs text-[#3A478A]">Hot meal service included</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <UtensilsCrossed className="w-5 h-5 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#010D50]">Beverages</span>
                            <span className="text-xs text-[#3A478A]">Soft drinks, tea, coffee</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <UtensilsCrossed className="w-5 h-5 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#010D50]">Special meals</span>
                            <span className="text-xs text-[#3A478A]">Available on request</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stopover Info (if applicable) */}
                {currentLeg.stopDetails !== "Direct" && (
                  <div className="flex flex-col gap-3">
                    {/* Stopover Duration */}
                    <div className="bg-[#F5F7FF] rounded-xl px-4 py-3 flex items-center gap-3 w-fit">
                      <span className="text-sm text-[#3A478A]">
                        Stopover at Casablanca (CMN) for
                      </span>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#010D50]" />
                        <span className="text-sm font-medium text-[#010D50]">
                          5h 15m
                        </span>
                      </div>
                    </div>

                    {/* Baggage Alert */}
                    <div className="bg-[#FFE1E1] border border-[#FF9393] rounded-xl p-3 flex items-start gap-2">
                      <Info className="w-6 h-6 text-[#FF0202] shrink-0" />
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-[#FF0202]">
                          Baggage Alert: Re-Check Required
                        </span>
                        <span className="text-sm text-[#FF0202]">
                          Due to airline or flight changes during your stop, you
                          MUST collect your checked luggage and re-check it with
                          the connecting airline. Always confirm your baggage tag
                          instructions upon arrival at your layover city.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fare Type Selector */}
          <div className="flex flex-col gap-5 sm:gap-6">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              <Button
                variant={selectedFareType === "value" ? "default" : "outline"}
                className={`${
                  selectedFareType === "value"
                    ? "bg-[#3754ED] text-white hover:bg-[#2A3FB8]"
                    : "bg-[#F5F7FF] text-[#010D50] border-0 hover:bg-[#E0E7FF]"
                } rounded-full px-4 py-2.5 h-auto text-sm font-semibold leading-normal`}
                onClick={() => setSelectedFareType("value")}
              >
                Eco Value
              </Button>
              <Button
                variant={selectedFareType === "classic" ? "default" : "outline"}
                className={`${
                  selectedFareType === "classic"
                    ? "bg-[#3754ED] text-white hover:bg-[#2A3FB8]"
                    : "bg-[#F5F7FF] text-[#010D50] border-0 hover:bg-[#E0E7FF]"
                } rounded-full px-4 py-2.5 h-auto text-sm font-semibold leading-normal`}
                onClick={() => setSelectedFareType("classic")}
              >
                Eco Classic
              </Button>
              <Button
                variant={selectedFareType === "flex" ? "default" : "outline"}
                className={`${
                  selectedFareType === "flex"
                    ? "bg-[#3754ED] text-white hover:bg-[#2A3FB8]"
                    : "bg-[#F5F7FF] text-[#010D50] border-0 hover:bg-[#E0E7FF]"
                } rounded-full px-4 py-2.5 h-auto text-sm font-semibold leading-normal`}
                onClick={() => setSelectedFareType("flex")}
              >
                Eco Flex
              </Button>
            </div>

            {/* Fare Details */}
            <div className="flex flex-col md:flex-row items-stretch gap-3">
                {/* Baggage Section */}
                <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-4 sm:gap-6 min-w-0">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Baggage
                  </span>
                  <div className="flex flex-col gap-3">
                    {/* Personal Item */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            1 personal item
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            Fits under the seat in front of you
                          </span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>

                    {/* Carry-on */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            1 carry-on bag
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A]">
                            Max weight 10 kg
                          </span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>

                    {/* Checked Bags */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            2 checked bags
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A]">
                            Max weight 23 kg
                          </span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Flexibility Section */}
                <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 min-w-0">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Flexibility
                  </span>
                  <div className="flex flex-col gap-3">
                    {/* Non-Refundable */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            Non-Refundable
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            Ticket can&apos;t be refunded
                          </span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>

                    {/* Changes */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            Changes not allowed
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            Flights can&apos;t be changed after booking
                          </span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>

                    {/* Seat Choice */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            Seat choice for free
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            Choose your desired seat for free
                          </span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
          </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-3 border border-[#EEF0F7] shadow-[0_-8px_24px_-12px_rgba(2,6,23,0.35)]">
          <span className="text-sm sm:text-lg font-medium text-[#3754ED] whitespace-nowrap">
            {flight.currency}
            {flight.pricePerPerson} <span className="hidden sm:inline">/per person</span>
          </span>
          <Button 
            onClick={() => router.push("/booking")}
            className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-4 sm:px-5 py-2 h-auto gap-1 text-sm font-bold shrink-0"
          >
            Book
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white sm:w-6 sm:h-6"
            >
              <path
                d="M8.43 6.43L13.57 12L8.43 17.57"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

