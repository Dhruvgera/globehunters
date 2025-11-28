"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Info, Clock, Briefcase, Package, ShoppingBag, XCircle as XIcon, Plane, MapPin, UtensilsCrossed, Loader2, ChevronDown, ChevronUp, RotateCcw, RefreshCw, Armchair } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flight, FlightSegment } from "@/types/flight";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import { useBookingStore } from "@/store/bookingStore";
import { usePriceCheck } from "@/hooks/usePriceCheck";
import { TransformedPriceOption } from "@/types/priceCheck";
import { ErrorMessage } from "@/components/ui/error-message";

/** Debug component to display raw API response */
function RawResponseDebug({ rawResponse, title }: { rawResponse: any; title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-semibold text-yellow-800 w-full"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>🔧 {title}</span>
      </button>
      {isExpanded && (
        <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-900 overflow-auto max-h-80 whitespace-pre-wrap break-all">
          {JSON.stringify(rawResponse, null, 2)}
        </pre>
      )}
    </div>
  );
}

interface FlightInfoModalProps {
  flight: Flight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stayOnCurrentPage?: boolean;
}

export default function FlightInfoModal({
  flight,
  open,
  onOpenChange,
  stayOnCurrentPage = false,
}: FlightInfoModalProps) {
  const t = useTranslations('flightInfo');
  const router = useRouter();
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const setSelectedUpgrade = useBookingStore((state) => state.setSelectedUpgrade);
  const setPriceCheckData = useBookingStore((state) => state.setPriceCheckData);
  const selectedUpgradeInStore = useBookingStore((state) => state.selectedUpgradeOption);
  const passengersInStore = useBookingStore((state) => state.passengers);
  const [imgError, setImgError] = useState(false);
  const [selectedLegIndex, setSelectedLegIndex] = useState(0);
  const [selectedUpgradeOption, setSelectedUpgradeOption] = useState<TransformedPriceOption | null>(null);
  const [availabilityErrorOpen, setAvailabilityErrorOpen] = useState(false);
  const [returnWarnOpen, setReturnWarnOpen] = useState(false);

  // Price check integration
  const { priceCheck, isLoading, error, checkPrice, clearError } = usePriceCheck();

  const hasUpgradeOptions = !!(priceCheck && priceCheck.priceOptions && priceCheck.priceOptions.some((opt) => opt.isUpgrade));

  const journeySegments = flight.segments && flight.segments.length > 0
    ? flight.segments
    : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])].filter(
        (seg): seg is FlightSegment => !!seg
      );

  const normalizedIndex =
    selectedLegIndex >= 0 && selectedLegIndex < journeySegments.length
      ? selectedLegIndex
      : 0;

  const currentLeg = journeySegments[normalizedIndex];

  // Trigger price check when modal opens - run immediately, don't wait for other requests
  useEffect(() => {
    if (open && flight.segmentResultId) {
      checkPrice(flight.segmentResultId);
    }
  }, [open, flight.segmentResultId, checkPrice]);

  useEffect(() => {
    if (!open) return;
    console.log("[FlightInfoModal] State", {
      flightId: flight.id,
      segmentResultId: flight.segmentResultId,
      isLoadingPriceCheck: isLoading,
      hasPriceCheck: !!priceCheck,
      priceCheckOptionCount: priceCheck?.priceOptions?.length ?? 0,
      hasUpgradeOptions,
      hasError: !!error,
      errorType: error?.type,
      refundable: priceCheck?.flightDetails?.refundable,
      flightDetails: priceCheck?.flightDetails,
    });
  }, [open, flight.id, flight.segmentResultId, isLoading, priceCheck, error, hasUpgradeOptions]);

  useEffect(() => {
    if (!open || !error) return;
    console.warn("[FlightInfoModal] Price check error", {
      flightId: flight.id,
      segmentResultId: flight.segmentResultId,
      error,
    });
  }, [open, error, flight.id, flight.segmentResultId]);

  // Clear error when modal closes
  useEffect(() => {
    if (!open) {
      clearError();
      setSelectedUpgradeOption(null);
    }
  }, [open, clearError]);

  // Set default selected option when price check loads
  useEffect(() => {
    if (!priceCheck || priceCheck.priceOptions.length === 0) return;
    if (!hasUpgradeOptions) {
      console.log("[FlightInfoModal] Price check returned no upgrade options; using search price without upgrades.", {
        optionCount: priceCheck.priceOptions.length,
      });
      return;
    }
    // If user has already selected an option locally, do not override
    if (selectedUpgradeOption) return;

    // Prefer persisted selection from store if available
    if (selectedUpgradeInStore) {
      const match =
        priceCheck.priceOptions.find((o) => o.id === selectedUpgradeInStore.id) ||
        priceCheck.priceOptions.find((o) => o.cabinClassDisplay === selectedUpgradeInStore.cabinClassDisplay);
      if (match) {
        setSelectedUpgradeOption(match);
        return;
      }
    }
    // Otherwise default to first option
    setSelectedUpgradeOption(priceCheck.priceOptions[0]);
  }, [priceCheck, selectedUpgradeOption, selectedUpgradeInStore, hasUpgradeOptions]);

  function prettifyCabinName(name: string) {
    if (!name) return '';
    // Handle known concatenations
    const map: Record<string, string> = {
      PremiumEconomy: 'Premium Economy',
    };
    if (map[name]) return map[name];
    
    // If it's all uppercase (like "ECONOMY LIGHT" or "PREMIUM"), convert to Title Case
    if (name === name.toUpperCase()) {
      return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Insert space before capital letters for camelCase
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  function normalizeBaggageLabel(label?: string): string {
    if (!label) return '';
    const code = String(label).trim();
    const match = code.match(/(\d+)p/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num === 0) return 'Cabin bag only';
      if (num === 1) return '1 piece';
      return `${num} pieces`;
    }
    if (code.endsWith('***')) return 'Cabin bag only';
    return label;
  }

  const handleBookNow = () => {
    console.log("[FlightInfoModal] handleBookNow", {
      flightId: flight.id,
      segmentResultId: flight.segmentResultId,
      hasSelectedUpgradeOption: !!selectedUpgradeOption,
      usingUpgrade: !!(selectedUpgradeOption && hasUpgradeOptions && selectedUpgradeOption.isUpgrade),
      selectedUpgradeId: selectedUpgradeOption?.id,
    });
    // COMMENTED OUT: Availability error check (dialog was disabled)
    // If you need to re-enable availability checking, uncomment this block
    // and uncomment the availability error dialog below
    /*
    if (
      (priceCheck && priceCheck.priceOptions.length === 0) ||
      (error && error.type) // any API error while checking availability
    ) {
      setAvailabilityErrorOpen(true);
      return;
    }
    */

    if (selectedUpgradeOption) {
      // Save selected upgrade to store
      setSelectedUpgrade(selectedUpgradeOption);
      // Save flight with selected cabin class
      setSelectedFlight(flight, selectedUpgradeOption.cabinClassDisplay);
      // Save price check data
      if (priceCheck) {
        setPriceCheckData(priceCheck);
      }
    } else {
      // Fallback to original flight price
      setSelectedFlight(flight, 'Economy');
      // Still save price check data if available (for any flight details)
      if (priceCheck) {
        setPriceCheckData(priceCheck);
      }
    }

    if (stayOnCurrentPage) {
      onOpenChange(false);
      return;
    }

    // Navigate to booking page
    router.push('/booking');
  };

  function cabinClassName(code?: string) {
    if (!code) return undefined;
    const m = String(code).toUpperCase();
    switch (m) {
      case 'F': return 'First';
      case 'C': return 'Business';
      case 'W': return 'Premium Economy';
      case 'Y':
      case 'M':
        return 'Economy';
      default:
        return m;
    }
  }
  function hasSegmentBaggage(): boolean {
    const label = currentLeg?.segmentBaggage;
    const qty = currentLeg?.segmentBaggageQuantity;
    const unit = currentLeg?.segmentBaggageUnit;
    const lower = label ? String(label).toLowerCase() : '';
    if (lower === 'none' || lower === 'no' || lower === '0') return false;
    if (qty && qty !== '0') return true;
    return !!label;
  }
  function formatBaggageText(): string {
    // Prefer segment baggage; fallback to flight-level
    if (hasSegmentBaggage()) {
      const qty = currentLeg?.segmentBaggageQuantity;
      const unit = currentLeg?.segmentBaggageUnit;
      const label = currentLeg?.segmentBaggage || '';
      const lower = label ? label.toLowerCase() : '';
      if (lower === 'none' || lower === 'no' || lower === '0') return '';
      if (qty && unit) {
        const u = String(unit).toLowerCase();
        const normUnit = u === 'k' ? 'kg' : (u === 'p' ? 'pc' : unit);
        return `${qty} ${normUnit}`;
      }
      return label;
    }
    // Flight-level baggage (e.g., "Included")
    if (flight.hasBaggage && flight.baggage) {
      const lower = String(flight.baggage).toLowerCase();
      if (lower === 'none' || lower === 'no' || lower === '0') return '';
      return String(flight.baggage);
    }
    return '';
  }

  function getBaggageDetails(): string {
    // Get the baggage unit to determine what details to show
    if (hasSegmentBaggage()) {
      const unit = currentLeg?.segmentBaggageUnit;
      if (unit) {
        const u = String(unit).toLowerCase();
        // If it's pieces, show "Consult airline policy"
        if (u === 'p' || u === 'pc') {
          return 'Consult airline policy';
        }
        // If it's kg, don't show additional text as the weight is already in the main display
        if (u === 'k' || u === 'kg') {
          return '';
        }
      }
    }
    // Default: show nothing
    return '';
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[min(100vw-24px,960px)] max-w-full max-h-[90vh] overflow-y-auto overflow-x-clip p-4 sm:p-6 gap-6 sm:gap-8 [&>button]:hidden bg-white rounded-3xl border-0 box-border"
        aria-describedby="flight-details-description"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t('modal.title')}</DialogTitle>
          <p id="flight-details-description" className="sr-only">
            View detailed flight information including departure and arrival times, baggage allowance, and fare options
          </p>
        </DialogHeader>
        {/* Header with Flight Leg Selector */}
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              {/* Flight Leg Tabs (supports multi-city) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
                {journeySegments.map((seg, index) => (
                  <Button
                    key={`${seg.departureAirport.code}-${seg.arrivalAirport.code}-${index}`}
                    variant={normalizedIndex === index ? "default" : "outline"}
                    className={`${
                      normalizedIndex === index
                        ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D0D7EF]"
                        : "bg-[#F6F6F6] text-[#3754ED] border-[#3754ED] hover:bg-[#EEEEEE]"
                    } rounded-full px-3 sm:px-4 py-2.5 h-auto text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 leading-normal`}
                    onClick={() => {
                      if (index > 0 && passengersInStore && passengersInStore.length > 0) {
                        setReturnWarnOpen(true);
                      }
                      setSelectedLegIndex(index);
                    }}
                  >
                    <span className="hidden sm:inline">
                      {seg.departureAirport.city} - {seg.arrivalAirport.city} - {seg.date}
                    </span>
                    <span className="sm:hidden">
                      {seg.departureAirport.code} - {seg.arrivalAirport.code}
                    </span>
                  </Button>
                ))}
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
                    {`Flight ${normalizedIndex + 1} of ${journeySegments.length}`}
                  </span>

                  {/* Flight Card */}
                  <div className="bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-4 sm:gap-6 max-w-full overflow-hidden">
                    {/* Airline Info */}
                    <div className="flex flex-col justify-center gap-3">
                      <div className="flex items-center gap-2">
                        {!imgError ? (
                          <div className="w-10 h-10 relative flex items-center justify-center">
                            <Image
                              src={`https://images.kiwi.com/airlines/64/${flight.airline.code}.png`}
                              alt={`${flight.airline.name} logo`}
                              width={40}
                              height={40}
                              className="object-contain"
                              onError={() => setImgError(true)}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{flight.airline.code}</span>
                          </div>
                        )}
                        <span className="text-sm font-semibold text-[#010D50]">
                          {flight.airline.name}
                        </span>
                      </div>
                      {(currentLeg?.carrierCode || currentLeg?.flightNumber || currentLeg?.cabinClass || currentLeg?.distance || currentLeg?.aircraftType) && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-[#3A478A]">
                          {(currentLeg?.carrierCode || currentLeg?.flightNumber || currentLeg?.cabinClass) && (
                            <span>
                              {(currentLeg?.carrierCode || '')}
                              {currentLeg?.flightNumber ? `${currentLeg?.carrierCode ? '' : ''}${currentLeg.flightNumber}` : ''}
                              {currentLeg?.cabinClass ? ` - ${cabinClassName(currentLeg.cabinClass)}` : ''}
                            </span>
                          )}
                          {currentLeg?.distance && (
                            <>
                              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#010D50]" />
                              <span>{currentLeg.distance}</span>
                            </>
                          )}
                          {currentLeg?.aircraftType && (
                            <>
                              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#010D50]" />
                              <span>{currentLeg.aircraftType}</span>
                            </>
                          )}
                        </div>
                      )}
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
                            {currentLeg?.departureTerminal && (
                              <span className="text-xs sm:text-sm text-[#3A478A]">
                                Terminal {currentLeg.departureTerminal}
                              </span>
                            )}
                          </div>

                          {/* Travel Time - show individual flights if available, otherwise show total */}
                          <div className="flex flex-col gap-2">
                            {currentLeg.individualFlights && currentLeg.individualFlights.length > 0 ? (
                              <>
                                {/* Individual Flight Times */}
                                {currentLeg.individualFlights.map((flight, idx) => (
                                  <div key={idx} className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <Plane className="w-3 sm:w-4 h-3 sm:h-4 text-[#3A478A] shrink-0" />
                                      <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
                                        <span className="font-bold text-[#010D50]">
                                          {flight.carrierCode}{flight.flightNumber}
                                        </span>
                                        <span className="text-[#3A478A]">
                                          {flight.departureAirport} → {flight.arrivalAirport}
                                        </span>
                                        <span className="text-[#3A478A] opacity-50">•</span>
                                        <span className="text-[#010D50] font-medium">
                                          {flight.departureTime} - {flight.arrivalTime}
                                        </span>
                                        <span className="text-[#3A478A] opacity-50">•</span>
                                        <span className="text-[#3A478A]">
                                          {flight.duration}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Debug: Show raw API dates */}
                                    {process.env.NEXT_PUBLIC_DEBUG_FLIGHT_DATES === 'true' && (
                                      <div className="ml-4 text-[10px] font-mono text-orange-600 bg-orange-50 px-1 py-0.5 rounded w-fit">
                                        API: dep={flight.departureDate} → arr={flight.arrivalDate}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {/* Total Journey Time */}
                                {currentLeg.totalJourneyTime && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-[#010D50] shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                      Total journey time: {currentLeg.totalJourneyTime}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-[#3A478A] shrink-0" />
                                <span className="text-xs sm:text-sm text-[#3A478A]">
                                  Flight time: {currentLeg.duration}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Arrival */}
                          <div className="flex flex-col gap-1">
                            <span className="text-xs sm:text-sm font-semibold text-[#010D50] break-words">
                              {currentLeg.arrivalAirport.city} (
                              {currentLeg.arrivalAirport.code})
                            </span>
                            {currentLeg?.arrivalTerminal && (
                              <span className="text-xs sm:text-sm text-[#3A478A]">
                                Terminal {currentLeg.arrivalTerminal}
                              </span>
                            )}
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
                            {currentLeg.arrivalDate || currentLeg.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segment Baggage (conditional, prefer leg-specific baggage) */}
                {formatBaggageText() && (
                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold text-[#010D50]">
                      {t('modal.includedSegment')}
                    </span>
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex flex-col gap-3">
                        <span className="text-sm font-medium text-[#010D50]">{t('baggage.title')}</span>
                        <div className="flex items-start gap-2">
                          <Package className="w-5 h-5 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#010D50]">{normalizeBaggageLabel(formatBaggageText())}</span>
                            {getBaggageDetails() && (
                              <span className="text-xs text-[#3A478A]">{getBaggageDetails()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stopover Info (if applicable) */}
                {currentLeg.stopDetails && currentLeg.stopDetails !== "Direct" && (
                  <div className="flex flex-col gap-3">
                    {/* Stopover Durations */}
                    {currentLeg.layovers && currentLeg.layovers.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {currentLeg.layovers.map((lay, idx) => (
                          <div key={idx} className="bg-[#F5F7FF] rounded-xl px-4 py-3 flex items-center gap-3 w-fit">
                            <span className="text-sm text-[#3A478A]">
                              Stopover at {lay.viaAirport} for <span className="font-medium text-[#010D50]">{lay.duration}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#F5F7FF] rounded-xl px-4 py-3 flex items-center gap-3 w-fit">
                        <span className="text-sm text-[#3A478A]">{currentLeg.stopDetails}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Refundable and Meals (Extras) */}
                {(flight.refundable !== null || flight.meals !== undefined) && (
                  <div className="flex flex-col md:flex-row gap-3">
                    {flight.refundable !== null && (
                      <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex items-start gap-3">
                        <Info className={`w-5 h-5 ${flight.refundable ? 'text-[#008234]' : 'text-[#FF0202]'} shrink-0`} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-[#010D50]">
                            {flight.refundable ? 'Refundable' : 'Non-Refundable'}
                          </span>
                          {flight.refundableText && (
                            <span className="text-xs text-[#3A478A] break-words">{flight.refundableText}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {flight.meals !== undefined && (
                      <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex items-start gap-3">
                        <UtensilsCrossed className="w-5 h-5 text-[#010D50] shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-[#010D50]">
                            {flight.meals ? 'Meals included' : 'Meals not included'}
                          </span>
                          {flight.meals && (
                            <span className="text-xs text-[#3A478A]">{t('meals.complimentaryDesc')}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price Check Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-3 items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#3754ED]" />
              <p className="text-sm text-[#3A478A]">Loading fare options...</p>
            </div>
          )}

          {/* Price check is only for optional upgrades - no error display needed */}

          {/* (chips rendered once below within Fare Details section) */}

          {/* Fare Details Section (Dynamic from Price Check) */}
          {priceCheck && priceCheck.priceOptions.length > 0 && selectedUpgradeOption && (
          <div className="flex flex-col gap-5 sm:gap-6">
            <div className="flex flex-wrap items-center gap-2 py-1">
              {priceCheck.priceOptions.map((option) => (
                <Button
                  key={option.id}
                  variant={selectedUpgradeOption?.id === option.id ? "default" : "outline"}
                  className={`${
                    selectedUpgradeOption?.id === option.id
                      ? "bg-[#3754ED] text-white hover:bg-[#2A3FB8]"
                      : "bg-[#F5F7FF] text-[#010D50] border-0 hover:bg-[#E0E7FF]"
                  } rounded-full px-4 py-2.5 h-auto text-sm font-semibold leading-normal whitespace-nowrap`}
                  onClick={() => setSelectedUpgradeOption(option)}
                >
                  {prettifyCabinName(option.cabinClassDisplay)}
                  {option.isUpgrade && option.priceDifference && (
                    <span className="ml-2 text-xs opacity-80">
                      +{formatPrice(option.priceDifference, option.currency)}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Fare Details */}
            <div className="flex flex-col md:flex-row items-stretch gap-3">
                {/* Baggage Section - From Selected Option */}
                <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-4 sm:gap-6 min-w-0">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Baggage
                  </span>
                  <div className="flex flex-col gap-3">
                    {/* Baggage from API */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            {selectedUpgradeOption.baggage.description}
                          </span>
                          {selectedUpgradeOption.baggage.details && (
                            <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                              {selectedUpgradeOption.baggage.details.substring(0, 100)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>

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
                            Standard size restrictions apply
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
                    {/* Refundable Status - Dynamic from API */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            {priceCheck?.flightDetails?.refundable ? 'Refundable' : 'Non-Refundable'}
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            {priceCheck?.flightDetails?.refundable 
                              ? 'Ticket can be refunded (fees may apply)' 
                              : 'Ticket can\'t be refunded'}
                          </span>
                        </div>
                      </div>
                      {priceCheck?.flightDetails?.refundable ? (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                      ) : (
                        <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                      )}
                    </div>

                    {/* Changes - depends on fare type */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            {priceCheck?.flightDetails?.changeable ? 'Changes allowed' : 'Changes not allowed'}
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            {priceCheck?.flightDetails?.changeable 
                              ? 'Flights can be changed (fees may apply)' 
                              : 'Flights can\'t be changed after booking'}
                          </span>
                        </div>
                      </div>
                      {priceCheck?.flightDetails?.changeable ? (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                      ) : (
                        <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                      )}
                    </div>

                    {/* Seat Choice */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Armchair className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            {priceCheck?.flightDetails?.seatSelectionFree ? 'Seat choice for free' : 'Seat selection available'}
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            {priceCheck?.flightDetails?.seatSelectionFree 
                              ? 'Choose your desired seat for free' 
                              : 'Seat selection available for a charge'}
                          </span>
                        </div>
                      </div>
                      {priceCheck?.flightDetails?.seatSelectionFree ? (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                      ) : (
                        <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </div>
          )}

          {/* Debug: Raw Price Check Response */}
          {process.env.NEXT_PUBLIC_DEBUG_FLIGHT_IDS === 'true' && priceCheck?.rawResponse && (
            <RawResponseDebug rawResponse={priceCheck.rawResponse} title="Price Check Raw Response" />
          )}

        {/* Footer - Only show on search/results pages, not on payment page */}
        {!stayOnCurrentPage && (
          <div className="sticky bottom-0 z-20 bg-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-3 border border-[#EEF0F7] shadow-[0_-8px_24px_-12px_rgba(2,6,23,0.35)]">
            <div className="flex flex-col gap-1">
              <span className="text-sm sm:text-lg font-medium text-[#3754ED] whitespace-nowrap">
                {selectedUpgradeOption 
                  ? formatPrice(selectedUpgradeOption.totalPrice, selectedUpgradeOption.currency)
                  : formatPrice(flight.price, flight.currency)}
              </span>
              <span className="text-xs text-[#3A478A]">
                {selectedUpgradeOption
                  ? `${formatPrice(selectedUpgradeOption.pricePerPerson, selectedUpgradeOption.currency)} per person`
                  : `${formatPrice(flight.pricePerPerson, flight.currency)} per person`}
              </span>
            </div>
            <Button 
              onClick={handleBookNow}
              disabled={!flight.price && !selectedUpgradeOption}
              className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-4 sm:px-5 py-2 h-auto gap-1 text-sm font-bold shrink-0 disabled:opacity-50"
            >
              {isLoading ? 'Book' : (priceCheck && priceCheck.priceOptions.length === 0 ? 'Book Now' : 'Book')}
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
        )}
      </DialogContent>
    </Dialog>
    {/* Availability Error Popup */}
    {/* COMMENTED OUT: Limited Availability Error Dialog
    <Dialog open={availabilityErrorOpen} onOpenChange={setAvailabilityErrorOpen}>
      <DialogContent className="max-w-[min(100vw-24px,560px)] p-0 [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Limited availability</DialogTitle>
        </DialogHeader>
        <ErrorMessage
          title="Limited Availability"
          message="Sorry, the flight you selected has limited availability. Please select an alternative flight or call us on 1822222 where a sales agent will help with your booking."
        />
      </DialogContent>
    </Dialog>
    */}
    {/* Return tab warning (passenger page context) */}
    {/* <Dialog open={returnWarnOpen} onOpenChange={setReturnWarnOpen}>
      <DialogContent 
        className="max-w-[min(100vw-24px,560px)] p-0 [&>button]:hidden"
        aria-describedby="booking-warning-description"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Booking warning</DialogTitle>
          <p id="booking-warning-description" className="sr-only">
            Warning dialog about booking issues
          </p>
        </DialogHeader>
        <ErrorMessage
          title="Warning"
          message="There is a problem with your booking. Please try again."
        />
      </DialogContent>
    </Dialog> */}
    </>
  );
}

