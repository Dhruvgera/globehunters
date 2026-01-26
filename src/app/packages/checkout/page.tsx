"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import { WebRefCard } from "@/components/booking/WebRefCard";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import PassengerFormsSection from "@/components/booking/PassengerFormsSection";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { useBookingStore, useSelectedFlight, useStoreHydration } from "@/store/bookingStore";
import { airportCache } from "@/lib/cache/airportCache";
import { shortenAirportName } from "@/lib/vyspa/utils";
import { formatFareLabel } from "@/lib/utils";

function PackageTravellerDetailsInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const hasHydrated = useStoreHydration();
  const flight = useSelectedFlight();
  const selectedFareType = useBookingStore((s) => s.selectedFareType);
  const selectedUpgrade = useBookingStore((s) => s.selectedUpgradeOption);
  const setSearchParams = useBookingStore((s) => s.setSearchParams);
  const storeSearchParams = useBookingStore((s) => s.searchParams);
  const passengersSaved = useBookingStore((s) => s.passengersSaved);
  const passengers = useBookingStore((s) => s.passengers);

  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Hotel dummy data passed from review page
  const hotelName = sp.get("hotelName") ? decodeURIComponent(sp.get("hotelName") as string) : "Selected hotel";
  const hotelImage = sp.get("hotelImage") || "/hotels/hotel-placeholder.jpg";
  const hotelRating = parseFloat(sp.get("hotelRating") || "0") || 0;
  const hotelReviewCount = parseInt(sp.get("hotelReviewCount") || "0", 10) || 0;
  const hotelDistance = sp.get("hotelDistance") || "";
  const hotelAmenities = (sp.get("hotelAmenities") || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  // Ensure search params exist so PassengerFormsSection renders correct passenger slots
  useEffect(() => {
    const from = sp.get("from") || "LHR";
    const to = sp.get("to") || "HKG";
    const depStr = sp.get("departureDate") || sp.get("checkIn") || "";
    const retStr = sp.get("returnDate") || sp.get("checkOut") || "";

    const adults = parseInt(sp.get("adults") || sp.get("guests") || "2", 10) || 2;
    const children = parseInt(sp.get("children") || "0", 10) || 0;
    const infants = parseInt(sp.get("infants") || "0", 10) || 0;

    // Only set if missing or clearly not for this flow
    if (storeSearchParams?.from && storeSearchParams?.to && storeSearchParams?.passengers) return;

    setSearchParams({
      from,
      to,
      departureDate: depStr ? new Date(depStr) : new Date(),
      returnDate: retStr ? new Date(retStr) : undefined,
      passengers: { adults, children, infants },
      class: "Economy",
      tripType: retStr ? "round-trip" : "one-way",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect back to flight selection if no flight selected
  useEffect(() => {
    if (hasHydrated && !flight) {
      const params = new URLSearchParams(sp.toString());
      params.set("type", "package");
      router.replace(`/search?${params.toString()}`);
    }
  }, [hasHydrated, flight, router, sp]);

  // Airport name cache (same logic as booking/payment)
  const [airportNameCache, setAirportNameCache] = useState<Record<string, string>>({});
  useEffect(() => {
    const load = async () => {
      await airportCache.getAirports();
      if (!flight) return;
      const codes = new Set<string>();
      const segments =
        flight.segments && flight.segments.length > 0
          ? flight.segments
          : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];
      segments.forEach((seg) => {
        codes.add(seg.departureAirport.code);
        codes.add(seg.arrivalAirport.code);
      });
      const map: Record<string, string> = {};
      codes.forEach((code) => (map[code] = airportCache.getAirportName(code)));
      setAirportNameCache(map);
    };
    load();
  }, [flight]);

  const getAirportName = (code: string, flightName: string, city: string) => {
    const cached = airportNameCache[code];
    if (cached && cached !== code) return shortenAirportName(cached);
    if (flightName && flightName !== code) return shortenAirportName(flightName);
    if (city && city !== code) return shortenAirportName(city);
    return code;
  };

  const summaryLegs = useMemo(() => {
    if (!flight) return [];
    const journeySegments =
      flight.segments && flight.segments.length > 0
        ? flight.segments
        : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];
    return journeySegments.map((seg) => ({
      from: getAirportName(seg.departureAirport.code, seg.departureAirport.name, seg.departureAirport.city),
      to: getAirportName(seg.arrivalAirport.code, seg.arrivalAirport.name, seg.arrivalAirport.city),
      fromCode: seg.departureAirport.code,
      toCode: seg.arrivalAirport.code,
      departureTime: seg.departureTime,
      arrivalTime: seg.arrivalTime,
      date: seg.date,
      duration: seg.totalJourneyTime || seg.duration,
      stops: seg.stopDetails || `${seg.stops} Stop${seg.stops !== 1 ? "s" : ""}`,
      airline: seg.carrierName || flight.airline.name,
      airlineCode: seg.carrierCode || flight.airline.code,
    }));
  }, [airportNameCache, flight]);

  const passengerLabel = useMemo(() => {
    const counts = storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const parts: string[] = [];
    if (counts.adults) parts.push(`${counts.adults} Adult${counts.adults > 1 ? "s" : ""}`);
    if (counts.children) parts.push(`${counts.children} Child${counts.children > 1 ? "ren" : ""}`);
    if (counts.infants) parts.push(`${counts.infants} Infant${counts.infants > 1 ? "s" : ""}`);
    return parts.join(", ");
  }, [storeSearchParams?.passengers]);

  const cabinLabel = formatFareLabel(selectedUpgrade?.cabinClassDisplay || selectedFareType);
  const refNumber = useBookingStore.getState().vyspaFolderNumber || useBookingStore.getState().searchRequestId || flight?.webRef || "—";

  const handleContinue = () => {
    if (!termsAccepted) return;
    if (!passengersSaved) {
      alert("Please complete all traveller details before continuing.");
      return;
    }
    // Minimal validation - mirror booking expectations
    const counts = storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const required = (counts.adults || 0) + (counts.children || 0) + (counts.infants || 0);
    for (let i = 0; i < required; i += 1) {
      const p = passengers[i];
      if (!p?.firstName || !p?.lastName || !p?.dateOfBirth || !p?.email || !p?.phone) {
        alert("Please complete all traveller details before continuing.");
        return;
      }
    }

    const params = new URLSearchParams(sp.toString());
    params.set("type", "package");
    // Carry consent for analytics (non-blocking)
    if (marketingConsent) params.set("marketing", "1");
    router.push(`/payment?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <PackageStepProgress currentStep="payment" />

        {/* Web Ref (Mobile) */}
        <div className="mt-4">
          <WebRefCard refNumber={refNumber} phoneNumber={affiliatePhone} isMobile={true} />
        </div>

        <div className="mt-6 flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Summary cards */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <div className="text-sm font-semibold text-[#010D50]">Your hotel</div>
              <div className="flex gap-3">
                <div className="relative w-[96px] h-[72px] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={hotelImage}
                    alt={hotelName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#010D50] truncate">{hotelName}</div>
                  {hotelDistance ? (
                    <div className="text-xs text-[#3A478A] truncate">{hotelDistance}</div>
                  ) : null}
                  {hotelRating ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="bg-[#3754ED] text-white text-xs font-semibold px-2 py-0.5 rounded">
                        {hotelRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-[#3A478A]">
                        {hotelReviewCount ? `${hotelReviewCount} reviews` : ""}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              {hotelAmenities.length ? (
                <div className="flex flex-wrap gap-3 text-xs text-[#3A478A]">
                  {hotelAmenities.slice(0, 4).map((a) => (
                    <span key={a} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#3A478A] rounded-full" />
                      {a}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              {summaryLegs.map((leg, idx) => (
                <FlightSummaryCard
                  key={`${leg.fromCode}-${leg.toCode}-${idx}`}
                  leg={leg}
                  passengers={passengerLabel || "1 Adult"}
                  onViewDetails={() => setShowFlightInfo(true)}
                  cabinLabel={cabinLabel}
                />
              ))}
            </div>

            {/* Traveller forms */}
            <PassengerFormsSection />

            {/* Terms + CTA */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-terms"
                  className="mt-1"
                  checked={termsAccepted}
                  onCheckedChange={(c) => setTermsAccepted(!!c)}
                />
                <label htmlFor="pkg-terms" className="text-sm font-medium text-[#010D50] leading-relaxed">
                  I confirm that the traveller details match the passport/official ID and I agree to the terms &amp; conditions.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-marketing"
                  className="mt-1"
                  checked={marketingConsent}
                  onCheckedChange={(c) => setMarketingConsent(!!c)}
                />
                <label htmlFor="pkg-marketing" className="text-sm text-[#3A478A] leading-relaxed">
                  By clicking this checkbox, I consent to receive marketing messages via calls, texts, and emails from Globehunters.
                </label>
              </div>

              <Button
                onClick={handleContinue}
                disabled={!termsAccepted}
                className="w-full bg-[#3754ED] hover:bg-[#2A41C9] text-white rounded-full py-3 h-auto text-sm font-bold disabled:opacity-50"
              >
                Continue to payment
              </Button>
            </div>
          </div>

          {/* Right column */}
          <div className="w-full lg:w-[482px] flex flex-col gap-4">
            <WebRefCard refNumber={refNumber} phoneNumber={affiliatePhone} isMobile={false} />

            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4">
              <div className="text-sm font-semibold text-[#010D50]">Need help?</div>
              <div className="mt-2 text-sm text-[#3A478A]">
                Call us 24/7:{" "}
                <a className="text-[#3754ED] font-semibold hover:underline" href={`tel:${affiliatePhone}`}>
                  {affiliatePhone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {flight && (
        <FlightInfoModal flight={flight} open={showFlightInfo} onOpenChange={setShowFlightInfo} stayOnCurrentPage={true} />
      )}
    </div>
  );
}

export default function PackageTravellerDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PackageTravellerDetailsInner />
    </Suspense>
  );
}

