"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ChevronLeft, Loader2, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { useBookingStore, useSelectedFlight, useStoreHydration } from "@/store/bookingStore";
import { PRICING_CONFIG, IASSURE_PRICING } from "@/config/constants";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { useBoxPay } from "@/hooks/useBoxPay";
import { getRegion } from "@/lib/utils/domainMapping";
import { airportCache } from "@/lib/cache/airportCache";
import { shortenAirportName } from "@/lib/vyspa/utils";
import { normalizeCabinClass } from "@/lib/utils";

// Import new modular components
import { PaymentHeader } from "@/components/payment/PaymentHeader";
import { BaggageSection } from "@/components/payment/BaggageSection";
import { ProtectionPlanSection } from "@/components/payment/ProtectionPlanSection";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import { WebRefCard } from "@/components/booking/WebRefCard";
import { PaymentForm } from "@/components/payment/PaymentForm";

function PaymentContent() {
  const t = useTranslations('payment');
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Get affiliate phone number
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  // Affiliate detection (Skyscanner copy if aff present and matches)
  const aff = searchParams?.get('aff') || '';
  const isSkyscanner = (() => {
    const a = (aff || '').toLowerCase();
    return a.startsWith('sk') || a.includes('skyscanner');
  })();

  // Redirect to search if no flight selected (only after store has hydrated)
  useEffect(() => {
    if (hasHydrated && !flight) {
      router.push('/search');
    }
  }, [hasHydrated, flight, router]);

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

  // Show loading state while store is hydrating or no flight selected
  if (!hasHydrated || !flight) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3754ED] animate-spin" />
      </div>
    );
  }

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

  // Price calculation - Use real pricing from selected upgrade or flight
  const currency = selectedUpgrade ? selectedUpgrade.currency : flight.currency;
  const baseFare = selectedUpgrade ? selectedUpgrade.totalPrice : (flight.price || 0);

  // Determine region (UK vs Global) and pick appropriate iAssure pricing
  const region = getRegion();
  const isUK = region === "UK";

  const protectionPlanPercentages = (() => {
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

  const normalizedProtectionPlan = protectionPlan;
  const protectionPlanCost = normalizedProtectionPlan
    ? protectionPlanPrices[normalizedProtectionPlan]
    : 0;
  const baggageCost = additionalBaggage * baggagePrice;
  const subtotal = baseFare + protectionPlanCost + baggageCost;
  const discountAmount = subtotal * discountPercent;
  const tripTotal = subtotal - discountAmount;

  const protectionPlanName =
    normalizedProtectionPlan === "basic"
      ? "Basic"
      : normalizedProtectionPlan === "premium"
        ? "Premium"
        : normalizedProtectionPlan === "all"
          ? "All Included"
          : "None";

  // Flight data for summary cards - Use real flight data (supports multi-city)
  const journeySegments = flight.segments && flight.segments.length > 0
    ? flight.segments
    : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];

  const summaryLegs = journeySegments.map((seg) => ({
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
    airline: flight.airline.name,
    airlineCode: flight.airline.code,
  }));

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
  const cabinLabel = normalizeCabinClass(selectedUpgrade?.cabinClassDisplay || selectedFareType);
  // Web reference: prefer folder number, then search request ID, then fallbacks
  const refNumber = vyspaFolderNumber || searchRequestId || flight.webRef || '—';
  const orderId = refNumber;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
        {/* Header with Back Link and Progress Steps */}
        <PaymentHeader currentStep={3} />

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
            {/* Flight Summary Cards */}
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

            {/* Baggage Allowance Section */}
            <BaggageSection
              additionalBaggage={additionalBaggage}
              onUpdateBaggage={setAdditionalBaggage}
              baggageDescription={
                selectedUpgrade?.baggage?.description ||
                (flight.outbound.segmentBaggageQuantity && flight.outbound.segmentBaggageUnit
                  ? `${flight.outbound.segmentBaggageQuantity} ${flight.outbound.segmentBaggageUnit}`
                  : flight.outbound.segmentBaggage || flight.baggage || undefined)
              }
              maxBaggageCount={(storeSearchParams?.passengers.adults || 1) + (storeSearchParams?.passengers.children || 0)}
              baggagePrice={baggagePrice}
              currencySymbol={currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'}
            />

            {/* iAssure Protection Plan */}
            <ProtectionPlanSection
              selectedPlan={normalizedProtectionPlan}
              onSelectPlan={setProtectionPlan}
              planPrices={protectionPlanPrices}
              currency={currency}
            />

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
                // Get shopper info from billing address or passengers
                const leadPassenger = passengers[0];
                const firstName = billingAddress.firstName || leadPassenger?.firstName || 'Guest';
                const lastName = billingAddress.lastName || leadPassenger?.lastName || 'User';

                // Create BoxPay session
                const result = await createSession({
                  orderId,
                  amount: tripTotal,
                  currency: currency,
                  shopper: {
                    firstName,
                    lastName,
                    email: contactEmail || 'customer@globehunters.com',
                    phone: contactPhone || '442089444555',
                    address: {
                      address1: billingAddress.addressLine1,
                      address2: billingAddress.addressLine2,
                      city: billingAddress.city,
                      state: billingAddress.state || billingAddress.city,
                      countryCode: billingAddress.country === 'United Kingdom' ? 'GB' : billingAddress.country?.substring(0, 2).toUpperCase() || 'GB',
                      postalCode: billingAddress.postalCode,
                    },
                  },
                });

                if (result.success && result.checkoutUrl) {
                  // Store order info before redirect
                  sessionStorage.setItem('pendingOrderId', orderId);
                  sessionStorage.setItem('pendingOrderAmount', tripTotal.toString());
                  sessionStorage.setItem('pendingOrderCurrency', currency);

                  // Redirect to BoxPay checkout
                  redirectToCheckout(result.checkoutUrl);
                } else {
                  throw new Error(result.error || 'Failed to create payment session');
                }
              } catch (e) {
                console.error('BoxPay error:', e);
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
                  {t('form.termsCheckbox')}
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
              currency={currency}
            />
          </div>
        </div>
      </div>

      {/* Flight Info Modal */}
      <FlightInfoModal
        flight={flight}
        open={showFlightInfo}
        onOpenChange={setShowFlightInfo}
        stayOnCurrentPage={true}
      />

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
