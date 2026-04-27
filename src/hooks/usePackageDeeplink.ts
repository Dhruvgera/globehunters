/**
 * Package/Hotel Deeplink Handler
 *
 * Handles entry via encrypted deeplink key from Vyspa search response.
 *
 * Triggered by URL params:
 *   ?packageKey={encryptedKey}  → calls holiday_package_view (package with flights)
 *   ?hotelKey={encryptedKey}    → calls accommodationView (hotel only)
 *   ?package={encryptedKey}     → legacy/meta alias for packageKey
 *   ?hotel={encryptedKey}       → legacy/meta alias for hotelKey
 *
 * Flow:
 *   1. Detect key param on page load
 *   2. Call view API → get full hotel+room details
 *   3. Store in bookingStore.deeplinkViewData + populate packageSearch/meta for downstream
 *   4. Redirect to /hotels/{hotelId}?type=package|deeplink
 */

"use client";

import { useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { packageService } from "@/services/api/packageService";
import { useBookingStore } from "@/store/bookingStore";
import type {
  HolidayPackageViewResponse,
  AccommodationViewResponse,
  PackageSearchCriteria,
  PackageSearchResult,
  PackageResultsMeta,
} from "@/types/holidayPackage";
import type { Flight, FlightSegment } from "@/types/flight";

export type DeeplinkMode = "package" | "hotel";

interface UsePackageDeeplinkReturn {
  /** Whether a deeplink key was detected and is being processed */
  isProcessing: boolean;
  /** Error message if processing failed */
  error: string | null;
  /** Manually trigger deeplink processing (if not auto-triggered) */
  processDeeplink: () => void;
}

function formatTime(value: unknown): string {
  const raw = String(value ?? "").replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `${raw.slice(0, 2)}:${raw.slice(2)}`;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function buildFlightSegment(direction: HolidayPackageViewResponse["results"]["FlightDetails"][number]): FlightSegment | null {
  const legs = Array.isArray(direction?.Flights) ? direction.Flights : [];
  if (legs.length === 0) return null;

  const first = legs[0];
  const last = legs[legs.length - 1];
  const stops = Math.max(0, Number(direction.Stops ?? legs.length - 1) || 0);

  return {
    departureTime: formatTime(first.departure_time),
    arrivalTime: formatTime(last.arrival_time),
    departureAirport: {
      code: String(first.departure_airport || ""),
      name: String(first.departure_airport || ""),
      city: String(first.departure_airport || ""),
    },
    arrivalAirport: {
      code: String(last.arrival_airport || ""),
      name: String(last.arrival_airport || ""),
      city: String(last.arrival_airport || ""),
    },
    date: String(first.departure_date || ""),
    arrivalDate: String(last.arrival_date || first.departure_date || ""),
    duration: formatDuration(Number(direction.Flying_time || 0)),
    totalJourneyTime: formatDuration(Number(direction.Total_travel_time || direction.Flying_time || 0)),
    stops,
    stopDetails: stops === 0 ? "Direct" : `${stops} Stop${stops === 1 ? "" : "s"}`,
    carrierCode: String(first.airline_code || ""),
    carrierName: String(first.airline_name || ""),
    flightNumber: String(first.flight_number || ""),
    cabinClass: String(first.class_name || first.cabin_class || ""),
    aircraftType: String(first.aircraft_type || ""),
    distance: Number(first.distance || 0) || undefined,
    departureTerminal: String(first.departure_terminal || "") || undefined,
    arrivalTerminal: String(last.arrival_terminal || "") || undefined,
    segmentBaggage: String(first.baggage || "") || undefined,
    individualFlights: legs.map((leg) => ({
      departureAirport: String(leg.departure_airport || ""),
      arrivalAirport: String(leg.arrival_airport || ""),
      departureCity: String(leg.departure_airport || ""),
      arrivalCity: String(leg.arrival_airport || ""),
      departureTime: formatTime(leg.departure_time),
      arrivalTime: formatTime(leg.arrival_time),
      duration: formatDuration(Number(leg.travel_time || 0)),
      flightNumber: String(leg.flight_number || ""),
      carrierCode: String(leg.airline_code || ""),
      airline: String(leg.airline_name || ""),
      operatedBy: String(leg.operating_airline_name || ""),
      departureDate: String(leg.departure_date || ""),
      arrivalDate: String(leg.arrival_date || ""),
    })),
  };
}

function buildSelectedFlightFromView(viewData: HolidayPackageViewResponse): Flight | null {
  const directions = Array.isArray(viewData.results?.FlightDetails) ? viewData.results.FlightDetails : [];
  if (directions.length === 0) return null;

  const outbound = buildFlightSegment(directions[0]);
  const inbound = directions.length > 1 ? buildFlightSegment(directions[1]) : null;
  if (!outbound) return null;

  const firstLeg = directions[0]?.Flights?.[0];
  const currency = String(viewData.results?.HotelDetails?.SellCur || "GBP").toUpperCase();

  return {
    id: String(viewData.results.FlightResultId || ""),
    airline: {
      name: String(firstLeg?.airline_name || outbound.carrierName || "Selected Airline"),
      logo: "",
      code: String(firstLeg?.airline_code || outbound.carrierCode || ""),
    },
    outbound,
    inbound: inbound || undefined,
    segments: [outbound, ...(inbound ? [inbound] : [])],
    tripType: inbound ? "round-trip" : "one-way",
    price: 0,
    pricePerPerson: 0,
    currency,
    ticketOptions: [],
    webRef: String(viewData.results.RequestId || ""),
    baggage: outbound.segmentBaggage,
    refundable: firstLeg ? Number(firstLeg.refundable || 0) === 1 : null,
    refundableText: String(firstLeg?.refundable_text || "") || undefined,
    hasBaggage: Boolean(outbound.segmentBaggage),
    segmentResultId: String(viewData.results.FlightResultId || ""),
  };
}

function extractRoomConfigurations(hotelDetails: HolidayPackageViewResponse["results"]["HotelDetails"]) {
  const groups = Object.values(hotelDetails.rooms || {}).filter((entry) => Array.isArray(entry)) as Array<
    Array<{ occupancies?: { adults?: number; children?: number; children_ages?: number[] } }>
  >;

  const fromOccupancy = groups
    .map((group) => group[0]?.occupancies)
    .filter(Boolean)
    .map((occ) => ({
      adults: Math.max(1, Number(occ?.adults || 1)),
      children: Math.max(0, Number(occ?.children || 0)),
      infants: 0,
      childAges: Array.isArray(occ?.children_ages) ? occ.children_ages.map((age) => Number(age) || 0) : [],
    }));

  return fromOccupancy.length > 0 ? fromOccupancy : [{ adults: 2, children: 0, infants: 0, childAges: [] }];
}

function shiftIsoDateByDays(baseIso: string, days: number): string {
  if (!baseIso) return "";
  const d = new Date(`${baseIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Math.max(0, Math.trunc(days)));
  return d.toISOString().slice(0, 10);
}

/**
 * Hook to handle package/hotel deeplink entry via encrypted key.
 * Call in a layout or page component that runs early.
 */
export function usePackageDeeplink(): UsePackageDeeplinkReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setDeeplinkViewData = useBookingStore((s) => s.setDeeplinkViewData);
  const setIsFromDeeplink = useBookingStore((s) => s.setIsFromDeeplink);
  const setPackageSearch = useBookingStore((s) => s.setPackageSearch);
  const setHotelSearch = useBookingStore((s) => s.setHotelSearch);
  const setPackageResults = useBookingStore((s) => s.setPackageResults);
  const setSelectedFlight = useBookingStore((s) => s.setSelectedFlight);
  const setSearchParams = useBookingStore((s) => s.setSearchParams);
  const setSearchRequestId = useBookingStore((s) => s.setSearchRequestId);

  const processDeeplink = useCallback(async () => {
    const packageKey = searchParams.get("packageKey") || searchParams.get("package");
    const hotelKey = searchParams.get("hotelKey") || searchParams.get("hotel");

    const key = packageKey || hotelKey;
    const mode: DeeplinkMode | null = packageKey ? "package" : hotelKey ? "hotel" : null;

    if (!key?.trim() || !mode) return;

    setIsFromDeeplink(true);

    try {
      let viewData: HolidayPackageViewResponse | AccommodationViewResponse;

      if (mode === "package") {
        viewData = await packageService.getPackageView(key.trim());
      } else {
        viewData = await packageService.getHotelView(key.trim());
      }

      if (!viewData.success) {
        throw new Error(viewData.status || "View API returned unsuccessful response");
      }

      // Store full view data for detail page room rendering
      setDeeplinkViewData(viewData);

      // Extract hotel ID for navigation — always use vendor hotel_id since /hotels/[id]
      // route parameter must be a valid vendor hotel ID for room/content API calls.
      // HotelResultId (search result ID) is stored in packageResultsMeta.hotelRequestId
      // for downstream change-flight URLs.
      const hotelId = String(viewData.results.HotelDetails.hotel_id);
      const hd = viewData.results.HotelDetails;
      const allRooms = Object.values(hd.rooms || {}).flat();
      const firstRoom = allRooms[0];
      const fallbackNights = Math.max(1, Number(firstRoom?.days_spent || 1));
      const checkIn = firstRoom?.CheckInDate || hd.CheckInDate || "";
      const checkOut =
        firstRoom?.CheckOutDate ||
        hd.CheckOutDate ||
        (checkIn ? shiftIsoDateByDays(checkIn, fallbackNights) : "");
      const roomConfigurations = extractRoomConfigurations(hd);
      const adults = roomConfigurations.reduce((sum, room) => sum + room.adults, 0);
      const children = roomConfigurations.reduce((sum, room) => sum + room.children, 0);

      // Populate hotel search context for hotel checkout sidebar + submission flow.
      setHotelSearch({
        provider: "vyspa",
        location: String(hd.hotel_name || ""),
        hidden_id: String(hd.hotel_id || ""),
        hidden_key: String(hd.VmapId || ""),
        checkIn,
        checkOut,
        rooms: Math.max(1, roomConfigurations.length),
        adults: Math.max(1, adults || 1),
        children: Math.max(0, children || 0),
        child_age: roomConfigurations.map((room) => {
          const out: Record<string, number> = {};
          room.childAges.forEach((age, index) => {
            out[String(index + 1)] = Number(age) || 0;
          });
          return out;
        }),
        branches: "UK",
        searchCriteriaId: hd.searchCriteriaId || viewData.results.RequestId,
      });
      setSearchRequestId(String(viewData.results.RequestId || hd.searchCriteriaId || ""));

      // For package mode, populate packageSearch/meta so downstream pages (review/checkout) work
      if (mode === "package" && "FlightResultId" in viewData.results) {
        const pkgView = viewData as HolidayPackageViewResponse;
        const results = pkgView.results;
        const selectedFlight = buildSelectedFlightFromView(pkgView);

        const destinationCode = String(pkgView.results.FlightDetails?.[0]?.Flights?.slice(-1)?.[0]?.arrival_airport || "").toUpperCase();
        const departureCode = String(pkgView.results.FlightDetails?.[0]?.Flights?.[0]?.departure_airport || "").toUpperCase();

        const deeplinkPackageSearch: PackageSearchCriteria = {
          departureCode,
          departureName: departureCode,
          destinationCode,
          destinationName: hd.hotel_name,
          destinationHiddenValue: destinationCode ? `${destinationCode};;${hd.hotel_name}` : `${hd.hotel_id};;${hd.hotel_name}`,
          checkIn,
          nights: Math.max(1, Number(firstRoom?.days_spent || 1)),
          rooms: roomConfigurations,
          timeout: 30,
          requestId: results.RequestId,
        };
        setPackageSearch(deeplinkPackageSearch);

        const deeplinkMeta: PackageResultsMeta = {
          requestId: results.RequestId,
          hotelRequestId: results.HotelResultId,
          selectedFlightResultId: results.FlightResultId,
          completed: true,
        };
        setPackageResults(
          [] as PackageSearchResult[], // results will be populated from view data on detail page
          deeplinkMeta,
        );

        if (selectedFlight) {
          setSelectedFlight(selectedFlight, selectedFlight.outbound.cabinClass || "Economy");
        }

        setSearchParams({
          from: departureCode || "",
          to: destinationCode || "",
          departureDate: checkIn ? new Date(`${checkIn}T12:00:00`) : new Date(),
          returnDate: checkOut ? new Date(`${checkOut}T12:00:00`) : undefined,
          passengers: {
            adults,
            children,
            infants: 0,
          },
          class: "Economy",
          tripType: "round-trip",
        });
      }

      // Navigate to hotel detail page
      // type=package → triggers isPackageMode=true (per-person pricing, "Includes flights", etc.)
      const urlType = mode === "package" ? "package" : "deeplink";
      const passthrough = new URLSearchParams();
      passthrough.set("type", urlType);
      passthrough.set("mode", mode);
      for (const keyName of ["aff", "utm_source", "utm_medium", "utm_campaign", "utm_id", "cnc"]) {
        const value = searchParams.get(keyName);
        if (value != null) passthrough.set(keyName, value);
      }
      router.replace(`/hotels/${hotelId}?${passthrough.toString()}`);
    } catch (err) {
      console.error("[usePackageDeeplink] Failed to process deeplink:", err);
      return err instanceof Error ? err.message : "Failed to load package details";
    }
  }, [searchParams, setDeeplinkViewData, setIsFromDeeplink, setPackageSearch, setHotelSearch, setPackageResults, setSearchParams, setSelectedFlight, setSearchRequestId, router]);

  // Auto-process on mount if key present
  useEffect(() => {
    const packageKey = searchParams.get("packageKey") || searchParams.get("package");
    const hotelKey = searchParams.get("hotelKey") || searchParams.get("hotel");

    if ((packageKey?.trim() || hotelKey?.trim())) {
      processDeeplink();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isProcessing: false,
    error: null,
    processDeeplink,
  };
}
