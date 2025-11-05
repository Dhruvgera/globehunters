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

  // Get selected flight from Zustand store
  const flight = useSelectedFlight();

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

  // Price calculation
  const baseFare = 94353;
  const protectionPlanPrices = {
    basic: 8623.68,
    premium: 10779.60,
    all: 12935.52,
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

  // Flight data for summary cards
  const outboundLeg = {
    from: "London",
    to: "Lagos",
    fromCode: "LGW",
    toCode: "LOS",
    departureTime: "16:40",
    arrivalTime: "05:50",
    date: "Sun, 9 Oct",
    duration: "13h 10m",
    stops: "1 Stop",
    airline: "Royal Air Maroc",
  };

  const inboundLeg = {
    from: "Lagos",
    to: "London",
    fromCode: "LOS",
    toCode: "LGW",
    departureTime: "05:50",
    arrivalTime: "16:40",
    date: "Wed, 12 Oct",
    duration: "13h 10m",
    stops: "1 Stop",
    airline: "Royal Air Maroc",
  };

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
              <FlightSummaryCard
                leg={inboundLeg}
                passengers={`1 ${t('adult')}`}
                onViewDetails={() => setShowFlightInfo(true)}
              />
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
