"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import PassengerFormsSection from "@/components/booking/PassengerFormsSection";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { FlightSummaryCard, type FlightLeg } from "@/components/booking/FlightSummaryCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBookingStore } from "@/store/bookingStore";
import type { Flight } from "@/types/flight";
import { ArrowLeft, CalendarDays, Clock, Users } from "lucide-react";

type AiHotelDraft = {
  name?: string;
  imageSrc?: string;
  distanceLabel?: string;
  price?: { total?: number; currency?: string };
};

type AiActivityDraft = {
  productCode: string;
  title: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  duration?: string;
  rating?: number;
  itineraryDate?: string;
  itineraryTime?: string;
};

type AiDestinationDraft = {
  id?: string;
  name?: string;
  checkIn?: string;
  checkOut?: string;
  airportCode?: string;
  hotel?: AiHotelDraft | null;
  activities?: AiActivityDraft[];
  order?: number;
};

type AiBookingDraft = {
  search?: {
    destination?: string;
    fromCode?: string;
    fromName?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    rooms?: number;
    lookingFor?: string;
    stayPreference?: string;
  };
  hotel?: AiHotelDraft;
  flight?: Flight | null;
  activities?: AiActivityDraft[];
  destinations?: AiDestinationDraft[];
  totals?: {
    flight?: number;
    hotel?: number;
    activities?: number;
    package?: number;
    currency?: string;
  };
};

function money(value?: number, currency = "GBP") {
  const amount = Number(value || 0);
  const normalized = (() => {
    const raw = String(currency || "GBP").trim().toUpperCase();
    if (raw === "£") return "GBP";
    if (raw === "$") return "USD";
    if (raw === "€") return "EUR";
    return /^[A-Z]{3}$/.test(raw) ? raw : "GBP";
  })();
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: normalized, maximumFractionDigits: 0 }).format(amount);
}

function longDate(value?: string) {
  if (!value) return "Date pending";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}

function flightSegmentToSummaryLeg(flight: Flight, segment: Flight["outbound"]): FlightLeg {
  return {
    from: segment.departureAirport.name || segment.departureAirport.city || segment.departureAirport.code,
    to: segment.arrivalAirport.name || segment.arrivalAirport.city || segment.arrivalAirport.code,
    fromCode: segment.departureAirport.code,
    toCode: segment.arrivalAirport.code,
    departureTime: segment.departureTime || "",
    arrivalTime: segment.arrivalTime || "",
    date: segment.date || "",
    duration: segment.totalJourneyTime || segment.duration || "",
    stops: Number(segment.stops || 0) > 0
      ? `${segment.stops} stop${Number(segment.stops || 0) === 1 ? "" : "s"}`
      : "Direct",
    airline: segment.carrierName || flight.airline.name || "Selected airline",
    airlineCode: segment.carrierCode || flight.airline.code,
    cabinClass: segment.cabinClass || "Economy",
  };
}

