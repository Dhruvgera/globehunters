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
import { airportCache } from "@/lib/cache/airportCache";
import { shortenAirportName } from "@/lib/vyspa/utils";

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
  const setVyspaFolderInfo = useBookingStore((state) => state.setVyspaFolderInfo);
  const selectedUpgradeInStore = useBookingStore((state) => state.selectedUpgradeOption);
  const passengersInStore = useBookingStore((state) => state.passengers);
  const searchParams = useBookingStore((state) => state.searchParams);
  const [imgError, setImgError] = useState(false);
  const [selectedLegIndex, setSelectedLegIndex] = useState(0);
  const [selectedUpgradeOption, setSelectedUpgradeOption] = useState<TransformedPriceOption | null>(null);
  const [availabilityErrorOpen, setAvailabilityErrorOpen] = useState(false);
  const [returnWarnOpen, setReturnWarnOpen] = useState(false);

  // Price check integration
  const { priceCheck, isLoading, error, checkPrice, clearError } = usePriceCheck();

  const hasUpgradeOptions = !!(priceCheck && priceCheck.priceOptions && priceCheck.priceOptions.some((opt) => opt.isUpgrade));

  // State for resolved airport names from cache
  const [airportNameCache, setAirportNameCache] = useState<Record<string, string>>({});

  // Load airport names from cache when modal opens
  useEffect(() => {
    if (!open) return;

    const loadAirportNames = async () => {
      await airportCache.getAirports();

      // Get all unique airport codes from the flight
      const codes = new Set<string>();
      const segments = flight.segments && flight.segments.length > 0
        ? flight.segments
        : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];

      segments.forEach((seg) => {
        if (seg) {
          codes.add(seg.departureAirport.code);
          codes.add(seg.arrivalAirport.code);
          // Also add individual flight airport codes
          if (seg.individualFlights) {
            seg.individualFlights.forEach((f) => {
              if (f.departureAirport) codes.add(f.departureAirport);
              if (f.arrivalAirport) codes.add(f.arrivalAirport);
            });
          }
        }
      });

      const nameMap: Record<string, string> = {};
      codes.forEach((code) => {
        nameMap[code] = airportCache.getAirportName(code);
      });
      setAirportNameCache(nameMap);
    };

    loadAirportNames();
  }, [open, flight]);

  // Helper to get airport name - prefer cache, then flight data, then code
  const getAirportName = (code: string, flightName?: string, city?: string) => {
    const cached = airportNameCache[code];
    if (cached && cached !== code) return shortenAirportName(cached);
    if (flightName && flightName !== code) return shortenAirportName(flightName);
    if (city && city !== code) return shortenAirportName(city);
    return code;
  };

  // Helper to get city name from airport code using cache
  const getCityName = (code: string) => {
    const airport = airportCache.getAirportByCode(code);
    if (airport?.city && airport.city !== code) {
      return airport.city;
    }
    // Fallback to airport name if city not available
    if (airport?.name && airport.name !== code) {
      return shortenAirportName(airport.name);
    }
    return code;
  };

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
  // V3 flow: Use flightKey for FlightView -> psw_result_id -> PriceCheck
  useEffect(() => {
    if (open && (flight.flightKey || flight.segmentResultId)) {
      checkPrice(flight.segmentResultId || '', flight.flightKey);
    }
  }, [open, flight.segmentResultId, flight.flightKey, checkPrice]);

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

    // If user has already selected an option locally, do not override
    if (selectedUpgradeOption) return;

    // Log if no upgrade options (only fallback available)
    if (!hasUpgradeOptions) {
      console.log("[FlightInfoModal] Price check returned no upgrade options; using fallback option.", {
        optionCount: priceCheck.priceOptions.length,
      });
    }

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

    // Try to match the searched cabin class (only if we have multiple options)
    if (hasUpgradeOptions) {
      const searchedClass = searchParams?.class;
      if (searchedClass) {
        // Map search class names to possible cabin class display values
        const classMapping: Record<string, string[]> = {
          'Economy': ['Economy', 'ECONOMY', 'Economy Delight', 'Economy Flex', 'Economy Light'],
          'Premium Economy': ['Premium Economy', 'PREMIUM ECONOMY', 'Premium', 'PREMIUM'],
          'Business': ['Business', 'BUSINESS', 'Business Class', 'Upper Class'],
          'First': ['First', 'FIRST', 'First Class', 'Upper Class Flex'],
        };

        const possibleMatches = classMapping[searchedClass] || [searchedClass];

        // Find the first option that matches the searched class (cheapest within that class)
        const matchingOptions = priceCheck.priceOptions.filter((o) =>
          possibleMatches.some((match) =>
            o.cabinClassDisplay?.toLowerCase().includes(match.toLowerCase())
          )
        );

        if (matchingOptions.length > 0) {
          // Sort by price and pick the cheapest matching option
          const cheapestMatch = matchingOptions.sort((a, b) => a.totalPrice - b.totalPrice)[0];
          setSelectedUpgradeOption(cheapestMatch);
          return;
        }
      }
    }

    // Fallback: default to the first option (usually the cheapest/base fare)
    setSelectedUpgradeOption(priceCheck.priceOptions[0]);
  }, [priceCheck, selectedUpgradeOption, selectedUpgradeInStore, hasUpgradeOptions, searchParams?.class]);

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

    // Clear any previous folder info when selecting a new flight
    // This ensures old folder IDs don't carry over to a new booking
    setVyspaFolderInfo({ folderNumber: '', customerId: null, emailAddress: null });

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
          className="w-[min(100vw-24px,960px)] max-w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 gap-6 sm:gap-8 [&>button]:hidden bg-white rounded-3xl border-0 box-border"
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
            <div className="flex items-center justify-between gap-2 min-w-0">
              {/* Flight Leg Tabs (supports multi-city) - scrollable container */}
              <div className="relative flex-1 min-w-0 overflow-hidden">
                <div 
                  className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {journeySegments.map((seg, index) => (
                    <Button
                      key={`${seg.departureAirport.code}-${seg.arrivalAirport.code}-${index}`}
                      variant={normalizedIndex === index ? "default" : "outline"}
                      className={`${normalizedIndex === index
                        ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D0D7EF]"
                        : "bg-[#F6F6F6] text-[#3754ED] border-[#3754ED] hover:bg-[#EEEEEE]"
                        } rounded-full px-2.5 sm:px-3 py-2 h-auto text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 leading-normal min-w-0`}
                      onClick={() => {
                        if (index > 0 && passengersInStore && passengersInStore.length > 0) {
                          setReturnWarnOpen(true);
                        }
                        setSelectedLegIndex(index);
                      }}
                    >
                      {/* Compact format for multi-city: Airport codes with date */}
                      <span className="hidden sm:inline">
                        {seg.departureAirport.code} → {seg.arrivalAirport.code} • {seg.date.split(', ')[1] || seg.date}
                      </span>
                      <span className="sm:hidden">
                        {seg.departureAirport.code} → {seg.arrivalAirport.code}
                      </span>
                    </Button>
                  ))}
                </div>
                {/* Gradient fade indicators for scroll */}
                {journeySegments.length > 2 && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none opacity-0 transition-opacity" />
                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                  </>
                )}
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full h-7 w-7 shrink-0"
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
                              {getAirportName(currentLeg.departureAirport.code, currentLeg.departureAirport.name, currentLeg.departureAirport.city)} ({currentLeg.departureAirport.code})
                            </span>
                            <span className="text-xs text-[#3A478A]">
                              {getCityName(currentLeg.departureAirport.code)}
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
                                {/* Individual Flight Times with Layovers */}
                            {currentLeg.individualFlights.map((flight, idx) => {
                                  // Find layover after this flight (if not the last flight)
                                  const layover = idx < currentLeg.individualFlights!.length - 1 && currentLeg.layovers
                                    ? currentLeg.layovers.find(lay => lay.viaAirport === flight.arrivalAirport)
                                    : null;

                                  return (
                                    <div key={idx} className="relative">
                                      {/* Flight Segment - Grid Layout */}
                                      <div className="grid grid-cols-[48px_16px_1fr] sm:grid-cols-[64px_24px_1fr] gap-x-3 sm:gap-x-4">
                                        
                                        {/* DEPARTURE */}
                                        <div className="text-right pt-0.5">
                                          <span className="block text-sm sm:text-lg font-bold text-[#010D50] leading-tight">{flight.departureTime}</span>
                                        </div>
                                        <div className="relative flex justify-center pt-1.5">
                                           <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#010D50] bg-white z-10" />
                                           <div className="absolute top-2.5 bottom-0 w-0.5 bg-slate-200" />
                                        </div>
                                        <div className="pb-6">
                                          <span className="block text-sm sm:text-base font-bold text-[#010D50] leading-tight mb-0.5">
                                             {getCityName(flight.departureAirport)} ({flight.departureAirport})
                                          </span>
                                           <span className="text-xs sm:text-sm text-slate-500 block truncate max-w-[200px] sm:max-w-none">
                                             {getAirportName(flight.departureAirport, undefined, undefined) || flight.departureAirport}
                                           </span>
                                        </div>

                                        {/* FLIGHT DURATION & INFO */}
                                        <div className="text-right py-1">
                                          <span className="text-xs text-slate-500 font-medium">{flight.duration}</span>
                                        </div>
                                        <div className="relative flex justify-center">
                                           <div className="absolute top-0 bottom-0 w-0.5 bg-slate-200" />
                                        </div>
                                        <div className="pb-6 flex items-center gap-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 relative flex-shrink-0 bg-white rounded-sm">
                                                <Image 
                                                  src={`https://images.kiwi.com/airlines/64/${flight.carrierCode}.png`} 
                                                  alt={flight.carrierCode || 'Airline'}
                                                  width={24}
                                                  height={24}
                                                  className="object-contain"
                                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs sm:text-sm font-medium text-slate-700">
                                                    {flight.carrierCode}{flight.flightNumber}
                                                </span>
                                            </div>
                                        </div>

                                        {/* ARRIVAL */}
                                        <div className="text-right pt-0.5">
                                          <span className="block text-sm sm:text-lg font-bold text-[#010D50] leading-tight">{flight.arrivalTime}</span>
                                        </div>
                                        <div className="relative flex justify-center pt-1.5">
                                           <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#010D50] bg-[#010D50] z-10" />
                                           {/* Continue line only if there's a layover */}
                                           {layover && <div className="absolute top-2.5 bottom-0 w-0.5 bg-slate-200" />}
                                        </div>
                                        <div className="">
                                          <span className="block text-sm sm:text-base font-bold text-[#010D50] leading-tight mb-0.5">
                                             {getCityName(flight.arrivalAirport)} ({flight.arrivalAirport})
                                          </span>
                                          <span className="text-xs sm:text-sm text-slate-500 block truncate max-w-[200px] sm:max-w-none">
                                             {getAirportName(flight.arrivalAirport, undefined, undefined) || flight.arrivalAirport}
                                          </span>
                                          
                                          {/* Debug: Show raw API dates */}
                                          {process.env.NEXT_PUBLIC_DEBUG_FLIGHT_DATES === 'true' && (
                                            <div className="mt-1 text-[10px] font-mono text-orange-600 bg-orange-50 px-1 py-0.5 rounded w-fit">
                                              API: dep={flight.departureDate} → arr={flight.arrivalDate}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* LAYOVER SECTION */}
                                      {layover && (
                                        <div className="grid grid-cols-[48px_16px_1fr] sm:grid-cols-[64px_24px_1fr] gap-x-3 sm:gap-x-4 my-6">
                                          <div className="text-right">
                                              {/* Empty time col */}
                                          </div>
                                          <div className="relative flex justify-center">
                                              {/* Dashed line for layover */}
                                              <div className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-slate-300" />
                                          </div>
                                          <div className="py-2">
                                              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 sm:p-4 inline-flex flex-col gap-1 w-full sm:w-auto">
                                                  <div className="flex items-center gap-2 text-[#B91C1C]">
                                                      <Clock className="w-4 h-4" />
                                                      <span className="text-sm font-bold">{layover.duration} stopover</span>
                                                  </div>
                                                  <div className="text-xs sm:text-sm text-[#7F1D1D]">
                                                      Connect in <span className="font-semibold">{getCityName(layover.viaAirport)}</span> ({layover.viaAirport})
                                                  </div>
                                              </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Spacer between flights if no layover (shouldn't happen in this logic usually but good safety) */}
                                      {!layover && idx < currentLeg.individualFlights!.length - 1 && (
                                        <div className="h-8" />
                                      )}
                                    </div>
                                  );
                                })}
                                {/* Total Journey Time */}
                                {currentLeg.totalJourneyTime && (
                                  <div className="flex items-center gap-1 mt-4">
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
                              {getAirportName(currentLeg.arrivalAirport.code, currentLeg.arrivalAirport.name, currentLeg.arrivalAirport.city)} ({currentLeg.arrivalAirport.code})
                            </span>
                            <span className="text-xs text-[#3A478A]">
                              {getCityName(currentLeg.arrivalAirport.code)}
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

          {/* Fare Details Section (Dynamic from Price Check or Flight data fallback) */}
          {/* Show either when we have upgrade options OR when price check has loaded (even with fallback data) */}
          {((priceCheck && priceCheck.priceOptions.length > 0 && selectedUpgradeOption) || (!isLoading && priceCheck)) && (
            <div className="flex flex-col gap-5 sm:gap-6">
              {/* Only show fare option chips if there are multiple options */}
              {priceCheck && priceCheck.priceOptions.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 py-1">
                  {priceCheck.priceOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant={selectedUpgradeOption?.id === option.id ? "default" : "outline"}
                      className={`${selectedUpgradeOption?.id === option.id
                        ? "bg-[#3754ED] text-white hover:bg-[#2A3FB8]"
                        : "bg-[#F5F7FF] text-[#010D50] border-0 hover:bg-[#E0E7FF]"
                        } rounded-full px-4 py-2.5 h-auto text-sm font-semibold leading-normal whitespace-nowrap`}
                      onClick={() => setSelectedUpgradeOption(option)}
                    >
                      {prettifyCabinName(option.cabinClassDisplay)}
                      {/* Always show actual total fare, not price difference */}
                      <span className="ml-2 text-xs opacity-80">
                        {formatPrice(option.totalPrice, option.currency)}
                      </span>
                    </Button>
                  ))}
                </div>
              )}

              {/* Fare Details */}
              <div className="flex flex-col md:flex-row items-stretch gap-3">
                {/* Baggage Section - From OptionalService tags or fallback */}
                <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-4 sm:gap-6 min-w-0">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Baggage
                  </span>
                  <div className="flex flex-col gap-3">
                    {/* Checked Baggage - prefer perLeg data (has route info) for multi-segment flights */}
                    {(() => {
                      const checkedBaggageServices = selectedUpgradeOption?.checkedBaggageServices || [];
                      const perLeg = selectedUpgradeOption?.baggage?.perLeg;
                      
                      // Get chargeable status from OptionalService if available
                      const chargeableStatus = checkedBaggageServices[0]?.chargeable || 'included';
                      const isIncluded = chargeableStatus === 'included';
                      
                      // If we have perLeg data (route-based baggage), prefer showing it
                      // This gives better UX for multi-city showing LGW-DXB, DXB-DEL etc.
                      if (perLeg && perLeg.length > 0) {
                        return perLeg.map((leg, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {leg.allowance}
                                </span>
                                <span className="text-xs sm:text-sm text-[#3A478A]">
                                  {leg.route} · {isIncluded ? 'Included in fare' : 'Available for a charge'}
                                </span>
                              </div>
                            </div>
                            {isIncluded ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                            ) : (
                              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                            )}
                          </div>
                        ));
                      }
                      
                      // If no perLeg but we have OptionalService data, deduplicate by text and show
                      if (checkedBaggageServices.length > 0) {
                        // Deduplicate by text to avoid showing "Checked Baggage 25kgs" multiple times
                        const uniqueServices = checkedBaggageServices.filter((svc, idx, arr) => 
                          arr.findIndex(s => s.text === svc.text) === idx
                        );
                        
                        return uniqueServices.map((svc, idx) => (
                          <div key={`checked-${idx}`} className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {svc.text || 'Checked baggage'}
                                </span>
                                <span className="text-xs sm:text-sm text-[#3A478A]">
                                  {svc.chargeable === 'included' ? 'Included in fare' : 'Available for a charge'}
                                </span>
                              </div>
                            </div>
                            {svc.chargeable === 'included' ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                            ) : (
                              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                            )}
                          </div>
                        ));
                      }

                      // Fallback to baggage description
                      if (selectedUpgradeOption) {
                        return (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {selectedUpgradeOption.baggage.description}
                                </span>
                              </div>
                            </div>
                            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                          </div>
                        );
                      }

                      // Flight-level fallback
                      const baggageDisplay = flight.baggage || 'Cabin bag included';
                      return (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                {baggageDisplay}
                              </span>
                            </div>
                          </div>
                          {flight.hasBaggage ? (
                            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                          ) : (
                            <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                          )}
                        </div>
                      );
                    })()}

                    {/* Carry-On / Hand Baggage from OptionalService - "Carry On Hand Baggage" tag */}
                    {(() => {
                      const carryOnServices = selectedUpgradeOption?.carryOnBaggageServices || [];

                      if (carryOnServices.length > 0) {
                        // Deduplicate by text to avoid showing "Hand Luggage" multiple times
                        const uniqueServices = carryOnServices.filter((svc, idx, arr) => 
                          arr.findIndex(s => s.text === svc.text) === idx
                        );
                        
                        return uniqueServices.map((svc, idx) => (
                          <div key={`carryon-${idx}`} className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {svc.text || 'Hand baggage'}
                                </span>
                                <span className="text-xs sm:text-sm text-[#3A478A]">
                                  {svc.chargeable === 'included' ? 'Included in fare' : 'Available for a charge'}
                                </span>
                              </div>
                            </div>
                            {svc.chargeable === 'included' ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                            ) : (
                              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                            )}
                          </div>
                        ));
                      }

                      // Default carry-on display
                      return (
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
                      );
                    })()}

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
                  </div>
                </div>

                {/* Flexibility Section - From OptionalService tags */}
                <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 min-w-0">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Flexibility
                  </span>
                  <div className="flex flex-col gap-3">
                    {/* Refundable Status - from OptionalService "Refund" tag */}
                    {(() => {
                      const refundService = selectedUpgradeOption?.refundService;

                      if (refundService) {
                        // Use OptionalService "Refund" tag data
                        const isIncluded = refundService.chargeable === 'included';
                        const isChargeable = refundService.chargeable === 'chargeable';

                        let displayLabel = 'Refunds';
                        let displayText = refundService.text || 'Refunds';

                        if (isIncluded) {
                          displayLabel = 'Refunds included';
                          displayText = 'Ticket can be refunded';
                        } else if (isChargeable) {
                          displayLabel = 'Refunds available';
                          displayText = 'Refundable for a charge';
                        }

                        return (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {displayLabel}
                                </span>
                                <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                                  {displayText}
                                </span>
                              </div>
                            </div>
                            {isIncluded ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                            ) : isChargeable ? (
                              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                            ) : (
                              <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                            )}
                          </div>
                        );
                      }

                      // Use selected option's refundable status first, then fallback to priceCheck.flightDetails or flight data
                      const isRefundable = selectedUpgradeOption?.refundable ?? priceCheck?.flightDetails?.refundable ?? flight.refundable ?? false;
                      const refundableStatus = selectedUpgradeOption?.refundableStatus ?? priceCheck?.flightDetails?.refundableStatus;
                      const refundableText = selectedUpgradeOption?.refundableText ?? priceCheck?.flightDetails?.refundableText ?? flight.refundableText ?? (isRefundable ? 'Ticket can be refunded (fees may apply)' : 'Ticket can\'t be refunded');

                      let displayLabel = 'Non-Refundable';
                      if (refundableStatus === 'fully-refundable') {
                        displayLabel = 'Fully Refundable';
                      } else if (refundableStatus === 'refundable-with-penalty') {
                        displayLabel = 'Refundable with Penalty';
                      } else if (isRefundable) {
                        displayLabel = 'Refundable';
                      }

                      return (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                {displayLabel}
                              </span>
                              <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                                {refundableText}
                              </span>
                            </div>
                          </div>
                          {refundableStatus === 'fully-refundable' ? (
                            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                          ) : refundableStatus === 'refundable-with-penalty' || refundableStatus === 'refundable' ? (
                            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                          ) : (
                            <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                          )}
                        </div>
                      );
                    })()}

                    {/* Changes/Rebooking - from OptionalService "Rebooking" tag */}
                    {(() => {
                      const rebookingService = selectedUpgradeOption?.rebookingService;

                      if (rebookingService) {
                        const isIncluded = rebookingService.chargeable === 'included';
                        const isChargeable = rebookingService.chargeable === 'chargeable';

                        let displayLabel = 'Changes';
                        let displayText = rebookingService.text || 'Changes';

                        if (isIncluded) {
                          displayLabel = 'Changes included';
                          displayText = 'Flights can be changed for free';
                        } else if (isChargeable) {
                          displayLabel = 'Changes available';
                          displayText = 'Flights can be changed for a charge';
                        }

                        return (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {displayLabel}
                                </span>
                                <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                                  {displayText}
                                </span>
                              </div>
                            </div>
                            {isIncluded ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                            ) : isChargeable ? (
                              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                            ) : (
                              <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                            )}
                          </div>
                        );
                      }

                      // Fallback to priceCheck.flightDetails
                      return (
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
                      );
                    })()}

                    {/* Seat Selection - from OptionalService "Seat Assignment" tag */}
                    {(() => {
                      const seatServices = selectedUpgradeOption?.seatServices || [];

                      // Find the first seat service that's not "Not offered"
                      const seatService = seatServices.find(s => s.chargeable !== 'not_offered');

                      if (seatService) {
                        const isIncluded = seatService.chargeable === 'included';
                        const isChargeable = seatService.chargeable === 'chargeable';

                        let displayLabel = seatService.text || 'Seat selection';
                        let displayText = '';

                        if (isIncluded) {
                          displayText = 'Included in fare';
                        } else if (isChargeable) {
                          displayText = 'Available for a charge';
                        }

                        return (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Armchair className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {displayLabel}
                                </span>
                                {displayText && (
                                  <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                                    {displayText}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isIncluded ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                            ) : isChargeable ? (
                              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                            ) : (
                              <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                            )}
                          </div>
                        );
                      }

                      // Fallback to priceCheck.flightDetails
                      return (
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
                            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                          )}
                        </div>
                      );
                    })()}

                    {/* Meals - from OptionalService "Meals and Beverages" tag */}
                    {(() => {
                      const mealsService = selectedUpgradeOption?.mealsService;

                      if (mealsService) {
                        const isIncluded = mealsService.chargeable === 'included';
                        const isChargeable = mealsService.chargeable === 'chargeable';

                        return (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {mealsService.text || 'Meals and beverages'}
                                </span>
                                <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                                  {isIncluded ? 'Included in fare' : isChargeable ? 'Available for purchase' : ''}
                                </span>
                              </div>
                            </div>
                            {isIncluded ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                            ) : isChargeable ? (
                              <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                            ) : (
                              <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                            )}
                          </div>
                        );
                      }

                      // If no mealsService, don't show this section (or show flight.meals fallback if needed)
                      return null;
                    })()}
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

          {/* Footer for booking page - "Done" button to confirm upgrade selection */}
          {stayOnCurrentPage && selectedUpgradeOption && (
            <div className="sticky bottom-0 z-20 bg-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-3 border border-[#EEF0F7] shadow-[0_-8px_24px_-12px_rgba(2,6,23,0.35)]">
              <div className="flex flex-col gap-1">
                <span className="text-sm sm:text-lg font-medium text-[#3754ED] whitespace-nowrap">
                  {formatPrice(selectedUpgradeOption.totalPrice, selectedUpgradeOption.currency)}
                </span>
                <span className="text-xs text-[#3A478A]">
                  {`${formatPrice(selectedUpgradeOption.pricePerPerson, selectedUpgradeOption.currency)} per person`}
                </span>
              </div>
              <Button
                onClick={() => {
                  // Save selected upgrade to store
                  setSelectedUpgrade(selectedUpgradeOption);
                  // Update selected flight with new cabin class
                  setSelectedFlight(flight, selectedUpgradeOption.cabinClassDisplay);
                  // Save price check data
                  if (priceCheck) {
                    setPriceCheckData(priceCheck);
                  }
                  // Close the dialog
                  onOpenChange(false);
                }}
                className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-4 sm:px-5 py-2 h-auto gap-1 text-sm font-bold shrink-0"
              >
                Done
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
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

