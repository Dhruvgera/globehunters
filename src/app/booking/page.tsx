"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useBookingStore, useSelectedFlight } from "@/store/bookingStore";

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

  // Mock flight leg data (in real app, this would come from the flight object)
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
                Please remember that it is your responsibility to have in your
                possession all the necessary travel documents with you
              </p>
              <p>
                Valid travel ID (passport or ID card). Visa for your final
                destination and any transit countries (if required).
              </p>
              <p>
                We strongly recommend you check the entry requirements for any
                country you travel through. You can find this info on the
                website of the countries&apos; relevant authorities, or via your
                embassy or consulate.
              </p>
            </AlertBanner>

            {/* Price Change Alert */}
            <AlertBanner type="info" title="Heads up! The result for your search is now coming back with a different price.">
              <p>
                Ticket price changed from £94,348 to £94,353. You can continue,
                or we can help you find other flights.
              </p>
            </AlertBanner>

            {/* Baggage Alert */}
            <AlertBanner type="error" title="Baggage Alert: Re-Check Required">
              <p>
                Due to airline or flight changes during your stop, you MUST
                collect your checked luggage and re-check it with the connecting
                airline. Always confirm your baggage tag instructions upon
                arrival at your layover city.
              </p>
            </AlertBanner>

            {/* Flight Summary Cards */}
            <div className="flex flex-col gap-3">
              <FlightSummaryCard
                leg={outboundLeg}
                passengers="1 Adult"
                onViewDetails={() => setShowFlightInfo(true)}
              />
              <FlightSummaryCard
                leg={inboundLeg}
                passengers="1 Adult"
                onViewDetails={() => setShowFlightInfo(true)}
              />
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
              flightFare={45995}
              taxesAndFees={48358}
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
