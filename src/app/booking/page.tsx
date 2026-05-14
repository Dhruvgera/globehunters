"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { useBookingStore, useSelectedFlight, useSelectedUpgrade, usePriceCheckData, useStoreHydration } from "@/store/bookingStore";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { formatFareLabel } from "@/lib/utils";
import { formatPassengerLabel } from "@/lib/utils/passengerLabel";
import { buildSummaryRows } from "@/lib/utils/buildSummaryRows";
import { useAirportNames } from "@/hooks/useAirportNames";
import { getJourneySegments } from "@/lib/flight/segments";

// Import new modular components
import { BookingHeader } from "@/components/booking/BookingHeader";
import { AlertBanner } from "@/components/booking/AlertBanner";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import PassengerFormsSection from "@/components/booking/PassengerFormsSection";
import { TermsAndConditions } from "@/components/booking/TermsAndConditions";
import { CostSummaryCard } from "@/components/shared/CostSummaryCard";
import { CustomerReviewsCard } from "@/components/booking/CustomerReviewsCard";
import { WebRefCard } from "@/components/booking/WebRefCard";
import UpgradeOptionsModal from "@/components/flights/modals/UpgradeOptionsModal";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { usePriceCheck } from "@/hooks/usePriceCheck";
import { useReviews } from "@/hooks/useReviews";

