"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Info, Clock, Briefcase, Package, ShoppingBag, XCircle as XIcon, Plane, MapPin } from "lucide-react";
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
      <DialogContent className="max-w-[min(100vw-24px,960px)] max-h-[90vh] overflow-y-auto p-4 sm:p-6 gap-6 sm:gap-8 [&>button]:hidden bg-white rounded-3xl border-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Flight information</DialogTitle>
        </DialogHeader>
        {/* Header with Flight Leg Selector */}
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              {/* Flight Leg Tabs */}
              <div className="flex items-center gap-3">
                <Button
                  variant={selectedLeg === "outbound" ? "default" : "outline"}
                  className={`${
                    selectedLeg === "outbound"
                      ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D0D7EF]"
                      : "bg-[#F6F6F6] text-[#3754ED] border-[#3754ED] hover:bg-[#EEEEEE]"
                  } rounded-full px-4 py-2 h-auto text-sm font-medium`}
                  onClick={() => setSelectedLeg("outbound")}
                >
                  {flight.outbound.departureAirport.city} -{" "}
                  {flight.outbound.arrivalAirport.city} -{" "}
                  {flight.outbound.date}
                </Button>
                {flight.inbound && (
                  <Button
                    variant={selectedLeg === "inbound" ? "default" : "outline"}
                    className={`${
                      selectedLeg === "inbound"
                        ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D0D7EF]"
                        : "bg-[#F6F6F6] text-[#3754ED] border-[#3754ED] hover:bg-[#EEEEEE]"
                    } rounded-full px-4 py-2 h-auto text-sm font-medium`}
                    onClick={() => setSelectedLeg("inbound")}
                  >
                    {flight.inbound.departureAirport.city} -{" "}
                    {flight.inbound.arrivalAirport.city} - {flight.inbound.date}
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
                  <div className="bg-[#F5F7FF] rounded-xl p-4 flex flex-col gap-6">
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
                      <div className="flex items-center gap-3 text-sm text-[#3A478A]">
                        <span>AT555 - Economy</span>
                        <div className="w-2 h-2 rounded-full bg-[#010D50]" />
                        <span>6009 km</span>
                        <div className="w-2 h-2 rounded-full bg-[#010D50]" />
                        <span>Airbus A330-200</span>
                      </div>
                    </div>

                    {/* Flight Route */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 md:gap-8">
                      {/* Route Details */}
                      <div className="flex items-center flex-1 gap-4">
                        {/* Visual Timeline with Location Icons */}
                        <div className="flex flex-col items-center justify-between self-stretch py-1">
                          <MapPin className="w-3 h-3 text-[#010D50]" />
                          <div className="flex-1 w-px border-l-2 border-dashed border-[#010D50] my-2" />
                          <div className="w-3 h-3 bg-[#010D50] rounded-full" />
                        </div>

                        {/* Airport Info */}
                        <div className="flex flex-col justify-between flex-1 gap-12">
                          {/* Departure */}
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-[#010D50]">
                              {currentLeg.departureAirport.city} (
                              {currentLeg.departureAirport.code})
                            </span>
                            <span className="text-sm text-[#3A478A]">
                              Terminal 3
                            </span>
                          </div>

                          {/* Travel Time */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-[#3A478A]" />
                            <span className="text-sm text-[#3A478A]">
                              Travel time: {currentLeg.duration}
                            </span>
                          </div>

                          {/* Arrival */}
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-[#010D50]">
                              {currentLeg.arrivalAirport.city} (
                              {currentLeg.arrivalAirport.code})
                            </span>
                            <span className="text-sm text-[#3A478A]">
                              Terminal 3
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Times */}
                      <div className="flex flex-row md:flex-col justify-between md:justify-between gap-6 md:gap-12">
                        {/* Departure Time */}
                        <div className="flex flex-col items-end md:items-end gap-1">
                          <span className="text-sm font-semibold text-[#010D50]">
                            {currentLeg.departureTime}
                          </span>
                          <span className="text-sm font-medium text-[#3A478A]">
                            {currentLeg.date}
                          </span>
                        </div>

                        {/* Arrival Time */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-[#010D50]">
                            {currentLeg.arrivalTime}
                          </span>
                          <span className="text-sm font-medium text-[#3A478A]">
                            {currentLeg.date}
                          </span>
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant={selectedFareType === "value" ? "default" : "outline"}
                className={`${
                  selectedFareType === "value"
                    ? "bg-[#3754ED] text-white hover:bg-[#2A3FB8]"
                    : "bg-[#F5F7FF] text-[#010D50] border-0 hover:bg-[#E0E7FF]"
                } rounded-full px-4 py-2 h-auto text-sm font-semibold`}
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
                } rounded-full px-4 py-2 h-auto text-sm font-semibold`}
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
                } rounded-full px-4 py-2 h-auto text-sm font-semibold`}
                onClick={() => setSelectedFareType("flex")}
              >
                Eco Flex
              </Button>
            </div>

            {/* Fare Details */}
            <div className="bg-white rounded-3xl p-3">
              <div className="flex items-stretch gap-3">
                {/* Baggage Section */}
                <div className="flex-1 bg-[#F5F7FF] rounded-xl p-4 flex flex-col gap-6">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Baggage
                  </span>
                  <div className="flex flex-col gap-3">
                    {/* Personal Item */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <ShoppingBag className="w-6 h-6 text-[#010D50]" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-[#010D50]">
                            1 personal item
                          </span>
                          <span className="text-sm text-[#3A478A]">
                            Fits under the seat in front of you
                          </span>
                        </div>
                      </div>
                      <Check className="w-6 h-6 text-[#008234]" />
                    </div>

                    {/* Carry-on */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <Briefcase className="w-6 h-6 text-[#010D50]" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-[#010D50]">
                            1 carry-on bag
                          </span>
                          <span className="text-sm text-[#3A478A]">
                            Max weight 10 kg
                          </span>
                        </div>
                      </div>
                      <Check className="w-6 h-6 text-[#008234]" />
                    </div>

                    {/* Checked Bags */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <Package className="w-6 h-6 text-[#010D50]" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-[#010D50]">
                            2 checked bags
                          </span>
                          <span className="text-sm text-[#3A478A]">
                            Max weight 23 kg
                          </span>
                        </div>
                      </div>
                      <Check className="w-6 h-6 text-[#008234]" />
                    </div>
                  </div>
                </div>

                {/* Flexibility Section */}
                <div className="flex-1 bg-[#F5F7FF] rounded-xl p-4 flex flex-col gap-4">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Flexibility
                  </span>
                  <div className="flex flex-col gap-3">
                    {/* Non-Refundable */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <XIcon className="w-6 h-6 text-[#010D50]" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-[#010D50]">
                            Non-Refundable
                          </span>
                          <span className="text-sm text-[#3A478A]">
                            Ticket can&apos;t be refunded
                          </span>
                        </div>
                      </div>
                      <Check className="w-6 h-6 text-[#008234]" />
                    </div>

                    {/* Changes */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <XIcon className="w-6 h-6 text-[#010D50]" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-[#010D50]">
                            Changes not allowed
                          </span>
                          <span className="text-sm text-[#3A478A]">
                            Flights can&apos;t be changed after booking
                          </span>
                        </div>
                      </div>
                      <Check className="w-6 h-6 text-[#008234]" />
                    </div>

                    {/* Seat Choice */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <Check className="w-6 h-6 text-[#010D50]" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-[#010D50]">
                            Seat choice for free
                          </span>
                          <span className="text-sm text-[#3A478A]">
                            Choose your desired seat for free
                          </span>
                        </div>
                      </div>
                      <Check className="w-6 h-6 text-[#008234]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Footer */}
        <div className="bg-[#F5F7FF] rounded-xl px-4 py-2 flex items-center justify-between">
          <span className="text-lg font-medium text-[#3754ED]">
            {flight.currency}
            {flight.pricePerPerson} /per person
          </span>
          <Button 
            onClick={() => router.push("/booking")}
            className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto gap-1 text-sm font-bold"
          >
            Book
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white"
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

