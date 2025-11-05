"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flight } from "@/types/flight";
import { useBookingStore } from "@/store/bookingStore";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { AirlineHeader } from "./flight-card/AirlineHeader";
import { FlightLegMobile } from "./flight-card/FlightLegMobile";
import { FlightLegDesktop } from "./flight-card/FlightLegDesktop";
import { FlightActions } from "./flight-card/FlightActions";
import { TicketOptionsPanel } from "./flight-card/TicketOptionsPanel";

interface FlightCardProps {
  flight: Flight;
  showReturn?: boolean;
}

export default function FlightCard({
  flight,
  showReturn = true,
}: FlightCardProps) {
  const router = useRouter();
  const setSelectedFlight = useBookingStore(
    (state) => state.setSelectedFlight
  );
  const [showTicketOptions, setShowTicketOptions] = useState(false);
  const [showFlightInfo, setShowFlightInfo] = useState(false);

  const handleSelectFlight = (
    fareType: "Eco Value" | "Eco Classic" | "Eco Flex"
  ) => {
    setSelectedFlight(flight, fareType);
    router.push("/booking");
  };

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Flight Details */}
      <div className="flex flex-col gap-4">
        {/* Airline Header */}
        <AirlineHeader airline={flight.airline} />

        {/* Outbound Flight */}
        <FlightLegMobile leg={flight.outbound} />
        <FlightLegDesktop leg={flight.outbound} />

        {/* Return Flight */}
        {showReturn && flight.inbound && (
          <>
            <FlightLegMobile leg={flight.inbound} />
            <FlightLegDesktop leg={flight.inbound} />
          </>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-[#DAE0FF] my-4" />

      {/* Price and Actions */}
      <FlightActions
        currency={flight.currency}
        pricePerPerson={flight.pricePerPerson}
        showTicketOptions={showTicketOptions}
        onViewFlightInfo={() => setShowFlightInfo(!showFlightInfo)}
        onToggleTicketOptions={() => setShowTicketOptions(!showTicketOptions)}
      />

      {/* Expandable Ticket Options */}
      {showTicketOptions && flight.ticketOptions && (
        <TicketOptionsPanel
          ticketOptions={flight.ticketOptions}
          currency={flight.currency}
          onSelectFlight={handleSelectFlight}
        />
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
