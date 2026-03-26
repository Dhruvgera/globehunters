"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Edit2, Info, Loader2 } from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import { Button } from "@/components/ui/button";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { WebRefCard } from "@/components/booking/WebRefCard";
import { BaggageSection } from "@/components/payment/BaggageSection";
import { ProtectionPlanSection } from "@/components/payment/ProtectionPlanSection";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { useBookingStore, useSelectedFlight } from "@/store/bookingStore";
import { packageService } from "@/services/api/packageService";
import { PRICING_CONFIG, IASSURE_PRICING } from "@/config/constants";
import { getRegion } from "@/lib/utils/domainMapping";
import { formatFareLabel } from "@/lib/utils";
import { resolvePackagePricing } from "@/lib/package/pricing";
import { calculatePackagePerPersonPrice } from "@/lib/package/passengers";

function formatDateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseMoneyString(value?: string | null) {
  const raw = String(value || "").trim();
  const match = raw.match(/^([A-Z]{3}|£|\$|€)?\s*([0-9]+(?:\.[0-9]+)?)\s*([A-Z]{3}|£|\$|€)?$/i);
  if (!match) return { amount: undefined, currency: undefined as string | undefined };
  const leading = match[1];
  const trailing = match[3];
  return {
    amount: Number(match[2]),
    currency: String(leading || trailing || "").trim() || undefined,
  };
}

function formatMoney(currency: string | undefined, amount: number | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—";
  const normalized = String(currency || "").trim();
  if (normalized === "£" || normalized === "$" || normalized === "€") {
    return `${normalized}${amount.toFixed(2)}`;
  }
  if (/^[A-Z]{3}$/.test(normalized)) {
    return `${amount.toFixed(2)} ${normalized}`;
  }
  return amount.toFixed(2);
}

function getUniquePackageRooms<T>(rooms: T[] | undefined) {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];

  const uniqueRooms: T[] = [];
  const seenSelectionKeys = new Set<string>();

  for (const room of rooms) {
    const selectionKey = String((room as { selectionKey?: string } | null)?.selectionKey || "").trim();
    if (selectionKey) {
      if (seenSelectionKeys.has(selectionKey)) continue;
      seenSelectionKeys.add(selectionKey);
    }
    uniqueRooms.push(room);
  }

  return uniqueRooms;
}

function PackageReviewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  const searchRequestId = useBookingStore((state) => state.searchRequestId);
  const vyspaFolderNumber = useBookingStore((state) => state.vyspaFolderNumber);
  const selectedHotel = useBookingStore((state) => state.selectedHotel);
  const hotelSearch = useBookingStore((state) => state.hotelSearch);
  const hotelDetailsCache = useBookingStore((state) => state.hotelDetailsCache);
  const selectedHotelRoomIds = useBookingStore((state) => state.selectedHotelRoomIds);
  const hotelRoomSummary = useBookingStore((state) => state.selectedHotelRoomSummary);
  const addOns = useBookingStore((state) => state.addOns);
  const setProtectionPlan = useBookingStore((state) => state.setProtectionPlan);
  const setAdditionalBaggage = useBookingStore((state) => state.setAdditionalBaggage);
  const storeSearchParams = useBookingStore((state) => state.searchParams);
  const packageSearch = useBookingStore((state) => state.packageSearch);
  const packageResults = useBookingStore((state) => state.packageResults);
  const selectedFareType = useBookingStore((state) => state.selectedFareType);
  const selectedUpgrade = useBookingStore((state) => state.selectedUpgradeOption);
  const selectedFlight = useSelectedFlight();

  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [packageDetails, setPackageDetails] = useState<Awaited<ReturnType<typeof packageService.getPackageDetails>>["details"] | null>(null);

  const hotelId = selectedHotel?.hotelId || searchParams.get("hotelId") || "";
  const flightResultId =
    selectedFlight?.segmentResultId ||
    searchParams.get("flightId") ||
    searchParams.get("flightResultId") ||
    "";

  useEffect(() => {
    if (!flightResultId || selectedHotelRoomIds.length === 0) return;
    let cancelled = false;

    async function loadDetails() {
      try {
        setDetailLoading(true);
        setDetailError(null);
        const response = await packageService.getPackageDetails({
          flightResultId,
          hotelResultRoomIds: selectedHotelRoomIds,
        });
        if (!cancelled) {
          setPackageDetails(response.details);
        }
      } catch (error) {
        if (!cancelled) {
          setDetailError(error instanceof Error ? error.message : "Failed to load package details");
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [flightResultId, selectedHotelRoomIds]);

  const nights = useMemo(() => {
    if (hotelSearch?.checkIn && hotelSearch?.checkOut) {
      const start = new Date(`${hotelSearch.checkIn}T12:00:00`);
      const end = new Date(`${hotelSearch.checkOut}T12:00:00`);
      return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return packageDetails?.hotel?.rooms?.[0]?.nights || 1;
  }, [hotelSearch?.checkIn, hotelSearch?.checkOut, packageDetails?.hotel?.rooms]);

  const passengerLabel = useMemo(() => {
    const counts = storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const parts: string[] = [];
    if (counts.adults) parts.push(`${counts.adults} Adult${counts.adults > 1 ? "s" : ""}`);
    if (counts.children) parts.push(`${counts.children} Child${counts.children > 1 ? "ren" : ""}`);
    if (counts.infants) parts.push(`${counts.infants} Infant${counts.infants > 1 ? "s" : ""}`);
    return parts.join(", ");
  }, [storeSearchParams?.passengers]);

  const summaryLegs = useMemo(() => {
    if (!selectedFlight) return [];
    const journeySegments =
      selectedFlight.segments && selectedFlight.segments.length > 0
        ? selectedFlight.segments
        : [selectedFlight.outbound, ...(selectedFlight.inbound ? [selectedFlight.inbound] : [])];

    return journeySegments.map((segment) => ({
      from: segment.departureAirport.city || segment.departureAirport.name || segment.departureAirport.code,
      to: segment.arrivalAirport.city || segment.arrivalAirport.name || segment.arrivalAirport.code,
      fromCode: segment.departureAirport.code,
      toCode: segment.arrivalAirport.code,
      departureTime: segment.departureTime,
      arrivalTime: segment.arrivalTime,
      date: segment.date,
      duration: segment.totalJourneyTime || segment.duration,
      stops: segment.stopDetails || `${segment.stops} Stop${segment.stops !== 1 ? "s" : ""}`,
      airline: segment.carrierName || selectedFlight.airline.name,
      airlineCode: segment.carrierCode || selectedFlight.airline.code,
    }));
  }, [selectedFlight]);

  const region = getRegion();
  const baseFare = selectedUpgrade?.totalPrice || selectedFlight?.price || 0;
  const protectionPlanPercentages = !baseFare
    ? IASSURE_PRICING.global
    : region === "UK"
      ? IASSURE_PRICING.uk.slabs.find((slab) => baseFare <= slab.max) || IASSURE_PRICING.uk.slabs[IASSURE_PRICING.uk.slabs.length - 1]
      : IASSURE_PRICING.global;
  const protectionPlanPrices = {
    basic: baseFare * protectionPlanPercentages.basic,
    premium: baseFare * protectionPlanPercentages.premium,
    all: baseFare * protectionPlanPercentages.all,
  };

  const parsedPackagePrice = parseMoneyString(packageDetails?.packagePrice);
  const uniqueHotelRooms = useMemo(
    () => getUniquePackageRooms(packageDetails?.hotel?.rooms),
    [packageDetails?.hotel?.rooms]
  );
  const selectedFlightDelta =
    typeof selectedFlight?.packagePriceDeltaTotal === "number"
      ? selectedFlight.packagePriceDeltaTotal
      : 0;
  const fallbackPackagePricing = useMemo(() => {
    const matchedPackage = packageResults?.find((row) => String(row.id) === String(hotelId));
    const resolved = resolvePackagePricing({
      selectedRoomPackageTotal: hotelRoomSummary?.total,
      selectedRoomCurrency: hotelRoomSummary?.currency,
      selectedFlightDelta,
      fallbackStartingPrice: matchedPackage?.startingPrice,
      fallbackCurrency: matchedPackage?.currency,
      selectedFlightCurrency: selectedFlight?.currency,
    });
    return resolved.amount != null ? resolved : null;
  }, [
    hotelId,
    hotelRoomSummary?.currency,
    hotelRoomSummary?.total,
    packageResults,
    selectedFlight?.currency,
    selectedFlightDelta,
  ]);

  const resolvedPackagePricing = useMemo(
    () =>
      resolvePackagePricing({
        packagePriceAmount: parsedPackagePrice.amount,
        packagePriceCurrency: parsedPackagePrice.currency,
        hotelRoomTotals: uniqueHotelRooms.map((room) => Number(room.price || 0) || undefined),
        flightTotal: packageDetails?.flight?.totalFare,
        flightCurrency: packageDetails?.flight?.currency,
        selectedRoomPackageTotal: hotelRoomSummary?.total,
        selectedRoomCurrency: hotelRoomSummary?.currency,
        selectedFlightDelta,
        fallbackStartingPrice: fallbackPackagePricing?.amount,
        fallbackCurrency: fallbackPackagePricing?.currency,
        selectedFlightCurrency: selectedFlight?.currency,
      }),
    [
      fallbackPackagePricing?.amount,
      fallbackPackagePricing?.currency,
      hotelRoomSummary?.currency,
      hotelRoomSummary?.total,
      packageDetails?.flight?.currency,
      packageDetails?.flight?.totalFare,
      parsedPackagePrice.amount,
      parsedPackagePrice.currency,
      selectedFlight?.currency,
      selectedFlightDelta,
      uniqueHotelRooms,
    ]
  );

  const pricing = useMemo(() => {
    const hotelTotal =
      uniqueHotelRooms.reduce((sum, room) => sum + Number(room.price || 0), 0) || 0;
    const flightTotal = packageDetails?.flight?.totalFare || selectedFlight?.price || 0;
    const packageTotal = resolvedPackagePricing.amount ?? 0;
    return {
      hotelTotal,
      flightTotal,
      packageTotal,
      currency:
        resolvedPackagePricing.currency || "GBP",
    };
  }, [
    packageDetails?.flight?.totalFare,
    resolvedPackagePricing.amount,
    resolvedPackagePricing.currency,
    selectedFlight?.price,
    uniqueHotelRooms,
  ]);

  const hotelDisplay = useMemo(() => {
    const cached = selectedHotel?.hotelId ? hotelDetailsCache?.[selectedHotel.hotelId] : undefined;
    return {
      name: packageDetails?.hotel?.name || selectedHotel?.hotelName || cached?.hotelName || "Selected hotel",
      image: packageDetails?.hotel?.imageUrl || cached?.mainImage || "/hotels/hotel-placeholder.jpg",
      rating: packageDetails?.hotel?.starRating || cached?.hotelRating || 0,
      reviewCount: cached?.trustYou?.reviewsCount || 0,
      distance: cached?.address || "",
      amenities: packageDetails?.hotel?.amenities || cached?.amenities || [],
    };
  }, [hotelDetailsCache, packageDetails?.hotel, selectedHotel]);

  const changeFlightHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", "package");
    if (hotelId) params.set("hotelId", hotelId);
    if (flightResultId) params.set("flightResultId", flightResultId);
    return `/search?${params.toString()}`;
  }, [flightResultId, hotelId]);

  const handleContinue = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", "package");
    router.push(`/packages/checkout?${params.toString()}`);
  };

  const refNumber = vyspaFolderNumber || searchRequestId || selectedFlight?.webRef || "—";
  const selectedCancellation = packageDetails?.cancellationPolicies?.[0];
  const cabinLabel = formatFareLabel(selectedUpgrade?.cabinClassDisplay || selectedFareType);
  const baggageCurrency = selectedFlight?.currency || "£";
  const journeySegments =
    selectedFlight?.segments && selectedFlight.segments.length > 0
      ? selectedFlight.segments
      : selectedFlight
        ? [selectedFlight.outbound, ...(selectedFlight.inbound ? [selectedFlight.inbound] : [])]
        : [];
  const baggageCost = addOns.additionalBaggage * PRICING_CONFIG.baggagePrice * journeySegments.length;
  const protectionPlanCost = addOns.protectionPlan
    ? protectionPlanPrices[addOns.protectionPlan]
    : 0;
  const totalPrice = pricing.packageTotal + baggageCost + protectionPlanCost;
  const totalPerPersonPrice = calculatePackagePerPersonPrice(totalPrice, packageSearch?.rooms);

  if (!selectedFlight) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3754ED]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <PackageStepProgress currentStep="review" />

        <div className="mt-4">
          <WebRefCard refNumber={refNumber} phoneNumber={affiliatePhone} isMobile={true} />
        </div>

        <div className="mt-4 sm:mt-6 bg-[#F5F7FF] border border-[#DFE0E4] rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#3754ED] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#3A478A]">
            Please remember that it is your responsibility to have in your possession all the necessary travel documents.
          </p>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 space-y-5 sm:space-y-6">
            <div className="bg-white border border-[#DFE0E4] rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[#DFE0E4] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#010D50]">Stay Details</h2>
                <Link href="/hotels?type=package" className="text-[#3754ED] text-sm font-medium flex items-center gap-1 hover:underline">
                  <Edit2 className="w-4 h-4" />
                  Change selection
                </Link>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-80 h-44 sm:h-48 md:h-56 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={hotelDisplay.image}
                      alt={hotelDisplay.name}
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop";
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#010D50] mb-1">{hotelDisplay.name}</h3>
                    <p className="text-sm text-[#3A478A] mb-3">{hotelDisplay.distance}</p>

                    {hotelDisplay.rating ? (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="bg-[#3754ED] text-white text-sm font-semibold px-2.5 py-1 rounded">
                          {hotelDisplay.rating}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-[#010D50]">
                            {hotelDisplay.rating >= 8 ? "Exceptional" : "Very good"}
                          </span>
                          <span className="text-xs text-[#3A478A] ml-2">
                            {hotelDisplay.reviewCount ? `${hotelDisplay.reviewCount} reviews` : ""}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-4 text-sm text-[#3A478A]">
                      {hotelDisplay.amenities.slice(0, 4).map((amenity) => (
                        <span key={amenity} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#3A478A] rounded-full" />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8F9FC] rounded-xl">
                  <div>
                    <div className="text-sm text-[#3A478A] mb-1">Check-In</div>
                    <div className="text-lg font-semibold text-[#010D50]">
                      {formatDateLabel(hotelSearch?.checkIn || packageDetails?.hotel?.rooms?.[0]?.checkIn)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#3A478A] mb-1">Check-Out</div>
                    <div className="text-lg font-semibold text-[#010D50]">
                      {formatDateLabel(hotelSearch?.checkOut || packageDetails?.hotel?.rooms?.[0]?.checkOut || packageDetails?.hotel?.checkOutDate)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 sm:gap-6">
                  <div>
                    <div className="text-sm text-[#3A478A]">Total length of stay</div>
                    <div className="font-semibold text-[#010D50]">{nights} Night{nights !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="sm:border-l sm:border-[#DFE0E4] sm:pl-6">
                    <div className="text-sm text-[#3A478A]">Rooms selected</div>
                    <div className="font-semibold text-[#010D50]">
                      {selectedHotelRoomIds.length} room{selectedHotelRoomIds.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                {detailLoading && (
                  <div className="text-sm text-[#3A478A] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading live package pricing...
                  </div>
                )}
                {detailError && (
                  <div className="text-sm text-red-600">{detailError}</div>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#DFE0E4] rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[#DFE0E4] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#010D50]">Flight Details</h2>
                <Link href={changeFlightHref} className="text-[#3754ED] text-sm font-medium flex items-center gap-1 hover:underline">
                  <Edit2 className="w-4 h-4" />
                  Change selection
                </Link>
              </div>
              <div className="p-4 sm:p-6 flex flex-col gap-3">
                {summaryLegs.map((leg, index) => (
                  <FlightSummaryCard
                    key={`${leg.fromCode}-${leg.toCode}-${index}`}
                    leg={leg}
                    passengers={passengerLabel || "1 Adult"}
                    onViewDetails={() => setShowFlightInfo(true)}
                    cabinLabel={cabinLabel}
                  />
                ))}
              </div>
            </div>

            <BaggageSection
              additionalBaggage={addOns.additionalBaggage}
              onUpdateBaggage={setAdditionalBaggage}
              baggageDescription={selectedFlight.baggage || "Cabin bag only"}
              maxBaggageCount={(storeSearchParams?.passengers.adults || 1) + (storeSearchParams?.passengers.children || 0)}
              baggagePrice={PRICING_CONFIG.baggagePrice}
              currencySymbol={baggageCurrency}
            />

            <ProtectionPlanSection
              selectedPlan={addOns.protectionPlan}
              onSelectPlan={setProtectionPlan}
              planPrices={protectionPlanPrices}
              currency={baggageCurrency}
            />

            <div className="bg-white border border-[#DFE0E4] rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[#DFE0E4]">
                <h2 className="text-xl font-semibold text-[#010D50]">Cancellation Policy</h2>
              </div>
              <div className="p-4 sm:p-6 flex flex-col gap-2">
                {selectedCancellation ? (
                  <>
                    <p className="text-sm font-medium text-[#010D50]">
                      Effective from {formatDateLabel(selectedCancellation.effectiveDate)}
                    </p>
                    <p className="text-sm text-[#3A478A]">
                      {selectedCancellation.policy}
                    </p>
                    {selectedCancellation.penalty != null && (
                      <p className="text-sm text-[#3A478A]">
                        Penalty: {formatMoney(selectedCancellation.penaltyCurrency, selectedCancellation.penalty)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[#3A478A]">Live cancellation details will appear here once the package detail request completes.</p>
                )}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4">
            <WebRefCard refNumber={refNumber} phoneNumber={affiliatePhone} isMobile={false} />

            <div className="bg-white border border-[#DFE0E4] rounded-xl lg:sticky lg:top-4">
              <div className="p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold text-[#010D50]">Summary</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3A478A]">Hotel ({nights} nights)</span>
                    <span className="font-medium text-[#010D50]">Included</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3A478A]">Flights (per booking)</span>
                    <span className="font-medium text-[#010D50]">Included</span>
                  </div>
                  {addOns.additionalBaggage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#3A478A]">
                        Checked baggage ({addOns.additionalBaggage} bag{addOns.additionalBaggage !== 1 ? "s" : ""})
                      </span>
                      <span className="font-medium text-[#010D50]">{formatMoney(pricing.currency, baggageCost)}</span>
                    </div>
                  )}
                  {addOns.protectionPlan && (
                    <div className="flex justify-between">
                      <span className="text-[#3A478A]">Protection plan</span>
                      <span className="font-medium text-[#010D50]">
                        {formatMoney(pricing.currency, protectionPlanCost)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#DFE0E4] pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-[#010D50]">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#3754ED]">
                        {formatMoney(pricing.currency, totalPrice)}
                      </div>
                      <div className="text-xs text-[#3A478A]">
                        {formatMoney(pricing.currency, totalPerPersonPrice)} per person
                      </div>
                      <div className="text-xs text-[#3A478A]">Incl. all taxes & fees</div>
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
                  By clicking continue, you confirm you are familiar with the terms and conditions of this booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <FlightInfoModal
        flight={selectedFlight}
        open={showFlightInfo}
        onOpenChange={setShowFlightInfo}
        stayOnCurrentPage={true}
      />
    </div>
  );
}

export default function PackageReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3754ED]" />
        </div>
      }
    >
      <PackageReviewPageInner />
    </Suspense>
  );
}
