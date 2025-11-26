"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { useBookingStore, useSelectedFlight } from "@/store/bookingStore";
import { PRICING_CONFIG, IASSURE_PRICING } from "@/config/constants";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { usePayment } from "@/hooks/usePayment";
import { getRegion } from "@/lib/utils/domainMapping";

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

  const protectionPlan = addOns.protectionPlan;
  const additionalBaggage = addOns.additionalBaggage;

  const { processPayment } = usePayment();
  
  // Get affiliate phone number
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  // Affiliate detection (Skyscanner copy if aff present and matches)
  const aff = searchParams?.get('aff') || '';
  const isSkyscanner = (() => {
    const a = (aff || '').toLowerCase();
    return a.startsWith('sk') || a.includes('skyscanner');
  })();

  // Redirect to search if no flight selected
  useEffect(() => {
    if (!flight) {
      router.push('/search');
    }
  }, [flight, router]);

  // Track session start for 60-min refresh expiry
  useEffect(() => {
    const key = 'paymentSessionStart';
    const existed = sessionStorage.getItem(key);
    const now = Date.now();
    if (!existed) {
      sessionStorage.setItem(key, String(now));
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
    // Keep visited flag
    sessionStorage.setItem('paymentVisited', '1');
  }, []);

  // Show loading state while redirecting
  if (!flight) {
    return null;
  }

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
    from: seg.departureAirport.city,
    to: seg.arrivalAirport.city,
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
  const cabinLabel = selectedUpgrade?.cabinClassDisplay || useBookingStore((s) => s.selectedFareType) || 'Economy';
  const refNumber = vyspaFolderNumber || flight.webRef || (priceCheckData?.sessionInfo?.sessionId || '—');
  const orderId = refNumber;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
        {/* Header with Back Link and Progress Steps */}
        <PaymentHeader currentStep={3} />

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
            />

            {/* iAssure Protection Plan */}
            <ProtectionPlanSection
              selectedPlan={normalizedProtectionPlan}
              onSelectPlan={setProtectionPlan}
              planPrices={protectionPlanPrices}
              currency={currency}
            />

            {/* Payment Details Form */}
            <PaymentForm onSubmit={async (card, address) => {
              // Block duplicate payment attempts if already processed
              const completedOrderId = sessionStorage.getItem('paymentCompletedOrderId');
              if (completedOrderId) {
                setPaymentErrorMessage(`This order has already been processed, please call on ${affiliatePhone} quoting your reference number ${completedOrderId}. Please DO NOT book alternative travel arrangements as this may result in a duplicate booking - charges will apply.`);
                setPaymentErrorOpen(true);
                return;
              }
              try {
                const resp = await processPayment({
                  bookingId: orderId,
                  paymentDetails: {
                    method: 'credit_card',
                    cardNumber: card.cardNumber!,
                    expiryMonth: card.expiryMonth!,
                    expiryYear: card.expiryYear!,
                    cvv: card.cvv!,
                    cardholderName: card.cardholderName!,
                    billingAddress: address as any,
                  } as any,
                } as any);
                if (resp && resp.paymentId) {
                  // Mark as completed to prevent double charging
                  sessionStorage.setItem('paymentCompletedOrderId', orderId);
                  // Navigate to confirmation (placeholder)
                  // router.push('/payment-completed');
                }
              } catch (e) {
                // Show affiliate-specific copy
                if (isSkyscanner) {
                  setPaymentErrorMessage(`There has been a problem processing your order (${orderId}), and no payment has been charged from your card. Please check that all the card details are correct and try again`);
                } else {
                  setPaymentErrorMessage(`There has been a problem processing your booking, please check that all the card details are correct and then try again. If you still encounter a problem, please call on 1800 226 817 quoting your reference number ${orderId}.\n\nPlease DO NOT book alternative travel arrangements as this may result in a duplicate booking - charges will apply`);
                }
                setPaymentErrorOpen(true);
              }
            }} onValidityChange={setIsPaymentValid} />

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

              <Button disabled={!isPaymentValid || !paymentTermsAccepted} className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto gap-1 text-sm font-bold w-fit disabled:opacity-50 disabled:cursor-not-allowed">
                {t('form.completeBooking')}
                <ChevronLeft className="w-5 h-5 rotate-180" />
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
          <ErrorMessage
            title="Your session has expired"
            message="Your session has been expired, please go Home for new search."
          />
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
