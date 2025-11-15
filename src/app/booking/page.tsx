"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useBookingStore, useSelectedFlight, useSelectedUpgrade, usePriceCheckData } from "@/store/bookingStore";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { useIdleTimer } from "@/hooks/useIdleTimer";

// Import new modular components
import { BookingHeader } from "@/components/booking/BookingHeader";
import { AlertBanner } from "@/components/booking/AlertBanner";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import PassengerFormsSection from "@/components/booking/PassengerFormsSection";
import { TermsAndConditions } from "@/components/booking/TermsAndConditions";
import { PriceSummaryCard } from "@/components/booking/PriceSummaryCard";
import { CustomerReviewsCard } from "@/components/booking/CustomerReviewsCard";
import { WebRefCard } from "@/components/booking/WebRefCard";
import UpgradeOptionsModal from "@/components/flights/modals/UpgradeOptionsModal";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { usePriceCheck } from "@/hooks/usePriceCheck";

// Mock reviews data
const mockReviews = [
  {
    name: "Sarah M.",
    rating: 5,
    text: "The booking process was incredibly fast and easy to navigate. The price breakdown was clear and I appreciate knowing exactly what I'm paying for.",
  },
  {
    name: "John D.",
    rating: 5,
    text: "Excellent service and great prices. Highly recommend!",
  },
];

function BookingContent() {
  const t = useTranslations('booking');
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [idleTimeoutOpen, setIdleTimeoutOpen] = useState(false);

  // Get selected flight and upgrade from Zustand store
  const flight = useSelectedFlight();
  const selectedUpgrade = useSelectedUpgrade();
  const priceCheckData = usePriceCheckData();
  const storeSearchParams = useBookingStore((s) => s.searchParams);
  const setPriceCheckData = useBookingStore((s) => s.setPriceCheckData);
  const { checkPrice, priceCheck } = usePriceCheck();

  // Redirect to search if no flight selected
  useEffect(() => {
    if (!flight) {
      router.push("/search");
    }
  }, [flight, router]);

  // Prefetch price check for booking if missing
  useEffect(() => {
    if (flight?.segmentResultId && !priceCheckData) {
      checkPrice(String(flight.segmentResultId));
    }
  }, [flight?.segmentResultId, priceCheckData, checkPrice]);
  useEffect(() => {
    if (priceCheck) {
      setPriceCheckData(priceCheck);
    }
  }, [priceCheck, setPriceCheckData]);

  // Inactivity: 20 minutes on passenger page
  useIdleTimer({
    timeoutMs: 20 * 60 * 1000,
    onIdle: () => setIdleTimeoutOpen(true),
  });

  // Show loading state while redirecting
  if (!flight) {
    return null;
  }

  // Extract flight leg data from the selected flight (supports multi-city)
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
    // Prefer selected upgrade breakdown; fallback to searched passengers
    if (selectedUpgrade?.passengerBreakdown?.length) {
      const adt = selectedUpgrade.passengerBreakdown.find(p => p.type === 'ADT')?.count || 0;
      const chd = selectedUpgrade.passengerBreakdown.find(p => p.type === 'CHD')?.count || 0;
      const inf = selectedUpgrade.passengerBreakdown.find(p => p.type === 'INF')?.count || 0;
      const parts = [];
      if (adt) parts.push(`${adt} Adult${adt > 1 ? 's' : ''}`);
      if (chd) parts.push(`${chd} Child${chd > 1 ? 'ren' : ''}`);
      if (inf) parts.push(`${inf} Infant${inf > 1 ? 's' : ''}`);
      return parts.join(", ");
    }
    const counts = storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const parts = [];
    if (counts.adults) parts.push(`${counts.adults} Adult${counts.adults > 1 ? 's' : ''}`);
    if (counts.children) parts.push(`${counts.children} Child${counts.children > 1 ? 'ren' : ''}`);
    if (counts.infants) parts.push(`${counts.infants} Infant${counts.infants > 1 ? 's' : ''}`);
    return parts.join(", ");
  })();
  const cabinLabel = selectedUpgrade?.cabinClassDisplay || useBookingStore((s) => s.selectedFareType) || 'Economy';

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        {/* Header with progress */}
        <BookingHeader currentStep={1} />

        {/* Content Grid */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Web Ref Card - Mobile Only (shown at top) */}
          <WebRefCard
            refNumber="IN-649707636"
            phoneNumber="020 4502 2984"
            isMobile={true}
          />

          {/* Left Column - Forms */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Travel Documents Alert */}
            <AlertBanner type="success">
              <p className="font-medium">
                {t('alerts.travelDocuments.line1')}
              </p>
              <p>
                {t('alerts.travelDocuments.line2')}
              </p>
              <p>
                {t('alerts.travelDocuments.line3')}
              </p>
            </AlertBanner>

            {/* Price Change Alert */}
            <AlertBanner type="info" title={t('alerts.priceChange.title')}>
              <p>
                {t('alerts.priceChange.message')}
              </p>
            </AlertBanner>

            {/* Baggage Alert */}
            <AlertBanner type="error" title={t('alerts.baggageAlert.title')}>
              <p>
                {t('alerts.baggageAlert.message')}
              </p>
            </AlertBanner>

            {/* Flight Summary Cards */}
            <div className="flex flex-col gap-3">
          {summaryLegs.map((leg, index) => (
            <FlightSummaryCard
              key={`${leg.fromCode}-${leg.toCode}-${index}`}
              leg={leg}
              passengers={passengerLabel || `1 ${t('flightSummary.passenger')}`}
              onViewDetails={() => setShowFlightInfo(true)}
              cabinLabel={cabinLabel}
            />
          ))}
            </div>

            {/* Passenger Details Form */}
            <PassengerFormsSection />

            {/* Terms & Conditions */}
            <TermsAndConditions
              onUpgradeClick={() => setShowUpgradeModal(true)}
              hasUpgradeOptions={priceCheckData?.priceOptions && priceCheckData.priceOptions.length > 1}
            />
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
            <PriceSummaryCard
              baseTripTotal={selectedUpgrade ? selectedUpgrade.totalPrice : flight.price}
              selectedUpgrade={selectedUpgrade}
              isSticky={true}
              currency={selectedUpgrade ? selectedUpgrade.currency : flight.currency}
            />

            {/* Customer Reviews */}
            <CustomerReviewsCard
              overallRating={4.5}
              totalReviews={10000}
              reviews={mockReviews}
            />
          </div>
        </div>
      </div>

      <Footer />

      {/* Modals */}
      <UpgradeOptionsModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
      <FlightInfoModal
        flight={flight}
        open={showFlightInfo}
        onOpenChange={setShowFlightInfo}
        stayOnCurrentPage={true}
      />
      {/* Idle timeout popup */}
      <Dialog open={idleTimeoutOpen} onOpenChange={setIdleTimeoutOpen}>
        <DialogContent className="max-w-[min(100vw-24px,560px)] p-0 [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Session timed out</DialogTitle>
          </DialogHeader>
          <ErrorMessage
            title="Your session timed out"
            message="Your session timed out because you were idle for too long."
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}
