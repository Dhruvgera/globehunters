"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Info, Clock, Briefcase, Package, ShoppingBag, XCircle as XIcon, Plane, MapPin, UtensilsCrossed, AlertTriangle, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flight } from "@/types/flight";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import { useBookingStore } from "@/store/bookingStore";
import { usePriceCheck } from "@/hooks/usePriceCheck";
import { TransformedPriceOption } from "@/types/priceCheck";

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
  const t = useTranslations('flightInfo');
  const router = useRouter();
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const setSelectedUpgrade = useBookingStore((state) => state.setSelectedUpgrade);
  const setPriceCheckData = useBookingStore((state) => state.setPriceCheckData);
  const [imgError, setImgError] = useState(false);
  const [selectedLeg, setSelectedLeg] = useState<"outbound" | "inbound">(
    "outbound"
  );
  const [selectedUpgradeOption, setSelectedUpgradeOption] = useState<TransformedPriceOption | null>(null);

  // Price check integration
  const { priceCheck, isLoading, error, checkPrice, clearError } = usePriceCheck();

  const currentLeg =
    selectedLeg === "outbound" ? flight.outbound : flight.inbound;

  // Trigger price check when modal opens - run immediately, don't wait for other requests
  useEffect(() => {
    if (open && flight.segmentResultId) {
      checkPrice(flight.segmentResultId);
    }
  }, [open, flight.segmentResultId, checkPrice]);

  // Clear error when modal closes
  useEffect(() => {
    if (!open) {
      clearError();
      setSelectedUpgradeOption(null);
    }
  }, [open, clearError]);

  // Set default selected option when price check loads
  useEffect(() => {
    if (priceCheck && priceCheck.priceOptions.length > 0 && !selectedUpgradeOption) {
      setSelectedUpgradeOption(priceCheck.priceOptions[0]);
    }
  }, [priceCheck, selectedUpgradeOption]);

  function prettifyCabinName(name: string) {
    if (!name) return '';
    // Insert space before capital letters, handle known concatenations
    const map: Record<string, string> = {
      PremiumEconomy: 'Premium Economy',
    };
    if (map[name]) return map[name];
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-24px,960px)] max-w-full max-h-[90vh] overflow-y-auto overflow-x-clip p-4 sm:p-6 gap-6 sm:gap-8 [&>button]:hidden bg-white rounded-3xl border-0 box-border">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('modal.title')}</DialogTitle>
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
                                  <div key={idx} className="flex items-center gap-1">
                                    <Plane className="w-3 sm:w-4 h-3 sm:h-4 text-[#3A478A] shrink-0" />
                                    <span className="text-xs sm:text-sm text-[#3A478A]">
                                      {flight.departureAirport} → {flight.arrivalAirport}: {flight.duration}
                                    </span>
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
                            {currentLeg.date}
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
                            <span className="text-xs text-[#3A478A]">{t('baggage.checkedDesc')}</span>
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

          {/* Price Check Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">{error.userMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => flight.segmentResultId && checkPrice(flight.segmentResultId)}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

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
          )}

        {/* Footer */}
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
            disabled={!selectedUpgradeOption && !flight.price}
            className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-4 sm:px-5 py-2 h-auto gap-1 text-sm font-bold shrink-0 disabled:opacity-50"
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

