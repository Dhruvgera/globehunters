"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ChevronLeft, Loader2, Home, AlertCircle, CalendarDays, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { useBookingStore, useSelectedFlight, useStoreHydration } from "@/store/bookingStore";
import { PRICING_CONFIG, IASSURE_PRICING, REFUND_SHIELD_PRICING } from "@/config/constants";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { useBoxPay } from "@/hooks/useBoxPay";
import { getRegion } from "@/lib/utils/domainMapping";
import { airportCache } from "@/lib/cache/airportCache";
import { shortenAirportName } from "@/lib/vyspa/utils";
import { formatFareLabel } from "@/lib/utils";

// Import new modular components
import { PaymentHeader } from "@/components/payment/PaymentHeader";
import { BaggageSection } from "@/components/payment/BaggageSection";
import { ProtectionPlanSection } from "@/components/payment/ProtectionPlanSection";
import { RefundShieldSection } from "@/components/payment/RefundShieldSection";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import { WebRefCard } from "@/components/booking/WebRefCard";
import { PaymentForm } from "@/components/payment/PaymentForm";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import { HotelSummaryCard } from "@/components/booking/HotelSummaryCard";
import { packageService } from "@/services/api/packageService";

import { FOLDER_STATUS_CODES } from "@/types/portal";
import { countryCodes } from "@/lib/utils/countryCodes";

const REFUNDABLE_TERMS_URL = "https://refundablebooking.com/refundable-terms";

function parseMoneyString(value: string | undefined): { amount?: number; currency?: string } {
  if (!value) return { amount: undefined, currency: undefined };
  const normalized = value.trim();
  const leadingCurrency = normalized.match(/^([A-Za-z£$€]{1,3})\s*([0-9]+(?:\.[0-9]+)?)$/);
  if (leadingCurrency) {
    return {
      currency: leadingCurrency[1],
      amount: Number(leadingCurrency[2]),
    };
  }

  const trailingCurrency = normalized.match(/^([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z£$€]{1,3})$/);
  if (trailingCurrency) {
    return {
      amount: Number(trailingCurrency[1]),
      currency: trailingCurrency[2],
    };
  }

  return { amount: undefined, currency: undefined };
}

