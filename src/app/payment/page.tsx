"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { useBookingStore, useSelectedFlight } from "@/store/bookingStore";
import { PRICING_CONFIG } from "@/config/constants";
import { useTranslations } from "next-intl";

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
  const [showFlightInfo, setShowFlightInfo] = useState(false);

  // Get selected flight and upgrade from Zustand store
  const flight = useSelectedFlight();
  const selectedUpgrade = useBookingStore((state) => state.selectedUpgradeOption);
  const priceCheckData = useBookingStore((state) => state.priceCheckData);

  // Get and set protection plan and baggage from/to Zustand store
  const addOns = useBookingStore((state) => state.addOns);
  const setProtectionPlan = useBookingStore((state) => state.setProtectionPlan);
  const setAdditionalBaggage = useBookingStore((state) => state.setAdditionalBaggage);

  const protectionPlan = addOns.protectionPlan || 'premium';
  const additionalBaggage = addOns.additionalBaggage;

  // Redirect to search if no flight selected
  useEffect(() => {
    if (!flight) {
      router.push('/search');
    }
  }, [flight, router]);

  // Show loading state while redirecting
  if (!flight) {
    return null;
  }

  // Price calculation - Use real pricing from selected upgrade or flight
  const baseFare = selectedUpgrade ? selectedUpgrade.totalPrice : (flight.price || 0);
  const protectionPlanPrices = {
    basic: baseFare * 0.05, // 5% of base fare
    premium: baseFare * 0.08, // 8% of base fare
    all: baseFare * 0.10, // 10% of base fare
  };
  const baggagePrice = PRICING_CONFIG.baggagePrice;
  const discountPercent = PRICING_CONFIG.defaultDiscount;

  const protectionPlanCost = protectionPlanPrices[protectionPlan];
  const baggageCost = additionalBaggage * baggagePrice;
  const subtotal = baseFare + protectionPlanCost + baggageCost;
  const discountAmount = subtotal * discountPercent;
  const tripTotal = subtotal - discountAmount;

  const protectionPlanName =
    protectionPlan === "basic"
      ? "Basic"
      : protectionPlan === "premium"
      ? "Premium"
      : "All Included";

  // Flight data for summary cards - Use real flight data
  const outboundLeg = {
    from: flight.outbound.departureAirport.city,
    to: flight.outbound.arrivalAirport.city,
    fromCode: flight.outbound.departureAirport.code,
    toCode: flight.outbound.arrivalAirport.code,
    departureTime: flight.outbound.departureTime,
    arrivalTime: flight.outbound.arrivalTime,
    date: flight.outbound.date,
    duration: flight.outbound.totalJourneyTime || flight.outbound.duration,
    stops: flight.outbound.stopDetails || `${flight.outbound.stops} Stop${flight.outbound.stops !== 1 ? 's' : ''}`,
    airline: flight.airline.name,
  };

  const inboundLeg = flight.inbound ? {
    from: flight.inbound.departureAirport.city,
    to: flight.inbound.arrivalAirport.city,
    fromCode: flight.inbound.departureAirport.code,
    toCode: flight.inbound.arrivalAirport.code,
    departureTime: flight.inbound.departureTime,
    arrivalTime: flight.inbound.arrivalTime,
    date: flight.inbound.date,
    duration: flight.inbound.totalJourneyTime || flight.inbound.duration,
    stops: flight.inbound.stopDetails || `${flight.inbound.stops} Stop${flight.inbound.stops !== 1 ? 's' : ''}`,
    airline: flight.airline.name,
  } : null;

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
            refNumber="IN-649707636"
            phoneNumber="020 4502 2984"
            isMobile={true}
          />

          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Flight Summary Cards */}
            <div className="flex flex-col gap-3">
              <FlightSummaryCard
                leg={outboundLeg}
                passengers={`1 ${t('adult')}`}
                onViewDetails={() => setShowFlightInfo(true)}
              />
              {inboundLeg && (
                <FlightSummaryCard
                  leg={inboundLeg}
                  passengers={`1 ${t('adult')}`}
                  onViewDetails={() => setShowFlightInfo(true)}
                />
              )}
            </div>

            {/* Baggage Allowance Section */}
            <BaggageSection
              additionalBaggage={additionalBaggage}
              onUpdateBaggage={setAdditionalBaggage}
            />

            {/* iAssure Protection Plan */}
            <ProtectionPlanSection
              selectedPlan={protectionPlan}
              onSelectPlan={setProtectionPlan}
            />

            {/* Payment Details Form */}
            <PaymentForm onSubmit={(card, address) => {
              // Handle payment submission
              console.log('Payment submitted', { card, address });
            }} />

            {/* Terms and Complete Booking */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6">
              <div className="flex items-start gap-2">
                <Checkbox id="payment-terms" className="mt-1" />
                <label
                  htmlFor="payment-terms"
                  className="text-sm font-medium text-[#010D50] leading-relaxed"
                >
                  {t('form.termsCheckbox')}
                </label>
              </div>

              <Button className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto gap-1 text-sm font-bold w-fit">
                {t('form.completeBooking')}
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </Button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[482px] flex flex-col gap-4">
            {/* Web Ref Card - Desktop Only */}
            <WebRefCard
              refNumber="IN-649707636"
              phoneNumber="020 4502 2984"
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
            />
          </div>
        </div>
      </div>

      {/* Flight Info Modal */}
      <FlightInfoModal
        flight={flight}
        open={showFlightInfo}
        onOpenChange={setShowFlightInfo}
      />

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
