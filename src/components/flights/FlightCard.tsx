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
import { ShareButton } from "@/components/ui/share-button";
import { usePriceCheck } from "@/hooks/usePriceCheck";
import { formatPrice } from "@/lib/currency";

function formatPackageDeltaLabel(amount?: number, currency?: string, perPerson = false): string {
  const delta = Number(amount || 0);
  if (Math.abs(delta) < 0.01) {
    const zeroLabel = formatPrice(0, currency || "GBP");
    return perPerson ? `${zeroLabel} per person` : zeroLabel;
  }
  const prefix = `${delta > 0 ? "+" : "-"}${formatPrice(Math.abs(delta), currency || "GBP")}`;
  return perPerson ? `${prefix} per person` : prefix;
}

interface FlightCardProps {
  flight: Flight;
  showReturn?: boolean;
  onSelect?: () => void;
  isPackageMode?: boolean;
}

export default function FlightCard({
  flight,
  showReturn = true,
  onSelect,
  isPackageMode = false,
}: FlightCardProps) {
  const router = useRouter();
  const setSelectedFlight = useBookingStore(
    (state) => state.setSelectedFlight
  );
  const setSelectedUpgrade = useBookingStore(
    (state) => state.setSelectedUpgrade
  );
  const setPriceCheckData = useBookingStore(
    (state) => state.setPriceCheckData
  );
  const setVyspaFolderInfo = useBookingStore(
    (state) => state.setVyspaFolderInfo
  );
  const [showTicketOptions, setShowTicketOptions] = useState(false);
  const [showFlightInfo, setShowFlightInfo] = useState(false);

  // Prefetch price check for this flight on intent (hover) to speed up modal/options
  // Uses flightKey directly with price check API (no FlightView needed)
  const { checkPrice, priceCheck, isLoading } = usePriceCheck();
  const prefetchOptions = () => {
    if (!isPackageMode && (flight.flightKey || flight.segmentResultId)) {
      checkPrice(String(flight.segmentResultId || ''), flight.flightKey);
    }
  };
  const priceCheckData = priceCheck;

  // Use price check data for displayed price when available (first/base option)
  // This ensures the card shows the updated price from price check, not the search result
  const baseOption = priceCheckData?.priceOptions?.[0];
  const effectivePricePerPerson = baseOption?.pricePerPerson ?? flight.pricePerPerson;
  const effectiveCurrency = baseOption?.currency ?? flight.currency;
  const isPackagePerPersonDelta = typeof flight.packagePriceDeltaPerPerson === "number";
  const packagePrimaryPriceLabel = isPackageMode
    ? formatPackageDeltaLabel(
        isPackagePerPersonDelta ? flight.packagePriceDeltaPerPerson : flight.packagePriceDeltaTotal,
        flight.currency,
        isPackagePerPersonDelta
      )
    : undefined;

  const handleSelectFlight = (
    fareType: "Eco Value" | "Eco Classic" | "Eco Flex"
  ) => {
    // For package mode, use the onSelect callback instead of navigating to booking
    if (isPackageMode && onSelect) {
      setSelectedFlight(flight, fareType);
      onSelect();
      return;
    }

    // Clear any previous folder info when selecting a new flight
    setVyspaFolderInfo({ folderNumber: '', customerId: null, emailAddress: null });
    
    // Save price check data if available
    if (priceCheckData) {
      setPriceCheckData(priceCheckData);
    }
    
    setSelectedFlight(flight, fareType);
    router.push("/booking");
  };

  const handleBook = async () => {
    if (isPackageMode && onSelect) {
      const baseOption = priceCheckData?.priceOptions?.[0];
      if (baseOption) {
        setSelectedUpgrade(baseOption);
      }
      setSelectedFlight(flight, baseOption?.cabinClassDisplay || 'Economy');
      onSelect();
      return;
    }

    let currentPriceCheck = priceCheckData;
    if (!currentPriceCheck && (flight.flightKey || flight.segmentResultId)) {
      currentPriceCheck = await checkPrice(String(flight.segmentResultId || ''), flight.flightKey);
    }

    setVyspaFolderInfo({ folderNumber: '', customerId: null, emailAddress: null });

    const baseOption = currentPriceCheck?.priceOptions?.[0];
    if (baseOption) {
      setSelectedUpgrade(baseOption);
      setSelectedFlight(flight, baseOption.cabinClassDisplay);
    } else {
      setSelectedFlight(flight, 'Economy');
    }

    if (currentPriceCheck) {
      setPriceCheckData(currentPriceCheck);
    }

    router.push('/booking');
  };

  // Debug mode - show module_id and Result_id when enabled
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_FLIGHT_IDS === 'true';

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden w-full max-w-full">
      {/* Debug Info */}
      {isDebugMode && (flight.segmentResultId || flight.moduleId) && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono space-y-1">
          {flight.moduleId && (
            <div className="flex gap-2">
              <span className="font-semibold text-yellow-800">module_id:</span>
              <span className="text-yellow-900">{flight.moduleId}</span>
            </div>
          )}
          {flight.segmentResultId && (
            <div className="flex gap-2">
              <span className="font-semibold text-yellow-800">Result_id:</span>
              <span className="text-yellow-900">{flight.segmentResultId}</span>
            </div>
          )}
        </div>
      )}

      {/* Flight Details */}
      <div className="flex flex-col gap-4">
        {/* Airline Header */}
        <AirlineHeader
          airline={flight.airline}
          rightContent={<ShareButton flight={flight} />}
        />

        {/* Multi-city: Render all segments */}
        {flight.tripType === 'multi-city' && flight.segments && flight.segments.length > 0 ? (
          flight.segments.map((segment, index) => (
            <div key={index}>
              <FlightLegMobile leg={segment} />
              <FlightLegDesktop leg={segment} />
            </div>
          ))
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-[#DAE0FF] my-4" />

      {/* Price and Actions - use price check data when available */}
      <FlightActions
        currency={effectiveCurrency}
        pricePerPerson={effectivePricePerPerson}
        primaryPriceLabel={packagePrimaryPriceLabel}
        showTicketOptions={showTicketOptions}
        showTicketOptionsToggle={!isPackageMode}
        onViewFlightInfo={() => setShowFlightInfo(!showFlightInfo)}
        onToggleTicketOptions={() => {
          if (flight.segmentResultId) prefetchOptions();
          setShowTicketOptions(!showTicketOptions);
        }}
        onPrefetchOptions={prefetchOptions}
        onBook={handleBook}
      />

      {/* Expandable Ticket Options */}
      {showTicketOptions && !isPackageMode && (
        <TicketOptionsPanel
          ticketOptions={flight.ticketOptions}
          priceOptions={priceCheckData?.priceOptions}
          currency={flight.currency}
          isLoading={isLoading}
          onSelectFlight={handleSelectFlight}
          onViewFlightInfo={() => setShowFlightInfo(true)}
          rawResponse={priceCheckData?.rawResponse}
        />
      )}

      {/* Flight Info Modal */}
      <FlightInfoModal
        flight={flight}
        open={showFlightInfo}
        onOpenChange={setShowFlightInfo}
        isPackageMode={isPackageMode}
        onPackageSelect={onSelect}
      />
    </div>
  );
}
