"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useBookingStore, useSelectedFlight } from "@/store/bookingStore";
import { useTranslations } from "next-intl";

// Import new modular components
import { BookingHeader } from "@/components/booking/BookingHeader";
import { AlertBanner } from "@/components/booking/AlertBanner";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import { PassengerDetailsInline } from "@/components/booking/PassengerDetailsInline";
import { TermsAndConditions } from "@/components/booking/TermsAndConditions";
import { PriceSummaryCard } from "@/components/booking/PriceSummaryCard";
import { CustomerReviewsCard } from "@/components/booking/CustomerReviewsCard";
import { WebRefCard } from "@/components/booking/WebRefCard";
import UpgradeOptionsModal from "@/components/flights/modals/UpgradeOptionsModal";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";

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

  // Get selected flight from Zustand store
  const flight = useSelectedFlight();

  // Redirect to search if no flight selected
  useEffect(() => {
    if (!flight) {
      router.push("/search");
    }
  }, [flight, router]);

  // Show loading state while redirecting
  if (!flight) {
    return null;
  }

  // Extract flight leg data from the selected flight
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
              <FlightSummaryCard
                leg={outboundLeg}
                passengers={`1 ${t('flightSummary.passenger')}`}
                onViewDetails={() => setShowFlightInfo(true)}
              />
              {inboundLeg && (
                <FlightSummaryCard
                  leg={inboundLeg}
                  passengers={`1 ${t('flightSummary.passenger')}`}
                  onViewDetails={() => setShowFlightInfo(true)}
                />
              )}
            </div>

            {/* Passenger Details Form */}
            <PassengerDetailsInline passengerCount={2} />

            {/* Terms & Conditions */}
            <TermsAndConditions
              onUpgradeClick={() => setShowUpgradeModal(true)}
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
              flightFare={flight.pricePerPerson}
              taxesAndFees={0}
              adults={1}
              isSticky={true}
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
      />
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