function parseCheckoutDestinations(raw: string | null): AiDestinationDraft[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AiDestinationDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sameText(a?: string | null, b?: string | null) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function draftMatchesCheckoutUrl(draft: AiBookingDraft, params: URLSearchParams) {
  const location = params.get("location");
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  const adults = Number(params.get("adults") || "0") || 0;
  const children = Number(params.get("children") || "0") || 0;
  const rooms = Number(params.get("rooms") || "0") || 0;
  const urlDestinations = parseCheckoutDestinations(params.get("destinations"));
  const draftDestinations = draft.destinations || [];

  if (location && !sameText(draft.search?.destination, location)) return false;
  if (checkIn && draft.search?.checkIn !== checkIn) return false;
  if (checkOut && draft.search?.checkOut !== checkOut) return false;
  if (adults && Number(draft.search?.adults || 0) !== adults) return false;
  if (children !== Number(draft.search?.children || 0)) return false;
  if (rooms && Number(draft.search?.rooms || 0) !== rooms) return false;

  if (urlDestinations.length > 0) {
    if (draftDestinations.length !== urlDestinations.length + 1) return false;
    const primary = draftDestinations[0];
    if (!sameText(primary?.name, location)) return false;
    if (checkIn && primary?.checkIn !== checkIn) return false;
    if (checkOut && primary?.checkOut !== checkOut) return false;
    return urlDestinations.every((destination, index) => {
      const draftDestination = draftDestinations[index + 1];
      return (
        sameText(draftDestination?.name, destination.name) &&
        draftDestination?.checkIn === destination.checkIn &&
        draftDestination?.checkOut === destination.checkOut
      );
    });
  }

  return draftDestinations.length <= 1;
}

function AiCheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const [draft, setDraft] = useState<AiBookingDraft | null>(null);
  const [showTravellers, setShowTravellers] = useState(false);
  const [flightInfoOpen, setFlightInfoOpen] = useState(false);
  const [hotelDetailsOpen, setHotelDetailsOpen] = useState(false);
  const [hotelDetailsDestinationIndex, setHotelDetailsDestinationIndex] = useState(0);
  const setSearchParams = useBookingStore((s) => s.setSearchParams);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("aiPackageBookingDraft");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AiBookingDraft;
      if (!draftMatchesCheckoutUrl(parsed, new URLSearchParams(paramsKey))) {
        window.sessionStorage.removeItem("aiPackageBookingDraft");
        setDraft(null);
        router.replace(`/packages/ai?${paramsKey}`);
        return;
      }
      setDraft(parsed);
    } catch {
      setDraft(null);
    }
  }, [paramsKey, router]);

  useEffect(() => {
    if (!draft?.search?.checkIn) return;
    setSearchParams({
      from: draft.search.fromCode || "",
      to: draft.search.destination || "",
      departureDate: new Date(`${draft.search.checkIn}T00:00:00`),
      returnDate: draft.search.checkOut ? new Date(`${draft.search.checkOut}T00:00:00`) : undefined,
      passengers: {
        adults: Number(draft.search.adults || 1),
        children: Number(draft.search.children || 0),
        infants: 0,
      },
      class: "Economy",
      tripType: "round-trip",
    });
  }, [draft, setSearchParams]);

  const currency = draft?.totals?.currency || draft?.flight?.currency || draft?.hotel?.price?.currency || "GBP";
  const travellers = useMemo(() => {
    const adults = Number(draft?.search?.adults || 0);
    const children = Number(draft?.search?.children || 0);
    return `${adults || 1} adult${adults === 1 ? "" : "s"}${children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}`;
  }, [draft?.search?.adults, draft?.search?.children]);
  const flightSummaryLegs = draft?.flight
    ? (draft.flight.tripType === "multi-city" && draft.flight.segments?.length
        ? draft.flight.segments
        : [draft.flight.outbound, ...(draft.flight.inbound ? [draft.flight.inbound] : [])]
      ).map((segment) => flightSegmentToSummaryLeg(draft.flight!, segment))
    : [];
  const destinationDrafts = useMemo<AiDestinationDraft[]>(() => {
    if (draft?.destinations?.length) return draft.destinations;
    if (!draft) return [];
    return [
      {
        id: "primary",
        name: draft.search?.destination || "Destination",
        checkIn: draft.search?.checkIn,
        checkOut: draft.search?.checkOut,
        hotel: draft.hotel || null,
        activities: draft.activities || [],
        order: 0,
      },
    ];
  }, [draft]);
  const selectedHotelDestination = destinationDrafts[hotelDetailsDestinationIndex] || destinationDrafts[0];

  if (!draft) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <Link href="/packages/ai" className="inline-flex items-center gap-2 text-sm font-medium text-[#3754ED]">
            <ArrowLeft className="h-4 w-4" />
            Back to AI planner
          </Link>
          <div className="mt-6 rounded-xl border border-[#DFE0E4] p-6 text-[#010D50]">
            Your AI itinerary is not available in this browser session.
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/packages/ai" className="inline-flex items-center gap-2 text-sm font-medium text-[#3754ED]">
          <ArrowLeft className="h-4 w-4" />
          Back to AI planner
        </Link>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-5">
            <section className="rounded-xl border border-[#DFE0E4] bg-white p-5">
              <h1 className="text-2xl font-bold text-[#010D50]">Review your AI trip</h1>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#F5F7FF] p-3 text-sm text-[#010D50]">
                  <CalendarDays className="mb-2 h-4 w-4 text-[#3754ED]" />
                  {longDate(destinationDrafts[0]?.checkIn || draft.search?.checkIn)} - {longDate(destinationDrafts[destinationDrafts.length - 1]?.checkOut || draft.search?.checkOut)}
                </div>
                <div className="rounded-lg bg-[#F5F7FF] p-3 text-sm text-[#010D50]">
                  <Users className="mb-2 h-4 w-4 text-[#3754ED]" />
                  {travellers}
                </div>
                <div className="rounded-lg bg-[#F5F7FF] p-3 text-sm text-[#010D50]">
                  {destinationDrafts.map((item) => item.name).filter(Boolean).join(" + ") || draft.search?.destination}
                  <div className="text-xs text-[#3A478A]">{draft.search?.lookingFor}</div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-[#010D50]">Stays</h2>
              <div className="grid gap-4">
                {destinationDrafts.map((destination, index) => (
                  <div key={destination.id || `${destination.name}-${index}`} className="grid gap-4 rounded-xl border border-[#DFE0E4] p-3 md:grid-cols-[220px_1fr_auto]">
                    {destination.hotel?.imageSrc ? (
                      <div className="relative h-40 overflow-hidden rounded-xl bg-[#F5F7FF]">
                        <Image src={destination.hotel.imageSrc} alt={destination.hotel.name || "Hotel"} fill className="object-cover" />
                      </div>
                    ) : null}
                    <div>
                      <div className="text-xs font-semibold uppercase text-[#3A478A]">
                        {destination.name} - {longDate(destination.checkIn)} to {longDate(destination.checkOut)}
                      </div>
                      <h3 className="mt-1 text-xl font-bold text-[#010D50]">{destination.hotel?.name || "Selected hotel"}</h3>
                      <p className="mt-1 text-sm text-[#3A478A]">{destination.hotel?.distanceLabel}</p>
                      <div className="mt-3 font-semibold text-[#010D50]">{money(destination.hotel?.price?.total, destination.hotel?.price?.currency || currency)}</div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setHotelDetailsDestinationIndex(index);
                        setHotelDetailsOpen(true);
                      }}
                      className="h-9 rounded-full border-[#DFE0E4] px-4 text-xs font-semibold text-[#3754ED] md:self-start"
                    >
                      View details
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#010D50]">Flight</h2>
                  <div className="mt-1 text-sm font-semibold text-[#010D50]">{draft.flight?.airline?.name}</div>
                </div>
                {draft.flight ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFlightInfoOpen(true)}
                    className="h-9 rounded-full border-[#DFE0E4] px-4 text-xs font-semibold text-[#3754ED]"
                  >
                    View flight info
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3">
                {flightSummaryLegs.map((leg, index) => (
                  <FlightSummaryCard
                    key={`${leg.fromCode}-${leg.toCode}-${index}`}
                    leg={leg}
                    passengers={travellers}
                    cabinLabel={leg.cabinClass}
                    onViewDetails={() => setFlightInfoOpen(true)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-[#010D50]">Itinerary</h2>
              <div className="grid gap-5">
                {destinationDrafts.map((destination, destinationIndex) => (
                  <div key={destination.id || `${destination.name}-activities-${destinationIndex}`} className="space-y-3">
                    <div className="rounded-lg bg-[#F5F7FF] px-3 py-2 text-sm font-semibold text-[#010D50]">
                      {destination.name}
                      <span className="ml-2 text-xs font-normal text-[#3A478A]">
                        {longDate(destination.checkIn)} - {longDate(destination.checkOut)}
                      </span>
                    </div>
                    {(destination.activities || []).length > 0 ? (
                      (destination.activities || []).map((activity) => (
                        <div key={`${destination.id || destinationIndex}-${activity.productCode}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-[#DFE0E4] p-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F5F7FF]">
                            <Clock className="h-4 w-4 text-[#3754ED]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[#010D50]">{activity.title}</div>
                            <div className="text-xs text-[#3A478A]">
                              {longDate(activity.itineraryDate)} at {activity.itineraryTime}
                              {activity.duration ? ` - ${activity.duration}` : ""}
                              {activity.rating ? ` - ${activity.rating.toFixed(1)} rating` : ""}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-[#010D50]">{money(activity.price, activity.currency || currency)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-[#F5F7FF] p-3 text-sm text-[#3A478A]">No activities selected for this destination.</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {showTravellers ? (
              <section id="traveller-details">
                <PassengerFormsSection showPassportFields requireContactInfoForAll={false} />
              </section>
            ) : null}
          </div>

          <aside className="h-fit rounded-xl border border-[#DFE0E4] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#010D50]">Trip total</h2>
            <div className="mt-3 text-3xl font-bold text-[#010D50]">{money(draft.totals?.package, currency)}</div>
            <div className="mt-4 grid gap-2 text-sm text-[#3A478A]">
              <div className="flex justify-between"><span>Flight</span><span>{money(draft.totals?.flight, currency)}</span></div>
              <div className="flex justify-between"><span>Hotel</span><span>{money(draft.totals?.hotel, currency)}</span></div>
              <div className="flex justify-between"><span>Activities</span><span>{money(draft.totals?.activities, currency)}</span></div>
            </div>
            <Button
              className="mt-5 h-11 w-full rounded-xl bg-[#3754ED] text-white hover:bg-[#2942D1]"
              onClick={() => {
                setShowTravellers(true);
                window.setTimeout(() => {
                  document.getElementById("traveller-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
            >
              Continue to traveller details
            </Button>
            <Button
              variant="outline"
              className="mt-3 h-11 w-full rounded-xl border-[#DFE0E4] text-[#010D50]"
              onClick={() => router.push("/packages/ai")}
            >
              Back to AI planner
            </Button>
          </aside>
        </div>
      </main>
      {draft.flight ? (
        <FlightInfoModal
          flight={draft.flight}
          open={flightInfoOpen}
          onOpenChange={setFlightInfoOpen}
          stayOnCurrentPage
          hideFooter
          isPackageMode
        />
      ) : null}
      <Dialog open={hotelDetailsOpen} onOpenChange={setHotelDetailsOpen}>
        <DialogContent className="max-w-[min(100vw-24px,680px)] bg-white">
          <DialogHeader>
            <DialogTitle className="pr-6 text-[#010D50]">{selectedHotelDestination?.hotel?.name || "Selected hotel"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            {selectedHotelDestination?.hotel?.imageSrc ? (
              <div className="relative h-40 overflow-hidden rounded-xl bg-[#F5F7FF]">
                <Image src={selectedHotelDestination.hotel.imageSrc} alt={selectedHotelDestination.hotel.name || "Hotel"} fill className="object-cover" />
              </div>
            ) : null}
            <div>
              <p className="text-sm text-[#3A478A]">{selectedHotelDestination?.hotel?.distanceLabel}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#DFE0E4] p-3">
                  <div className="text-xs text-[#3A478A]">Check-in</div>
                  <div className="text-sm font-semibold text-[#010D50]">{longDate(selectedHotelDestination?.checkIn || draft.search?.checkIn)}</div>
                </div>
                <div className="rounded-lg border border-[#DFE0E4] p-3">
                  <div className="text-xs text-[#3A478A]">Check-out</div>
                  <div className="text-sm font-semibold text-[#010D50]">{longDate(selectedHotelDestination?.checkOut || draft.search?.checkOut)}</div>
                </div>
                <div className="rounded-lg border border-[#DFE0E4] p-3">
                  <div className="text-xs text-[#3A478A]">Travellers</div>
                  <div className="text-sm font-semibold text-[#010D50]">{travellers}</div>
                </div>
                <div className="rounded-lg border border-[#DFE0E4] p-3">
                  <div className="text-xs text-[#3A478A]">Rooms</div>
                  <div className="text-sm font-semibold text-[#010D50]">{draft.search?.rooms || 1} room</div>
                </div>
              </div>
              <div className="mt-4 text-base font-bold text-[#010D50]">
                {money(selectedHotelDestination?.hotel?.price?.total, selectedHotelDestination?.hotel?.price?.currency || currency)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

export default function AiCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AiCheckoutContent />
    </Suspense>
  );
}