function BookingContent() {
  const t = useTranslations('booking');
  const tCost = useTranslations('costSummary');
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [idleTimeoutOpen, setIdleTimeoutOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Check if store has been hydrated from sessionStorage
  const hasHydrated = useStoreHydration();

  // Get selected flight and upgrade from Zustand store
  const flight = useSelectedFlight();
  const selectedUpgrade = useSelectedUpgrade();
  const priceCheckData = usePriceCheckData();
  const storeSearchParams = useBookingStore((s) => s.searchParams);
  const setPriceCheckData = useBookingStore((s) => s.setPriceCheckData);
  const vyspaFolderNumber = useBookingStore((s) => s.vyspaFolderNumber);
  const searchRequestId = useBookingStore((s) => s.searchRequestId);
  const selectedFareType = useBookingStore((s) => s.selectedFareType);
  const { checkPrice, priceCheck } = usePriceCheck();

  // Web reference: prefer folder number, then request ID, then flight's webRef
  const webRefNumber = vyspaFolderNumber || searchRequestId || flight?.webRef || '—';

  // Get affiliate phone number
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  // Fetch reviews
  const { reviews, totalReviews, averageRating, isLoading: reviewsLoading } = useReviews();

  // Redirect to search if no flight selected (only after store has hydrated)
  useEffect(() => {
    if (hasHydrated && !flight) {
      router.push("/search");
    }
  }, [hasHydrated, flight, router]);

  // Prefetch price check for booking if missing
  // Uses flightKey directly with price check API (no FlightView needed)
  useEffect(() => {
    if ((flight?.flightKey || flight?.segmentResultId) && !priceCheckData) {
      checkPrice(String(flight.segmentResultId || ''), flight.flightKey);
    }
  }, [flight?.segmentResultId, flight?.flightKey, priceCheckData, checkPrice]);
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

  const { getAirportName } = useAirportNames(flight);

  const passengerBreakdownForSummary = useMemo(() => {
    if (!flight) return [];

    // Primary: selected upgrade breakdown (explicit user choice)
    if (selectedUpgrade?.passengerBreakdown?.length) {
      return selectedUpgrade.passengerBreakdown;
    }

    // Fallback: base fare breakdown only if it matches charged amount/currency/passenger counts
    const fallbackOption = priceCheckData?.priceOptions?.[0];
    const fallbackBreakdown = fallbackOption?.passengerBreakdown;
    if (!fallbackBreakdown?.length) return [];

    const chargedTotal = selectedUpgrade ? selectedUpgrade.totalPrice : flight.price;
    const chargedCurrency = (selectedUpgrade ? selectedUpgrade.currency : flight.currency)?.toUpperCase();
    const fallbackCurrency = (fallbackOption?.currency || '').toUpperCase();

    // Compare rounded monetary values with 0.01 tolerance
    const breakdownSum = fallbackBreakdown.reduce((sum, pax) => sum + (pax.totalPrice || 0), 0);
    const totalsMatch = Math.abs(breakdownSum - chargedTotal) <= 0.01;

    // Ensure counts line up with current search passenger mix
    const expected = storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const actual = fallbackBreakdown.reduce(
      (acc, pax) => {
        if (pax.type === 'ADT') acc.adults += pax.count || 0;
        else if (pax.type === 'CHD') acc.children += pax.count || 0;
        else if (pax.type === 'INF') acc.infants += pax.count || 0;
        return acc;
      },
      { adults: 0, children: 0, infants: 0 }
    );

    const countsMatch =
      actual.adults === (expected.adults || 0) &&
      actual.children === (expected.children || 0) &&
      actual.infants === (expected.infants || 0);

    const currencyMatch = fallbackCurrency !== '' && fallbackCurrency === chargedCurrency;

    return totalsMatch && countsMatch && currencyMatch ? fallbackBreakdown : [];
  }, [selectedUpgrade, priceCheckData, flight, storeSearchParams?.passengers]);

  // Show loading state while store is hydrating or no flight selected
  if (!hasHydrated || !flight) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3754ED] animate-spin" />
      </div>
    );
  }

  const journeySegments = getJourneySegments(flight);

  const summaryLegs = journeySegments.map((seg) => ({
    from: getAirportName(seg.departureAirport.code, seg.departureAirport.name, seg.departureAirport.city),
    to: getAirportName(seg.arrivalAirport.code, seg.arrivalAirport.name, seg.arrivalAirport.city),
    fromCode: seg.departureAirport.code,
    toCode: seg.arrivalAirport.code,
    departureTime: seg.departureTime,
    arrivalTime: seg.arrivalTime,
    date: seg.date,
    duration: seg.totalJourneyTime || seg.duration,
    stops: seg.stopDetails || `${seg.stops} Stop${seg.stops !== 1 ? 's' : ''}`,
    // Use segment's airline info for multi-city support, fallback to flight's airline
    airline: seg.carrierName || flight.airline.name,
    airlineCode: seg.carrierCode || flight.airline.code,
  }));

  const passengerLabel = formatPassengerLabel({
    breakdown: selectedUpgrade?.passengerBreakdown,
    counts: storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 },
    t: tCost,
  });

  const bookingCurrency = selectedUpgrade ? selectedUpgrade.currency : flight.currency;
  const bookingTotal = selectedUpgrade ? selectedUpgrade.totalPrice : flight.price;

  const bookingSummaryRows = useMemo(
    () =>
      buildSummaryRows({
        mode: "flight",
        baseFare: bookingTotal,
        passengerBreakdown: passengerBreakdownForSummary,
        searchPassengers: storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 },
        currency: bookingCurrency,
        t: tCost,
      }),
    [bookingTotal, bookingCurrency, passengerBreakdownForSummary, storeSearchParams?.passengers, tCost]
  );

  const cabinLabel = formatFareLabel(selectedUpgrade?.cabinClassDisplay || selectedFareType);

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
            refNumber={webRefNumber}
            phoneNumber={affiliatePhone}
            isMobile={true}
          />

          {/* Left Column - Forms */}
          <div className="w-full lg:w-[70%] flex flex-col gap-3">
            {/* Travel Documents Alert */}

            {/* Price Change Alert - Temporarily hidden */}
            {/* <AlertBanner type="info" title={t('alerts.priceChange.title')}>
              <p>
                {t('alerts.priceChange.message')}
              </p>
            </AlertBanner> */}

            {/* Baggage Alert - Only show when flights have stopovers */}
            {/* {journeySegments.some(seg => seg.stops > 0) && (
              <AlertBanner type="error" title={t('alerts.baggageAlert.title')}>
                <p>
                  {t('alerts.baggageAlert.message')}
                </p>
              </AlertBanner>
            )} */}

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

            {/* Terms & Conditions */}
            <TermsAndConditions
              onUpgradeClick={() => setShowUpgradeModal(true)}
              hasUpgradeOptions={false}
              isCreatingFolder={isCreatingFolder}
              setIsCreatingFolder={setIsCreatingFolder}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[30%] flex flex-col gap-4">
            {/* Web Ref Card - Desktop Only */}
            <WebRefCard
              refNumber={webRefNumber}
              phoneNumber={affiliatePhone}
              isMobile={false}
            />

            {/* Price Summary */}
            <CostSummaryCard
              rows={bookingSummaryRows}
              total={bookingTotal}
              currency={bookingCurrency}
              isSticky={true}
            />

            {/* Customer Reviews */}
            <CustomerReviewsCard
              overallRating={averageRating || 4.8}
              totalReviews={totalReviews || 12500}
              reviews={reviews.length > 0 ? reviews : []}
            />
          </div>
        </div>
      </div>

      <Footer />

      {/* Loading Overlay - Shows when folder is being created */}
      {isCreatingFolder && (
        <div className="fixed inset-0 w-screen h-screen bg-white z-50 flex items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-[#010D50] mb-2">
                Creating your booking folder...
              </h3>
              <p className="text-sm text-[#3A478A]">
                This may take a few moments. Please do not close this page.
              </p>
            </div>
          </div>
        </div>
      )}

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
