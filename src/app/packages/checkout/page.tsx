"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Edit2, Loader2 } from "lucide-react";

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
import { folderService } from "@/services/api/folderService";
import { hotelService } from "@/services/api/hotelService";
import { packageService } from "@/services/api/packageService";
import { resolvePackagePricing } from "@/lib/package/pricing";
import { calculatePackagePerPersonPrice } from "@/lib/package/passengers";
import { hasErrors, validatePassenger } from "@/utils/validation";
import type { HolidayPackageViewResponse } from "@/types/holidayPackage";
import { formatMoneyFromSymbol } from "@/lib/currency/formatMoney";
import { formatLongDate } from "@/lib/utils/dateFormat";
import { buildDetailsFromDeeplinkView } from "@/lib/package/deeplinkDetails";
import { buildChangeHotelHref } from "@/lib/package/changeLinks";

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

function toIsoCurrency(currency: string | undefined) {
  const normalized = String(currency || "").trim().toUpperCase();
  if (normalized === "£") return "GBP";
  if (normalized === "$") return "USD";
  if (normalized === "€") return "EUR";
  return normalized || "GBP";
}

function mapPassengerType(type?: string) {
  if (type === "child") return "CHD" as const;
  if (type === "infant") return "INF" as const;
  return "ADT" as const;
}

function mapPassengerGender(title?: string) {
  const normalized = String(title || "").toLowerCase();
  return normalized === "mr" || normalized === "mstr" ? "M" as const : "F" as const;
}

function formatPassengerValidationMessage(
  passengerIndex: number,
  errors: ReturnType<typeof validatePassenger>
) {
  const labels: Record<string, string> = {
    firstName: "first name",
    lastName: "last name",
    dateOfBirth: "date of birth",
    email: "email",
    phone: "phone number",
    passportNumber: "passport number",
    passportExpiry: "passport expiry",
  };

  const invalidFields = Object.entries(errors)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => labels[key] || key);

  if (invalidFields.length === 0) {
    return `Please complete Passenger ${passengerIndex + 1} details before continuing.`;
  }

  return `Please check Passenger ${passengerIndex + 1}: ${invalidFields.join(", ")}.`;
}

function buildPackageRoomPassengers(
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

function resolveBookingRoomIdsFromDetail(
  rooms: Array<{ id?: number; selectionKey?: string }>,
  selectedRoomCount: number
) {
  const uniqueRooms: Array<{ id?: number; selectionKey?: string }> = [];
  const seenSelectionKeys = new Set<string>();

  for (const room of rooms) {
    const selectionKey = String(room.selectionKey || "").trim();
    if (selectionKey) {
      if (seenSelectionKeys.has(selectionKey)) continue;
      seenSelectionKeys.add(selectionKey);
    }
    uniqueRooms.push(room);
  }

  return uniqueRooms
    .slice(0, Math.max(1, selectedRoomCount))
    .map((room) => String(room.id || "").trim())
    .filter(Boolean);
}

function normalizeRoomCodesToBookingIds(
  rows: unknown[],
  selectedRoomIds: string[]
) {
  const map = new Map<string, string>();
  const normalizedSelected = selectedRoomIds.map((id) => String(id || "").trim()).filter(Boolean);

  rows.forEach((row, index) => {
    const current =
      row && typeof row === "object" && "SearchResultRoomDetail" in (row as Record<string, unknown>)
        ? ((row as Record<string, unknown>).SearchResultRoomDetail as Record<string, unknown>)
        : (row as Record<string, unknown>);
    const rawRow = (row as Record<string, unknown>) || {};

    const bookingRoomId = String(
      current?.id ?? current?.search_result_detail_id ?? ""
    ).trim();
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
      if (!map.has(candidate)) {
        map.set(candidate, bookingRoomId);
      }
    }
  });

  return normalizedSelected.map((roomId) => map.get(roomId) || roomId);
}

function PackageTravellerDetailsInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const hasHydrated = useStoreHydration();
  const flight = useSelectedFlight();
  const selectedFareType = useBookingStore((s) => s.selectedFareType);
  const selectedUpgrade = useBookingStore((s) => s.selectedUpgradeOption);
  const setSearchParams = useBookingStore((s) => s.setSearchParams);
  const storeSearchParams = useBookingStore((s) => s.searchParams);
  const packageSearch = useBookingStore((s) => s.packageSearch);
  const packageResultsMeta = useBookingStore((s) => s.packageResultsMeta);
  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const selectedHotel = useBookingStore((s) => s.selectedHotel);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const selectedHotelRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);
  const selectedHotelRoomSummary = useBookingStore((s) => s.selectedHotelRoomSummary);
  const passengersSaved = useBookingStore((s) => s.passengersSaved);
  const passengers = useBookingStore((s) => s.passengers);
  const vyspaFolderNumber = useBookingStore((s) => s.vyspaFolderNumber);
  const setVyspaFolderInfo = useBookingStore((s) => s.setVyspaFolderInfo);
  const setContactInfo = useBookingStore((s) => s.setContactInfo);
  const deeplinkViewData = useBookingStore((s) => s.deeplinkViewData);
  const isFromDeeplink = useBookingStore((s) => s.isFromDeeplink);

  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [airportNameCache, setAirportNameCache] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packageDetails, setPackageDetails] = useState<Awaited<ReturnType<typeof packageService.getPackageDetails>>["details"] | null>(null);

  useEffect(() => {
    const from = packageSearch?.departureCode || storeSearchParams?.from || sp.get("from") || "";
    const to = packageSearch?.destinationCode || storeSearchParams?.to || sp.get("to") || "";
    const depStr = hotelSearch?.checkIn || packageSearch?.checkIn || sp.get("departureDate") || "";
    const retStr = hotelSearch?.checkOut || sp.get("returnDate") || "";

    const roomConfigs = packageSearch?.rooms || [];
    const adults = roomConfigs.reduce((sum, room) => sum + Number(room.adults || 0), 0) || parseInt(sp.get("adults") || "2", 10) || 2;
    const children = roomConfigs.reduce((sum, room) => sum + Number(room.children || 0), 0) || parseInt(sp.get("children") || "0", 10) || 0;
    const infants = roomConfigs.reduce((sum, room) => sum + Number(room.infants || 0), 0) || parseInt(sp.get("infants") || "0", 10) || 0;

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

  useEffect(() => {
    if (hasHydrated && !flight) {
      const params = new URLSearchParams(sp.toString());
      params.set("type", "package");
      router.replace(`/search?${params.toString()}`);
    }
  }, [hasHydrated, flight, router, sp]);

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

  const deeplinkPackageView =
    isFromDeeplink &&
    deeplinkViewData?.success &&
    "FlightResultId" in deeplinkViewData.results
      ? (deeplinkViewData as HolidayPackageViewResponse)
      : null;

  // Use deeplink view data only when user hasn't done a change selection
  const useDeeplinkData = deeplinkPackageView && selectedHotelRoomIds.length === 0;

  useEffect(() => {
    if (useDeeplinkData) {
      setPackageDetails(buildDetailsFromDeeplinkView(deeplinkPackageView!));
      return;
    }

    if (!flight || selectedHotelRoomIds.length === 0) return;
    let cancelled = false;

    const loadPackageDetails = async () => {
      try {
        const response = await packageService.getPackageDetails({
          flightResultId: flight.segmentResultId || flight.id,
          hotelResultRoomIds: selectedHotelRoomIds,
        });
        if (!cancelled) {
          setPackageDetails(response.details);
        }
      } catch {
        if (!cancelled) {
          setPackageDetails(null);
        }
      }
    };

    loadPackageDetails();

    return () => {
      cancelled = true;
    };
  }, [useDeeplinkData, deeplinkPackageView, flight, selectedHotelRoomIds]);

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
  const refNumber = vyspaFolderNumber || useBookingStore.getState().searchRequestId || flight?.webRef || "—";

  const parsedPackagePrice = useMemo(() => parseMoneyString(packageDetails?.packagePrice), [packageDetails?.packagePrice]);
  const packageTotalLabel = useMemo(() => {
    const selectedFlightDelta =
      typeof flight?.packagePriceDeltaTotal === "number"
        ? flight.packagePriceDeltaTotal
        : 0;
    const resolved = resolvePackagePricing({
      packagePriceAmount: parsedPackagePrice.amount,
      packagePriceCurrency: parsedPackagePrice.currency,
      hotelRoomTotals: packageDetails?.hotel?.rooms?.map((room) => Number(room.price || 0) || undefined),
      flightTotal: packageDetails?.flight?.totalFare,
      flightCurrency: packageDetails?.flight?.currency,
      selectedRoomPackageTotal: selectedHotelRoomSummary?.total,
      selectedRoomCurrency: selectedHotelRoomSummary?.currency,
      selectedFlightDelta,
      selectedFlightCurrency: selectedUpgrade?.currency || flight?.currency,
    });
    return formatMoneyFromSymbol(resolved.currency, resolved.amount);
  }, [
    flight?.currency,
    flight?.packagePriceDeltaTotal,
    packageDetails?.flight?.currency,
    packageDetails?.flight?.totalFare,
    packageDetails?.hotel?.rooms,
    parsedPackagePrice.amount,
    parsedPackagePrice.currency,
    selectedHotelRoomSummary?.currency,
    selectedHotelRoomSummary?.total,
    selectedUpgrade?.currency,
  ]);
  const packagePerPersonLabel = useMemo(() => {
    const selectedFlightDelta =
      typeof flight?.packagePriceDeltaTotal === "number"
        ? flight.packagePriceDeltaTotal
        : 0;
    const resolved = resolvePackagePricing({
      packagePriceAmount: parsedPackagePrice.amount,
      packagePriceCurrency: parsedPackagePrice.currency,
      hotelRoomTotals: packageDetails?.hotel?.rooms?.map((room) => Number(room.price || 0) || undefined),
      flightTotal: packageDetails?.flight?.totalFare,
      flightCurrency: packageDetails?.flight?.currency,
      selectedRoomPackageTotal: selectedHotelRoomSummary?.total,
      selectedRoomCurrency: selectedHotelRoomSummary?.currency,
      selectedFlightDelta,
      selectedFlightCurrency: selectedUpgrade?.currency || flight?.currency,
    });
    return formatMoneyFromSymbol(
      resolved.currency,
      calculatePackagePerPersonPrice(resolved.amount, packageSearch?.rooms)
    );
  }, [
    flight?.currency,
    flight?.packagePriceDeltaTotal,
    packageDetails?.flight?.currency,
    packageDetails?.flight?.totalFare,
    packageDetails?.hotel?.rooms,
    packageSearch?.rooms,
    parsedPackagePrice.amount,
    parsedPackagePrice.currency,
    selectedHotelRoomSummary?.currency,
    selectedHotelRoomSummary?.total,
    selectedUpgrade?.currency,
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

  const changeHotelHref = useMemo(
    () => buildChangeHotelHref(hotelSearch, packageSearch),
    [hotelSearch, packageSearch],
  );

  const changeFlightHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", "package");
    const effectiveHotelId = String(packageResultsMeta?.hotelRequestId || selectedHotel?.hotelId || "");
    if (effectiveHotelId) params.set("hotelId", effectiveHotelId);
    if (flight?.segmentResultId || flight?.id) {
      params.set("flightResultId", flight?.segmentResultId || flight?.id || "");
    }
    return `/search?${params.toString()}`;
  }, [flight?.id, flight?.segmentResultId, selectedHotel?.hotelId, packageResultsMeta?.hotelRequestId]);

  const stayDetails = useMemo(() => {
    const checkIn =
      hotelSearch?.checkIn ||
      packageDetails?.hotel?.rooms?.[0]?.checkIn ||
      packageSearch?.checkIn ||
      sp.get("checkIn") ||
      sp.get("departureDate") ||
      "";
    const checkOut =
      hotelSearch?.checkOut ||
      packageDetails?.hotel?.rooms?.[0]?.checkOut ||
      packageDetails?.hotel?.checkOutDate ||
      sp.get("checkOut") ||
      sp.get("returnDate") ||
      "";
    const derivedNights =
      checkIn && checkOut
        ? Math.max(
            1,
            Math.round(
              (new Date(`${checkOut}T12:00:00`).getTime() - new Date(`${checkIn}T12:00:00`).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : undefined;

    return {
      checkIn,
      checkOut,
      nights: derivedNights || packageDetails?.hotel?.rooms?.[0]?.nights || packageSearch?.nights || 1,
      rooms: Math.max(1, selectedHotelRoomIds.length || packageSearch?.rooms?.length || hotelSearch?.rooms || 1),
    };
  }, [
    hotelSearch?.checkIn,
    hotelSearch?.checkOut,
    hotelSearch?.rooms,
    packageDetails?.hotel?.checkOutDate,
    packageDetails?.hotel?.rooms,
    packageSearch?.checkIn,
    packageSearch?.nights,
    packageSearch?.rooms,
    selectedHotelRoomIds.length,
    sp,
  ]);

  const handleContinue = async () => {
    if (!termsAccepted || !flight || !selectedHotel?.hotelId || selectedHotelRoomIds.length === 0) return;

    const counts = storeSearchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const required = (counts.adults || 0) + (counts.children || 0) + (counts.infants || 0);
    for (let i = 0; i < required; i += 1) {
      const passenger = passengers[i];
      if (!passenger) {
        alert(`Please complete Passenger ${i + 1} details before continuing.`);
        return;
      }

      const validationErrors = validatePassenger(passenger, passenger.type, { requireContactInfo: i === 0 });
      if (hasErrors(validationErrors)) {
        alert(formatPassengerValidationMessage(i, validationErrors));
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const leadPassenger = passengers[0];
      setContactInfo(leadPassenger.email, `${leadPassenger.countryCode || ""}${leadPassenger.phone || ""}`);

      const currency = toIsoCurrency(selectedUpgrade?.currency || flight.currency);
      const selectedRoomCodes = selectedHotelRoomIds
        .map((id) => String(id || "").trim())
        .filter(Boolean);
      if (selectedRoomCodes.length === 0) {
        throw new Error("Failed to resolve the selected package rooms for booking.");
      }

      const accommodationDetails = await hotelService.accommodationDetails([{ roomCode: selectedRoomCodes }]);
      const accommodationRows =
        accommodationDetails &&
        typeof accommodationDetails === "object" &&
        Array.isArray((accommodationDetails as { rooms?: unknown[] }).rooms)
          ? (accommodationDetails as { rooms: unknown[] }).rooms
          : [];
      const canonicalSelectedRoomIds = normalizeRoomCodesToBookingIds(accommodationRows, selectedRoomCodes);

      const packageDetail = await packageService.getPackageDetails({
        flightResultId: flight.segmentResultId || flight.id,
        hotelResultRoomIds: canonicalSelectedRoomIds,
      });
      const liveHotel = packageDetail.details.hotel;
      const liveFlight = packageDetail.details.flight;
      const resolvedRoomIds = resolveBookingRoomIdsFromDetail(
        liveHotel?.rooms || [],
        selectedHotelRoomIds.length
      );
      if (resolvedRoomIds.length === 0) {
        throw new Error("Failed to resolve the selected package rooms for booking.");
      }

      let folderNumber = vyspaFolderNumber ? Number(vyspaFolderNumber) : null;

      if (!folderNumber) {
        const createFolderResponse = await hotelService.createCustomerFolder({
          title: leadPassenger.title || "Mr",
          firstName: leadPassenger.firstName,
          lastName: leadPassenger.lastName,
          email: leadPassenger.email,
          phone: leadPassenger.phone,
          branchCode: hotelSearch?.branches || "UK",
          desAirportCode: hotelSearch?.arrivalPointCode || packageSearch?.destinationCode,
          departureDate: hotelSearch?.checkIn || packageSearch?.checkIn || "",
          address: "NA",
          zipCode: "NA",
        });

        folderNumber = (() => {
          if (typeof createFolderResponse === "number") return createFolderResponse;
          if (typeof createFolderResponse === "string" && /^\d+$/.test(createFolderResponse)) return Number(createFolderResponse);
          if (Array.isArray(createFolderResponse)) return (createFolderResponse as any)[0]?.folder_no;
          return (createFolderResponse as any)?.folder_no;
        })();

        if (!folderNumber) {
          throw new Error("Failed to create package customer folder.");
        }

        setVyspaFolderInfo({
          folderNumber: String(folderNumber),
          emailAddress: leadPassenger.email,
        });
      }

      const packageAddedKey = `packageItineraryAdded_${folderNumber}`;
      if (sessionStorage.getItem(packageAddedKey) !== "1") {
        const folderPassengers = passengers.slice(0, required).map((passenger, index) => ({
          pax_no: index + 1,
          title: passenger.title as any,
          first_name: passenger.firstName,
          middle_name: passenger.middleName || "",
          last_name: passenger.lastName,
          birth_date: passenger.dateOfBirth,
          pax_type: mapPassengerType(passenger.type) as any,
          api_gender: mapPassengerGender(passenger.title) as any,
          email: passenger.email,
          phone: passenger.phone,
        }));

        const roomPassengers = buildPackageRoomPassengers(
          resolvedRoomIds,
          packageSearch?.rooms || [{ adults: counts.adults, children: counts.children, infants: counts.infants }],
          passengers.slice(0, required)
        );

        const addResponse = await folderService.addToFolder({
          folderNumber: Number(folderNumber),
          itineraryNumber: "1",
          foldcur: currency,
          travelPurpose: "Holiday",
          comments: ["Holiday package itinerary"],
          set_as_preferred_itinerary: true,
          passengers: folderPassengers as any,
          requestData: [
            {
              type: "flight",
              psw_result_id: liveFlight?.pswResultId || flight.segmentResultId || flight.id,
              passengers: Array.from({ length: required }, (_, index) => index + 1).join(","),
              holiday_package: 1,
            },
            {
              type: "hotel",
              roomIds: resolvedRoomIds.join(","),
              passengers: roomPassengers,
              holiday_package: 1,
            },
          ] as any,
        });
        if (!addResponse.success) {
          throw new Error(addResponse.message || "Failed to add package itinerary to folder");
        }
        sessionStorage.setItem(packageAddedKey, "1");
      }

      const params = new URLSearchParams(sp.toString());
      params.set("type", "package");
      if (marketingConsent) params.set("marketing", "1");
      router.push(`/payment?${params.toString()}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to prepare package booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <PackageStepProgress currentStep="details" />

        <div className="mt-4">
          <WebRefCard refNumber={refNumber} phoneNumber={affiliatePhone} isMobile={true} isJourneyRef={!!vyspaFolderNumber} />
          <div className="mt-4 lg:hidden bg-white border border-[#DFE0E4] rounded-xl p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[#3A478A]">Total package price</div>
            <div className="mt-1 text-2xl font-semibold text-[#010D50]">{packageTotalLabel}</div>
            <div className="mt-1 text-sm text-[#3A478A]">{packagePerPersonLabel} per person</div>
          </div>
        </div>

        <div className="mt-5 sm:mt-6 flex flex-col lg:flex-row gap-5 sm:gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#010D50]">Your hotel</div>
                <Link href={changeHotelHref} className="text-[#3754ED] text-sm font-medium flex items-center gap-1 hover:underline">
                  <Edit2 className="w-3.5 h-3.5" />
                  Change selection
                </Link>
              </div>
              <div className="flex gap-3">
                <div className="relative w-[96px] h-[72px] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#010D50] truncate">{hotelDisplay.name}</div>
                  {hotelDisplay.distance ? (
                    <div className="text-xs text-[#3A478A] truncate">{hotelDisplay.distance}</div>
                  ) : null}
                  <div className="text-xs text-[#3A478A] mt-1">
                    Check-In: {formatLongDate(stayDetails.checkIn)} | Check-Out: {formatLongDate(stayDetails.checkOut)}
                  </div>
                  {hotelDisplay.rating ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="bg-[#3754ED] text-white text-xs font-semibold px-2 py-0.5 rounded">
                        {hotelDisplay.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-[#3A478A]">
                        {hotelDisplay.reviewCount ? `${hotelDisplay.reviewCount} reviews` : ""}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              {hotelDisplay.amenities.length ? (
                <div className="flex flex-wrap gap-3 text-xs text-[#3A478A]">
                  {hotelDisplay.amenities.slice(0, 4).map((amenity) => (
                    <span key={amenity} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#3A478A] rounded-full" />
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8F9FC] rounded-xl">
                <div>
                  <div className="text-sm text-[#3A478A] mb-1">Check-In</div>
                  <div className="text-lg font-semibold text-[#010D50]">
                    {formatLongDate(stayDetails.checkIn)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#3A478A] mb-1">Check-Out</div>
                  <div className="text-lg font-semibold text-[#010D50]">
                    {formatLongDate(stayDetails.checkOut)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <div>
                  <div className="text-sm text-[#3A478A]">Total length of stay</div>
                  <div className="font-semibold text-[#010D50]">
                    {stayDetails.nights} Night{stayDetails.nights !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="sm:border-l sm:border-[#DFE0E4] sm:pl-6">
                  <div className="text-sm text-[#3A478A]">Rooms selected</div>
                  <div className="font-semibold text-[#010D50]">
                    {stayDetails.rooms} room{stayDetails.rooms !== 1 ? "s" : ""}
                  </div>
                </div>
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
            </div>

            <PassengerFormsSection requireContactInfoForAll={false} />

            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-terms"
                  className="mt-1"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                />
                <label htmlFor="pkg-terms" className="text-sm font-medium text-[#010D50] leading-relaxed">
                  I confirm that the traveller details match the passport or official ID and I agree to the terms &amp; conditions.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-marketing"
                  className="mt-1"
                  checked={marketingConsent}
                  onCheckedChange={(checked) => setMarketingConsent(!!checked)}
                />
                <label htmlFor="pkg-marketing" className="text-sm text-[#3A478A] leading-relaxed">
                  By clicking this checkbox, I consent to receive marketing messages via calls, texts, and emails from Globehunters.
                </label>
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <Button
                onClick={handleContinue}
                disabled={!termsAccepted || submitting}
                className="w-full bg-[#3754ED] hover:bg-[#2A41C9] text-white rounded-full py-3 h-auto text-sm font-bold disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing booking...
                  </>
                ) : (
                  "Continue to payment"
                )}
              </Button>
            </div>
          </div>

          <div className="w-full lg:w-[482px] flex flex-col gap-4">
            <WebRefCard refNumber={refNumber} phoneNumber={affiliatePhone} isMobile={false} isJourneyRef={!!vyspaFolderNumber} />

            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 sm:p-5">
              <div className="text-xs uppercase tracking-[0.12em] text-[#3A478A]">Total package price</div>
              <div className="mt-1 text-2xl font-semibold text-[#010D50]">{packageTotalLabel}</div>
              <div className="mt-1 text-sm text-[#3A478A]">{packagePerPersonLabel} per person</div>
            </div>

            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 sm:p-5">
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3754ED]" />
        </div>
      }
    >
      <PackageTravellerDetailsInner />
    </Suspense>
  );
}
