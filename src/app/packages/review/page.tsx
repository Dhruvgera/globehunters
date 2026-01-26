"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Info,
  Edit2,
} from "lucide-react";
import { mockPackageFlights } from "@/data/mockPackageFlights";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { WebRefCard } from "@/components/booking/WebRefCard";
import { BaggageSection } from "@/components/payment/BaggageSection";
import { ProtectionPlanSection } from "@/components/payment/ProtectionPlanSection";

// Mock hotel data - in real app would come from API/store
const mockHotelData = {
  id: "h-1",
  name: "The Peninsula Hong Kong",
  image: "/hotels/peninsula-hk.jpg",
  rating: 9.3,
  reviewCount: 900,
  distance: "15.11 mi from Hong Kong Intl. (HKG)",
  amenities: ["Pet-friendly", "Airport shuttle included"],
};

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PackageReviewPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [additionalBaggage, setAdditionalBaggage] = useState(0);
  const [selectedProtectionPlan, setSelectedProtectionPlan] = useState<"basic" | "premium" | "all" | undefined>(undefined);

  // Protection plan prices (mock)
  const protectionPlanPrices = {
    basic: 12.99,
    premium: 24.99,
    all: 38.99,
  };

  // Get params from URL
  const hotelId = searchParams.get("hotelId") || "";
  const hotelName = searchParams.get("hotelName") || mockHotelData.name;
  const flightId = searchParams.get("flightId") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = parseInt(searchParams.get("guests") || "2");
  const rooms = parseInt(searchParams.get("rooms") || "1");

  // Calculate nights
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 6; // Default
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  // Get selected flight from mock data
  const selectedFlight = useMemo(() => {
    if (flightId) {
      return mockPackageFlights.find((f) => f.id === flightId) || mockPackageFlights[0];
    }
    return mockPackageFlights[0];
  }, [flightId]);

  // Transform flight data to FlightSummaryCard format (same as booking page)
  const flightSummaryLegs = useMemo(() => {
    if (!selectedFlight) return [];
    
    const legs = [];
    
    // Outbound leg
    if (selectedFlight.outbound) {
      legs.push({
        from: selectedFlight.outbound.departureAirport.city || selectedFlight.outbound.departureAirport.name,
        to: selectedFlight.outbound.arrivalAirport.city || selectedFlight.outbound.arrivalAirport.name,
        fromCode: selectedFlight.outbound.departureAirport.code,
        toCode: selectedFlight.outbound.arrivalAirport.code,
        departureTime: selectedFlight.outbound.departureTime,
        arrivalTime: selectedFlight.outbound.arrivalTime,
        date: selectedFlight.outbound.date,
        duration: selectedFlight.outbound.duration,
        stops: selectedFlight.outbound.stops === 0 
          ? "Direct" 
          : `${selectedFlight.outbound.stops} Stop${selectedFlight.outbound.stops > 1 ? "s" : ""}`,
        airline: selectedFlight.airline.name,
        airlineCode: selectedFlight.airline.code,
      });
    }
    
    // Inbound leg (return flight)
    if (selectedFlight.inbound) {
      legs.push({
        from: selectedFlight.inbound.departureAirport.city || selectedFlight.inbound.departureAirport.name,
        to: selectedFlight.inbound.arrivalAirport.city || selectedFlight.inbound.arrivalAirport.name,
        fromCode: selectedFlight.inbound.departureAirport.code,
        toCode: selectedFlight.inbound.arrivalAirport.code,
        departureTime: selectedFlight.inbound.departureTime,
        arrivalTime: selectedFlight.inbound.arrivalTime,
        date: selectedFlight.inbound.date,
        duration: selectedFlight.inbound.duration,
        stops: selectedFlight.inbound.stops === 0 
          ? "Direct" 
          : `${selectedFlight.inbound.stops} Stop${selectedFlight.inbound.stops > 1 ? "s" : ""}`,
        airline: selectedFlight.airline.name,
        airlineCode: selectedFlight.airline.code,
      });
    }
    
    return legs;
  }, [selectedFlight]);

  // Passenger label for flight summary
  const passengerLabel = `${guests} Adult${guests > 1 ? "s" : ""}`;

  // Calculate prices (mock)
  const pricing = useMemo(() => {
    const hotelPerNight = 450;
    const hotelTotal = hotelPerNight * nights;
    const flightTotal = selectedFlight?.price || 899;
    const taxesAndFees = Math.round((hotelTotal + flightTotal) * 0.12);
    const total = hotelTotal + flightTotal + taxesAndFees;

    return {
      hotelPerNight,
      hotelTotal,
      flightTotal,
      taxesAndFees,
      total,
    };
  }, [nights, selectedFlight]);

  const handleContinue = () => {
    // Navigate to traveler details / payment
    const params = new URLSearchParams(searchParams.toString());
    // Pass hotel dummy data forward for traveller details page
    params.set("hotelImage", mockHotelData.image);
    params.set("hotelRating", String(mockHotelData.rating));
    params.set("hotelReviewCount", String(mockHotelData.reviewCount));
    params.set("hotelDistance", mockHotelData.distance);
    params.set("hotelAmenities", mockHotelData.amenities.join("|"));
    router.push(`/packages/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Progress */}
        <PackageStepProgress currentStep="review" />

        {/* Web Ref (Mobile) - match booking page behavior */}
        <div className="mt-4">
          <WebRefCard
            refNumber="IN-649707636"
            phoneNumber="020 4502 2984"
            isMobile={true}
          />
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-[#F5F7FF] border border-[#DFE0E4] rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#3754ED] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#3A478A]">
            Please remember that it is your responsibility to have in your
            possession all the necessary travel documents with you
          </p>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          {/* Left Column - Details */}
          <div className="flex-1 space-y-6">
            {/* Stay Details Card */}
            <div className="bg-white border border-[#DFE0E4] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#DFE0E4] flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#010D50]">
                  Stay Details
                </h2>
                <Link
                  href={`/hotels?type=package`}
                  className="text-[#3754ED] text-sm font-medium flex items-center gap-1 hover:underline"
                >
                  <Edit2 className="w-4 h-4" />
                  Change selection
                </Link>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Hotel Image */}
                  <div className="w-full md:w-80 h-48 md:h-56 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src="/hotels/hotel-placeholder.jpg"
                      alt={decodeURIComponent(hotelName)}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop";
                      }}
                    />
                  </div>

                  {/* Hotel Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#010D50] mb-1">
                      {decodeURIComponent(hotelName)}
                    </h3>
                    <p className="text-sm text-[#3A478A] mb-3">
                      {mockHotelData.distance}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-[#3754ED] text-white text-sm font-semibold px-2.5 py-1 rounded">
                        {mockHotelData.rating}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-[#010D50]">
                          Exceptional
                        </span>
                        <span className="text-xs text-[#3A478A] ml-2">
                          {mockHotelData.reviewCount} reviews
                        </span>
                      </div>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-4 text-sm text-[#3A478A]">
                      {mockHotelData.amenities.map((amenity) => (
                        <span key={amenity} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#3A478A] rounded-full" />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Check-in/out Details */}
                <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-[#F8F9FC] rounded-xl">
                  <div>
                    <div className="text-sm text-[#3A478A] mb-1">Check-In:</div>
                    <div className="text-lg font-semibold text-[#010D50]">
                      {formatDate(checkIn) || "Wed, Jan 21, 2026"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#3A478A] mb-1">Check-Out:</div>
                    <div className="text-lg font-semibold text-[#010D50]">
                      {formatDate(checkOut) || "Wed, Jan 31, 2026"}
                    </div>
                  </div>
                </div>

                {/* Stay Summary */}
                <div className="mt-4 flex flex-wrap gap-6">
                  <div>
                    <div className="text-sm text-[#3A478A]">
                      Total length of the stay:
                    </div>
                    <div className="font-semibold text-[#010D50]">
                      {nights} Nights
                    </div>
                  </div>
                  <div className="border-l border-[#DFE0E4] pl-6">
                    <div className="text-sm text-[#3A478A]">You selected</div>
                    <div className="font-semibold text-[#010D50]">
                      {rooms} room{rooms > 1 ? "s" : ""} for {guests} adult
                      {guests > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Details Card */}
            <div className="bg-white border border-[#DFE0E4] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#DFE0E4] flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#010D50]">
                  Flight Details
                </h2>
                <Link
                  href={`/search?type=package&hotelId=${hotelId}&hotelName=${hotelName}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${rooms}`}
                  className="text-[#3754ED] text-sm font-medium flex items-center gap-1 hover:underline"
                >
                  <Edit2 className="w-4 h-4" />
                  Change selection
                </Link>
              </div>

              {/* Content - Using FlightSummaryCard like booking page */}
              <div className="p-6 flex flex-col gap-3">
                {flightSummaryLegs.map((leg, index) => (
                  <FlightSummaryCard
                    key={`${leg.fromCode}-${leg.toCode}-${index}`}
                    leg={leg}
                    passengers={passengerLabel}
                    onViewDetails={() => setShowFlightInfo(true)}
                    cabinLabel="Economy"
                  />
                ))}
              </div>
            </div>

            {/* Baggage Section - Using BaggageSection component like payment page */}
            <BaggageSection
              additionalBaggage={additionalBaggage}
              onUpdateBaggage={setAdditionalBaggage}
              baggageDescription="Cabin bag only"
              maxBaggageCount={guests}
              baggagePrice={90}
              currencySymbol="£"
            />

            {/* Travel Protection - Using ProtectionPlanSection component like payment page (iAssure) */}
            <ProtectionPlanSection
              selectedPlan={selectedProtectionPlan}
              onSelectPlan={setSelectedProtectionPlan}
              planPrices={protectionPlanPrices}
              currency="£"
            />

            {/* Cancellation Policy */}
            <div className="bg-white border border-[#DFE0E4] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#DFE0E4]">
                <h2 className="text-xl font-semibold text-[#010D50]">
                  Cancellation Policy
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-[#3A478A]">
                  Free cancellation before Jan 20
                </p>
                <p className="text-sm text-[#3A478A] mt-2">
                  After Jan 20, cancellation fee of £300 applies
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Price Summary */}
          <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4">
            {/* Web Ref Card - Using WebRefCard component like booking page */}
            <WebRefCard
              refNumber="IN-649707636"
              phoneNumber="020 4502 2984"
              isMobile={false}
            />

            {/* Price Summary Card */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl sticky top-4">
              <div className="p-6 space-y-4">
                <h3 className="font-semibold text-[#010D50]">Summary</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3A478A]">
                      Hotel ({nights} nights)
                    </span>
                    <span className="font-medium text-[#010D50]">
                      £{pricing.hotelTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3A478A]">Flights (per person)</span>
                    <span className="font-medium text-[#010D50]">
                      £{pricing.flightTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3A478A]">Taxes & Fees</span>
                    <span className="font-medium text-[#010D50]">
                      £{pricing.taxesAndFees.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#DFE0E4] pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-[#010D50]">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#3754ED]">
                        £{pricing.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#3A478A]">
                        Incl. all taxes & fees
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleContinue}
                  className="w-full bg-[#3754ED] hover:bg-[#2a41c9] text-white py-6 rounded-xl text-lg font-semibold"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-xs text-center text-[#3A478A]">
                  By clicking continue, you confirm you are familiar with the
                  terms & conditions of this booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Flight Info Modal */}
      {selectedFlight && (
        <FlightInfoModal
          flight={selectedFlight}
          open={showFlightInfo}
          onOpenChange={setShowFlightInfo}
          stayOnCurrentPage={true}
        />
      )}
    </div>
  );
}

export default function PackageReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3754ED]" />
        </div>
      }
    >
      <PackageReviewPageInner />
    </Suspense>
  );
}
