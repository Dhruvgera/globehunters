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
import { folderService } from "@/services/api/folderService";
import { hotelService } from "@/services/api/hotelService";
import { useBookingStore } from "@/store/bookingStore";
import type { Passenger, PassengerTitle, PassengerType } from "@/types/booking";
import type { Flight } from "@/types/flight";
import type { Hotel } from "@/types/hotel";
import { ArrowLeft, CalendarDays, Clock, Loader2, Users } from "lucide-react";

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
  hotel?: Hotel | null;
  activities?: AiActivityDraft[];
  order?: number;
  selectedRoomIds?: string[];
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
  hotel?: Hotel;
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

type InitFolderFlightSegment = {
  type: string;
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  arrivalDate: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  cabinClass?: string;
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

const PASSENGER_TITLES: PassengerTitle[] = ["Mr", "Mrs", "Ms", "Miss", "Dr"];

function sameText(a?: string | null, b?: string | null) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function normalizeCurrencyCode(value?: string) {
  const raw = String(value || "GBP").trim().toUpperCase();
  if (raw === "Â£" || raw === "£") return "GBP";
  if (raw === "$") return "USD";
  if (raw === "â‚¬" || raw === "€") return "EUR";
  return /^[A-Z]{3}$/.test(raw) ? raw : "GBP";
}

function rawHotelRecord(hotel?: Hotel | null) {
  const raw = hotel?.rawSearchResult;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function resolveAiHotelId(hotel?: Hotel | null) {
  const raw = rawHotelRecord(hotel);
  return String(raw?.hotel_id || raw?.hotelId || raw?.VmapId || raw?.vMapId || hotel?.id || "").trim();
}

function resolveAiRoomId(hotel?: Hotel | null) {
  const raw = rawHotelRecord(hotel);
  return String(raw?.id || raw?.srId || hotel?.id || "").trim();
}

function isAiHotelbedsHotel(hotel?: Hotel | null) {
  const raw = rawHotelRecord(hotel);
  const provider = String(raw?.provider || "").trim().toLowerCase();
  return provider === "hotelbeds" || Boolean(raw?._hotelbeds);
}

function roomNameText(hotel?: Hotel | null) {
  return String(hotel?.room?.name || "").trim().toLowerCase();
}

function roomHighlightsText(hotel?: Hotel | null) {
  return (hotel?.room?.highlights || []).map((value) => String(value || "").trim().toLowerCase()).join(" | ");
}

function toTitleCase(value: string | undefined | null) {
  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (["vip", "tv", "sqm", "sqft"].includes(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function sanitizeRoomText(value: string | undefined | null) {
  return String(value || "")
    .replace(/\*+/g, "")
    .replace(/\bnon[\s-]*refundable rate\b/gi, "")
    .replace(/\bnon[\s-]*refundable\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatRoomName(value: string | undefined | null) {
  const cleaned = sanitizeRoomText(value);
  return cleaned ? toTitleCase(cleaned) : "";
}

function formatRoomHighlights(highlights: string[] | undefined | null) {
  return Array.from(
    new Set(
      (highlights || [])
        .map((value) => sanitizeRoomText(value))
        .filter(Boolean)
        .map((value) => toTitleCase(value))
    )
  );
}

async function stableRateSelectionId(rateKey: string) {
  const encoded = new TextEncoder().encode(rateKey);
  const digest = await crypto.subtle.digest("SHA-1", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

function normalizeRoomCodesToBookingIds(rows: unknown[], selectedRoomIds: string[]) {
  const map = new Map<string, string>();
  const normalizedSelected = selectedRoomIds.map((id) => String(id || "").trim()).filter(Boolean);

  rows.forEach((row, index) => {
    const current =
      row && typeof row === "object" && "SearchResultRoomDetail" in (row as Record<string, unknown>)
        ? ((row as Record<string, unknown>).SearchResultRoomDetail as Record<string, unknown>)
        : (row as Record<string, unknown>);
    const rawRow = (row as Record<string, unknown>) || {};

    const bookingRoomId = String(current?.id ?? current?.search_result_detail_id ?? "").trim();
    if (!bookingRoomId) return;

    const candidates = [
      rawRow?.roomCode,
      rawRow?.room_code,
      current?.roomCode,
      current?.room_code,
      current?.source_room_code,
      current?.request_room_code,
      normalizedSelected[index],
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

    for (const candidate of candidates) {
      if (!map.has(candidate)) map.set(candidate, bookingRoomId);
    }
  });

  return normalizedSelected.map((roomId) => map.get(roomId) || roomId);
}

function extractRoomOptionRows(payload: unknown) {
  const current = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rooms = current?.rooms && typeof current.rooms === "object" ? (current.rooms as Record<string, unknown>) : {};
  const room1options = Array.isArray(rooms?.room1options)
    ? rooms.room1options
    : Array.isArray(current?.room1options)
      ? (current.room1options as unknown[])
      : [];
  return room1options.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object");
}

function pickFallbackRoomIds(
  hotel: Hotel,
  roomOptions: Record<string, unknown>[],
  desiredCount: number
) {
  const expectedName = roomNameText(hotel);
  const highlights = roomHighlightsText(hotel);
  const expectedTotal = Number(hotel.price?.total || 0);

  const scored = roomOptions.map((option, index) => {
    const optionId = String(option.id ?? "").trim();
    const optionName = String(option.room_name ?? option.roomName ?? "").trim().toLowerCase();
    const optionMeal = String(option.meal_name ?? option.mealName ?? option.MealPlan ?? "").trim().toLowerCase();
    const optionRefundable = Number(option.nonRef ?? 0) === 0;
    const optionPrice = Number(option.cust_tot_sell_amt ?? option.net_price ?? option.price ?? 0);
    let score = 0;
    if (expectedName && optionName && (expectedName.includes(optionName) || optionName.includes(expectedName))) score += 50;
    if (highlights && optionMeal && highlights.includes(optionMeal)) score += 20;
    if (highlights.includes("refund") && optionRefundable) score += 10;
    if (Number.isFinite(expectedTotal) && expectedTotal > 0 && Number.isFinite(optionPrice) && optionPrice > 0) {
      score -= Math.abs(optionPrice - expectedTotal);
    }
    score -= index * 0.01;
    return { optionId, score };
  });

  return scored
    .filter((row) => row.optionId)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, desiredCount))
    .map((row) => row.optionId);
}

async function resolveAiDestinationRoomIds(destination: AiDestinationDraft, roomCount: number) {
  const hotel = destination.hotel;
  if (!hotel) return [];
  if (isAiHotelbedsHotel(hotel)) {
    return (destination.selectedRoomIds || []).map((value) => String(value || "").trim()).filter(Boolean);
  }

  const raw = rawHotelRecord(hotel);
  const explicitIds = (destination.selectedRoomIds || []).map((value) => String(value || "").trim()).filter(Boolean);
  const hotelId = resolveAiHotelId(hotel);
  const searchResultId = resolveAiRoomId(hotel);
  const searchCriteriaId = raw?.searchCriteriaId;
  const cheapestRateKey =
    raw?._hotelbeds &&
    typeof raw._hotelbeds === "object" &&
    !Array.isArray(raw._hotelbeds) &&
    (raw._hotelbeds as Record<string, unknown>).cheapest &&
    typeof (raw._hotelbeds as Record<string, unknown>).cheapest === "object" &&
    !Array.isArray((raw._hotelbeds as Record<string, unknown>).cheapest)
      ? String(((raw._hotelbeds as Record<string, unknown>).cheapest as Record<string, unknown>).rateKey || "").trim()
      : "";

  let candidateIds = explicitIds;
  if (candidateIds.length === 0 && cheapestRateKey) {
    candidateIds = [await stableRateSelectionId(cheapestRateKey)];
  }

  if (candidateIds.length === 0 && (typeof searchCriteriaId === "string" || typeof searchCriteriaId === "number") && hotelId) {
    const roomsResponse = await hotelService.getRoomsV3(searchCriteriaId, hotelId, searchResultId || undefined);
    const roomOptions = extractRoomOptionRows(roomsResponse);
    candidateIds = pickFallbackRoomIds(hotel, roomOptions, roomCount);
  }

  if (candidateIds.length === 0) return [];
  if (candidateIds.every((value) => /^\d+$/.test(value))) return candidateIds;

  try {
    const accommodationDetails = await hotelService.accommodationDetails([{ roomCode: candidateIds }]);
    const accommodationRows =
      accommodationDetails &&
      typeof accommodationDetails === "object" &&
      Array.isArray((accommodationDetails as { rooms?: unknown[] }).rooms)
        ? (accommodationDetails as { rooms: unknown[] }).rooms
        : [];
    const normalized = normalizeRoomCodesToBookingIds(accommodationRows, candidateIds).filter(Boolean);
    return normalized.length > 0 ? normalized : candidateIds;
  } catch {
    return candidateIds;
  }
}

function mapPassengerTypeToFolder(type?: PassengerType | string) {
  if (type === "child") return "CHD";
  if (type === "infant") return "INF";
  return "ADT";
}

function mapPassengerGenderToFolder(title?: PassengerTitle | string) {
  return title === "Mr" ? "M" : "F";
}

function buildAiRoomPassengers(
  roomIds: string[],
  roomConfigs: Array<{ adults: number; children: number; infants: number }>,
  passengers: Array<{ type?: string }>
) {
  const byType = {
    adult: [] as number[],
    child: [] as number[],
    infant: [] as number[],
  };

  passengers.forEach((passenger, index) => {
    const paxNo = index + 1;
    if (passenger.type === "child") byType.child.push(paxNo);
    else if (passenger.type === "infant") byType.infant.push(paxNo);
    else byType.adult.push(paxNo);
  });

  const mapping: Record<string, string> = {};

  roomIds.forEach((roomId, index) => {
    const room = roomConfigs[index] || roomConfigs[roomConfigs.length - 1] || { adults: 1, children: 0, infants: 0 };
    const assigned = [
      ...byType.adult.splice(0, room.adults),
      ...byType.child.splice(0, room.children),
      ...byType.infant.splice(0, room.infants),
    ];
    if (assigned.length > 0) {
      mapping[roomId] = assigned.join(",");
    }
  });

  const leftovers = [...byType.adult, ...byType.child, ...byType.infant];
  if (leftovers.length > 0 && roomIds.length > 0) {
    const lastRoomId = roomIds[roomIds.length - 1];
    mapping[lastRoomId] = [mapping[lastRoomId], leftovers.join(",")].filter(Boolean).join(",");
  }

  return mapping;
}

function extractAiHotelbedsTaxes(hotel?: Hotel | null) {
  const raw = rawHotelRecord(hotel);
  const hotelbeds = raw?._hotelbeds && typeof raw._hotelbeds === "object" && !Array.isArray(raw._hotelbeds)
    ? (raw._hotelbeds as Record<string, unknown>)
    : null;
  const cheapest = hotelbeds?.cheapest && typeof hotelbeds.cheapest === "object" && !Array.isArray(hotelbeds.cheapest)
    ? (hotelbeds.cheapest as Record<string, unknown>)
    : null;
  const taxesRoot = cheapest?.taxes && typeof cheapest.taxes === "object" && !Array.isArray(cheapest.taxes)
    ? (cheapest.taxes as Record<string, unknown>)
    : null;
  const taxRows = Array.isArray(taxesRoot?.taxes) ? (taxesRoot?.taxes as Array<Record<string, unknown>>) : [];

  return taxRows
    .filter((tax) => !tax?.included)
    .map((tax) => ({
      amount: Number(tax?.clientAmount || tax?.amount || 0),
      currency: String(tax?.clientCurrency || tax?.currency || hotel?.price?.currency || "GBP"),
      label: String(tax?.subType || tax?.type || "Local tax"),
    }))
    .filter((tax) => Number.isFinite(tax.amount) && tax.amount > 0 && Boolean(tax.currency));
}

function extractAiHotelbedsRateKey(hotel?: Hotel | null) {
  const raw = rawHotelRecord(hotel);
  const hotelbeds = raw?._hotelbeds && typeof raw._hotelbeds === "object" && !Array.isArray(raw._hotelbeds)
    ? (raw._hotelbeds as Record<string, unknown>)
    : null;
  const cheapest = hotelbeds?.cheapest && typeof hotelbeds.cheapest === "object" && !Array.isArray(hotelbeds.cheapest)
    ? (hotelbeds.cheapest as Record<string, unknown>)
    : null;
  return String(cheapest?.rateKey || "").trim();
}

function buildAiPackageNotes(draft: AiBookingDraft, currency: string) {
  const lines: string[] = [];
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const search = draft.search;
  const destinations = draft.destinations || [];
  const selectedActivities = destinations.flatMap((destination) => destination.activities || []);

  if (selectedActivities.length === 0) return lines;

  lines.push(
    [
      "[AI_PACKAGE] Viator selections",
      search?.destination ? `trip=${search.destination}` : "",
      search?.checkIn && search?.checkOut ? `dates=${search.checkIn} to ${search.checkOut}` : "",
      `activities=${selectedActivities.length}`,
      Number.isFinite(draft.totals?.activities) ? `activitiesTotal=${money(Number(draft.totals?.activities || 0), normalizedCurrency)}` : "",
    ]
      .filter(Boolean)
      .join(" | ")
  );

  destinations.forEach((destination, index) => {
    (destination.activities || []).forEach((activity, activityIndex) => {
      lines.push(
        [
          `[AI_PACKAGE] Viator ${index + 1}.${activityIndex + 1}`,
          destination.name || `Stop ${index + 1}`,
          activity.productCode,
          activity.title,
          activity.itineraryDate ? `date=${activity.itineraryDate}` : "",
          activity.itineraryTime ? `time=${activity.itineraryTime}` : "",
          activity.duration ? `duration=${activity.duration}` : "",
          Number.isFinite(activity.price) ? `price=${money(Number(activity.price || 0), activity.currency || normalizedCurrency)}` : "",
          activity.rating ? `rating=${activity.rating.toFixed(1)}` : "",
        ]
          .filter(Boolean)
          .join(" | ")
      );
    });
  });

  return lines;
}

function buildInitFolderFlightSegments(flight: Flight): InitFolderFlightSegment[] {
  const segments = flight.tripType === "multi-city" && flight.segments?.length
    ? flight.segments
    : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];

  const results: InitFolderFlightSegment[] = [];

  for (const segment of segments) {
    if (!segment) continue;

    if (segment.individualFlights?.length) {
      for (const leg of segment.individualFlights) {
        results.push({
          type: "AIR",
          airlineCode: leg.carrierCode || segment.carrierCode || flight.airline.code || "",
          flightNumber: leg.flightNumber || segment.flightNumber || "",
          departureAirport: leg.departureAirport || segment.departureAirport?.code || "",
          arrivalAirport: leg.arrivalAirport || segment.arrivalAirport?.code || "",
          departureDate: leg.departureDate || segment.date || "",
          arrivalDate: leg.arrivalDate || segment.arrivalDate || segment.date || "",
          departureTime: leg.departureTime || segment.departureTime || "",
          arrivalTime: leg.arrivalTime || segment.arrivalTime || "",
          duration: leg.duration || segment.duration || "",
          cabinClass: segment.cabinClass || "",
        });
      }
      continue;
    }

    results.push({
      type: "AIR",
      airlineCode: segment.carrierCode || flight.airline.code || "",
      flightNumber: segment.flightNumber || "",
      departureAirport: segment.departureAirport?.code || "",
      arrivalAirport: segment.arrivalAirport?.code || "",
      departureDate: segment.date || "",
      arrivalDate: segment.arrivalDate || segment.date || "",
      departureTime: segment.departureTime || "",
      arrivalTime: segment.arrivalTime || "",
      duration: segment.duration || "",
      cabinClass: segment.cabinClass || "",
    });
  }

  return results;
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
  const plannerHref = useMemo(() => {
    const plannerParams = new URLSearchParams(paramsKey);
    plannerParams.delete("type");
    plannerParams.delete("folderNumber");
    plannerParams.delete("flightResultId");
    plannerParams.delete("hotelId");
    plannerParams.delete("roomId");
    return `/packages/ai?${plannerParams.toString()}`;
  }, [paramsKey]);
  const [draft, setDraft] = useState<AiBookingDraft | null>(null);
  const [showTravellers, setShowTravellers] = useState(false);
  const [flightInfoOpen, setFlightInfoOpen] = useState(false);
  const [hotelDetailsOpen, setHotelDetailsOpen] = useState(false);
  const [hotelDetailsDestinationIndex, setHotelDetailsDestinationIndex] = useState(0);
  const setSearchParams = useBookingStore((s) => s.setSearchParams);
  const passengers = useBookingStore((s) => s.passengers);
  const passengersSaved = useBookingStore((s) => s.passengersSaved);
  const addPassenger = useBookingStore((s) => s.addPassenger);
  const clearPassengers = useBookingStore((s) => s.clearPassengers);
  const setPassengersSaved = useBookingStore((s) => s.setPassengersSaved);
  const vyspaFolderNumber = useBookingStore((s) => s.vyspaFolderNumber);
  const vyspaCustomerId = useBookingStore((s) => s.vyspaCustomerId);
  const vyspaEmailAddress = useBookingStore((s) => s.vyspaEmailAddress);
  const setVyspaFolderInfo = useBookingStore((s) => s.setVyspaFolderInfo);
  const setHotelSearch = useBookingStore((s) => s.setHotelSearch);
  const setSelectedHotel = useBookingStore((s) => s.setSelectedHotel);
  const setSelectedHotelRoomIds = useBookingStore((s) => s.setSelectedHotelRoomIds);
  const setSelectedHotelRoomSummary = useBookingStore((s) => s.setSelectedHotelRoomSummary);
  const setHotelDetailsCache = useBookingStore((s) => s.setHotelDetailsCache);
  const setPackageSearch = useBookingStore((s) => s.setPackageSearch);
  const setContactInfo = useBookingStore((s) => s.setContactInfo);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  const requiredPassengerTypes = useMemo<PassengerType[]>(() => {
    const adults = Number(draft?.search?.adults || 0);
    const children = Number(draft?.search?.children || 0);
    return [
      ...Array.from({ length: Math.max(0, adults) }, () => "adult" as const),
      ...Array.from({ length: Math.max(0, children) }, () => "child" as const),
    ];
  }, [draft?.search?.adults, draft?.search?.children]);
  const selectedHotelDestination = destinationDrafts[hotelDetailsDestinationIndex] || destinationDrafts[0];

  const hasCompletePassengerData = (candidatePassengers: Passenger[]) =>
    candidatePassengers.length > 0 &&
    candidatePassengers.length === requiredPassengerTypes.length &&
    candidatePassengers.every((passenger, index) => {
      const requiresContact = index === 0;
      return Boolean(
        passenger.title &&
        passenger.firstName.trim() &&
        passenger.lastName.trim() &&
        passenger.dateOfBirth.trim() &&
        (!requiresContact || (passenger.email.trim() && passenger.phone.trim()))
      );
    });

  const collectPassengersFromDom = (): Passenger[] => {
    if (typeof document === "undefined") return [];

    return requiredPassengerTypes.map((type, index) => {
      const readValue = (id: string) => {
        const element = document.getElementById(id) as HTMLInputElement | null;
        return element?.value?.trim() || "";
      };
      const rawTitle = document.getElementById(`title-${index}`)?.textContent?.trim() || passengers[index]?.title || "Mr";
      const title = PASSENGER_TITLES.includes(rawTitle as PassengerTitle) ? (rawTitle as PassengerTitle) : "Mr";

      return {
        title,
        firstName: readValue(`firstName-${index}`),
        middleName: passengers[index]?.middleName || "",
        lastName: readValue(`lastName-${index}`),
        dateOfBirth: readValue(`dob-${index}`),
        email: readValue(`email-${index}`),
        phone: readValue(`phone-${index}`),
        countryCode: passengers[index]?.countryCode || "+44",
        passportNumber: readValue(`passport-${index}`),
        passportExpiry: readValue(`passportExpiry-${index}`),
        nationality: readValue(`nationality-${index}`) || passengers[index]?.nationality || "",
        type,
      };
    });
  };

  const syncPassengersFromDom = (): Passenger[] => {
    const collected = collectPassengersFromDom();
    if (collected.length === 0) return collected;

    clearPassengers();
    for (const passenger of collected) {
      addPassenger(passenger);
    }
    setPassengersSaved(hasCompletePassengerData(collected));
    return collected;
  };

  const hydrateSharedBookingState = () => {
    if (!draft) return null;
    const primaryDestination = destinationDrafts[0];
    const primaryHotel = primaryDestination?.hotel || draft.hotel || null;
    const hotelId = resolveAiHotelId(primaryHotel);
    const roomId = resolveAiRoomId(primaryHotel) || hotelId;
    const raw = rawHotelRecord(primaryHotel);
    const address = [String(raw?.address1 || "").trim(), String(raw?.address2 || "").trim()].filter(Boolean).join(", ");

    setPackageSearch({
      from: draft.search?.fromName || draft.search?.fromCode || "",
      fromCode: draft.search?.fromCode || "",
      to: draft.search?.destination || "",
      toCode: primaryDestination?.airportCode,
      checkIn: primaryDestination?.checkIn || draft.search?.checkIn || "",
      checkOut: primaryDestination?.checkOut || draft.search?.checkOut || "",
      travelers: Number(draft.search?.adults || 1) + Number(draft.search?.children || 0),
      travelClass: "Economy",
      rooms: Array.from({ length: Math.max(1, Number(draft.search?.rooms || 1)) }, (_, index) => ({
        adults:
          index === 0
            ? Math.max(1, Number(draft.search?.adults || 1) - Math.max(0, Number(draft.search?.rooms || 1) - 1))
            : 1,
        children: index === 0 ? Number(draft.search?.children || 0) : 0,
        childAges: Array.from({ length: index === 0 ? Number(draft.search?.children || 0) : 0 }, () => 9),
        infants: 0,
      })),
    } as never);

    setHotelSearch({
      provider: "hotelbeds",
      location: primaryDestination?.name || draft.search?.destination || "",
      hidden_id: String(raw?.hotel_id || raw?.hotelId || ""),
      hidden_key: String(raw?.searchCriteriaId || ""),
      checkIn: primaryDestination?.checkIn || draft.search?.checkIn || "",
      checkOut: primaryDestination?.checkOut || draft.search?.checkOut || "",
      rooms: Number(draft.search?.rooms || 1),
      adults: Number(draft.search?.adults || 1),
      children: Number(draft.search?.children || 0),
      searchCriteriaId: raw?.searchCriteriaId as string | number | undefined,
      arrivalPointCode: primaryDestination?.airportCode || draft.search?.destination,
    } as never);

    if (primaryHotel && hotelId) {
      setSelectedHotel({
        hotelId,
        hotelName: primaryHotel.name,
      });
      setSelectedHotelRoomIds(roomId ? [roomId] : []);
      setSelectedHotelRoomSummary({
        hotelId,
        roomId: roomId || hotelId,
        roomName: primaryHotel.room?.name,
        mealName: primaryHotel.room?.highlights?.join(" - "),
        isRefundable: primaryHotel.refundable ?? undefined,
        currency: primaryHotel.price?.currency,
        total: primaryHotel.price?.total,
        nightly: primaryHotel.price?.nightly,
        hotelBedsTaxes: null,
      });
      setHotelDetailsCache(hotelId, {
        hotelId,
        hotelName: primaryHotel.name,
        hotelRating: primaryHotel.starRating,
        mainImage: primaryHotel.imageSrc,
        address,
        rooms: roomId
          ? [
              {
                id: roomId,
                name: primaryHotel.room?.name || "Selected room",
                bedType: primaryHotel.room?.highlights?.join(" - "),
                isRefundable: primaryHotel.refundable ?? undefined,
                price: {
                  total: primaryHotel.price?.total,
                  nightly: primaryHotel.price?.nightly,
                  currency: primaryHotel.price?.currency,
                },
              },
            ]
          : [],
        amenities: primaryHotel.amenities || [],
        fetchedAt: Date.now(),
      });
    }

    return {
      primaryDestination,
      primaryHotel,
      hotelId,
      roomId,
    };
  };

  const proceedToPayment = async () => {
    if (!draft) return;
    let effectivePassengers = passengers;
    let effectivePassengersSaved = passengersSaved;

    if (!effectivePassengersSaved || effectivePassengers.length === 0) {
      const collectedPassengers = syncPassengersFromDom();
      if (hasCompletePassengerData(collectedPassengers)) {
        effectivePassengers = collectedPassengers;
        effectivePassengersSaved = true;
      }
    }

    if (!effectivePassengersSaved || effectivePassengers.length === 0) {
      setSubmitError("Please complete traveller details before continuing.");
      setShowTravellers(true);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const existingFolderNumber = vyspaFolderNumber;
      const hydrated = hydrateSharedBookingState();
      if (existingFolderNumber) {
        setVyspaFolderInfo({
          folderNumber: existingFolderNumber,
          customerId: vyspaCustomerId,
          emailAddress: vyspaEmailAddress,
        });
      }
      const leadPassenger = effectivePassengers[0];
      const requiredPassengerCount = effectivePassengers.length;
      const folderPassengers = effectivePassengers.slice(0, requiredPassengerCount).map((passenger, index) => ({
        pax_no: index + 1,
        title: passenger.title as PassengerTitle,
        first_name: passenger.firstName,
        middle_name: passenger.middleName || "",
        last_name: passenger.lastName,
        birth_date: passenger.dateOfBirth,
        pax_type: mapPassengerTypeToFolder(passenger.type),
        api_gender: mapPassengerGenderToFolder(passenger.title),
        email: passenger.email || leadPassenger?.email || "",
        phone: passenger.phone || leadPassenger?.phone || "",
      }));
      if (leadPassenger?.email || leadPassenger?.phone) {
        setContactInfo(leadPassenger.email || "", leadPassenger.phone || "");
      }

      let currentFolderNumber = existingFolderNumber ? String(existingFolderNumber) : "";

      if (!existingFolderNumber) {
        if (!draft.flight) throw new Error("Selected flight is missing from this AI itinerary.");

        const currency = normalizeCurrencyCode(draft.totals?.currency || draft.flight.currency || hydrated?.primaryHotel?.price?.currency || "GBP");
        const flightSegments = buildInitFolderFlightSegments(draft.flight);
        if (flightSegments.length === 0) throw new Error("No flight segments available for folder creation.");

        const response = await fetch("/api/vyspa/init-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passengers: effectivePassengers.map((p) => ({
              title: p.title,
              firstName: p.firstName,
              middleName: p.middleName || "",
              lastName: p.lastName,
              dateOfBirth: p.dateOfBirth,
              email: p.email || leadPassenger?.email || "",
              phone: p.phone || leadPassenger?.phone || "",
              countryCode: p.countryCode || "+44",
              type: p.type,
            })),
            currency,
            pswResultId: "",
            destinationAirportCode:
              destinationDrafts[destinationDrafts.length - 1]?.airportCode ||
              draft.flight.outbound?.arrivalAirport?.code ||
              "",
            departureDate: draft.flight.outbound?.date || draft.search?.checkIn || "",
            fareSelectedPrice: Number(draft.totals?.flight || draft.flight.price || 0),
            cabinClass: draft.flight.outbound?.cabinClass || "Economy",
            flightSegments,
            originAirportCode: draft.flight.outbound?.departureAirport?.code || draft.search?.fromCode || "",
            airlineCode: draft.flight.airline?.code || "",
            airlineName: draft.flight.airline?.name || "",
            additionalComments: buildAiPackageNotes(draft, currency),
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          folderNumber?: string;
          customerId?: number | null;
          emailAddress?: string | null;
          message?: string;
          error?: string;
        };

        if (!response.ok || !payload.folderNumber) {
          throw new Error(payload.message || payload.error || "Failed to create AI package folder.");
        }

        setVyspaFolderInfo({
          folderNumber: String(payload.folderNumber),
          customerId: payload.customerId ?? null,
          emailAddress: payload.emailAddress ?? leadPassenger?.email ?? null,
        });
        currentFolderNumber = String(payload.folderNumber);
      }

      const folderNumber = currentFolderNumber || String(useBookingStore.getState().vyspaFolderNumber || "");
      const hotelAddedKey = folderNumber ? `aiPackageHotelsAdded_${folderNumber}` : "";
      if (folderNumber && typeof window !== "undefined" && sessionStorage.getItem(hotelAddedKey) !== "1") {
        const roomConfigs = Array.from({ length: Math.max(1, Number(draft.search?.rooms || 1)) }, (_, index) => ({
          adults:
            index === 0
              ? Math.max(1, Number(draft.search?.adults || 1) - Math.max(0, Number(draft.search?.rooms || 1) - 1))
              : 1,
          children: index === 0 ? Number(draft.search?.children || 0) : 0,
          infants: 0,
        }));

        for (const destination of destinationDrafts) {
          if (!destination.hotel) continue;
          const destinationLabel = destination.name || destination.hotel.name || "selected hotel";
          if (isAiHotelbedsHotel(destination.hotel)) {
            const submitResp = await hotelService.submitHotelbedsToFolder({
              provider: "hotelbeds",
              folderNumber: Number(folderNumber),
              currency: normalizeCurrencyCode(currency),
              hotel: {
                hotelId: resolveAiHotelId(destination.hotel),
                hotelName: destination.hotel.name,
              },
              stay: {
                checkIn: destination.checkIn || draft.search?.checkIn || "",
                checkOut: destination.checkOut || draft.search?.checkOut || "",
                rooms: Math.max(1, Number(draft.search?.rooms || 1)),
                adults: Math.max(1, Number(draft.search?.adults || 1)),
                children: Math.max(0, Number(draft.search?.children || 0)),
              },
              passengers: folderPassengers as never,
              selection: {
                total: Number(destination.hotel.price?.total || 0),
                nightly: destination.hotel.price?.nightly,
                rateKey: extractAiHotelbedsRateKey(destination.hotel),
                boardName: destination.hotel.room?.highlights?.join(" - ") || destination.hotel.room?.name,
                refundable: destination.hotel.refundable ?? undefined,
                localPayableTaxes: extractAiHotelbedsTaxes(destination.hotel),
              },
            });

            if (!submitResp?.success) {
              throw new Error(
                `${submitResp?.message || "Failed to submit HotelBeds hotel to folder."} Hotel request: ${JSON.stringify({
                  hotelId: resolveAiHotelId(destination.hotel),
                  hotelName: destination.hotel.name,
                  checkIn: destination.checkIn || draft.search?.checkIn || "",
                  checkOut: destination.checkOut || draft.search?.checkOut || "",
                })}`
              );
            }
            continue;
          }

          const resolvedRoomIds = await resolveAiDestinationRoomIds(destination, roomConfigs.length);
          if (resolvedRoomIds.length === 0) {
            throw new Error(`Failed to resolve a live bookable room for ${destinationLabel}.`);
          }

          const hotelRequestItem = {
            type: "hotel" as const,
            search_result_id: resolveAiRoomId(destination.hotel) || undefined,
            roomIds: resolvedRoomIds.join(","),
            roomCodes: resolvedRoomIds.join(","),
            passengers: buildAiRoomPassengers(resolvedRoomIds, roomConfigs, effectivePassengers),
            holiday_package: 1,
          };

          const addHotelResponse = await folderService.addToFolder({
            folderNumber: Number(folderNumber),
            itineraryNumber: "1",
            foldcur: normalizeCurrencyCode(currency),
            travelPurpose: "Holiday",
            set_as_preferred_itinerary: true,
            passengers: folderPassengers as never,
            requestData: [hotelRequestItem] as never,
          });

          if (!addHotelResponse.success) {
            const details =
              addHotelResponse.rawResponse &&
              typeof addHotelResponse.rawResponse === "object" &&
              "details" in addHotelResponse.rawResponse
                ? String((addHotelResponse.rawResponse as { details?: unknown }).details || "")
                : "";
            throw new Error(
              [
                addHotelResponse.message || "Failed to add AI package hotel itinerary to folder.",
                details,
                `Hotel request: ${JSON.stringify(hotelRequestItem)}`,
              ]
                .filter(Boolean)
                .join(" ")
            );
          }
        }

        sessionStorage.setItem(hotelAddedKey, "1");
      }

      const next = new URLSearchParams(paramsKey);
      next.set("type", "package");
      if (folderNumber) next.set("folderNumber", String(folderNumber));
      if (draft.flight?.segmentResultId || draft.flight?.id) next.set("flightResultId", String(draft.flight?.segmentResultId || draft.flight?.id || ""));
      if (hydrated?.hotelId) next.set("hotelId", hydrated.hotelId);
      if (hydrated?.roomId) next.set("roomId", hydrated.roomId);
      router.push(`/payment?${next.toString()}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not continue to payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <Link href={plannerHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#3754ED]">
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
        <Link href={plannerHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#3754ED]">
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
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-[#010D50]">Stays</h2>
                <div className="text-sm font-semibold text-[#010D50]">
                  Total stay price: {money(draft.totals?.hotel, currency)}
                </div>
              </div>
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
                      {destination.hotel?.room?.name ? (
                        <div className="mt-3 rounded-xl border border-[#DFE0E4] bg-[#F5F7FF] p-3">
                          <div className="text-xs font-medium text-[#3A478A]">Selected room</div>
                          <div className="mt-1 text-sm font-semibold text-[#010D50]">{formatRoomName(destination.hotel.room.name)}</div>
                          {formatRoomHighlights(destination.hotel.room.highlights).length ? (
                            <div className="mt-1 text-xs text-[#3A478A]">{formatRoomHighlights(destination.hotel.room.highlights).join(" · ")}</div>
                          ) : null}
                        </div>
                      ) : null}
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
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm font-semibold text-[#010D50]">
                    Total flight price: {money(draft.totals?.flight, currency)}
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
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-[#010D50]">Itinerary</h2>
                <div className="text-sm font-semibold text-[#010D50]">
                  Total itinerary price: {money(draft.totals?.activities, currency)}
                </div>
              </div>
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
                <div className="mt-5 flex justify-end">
                  <Button
                    className="h-11 min-w-[220px] rounded-xl bg-[#010D50] px-6 text-white hover:bg-[#0B1C73] disabled:opacity-50"
                    disabled={submitting}
                    onClick={proceedToPayment}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating basket...
                      </>
                    ) : (
                      "Continue to payment"
                    )}
                  </Button>
                </div>
              </section>
            ) : null}
            {submitError ? (
              <div className="rounded-xl border border-[#F5C2C7] bg-[#FFF5F5] px-4 py-3 text-sm text-[#B42318]">
                {submitError}
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-xl border border-[#DFE0E4] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#010D50]">Trip total</h2>
            <div className="mt-3 text-3xl font-bold text-[#010D50]">{money(draft.totals?.package, currency)}</div>
            <div className="mt-4 grid gap-2 text-sm text-[#3A478A]">
              <div className="flex justify-between"><span>Total flight price</span><span>{money(draft.totals?.flight, currency)}</span></div>
              <div className="flex justify-between"><span>Total stay price</span><span>{money(draft.totals?.hotel, currency)}</span></div>
              <div className="flex justify-between"><span>Total itinerary price</span><span>{money(draft.totals?.activities, currency)}</span></div>
            </div>
            {!showTravellers ? (
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
            ) : (
              <Button
                className="mt-5 h-11 w-full rounded-xl bg-[#010D50] text-white hover:bg-[#0B1C73] disabled:opacity-50"
                disabled={submitting}
                onClick={proceedToPayment}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating basket...
                  </>
                ) : (
                  "Continue to payment"
                )}
              </Button>
            )}
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
              {selectedHotelDestination?.hotel?.room?.name ? (
                <div className="mt-3 rounded-xl border border-[#DFE0E4] bg-[#F5F7FF] p-3">
                  <div className="text-xs font-medium text-[#3A478A]">Selected room</div>
                  <div className="mt-1 text-sm font-semibold text-[#010D50]">{formatRoomName(selectedHotelDestination.hotel.room.name)}</div>
                  {formatRoomHighlights(selectedHotelDestination.hotel.room.highlights).length ? (
                    <div className="mt-1 text-xs text-[#3A478A]">{formatRoomHighlights(selectedHotelDestination.hotel.room.highlights).join(" · ")}</div>
                  ) : null}
                </div>
              ) : null}
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