function PaymentContent() {
  const t = useTranslations('payment');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPackageMode = searchParams?.get("type") === "package";
  const isHotelMode = searchParams?.get("type") === "hotel";
  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [isPaymentValid, setIsPaymentValid] = useState(false);
  const [paymentTermsAccepted, setPaymentTermsAccepted] = useState(false);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const [paymentErrorOpen, setPaymentErrorOpen] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>('');

  // Check if store has been hydrated from sessionStorage
  const hasHydrated = useStoreHydration();

  // Get selected flight and upgrade from Zustand store
  const flight = useSelectedFlight();
  const selectedUpgrade = useBookingStore((state) => state.selectedUpgradeOption);
  const priceCheckData = useBookingStore((state) => state.priceCheckData);
  const storeSearchParams = useBookingStore((state) => state.searchParams);

  // Get and set protection plan and baggage from/to Zustand store
  const addOns = useBookingStore((state) => state.addOns);
  const setProtectionPlan = useBookingStore((state) => state.setProtectionPlan);
  const setAdditionalBaggage = useBookingStore((state) => state.setAdditionalBaggage);
  const hotelRoomSummary = useBookingStore((state) => state.selectedHotelRoomSummary);
  const hotelSearch = useBookingStore((state) => state.hotelSearch);
  const selectedHotel = useBookingStore((state) => state.selectedHotel);
  const hotelDetailsCache = useBookingStore((state) => state.hotelDetailsCache);
  const selectedHotelRoomIds = useBookingStore((state) => state.selectedHotelRoomIds);
  const vyspaFolderNumber = useBookingStore((state) => state.vyspaFolderNumber);
  const searchRequestId = useBookingStore((state) => state.searchRequestId);
  const passengers = useBookingStore((state) => state.passengers);
  const contactEmail = useBookingStore((state) => state.contactEmail);
  const contactPhone = useBookingStore((state) => state.contactPhone);
  const selectedFareType = useBookingStore((state) => state.selectedFareType);

  const protectionPlan = addOns.protectionPlan;
  const additionalBaggage = addOns.additionalBaggage;

  const { createSession, redirectToCheckout, loading: boxPayLoading, error: boxPayError } = useBoxPay();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [packageTotalOverride, setPackageTotalOverride] = useState<{ amount?: number; currency?: string } | null>(null);

  // Get affiliate phone number
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  // Affiliate detection (Skyscanner copy if aff present and matches)
  const aff = searchParams?.get('aff') || '';
  const isSkyscanner = (() => {
    const a = (aff || '').toLowerCase();
    return a.startsWith('sk') || a.includes('skyscanner');
  })();

  // Redirect to search if no flight/hotel selected (only after store has hydrated)
  useEffect(() => {
    if (hasHydrated && !flight && !isHotelMode) {
      router.push('/search');
    }
  }, [hasHydrated, flight, isHotelMode, router]);

  const packageFlightResultId =
    searchParams?.get("flightResultId") ||
    searchParams?.get("flightId") ||
    "";
  const packageRoomIds = useMemo(() => {
    const ids = selectedHotelRoomIds?.length
      ? selectedHotelRoomIds
      : [searchParams?.get("roomId") || ""];
    return ids.map((id) => String(id || "").trim()).filter(Boolean);
  }, [searchParams, selectedHotelRoomIds]);

  useEffect(() => {
    if (!isPackageMode || !packageFlightResultId || packageRoomIds.length === 0) return;

    let cancelled = false;
    const loadPackagePricing = async () => {
      try {
        const response = await packageService.getPackageDetails({
          flightResultId: packageFlightResultId,
          hotelResultRoomIds: packageRoomIds,
        });
        if (cancelled) return;

        const parsed = parseMoneyString(response.details?.packagePrice);
        setPackageTotalOverride(parsed.amount != null ? parsed : null);
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load package pricing for payment page", error);
          setPackageTotalOverride(null);
        }
      }
    };

    loadPackagePricing();
    return () => {
      cancelled = true;
    };
  }, [isPackageMode, packageFlightResultId, packageRoomIds]);

  // Track session start for 60-min refresh expiry
  useEffect(() => {
    // Skip session expiry check if we just came back from a payment redirect
    // (indicated by pendingOrderId or error query param)
    const pendingOrderId = sessionStorage.getItem('pendingOrderId');
    const hasPaymentError = searchParams?.get('error') === 'payment_failed';
    if (pendingOrderId || hasPaymentError) {
      // Don't trigger session expired on payment redirect returns
      return;
    }

    const key = 'paymentSessionStart';
    const orderKey = 'paymentSessionOrderId';
    const existed = sessionStorage.getItem(key);
    const previousOrderId = sessionStorage.getItem(orderKey);
    const now = Date.now();

    // Get current order ID from store
    const currentOrderId = vyspaFolderNumber || searchRequestId || '';

    // Reset session if this is a different order (new booking flow)
    if (previousOrderId && currentOrderId && previousOrderId !== currentOrderId) {
      sessionStorage.setItem(key, String(now));
      sessionStorage.setItem(orderKey, currentOrderId);
      sessionStorage.setItem('paymentVisited', '1');
      return;
    }

    if (!existed) {
      sessionStorage.setItem(key, String(now));
      if (currentOrderId) {
        sessionStorage.setItem(orderKey, currentOrderId);
      }
      sessionStorage.setItem('paymentVisited', '1');
      return;
    }

    const startedAt = parseInt(existed, 10);
    const elapsed = now - startedAt;
    const visitedBefore = sessionStorage.getItem('paymentVisited') === '1';

    // Detect reload if possible
    const nav = (performance.getEntriesByType('navigation') as PerformanceNavigationTiming[])[0];
    const isReload = nav ? nav.type === 'reload' : false;

    if (visitedBefore && isReload && elapsed > 60 * 60 * 1000) {
      setSessionExpiredOpen(true);
    }

    // Keep visited flag and update order ID
    sessionStorage.setItem('paymentVisited', '1');
    if (currentOrderId) {
      sessionStorage.setItem(orderKey, currentOrderId);
    }
  }, [searchParams, vyspaFolderNumber, searchRequestId]);

  // State for resolved airport names from cache
  const [airportNameCache, setAirportNameCache] = useState<Record<string, string>>({});

  // Load airport names from cache on mount
  useEffect(() => {
    const loadAirportNames = async () => {
      await airportCache.getAirports();
      // Get all unique airport codes from the flight
      if (flight) {
        const codes = new Set<string>();
        const segments = flight.segments && flight.segments.length > 0
          ? flight.segments
          : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];

        segments.forEach((seg) => {
          codes.add(seg.departureAirport.code);
          codes.add(seg.arrivalAirport.code);
        });

        const nameMap: Record<string, string> = {};
        codes.forEach((code) => {
          nameMap[code] = airportCache.getAirportName(code);
        });
        setAirportNameCache(nameMap);
      }
    };

    loadAirportNames();
  }, [flight]);


  // Helper to get airport name - prefer cache, then flight data, then code
  const getAirportName = (code: string, flightName: string, city: string) => {
    // Check cache first
    const cached = airportNameCache[code];
    if (cached && cached !== code) return shortenAirportName(cached);
    // Fall back to flight data
    if (flightName && flightName !== code) return shortenAirportName(flightName);
    // Fall back to city
    if (city && city !== code) return shortenAirportName(city);
    return code;
  };

  // Price calculation - Use real pricing from selected upgrade, flight or hotel room
  const currency = isPackageMode
    ? (packageTotalOverride?.currency || selectedUpgrade?.currency || flight?.currency || hotelRoomSummary?.currency)
    : isHotelMode
      ? hotelRoomSummary?.currency
      : (selectedUpgrade ? selectedUpgrade.currency : flight?.currency);

  // BoxPay expects ISO currency codes (e.g. GBP), not symbols (e.g. £)
  const currencyForGateway = (() => {
    const c = String(currency || '').trim();
    if (!c) return 'GBP';
    if (c === '£') return 'GBP';
    if (c === '$') return 'USD';
    if (c === '€') return 'EUR';
    return c.toUpperCase();
  })();
  const baseFare = isPackageMode
    ? (packageTotalOverride?.amount || selectedUpgrade?.totalPrice || flight?.price || 0)
    : isHotelMode
      ? (hotelRoomSummary?.total || 0)
      : (selectedUpgrade ? selectedUpgrade.totalPrice : (flight?.price || 0));

  // Determine region (UK vs Global) and pick appropriate iAssure pricing
  const region = getRegion();
  const isUK = region === "UK";

  const normalizePhoneForBoxPay = (raw: string, fallbackDialCode: string) => {
    const input = (raw || "").trim();
    const fallback = (fallbackDialCode || "").trim();
    if (!input && !fallback) return "";

    // Already international
    if (input.startsWith("+")) return `+${input.slice(1).replace(/[^\d]/g, "")}`;
    if (input.startsWith("00")) return `+${input.slice(2).replace(/[^\d]/g, "")}`;

    const digits = input.replace(/[^\d]/g, "");
    const dialDigits = fallback.replace(/[^\d]/g, "");
    if (!digits) return dialDigits ? `+${dialDigits}` : "";

    // If user already included dial code without '+'
    if (dialDigits && digits.startsWith(dialDigits)) return `+${digits}`;

    // Strip trunk zeros
    const national = digits.replace(/^0+/, "");
    return dialDigits ? `+${dialDigits}${national}` : `+${national}`;
  };

  const dialFromBillingCountry = (country: string) => {
    const c = (country || "").trim().toLowerCase();
    if (!c) return "";
    const byIso = countryCodes.find((cc) => cc.isoCode.toLowerCase() === c);
    if (byIso) return byIso.code;
    const byName = countryCodes.find((cc) => cc.name.toLowerCase() === c);
    if (byName) return byName.code;
    const byIncludes = countryCodes.find((cc) => cc.name.toLowerCase().includes(c) || c.includes(cc.name.toLowerCase()));
    return byIncludes?.code || "";
  };

  const protectionPlanPercentages = (() => {
    if (isHotelMode) {
      return {
        basic: REFUND_SHIELD_PRICING.rate,
        premium: REFUND_SHIELD_PRICING.rate,
        all: REFUND_SHIELD_PRICING.rate,
      };
    }

    // Fallback to global config if base fare is not available
    if (!baseFare) {
      return IASSURE_PRICING.global;
    }

    if (isUK) {
      const slabs = IASSURE_PRICING.uk.slabs;
      const matchingSlab = slabs.find((slab) => baseFare <= slab.max) || slabs[slabs.length - 1];
      return matchingSlab;
    }

    return IASSURE_PRICING.global;
  })();

  const protectionPlanPrices = {
    basic: baseFare * protectionPlanPercentages.basic,
    premium: baseFare * protectionPlanPercentages.premium,
    all: baseFare * protectionPlanPercentages.all,
  };
  const baggagePrice = PRICING_CONFIG.baggagePrice;
  const discountPercent = 0; // No automatic discount unless applied explicitly

  // Flight data for summary cards - Use real flight data (supports multi-city)
  const journeySegments = useMemo(() => {
    if (!flight) return [];
    return flight.segments && flight.segments.length > 0
      ? flight.segments
      : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];
  }, [flight]);

  const normalizedProtectionPlan = isHotelMode
    ? (protectionPlan ? "basic" : undefined)
    : protectionPlan;
  const protectionPlanCost = normalizedProtectionPlan
    ? protectionPlanPrices[normalizedProtectionPlan]
    : 0;

  // Calculate number of ways for baggage pricing
  // For round-trip: 2 ways, for one-way: 1 way, for multi-city: number of segments
  const numberOfWays = journeySegments.length;
  // Baggage is charged per person per way (e.g., £90 per way means £180 for round-trip)
  const baggageCost = additionalBaggage * baggagePrice * numberOfWays;
  const subtotal = baseFare + protectionPlanCost + baggageCost;
  const discountAmount = subtotal * discountPercent;
  const tripTotal = subtotal - discountAmount;

  const protectionPlanName =
    isHotelMode
      ? "Refund Shield"
      : normalizedProtectionPlan === "basic"
      ? "Basic"
      : normalizedProtectionPlan === "premium"
        ? "Premium"
        : normalizedProtectionPlan === "all"
          ? "All Included"
          : "None";

  const paymentTermsText = isHotelMode
    ? "By checking this box, I acknowledge that guest information matches the passport or official ID for travel, and that name changes are not allowed. I confirm that I have reviewed the hotel details and agree to the Refund & Cancellation Policy. I understand bookings are non-transferable and non-changeable unless stated otherwise. I accept full responsibility for valid travel documentation and understand Globehunters cannot be held responsible for denied boarding due to passport or visa validity."
    : t('form.termsCheckbox');

  const summaryLegs = useMemo(() => {
    return journeySegments.map((seg) => ({
      // Use full airport name from cache or flight data
      from: getAirportName(seg.departureAirport.code, seg.departureAirport.name, seg.departureAirport.city),
      to: getAirportName(seg.arrivalAirport.code, seg.arrivalAirport.name, seg.arrivalAirport.city),
      fromCode: seg.departureAirport.code,
      toCode: seg.arrivalAirport.code,
      departureTime: seg.departureTime,
      arrivalTime: seg.arrivalTime,
      date: seg.date,
      duration: seg.totalJourneyTime || seg.duration,
      stops: seg.stopDetails || `${seg.stops} Stop${seg.stops !== 1 ? 's' : ''}`,
      airline: flight?.airline?.name || "",
      airlineCode: flight?.airline?.code || "",
    }));
  }, [journeySegments, flight]);

  const passengerLabel = (() => {
    if (selectedUpgrade?.passengerBreakdown?.length) {
      const adt = selectedUpgrade.passengerBreakdown.find(p => p.type === 'ADT')?.count || 0;
      const chd = selectedUpgrade.passengerBreakdown.find(p => p.type === 'CHD')?.count || 0;
      const inf = selectedUpgrade.passengerBreakdown.find(p => p.type === 'INF')?.count || 0;
      const parts: string[] = [];
      if (adt) parts.push(`${adt} ${t('adult')}${adt > 1 ? 's' : ''}`);
      if (chd) parts.push(`${chd} Child${chd > 1 ? 'ren' : ''}`);
      if (inf) parts.push(`${inf} Infant${inf > 1 ? 's' : ''}`);
      return parts.join(", ");
    }
    const counts = storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const parts: string[] = [];
    if (counts.adults) parts.push(`${counts.adults} ${t('adult')}${counts.adults > 1 ? 's' : ''}`);
    if (counts.children) parts.push(`${counts.children} Child${counts.children > 1 ? 'ren' : ''}`);
    if (counts.infants) parts.push(`${counts.infants} Infant${counts.infants > 1 ? 's' : ''}`);
    return parts.join(", ");
  })();
  const cabinLabel = formatFareLabel(selectedUpgrade?.cabinClassDisplay || selectedFareType);

  const hotelDisplay = useMemo(() => {
    if (!isHotelMode) return null;
    const hotelId = selectedHotel?.hotelId;
    const cached = hotelId ? hotelDetailsCache?.[hotelId] : undefined;
    const cancellationText = cached?.cancellationText || "";
    const isRefundable = hotelRoomSummary?.isRefundable;
    const roomName = hotelRoomSummary?.roomName || "Selected Room";
    const nightsCount = hotelSearch
      ? Math.max(1, Math.round((new Date(hotelSearch.checkOut).getTime() - new Date(hotelSearch.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const rooms = hotelSearch?.rooms || 1;
    const adults = hotelSearch?.adults || 1;
    const children = hotelSearch?.children || 0;

    const roomNames: string[] = [];
    if (Array.isArray(cached?.rooms) && selectedHotelRoomIds.length > 0) {
      const roomMap = new Map(cached!.rooms!.map((r: any) => [String(r.id), r.name || "Room"]));
      const counts: Record<string, number> = {};
      for (const rid of selectedHotelRoomIds) {
        const n = roomMap.get(String(rid)) || roomName;
        counts[n] = (counts[n] || 0) + 1;
      }
      for (const [n, c] of Object.entries(counts)) {
        roomNames.push(c > 1 ? `${n} x${c}` : n);
      }
    } else if (selectedHotelRoomIds.length > 0) {
      roomNames.push(
        selectedHotelRoomIds.length > 1 ? `${roomName} x${selectedHotelRoomIds.length}` : roomName
      );
    }

    return { cancellationText, isRefundable, nightsCount, rooms, adults, children, roomNames, roomName };
  }, [isHotelMode, selectedHotel, hotelDetailsCache, hotelRoomSummary, hotelSearch, selectedHotelRoomIds]);

  // Web reference: prefer folder number, then search request ID, then fallbacks
  const refNumber: string = vyspaFolderNumber || searchRequestId || flight?.webRef || '—';
  const orderId = refNumber;

  // Show loading state while store is hydrating or no flight/hotel selected
  if (!hasHydrated || (!flight && !isHotelMode)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3754ED] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
        {/* Header with progress */}
        {isPackageMode ? (
          <PackageStepProgress currentStep="payment" />
        ) : isHotelMode ? (
          <PaymentHeader currentStep={2} isHotel={true} />
        ) : (
          <PaymentHeader currentStep={3} />
        )}

        {/* Payment Failed Banner */}
        {searchParams?.get('error') === 'payment_failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-red-800">Payment Failed</h3>
              <p className="text-sm text-red-700">
                Your payment could not be processed. Please check your card details and try again.
              </p>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Web Ref Card - Mobile Only */}
          <WebRefCard
            refNumber={refNumber}
            phoneNumber={affiliatePhone}
            isMobile={true}
          />

          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-4">
            {(isPackageMode || isHotelMode) && (
              <div className="flex flex-col gap-3">
                <HotelSummaryCard />

                {/* Stay Details - hotel mode only */}
                {isHotelMode && hotelDisplay && (
                  <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
                    <span className="text-sm font-semibold text-[#010D50]">Stay Details</span>

                    <div className="flex gap-3">
                      <div className="flex-1 bg-[#F5F7FF] border border-[#DFE0E4] rounded-lg p-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-[#3A478A]" />
                          <span className="text-xs text-[#3A478A]">Check-In</span>
                        </div>
                        <span className="text-sm font-semibold text-[#010D50]">
                          {hotelSearch?.checkIn
                            ? new Date(hotelSearch.checkIn + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </div>
                      <div className="flex-1 bg-[#F5F7FF] border border-[#DFE0E4] rounded-lg p-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-[#3A478A]" />
                          <span className="text-xs text-[#3A478A]">Check-Out</span>
                        </div>
                        <span className="text-sm font-semibold text-[#010D50]">
                          {hotelSearch?.checkOut
                            ? new Date(hotelSearch.checkOut + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Moon className="w-3.5 h-3.5 text-[#3A478A]" />
                      <span className="text-xs text-[#3A478A]">Total length of stay:</span>
                      <span className="text-sm font-semibold text-[#010D50]">{hotelDisplay.nightsCount} Night{hotelDisplay.nightsCount !== 1 ? "s" : ""}</span>
                    </div>

                    <div className="border-t border-[#DFE0E4]" />

                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#3A478A]">You selected</span>
                      <span className="text-sm font-semibold text-[#010D50]">
                        {hotelDisplay.rooms} room{hotelDisplay.rooms !== 1 ? "s" : ""} for {hotelDisplay.adults + hotelDisplay.children} {hotelDisplay.adults + hotelDisplay.children === 1 ? "guest" : "guests"}
                      </span>
                    </div>

                    {hotelDisplay.roomNames.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {hotelDisplay.roomNames.map((name, i) => (
                          <span key={i} className="text-xs text-[#3A478A]">{name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cancellation Policy - hotel mode only */}
                {isHotelMode && hotelDisplay && (
                  <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-sm font-semibold text-[#010D50]">Cancellation Policy</span>

                    {hotelDisplay.isRefundable === true && hotelSearch?.checkIn && (
                      <p className="text-sm font-semibold text-[#008234]">
                        Free cancellation before{" "}
                        {new Date(hotelSearch.checkIn + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                    )}

                    {hotelDisplay.isRefundable === false && (
                      <p className="text-sm font-medium text-[#010D50]">Non-refundable</p>
                    )}

                    {hotelDisplay.cancellationText && (
                      <p className="text-xs text-[#3A478A]">{hotelDisplay.cancellationText}</p>
                    )}

                    {hotelDisplay.isRefundable === true && hotelSearch?.checkIn && hotelRoomSummary?.total != null && (
                      <div className="flex items-center justify-between text-sm font-medium text-[#3A478A]">
                        <span>
                          After 12:00 AM on{" "}
                          {new Date(hotelSearch.checkIn + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span>
                          {hotelRoomSummary.currency === "£" || hotelRoomSummary.currency === "$" || hotelRoomSummary.currency === "€"
                            ? `${hotelRoomSummary.currency}${hotelRoomSummary.total.toFixed(2)}`
                            : `${hotelRoomSummary.currency || ""} ${hotelRoomSummary.total.toFixed(2)}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Flight Summary Cards */}
            {!isHotelMode && (
              <div className="flex flex-col gap-3">
                {summaryLegs.map((leg, index) => (
                  <FlightSummaryCard
                    key={`${leg.fromCode}-${leg.toCode}-${index}`}
                    leg={leg}
                    passengers={passengerLabel || `1 ${t('adult')}`}
                    onViewDetails={() => setShowFlightInfo(true)}
                    cabinLabel={cabinLabel}
                  />
                ))}
              </div>
            )}

            {/* Baggage Allowance Section */}
            {!isHotelMode && (
              <BaggageSection
                additionalBaggage={additionalBaggage}
                onUpdateBaggage={setAdditionalBaggage}
                baggageDescription={
                  selectedUpgrade?.baggage?.description ||
                  (flight?.outbound?.segmentBaggageQuantity && flight?.outbound?.segmentBaggageUnit
                    ? `${flight.outbound.segmentBaggageQuantity} ${flight.outbound.segmentBaggageUnit}`
                    : flight?.outbound?.segmentBaggage || flight?.baggage || undefined)
                }
                maxBaggageCount={(storeSearchParams?.passengers.adults || 1) + (storeSearchParams?.passengers.children || 0)}
                baggagePrice={baggagePrice}
                currencySymbol={currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'}
              />
            )}

            {isHotelMode ? (
              <RefundShieldSection
                selected={Boolean(normalizedProtectionPlan)}
                onToggle={() => setProtectionPlan(normalizedProtectionPlan ? undefined : "basic")}
                price={protectionPlanPrices.basic}
                currency={currency || "GBP"}
              />
            ) : (
              <ProtectionPlanSection
                selectedPlan={normalizedProtectionPlan}
                onSelectPlan={setProtectionPlan}
                planPrices={protectionPlanPrices}
                currency={currency || 'GBP'}
              />
            )}

            {isHotelMode && (
              <div className="bg-[#F5F7FF] border border-[#DFE0E4] rounded-xl p-3">
                <p className="text-xs text-[#3A478A] leading-relaxed">
                  By selecting Refund Shield, you agree to the{" "}
                  <a
                    href={REFUNDABLE_TERMS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3754ED] font-semibold hover:underline"
                  >
                    Refundable Terms
                  </a>
                  .
                </p>
              </div>
            )}

            {/* Billing Address Form */}
            <PaymentForm onSubmit={async (billingAddress) => {
              // Block duplicate payment attempts if the SAME order was already processed
              const completedOrderId = sessionStorage.getItem('paymentCompletedOrderId');
              if (completedOrderId && completedOrderId === orderId) {
                setPaymentErrorMessage(`This order has already been processed, please call on ${affiliatePhone} quoting your reference number ${completedOrderId}. Please DO NOT book alternative travel arrangements as this may result in a duplicate booking - charges will apply.`);
                setPaymentErrorOpen(true);
                return;
              }

              setIsProcessingPayment(true);

              try {
                // Sync extras (insurance/baggage) to Vyspa folder before payment (non-blocking)
                {
                  const extras: Array<{
                    type: 'insurance' | 'baggage';
                    planType?: string;
                    price?: number;
                    quantity?: number;
                    pricePerBag?: number;
                    productName?: string;
                    vendorMode?: 'iassure' | 'refund-shield';
                  }> = [];

                  // Add protection plan if selected
                  if (normalizedProtectionPlan && protectionPlanPrices[normalizedProtectionPlan]) {
                    extras.push({
                      type: 'insurance',
                      planType: normalizedProtectionPlan,
                      price: protectionPlanPrices[normalizedProtectionPlan],
                      productName: isHotelMode ? 'Refund Shield' : 'iAssure Insurance',
                      vendorMode: isHotelMode ? 'refund-shield' : 'iassure',
                    });
                  }

                  // Add baggage if selected
                  if (!isHotelMode && additionalBaggage > 0) {
                    extras.push({
                      type: 'baggage',
                      quantity: additionalBaggage,
                      pricePerBag: baggagePrice,
                    });
                  }

                  // Sync extras to folder if any are selected
                  if (extras.length > 0) {
                    const hasInsuranceExtra = extras.some((extra) => extra.type === 'insurance');
                    const firstSegment = journeySegments[0];
                    const lastSegment = journeySegments[journeySegments.length - 1];
                    const startDate = isHotelMode
                      ? (hotelSearch?.checkIn || new Date().toISOString().split('T')[0])
                      : (firstSegment?.date || new Date().toISOString().split('T')[0]);
                    const endDate = isHotelMode
                      ? (hotelSearch?.checkOut || startDate)
                      : (lastSegment?.date || startDate);
                    const extrasCurrency = (currency || "GBP").toUpperCase();
                    const folderNumberForExtras = (() => {
                      const fromStore = Number.parseInt(vyspaFolderNumber || '', 10);
                      if (Number.isFinite(fromStore) && fromStore > 0) return fromStore;
                      const fromRef = Number.parseInt(refNumber || '', 10);
                      if (Number.isFinite(fromRef) && fromRef > 0) return fromRef;
                      return null;
                    })();

                    if (!folderNumberForExtras) {
                      if (hasInsuranceExtra) {
                        throw new Error(`Could not apply ${isHotelMode ? 'Refund Shield' : 'iAssure'} because the booking reference is missing. Please restart checkout.`);
                      }
                      console.warn('⚠️ Skipping extras sync because folder number is unavailable');
                    } else {

                    console.log('📤 Syncing extras to Vyspa folder', {
                      folderNumber: folderNumberForExtras,
                      extras,
                      currency: extrasCurrency,
                      startDate,
                      endDate,
                      mode: isHotelMode ? "hotel" : (isPackageMode ? "package" : "flight"),
                    });

                    try {
                      const extrasResponse = await fetch('/api/vyspa/add-extras', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          folderNumber: folderNumberForExtras,
                          currency: extrasCurrency,
                          startDate,
                          endDate,
                          extras,
                        }),
                      });

                      const extrasResult = await extrasResponse.json();

                      // Enhanced logging for debugging
                      console.log('📦 Vyspa add-extras response', {
                        status: extrasResponse.status,
                        ok: extrasResponse.ok,
                        success: extrasResult?.success,
                        folderNumber: folderNumberForExtras,
                        results: extrasResult?.results,
                      });

                      // Print folder data prominently for debugging
                      if (extrasResult?.folderDetails) {
                        console.log('📁 FOLDER DATA AFTER EXTRAS SYNC:');
                        console.log(JSON.stringify(extrasResult.folderDetails, null, 2));
                      }

                      const insuranceFailed = Array.isArray(extrasResult?.results)
                        ? extrasResult.results.some((row: any) => row?.type === 'insurance' && !row?.success)
                        : false;

                      if (extrasResponse.ok && extrasResult.success) {
                        console.log('✅ Extras synced to folder successfully');
                      } else {
                        console.error('❌ Failed to sync extras to folder', {
                          error: extrasResult?.error,
                          message: extrasResult?.message,
                          insuranceFailed,
                        });
                        if (hasInsuranceExtra || insuranceFailed) {
                          throw new Error(`Could not add ${isHotelMode ? 'Refund Shield' : 'iAssure'} to booking in CMS. Payment not started. Please retry.`);
                        }
                        // Continue for non-insurance extras failures
                      }
                    } catch (syncError) {
                      console.error('❌ Error syncing extras to folder:', syncError);
                      if (hasInsuranceExtra) {
                        throw syncError;
                      }
                      // Continue for non-insurance extras failures
                    }
                    }
                  }
                }

                // Get shopper info from billing address or passengers
                const leadPassenger = passengers[0];
                const firstName = billingAddress.firstName || leadPassenger?.firstName || 'Guest';
                const lastName = billingAddress.lastName || leadPassenger?.lastName || 'User';
                const fallbackDial =
                  leadPassenger?.countryCode ||
                  dialFromBillingCountry(billingAddress.country) ||
                  (isUK ? "+44" : "+1");
                const rawPhone =
                  contactPhone ||
                  (leadPassenger?.countryCode ? `${leadPassenger.countryCode}${leadPassenger.phone}` : leadPassenger?.phone) ||
                  "";
                const shopperPhone = normalizePhoneForBoxPay(rawPhone, fallbackDial) || (isUK ? "+442089444555" : "+12089444555");

                // Create BoxPay session
                const result = await createSession({
                  orderId,
                  amount: tripTotal,
                  currency: currencyForGateway,
                  flow: isHotelMode ? "hotel" : (isPackageMode ? "package" : "flight"),
                  shopper: {
                    firstName,
                    lastName,
                    email: contactEmail || 'customer@globehunters.com',
                    phone: shopperPhone,
                    address: {
                      address1: billingAddress.addressLine1,
                      address2: billingAddress.addressLine2,
                      city: billingAddress.city,
                      state: billingAddress.state || billingAddress.city,
                      // Send the raw country input; server will normalize to ISO2 before calling BoxPay.
                      countryCode: billingAddress.country || 'GB',
                      postalCode: billingAddress.postalCode,
                    },
                  },
                });

                if (result.success && result.checkoutUrl) {
                  // Store order info before redirect
                  sessionStorage.setItem('pendingOrderId', orderId);
                  sessionStorage.setItem('pendingOrderAmount', tripTotal.toString());
                  sessionStorage.setItem('pendingOrderCurrency', currencyForGateway);

                  // Persist a per-order snapshot so the confirmation page/email can't pick up stale store data
                  // (e.g. multi-tab or navigating around during payment redirects).
                  try {
                    const hotelNights = hotelSearch
                      ? Math.max(
                        1,
                        Math.round(
                          (new Date(hotelSearch.checkOut).getTime() - new Date(hotelSearch.checkIn).getTime()) /
                          (1000 * 60 * 60 * 24)
                        )
                      )
                      : undefined;
                    const hotelCacheEntry = selectedHotel?.hotelId
                      ? hotelDetailsCache?.[selectedHotel.hotelId]
                      : undefined;

                    const bookingContext = {
                      orderId,
                      createdAt: new Date().toISOString(),
                      vyspaFolderNumber,
                      searchRequestId,
                      contactEmail,
                      contactPhone: shopperPhone,
                      passengers,
                      flight,
                      hotelSummary: selectedHotel,
                      hotelDetailsSnapshot: hotelCacheEntry
                        ? {
                            hotelId: hotelCacheEntry.hotelId,
                            hotelName: hotelCacheEntry.hotelName,
                            hotelRating: hotelCacheEntry.hotelRating,
                            mainImage: hotelCacheEntry.mainImage,
                            address: hotelCacheEntry.address,
                            rooms: hotelCacheEntry.rooms,
                            cancellationText: hotelCacheEntry.cancellationText,
                            amenities: hotelCacheEntry.amenities,
                          }
                        : null,
                      hotelRoomSummary,
                      hotelSearch,
                      selectedHotelRoomIds,
                      checkIn: hotelSearch?.checkIn,
                      checkOut: hotelSearch?.checkOut,
                      nights: hotelNights,
                      rooms: hotelSearch?.rooms,
                      selectedUpgradeOption: selectedUpgrade,
                      addOns,
                      pricing: {
                        baseFare,
                        protectionPlanCost,
                        baggageCost,
                        tripTotal,
                        currency,
                      },
                    };
                    sessionStorage.setItem(
                      `bookingContext_${orderId}`,
                      JSON.stringify(bookingContext)
                    );
                  } catch (e) {
                    console.warn('Failed to persist bookingContext snapshot', e);
                  }

                  // Redirect to BoxPay checkout
                  redirectToCheckout(result.checkoutUrl);
                } else {
                  throw new Error(result.error || 'Failed to create payment session');
                }
              } catch (e: any) {
                console.error('BoxPay error:', e);

                // Update folder status to Payment Failed (56) on initial creation error
                if (vyspaFolderNumber) {
                  try {
                    await fetch("/api/vyspa/update-status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        folderNumber: vyspaFolderNumber,
                        statusCode: FOLDER_STATUS_CODES.PAYMENT_FAILURE,
                        comments: [`BoxPay Session Creation Failed: ${e?.message || 'Unknown error'}`]
                      }),
                    });
                  } catch (err) {
                    console.error("Failed to update status on error", err);
                  }
                }

                // Show affiliate-specific copy
                if (isSkyscanner) {
                  setPaymentErrorMessage(`There has been a problem processing your order (${orderId}). Please check that all the details are correct and try again`);
                } else {
                  setPaymentErrorMessage(`There has been a problem processing your booking, please check that all the details are correct and then try again. If you still encounter a problem, please call on ${affiliatePhone} quoting your reference number ${orderId}.\n\nPlease DO NOT book alternative travel arrangements as this may result in a duplicate booking - charges will apply`);
                }
                setPaymentErrorOpen(true);
              } finally {
                setIsProcessingPayment(false);
              }
            }} onValidityChange={setIsPaymentValid} loading={isProcessingPayment || boxPayLoading} />

            {/* Terms and Complete Booking */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6">
              <div className="flex items-start gap-2">
                <Checkbox id="payment-terms" className="mt-1" checked={paymentTermsAccepted} onCheckedChange={(c) => setPaymentTermsAccepted(!!c)} />
                <label
                  htmlFor="payment-terms"
                  className="text-sm font-medium text-[#010D50] leading-relaxed"
                >
                  {paymentTermsText}
                </label>
              </div>

              <Button
                type="submit"
                form="billing-address-form"
                disabled={!isPaymentValid || !paymentTermsAccepted || isProcessingPayment || boxPayLoading}
                className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto gap-1 text-sm font-bold w-fit disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(isProcessingPayment || boxPayLoading) ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {t('form.completeBooking')}
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[482px] flex flex-col gap-4">
            {/* Web Ref Card - Desktop Only */}
            <WebRefCard
              refNumber={refNumber}
              phoneNumber={affiliatePhone}
              isMobile={false}
            />

            {/* Price Summary */}
            <PaymentSummary
              baseFare={baseFare}
              protectionPlanCost={protectionPlanCost}
              protectionPlanName={protectionPlanName}
              baggageCost={baggageCost}
              baggageCount={additionalBaggage}
              discountPercent={discountPercent}
              discountAmount={discountAmount}
              tripTotal={tripTotal}
              isSticky={true}
              currency={currency || 'GBP'}
            />
          </div>
        </div>
      </div>

      {/* Flight Info Modal */}
      {flight && (
        <FlightInfoModal
          flight={flight}
          open={showFlightInfo}
          onOpenChange={setShowFlightInfo}
          stayOnCurrentPage={true}
        />
      )}

      {/* 60-min refresh expiry */}
      <Dialog open={sessionExpiredOpen} onOpenChange={setSessionExpiredOpen}>
        <DialogContent className="max-w-[min(100vw-24px,560px)] p-0 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Session expired</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-8 px-4 bg-white border border-red-200 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Home className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center max-w-md">
              <h3 className="text-lg font-semibold text-[#010D50]">Your session has expired</h3>
              <p className="text-sm text-[#3A478A]">Please start a new search to continue.</p>
            </div>
            <Button
              onClick={() => router.push('/')}
              className="bg-[#3754ED] hover:bg-[#2942D1] text-white rounded-full px-6 py-2 h-auto text-sm font-medium gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment error dialog (affiliate-based) */}
      <Dialog open={paymentErrorOpen} onOpenChange={setPaymentErrorOpen}>
        <DialogContent className="max-w-[min(100vw-24px,640px)] p-0 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Payment error</DialogTitle>
          </DialogHeader>
          <ErrorMessage
            title="Payment Error"
            message={paymentErrorMessage}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
