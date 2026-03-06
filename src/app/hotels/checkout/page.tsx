"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Ban,
  CreditCard,
} from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { BookingHeader } from "@/components/booking/BookingHeader";
import { HotelCheckoutSidebar } from "@/components/booking/HotelCheckoutSidebar";
import { useBookingStore } from "@/store/bookingStore";
import { hotelService } from "@/services/api/hotelService";
import { folderService } from "@/services/api/folderService";
import type { AddToFolderRequest } from "@/types/folder";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { CountryCodeSelector } from "@/components/booking/CountryCodeSelector";
import type { Passenger, PassengerType, PassengerTitle } from "@/types/booking";
import { countryCodes } from "@/lib/utils/countryCodes";
import { flattenHotelChildAges } from "@/lib/hotels/childAges";
import { calculateAge, validateDateOfBirthForType, validateEmail, validatePhone } from "@/utils/validation";

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
  error,
}: {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  error?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[#010D50]">{label}</label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 rounded-xl border ${error ? "border-red-500" : "border-[#DFE0E4]"} px-4 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED] transition-colors`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[#010D50]">{label}</label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-[#DFE0E4] px-4 pr-10 text-sm text-[#010D50] outline-none focus:border-[#3754ED] appearance-none bg-white transition-colors"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A478A] pointer-events-none" />
      </div>
    </div>
  );
}

function approximateBirthDateFromAge(age: number): string {
  const years = Math.max(0, Math.trunc(Number(age) || 0));
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

export default function HotelCheckoutPage() {
  const router = useRouter();

  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const hotelResultsMeta = useBookingStore((s) => s.hotelResultsMeta);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const selectedHotel = useBookingStore((s) => s.selectedHotel);
  const selectedHotelRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);
  const selectedHotelRoomSummary = useBookingStore((s) => s.selectedHotelRoomSummary);
  const passengers = useBookingStore((s) => s.passengers);
  const addPassenger = useBookingStore((s) => s.addPassenger);
  const updatePassenger = useBookingStore((s) => s.updatePassenger);
  const setPassengersSaved = useBookingStore((s) => s.setPassengersSaved);
  const setVyspaFolderInfo = useBookingStore((s) => s.setVyspaFolderInfo);
  const setContactInfo = useBookingStore((s) => s.setContactInfo);
  const vyspaFolderNumber = useBookingStore((s) => s.vyspaFolderNumber);
  const searchRequestId = useBookingStore((s) => s.searchRequestId);
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  const webRefNumber =
    vyspaFolderNumber ||
    searchRequestId ||
    (hotelSearch?.searchCriteriaId ? String(hotelSearch.searchCriteriaId) : "—");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Traveller form state
  const leadPassenger = passengers[0];
  const [title, setTitle] = useState<PassengerTitle>(leadPassenger?.title || "Mr");
  const [firstName, setFirstName] = useState(leadPassenger?.firstName || "");
  const [middleName, setMiddleName] = useState(leadPassenger?.middleName || "");
  const [lastName, setLastName] = useState(leadPassenger?.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState(leadPassenger?.dateOfBirth || "");
  const [email, setEmail] = useState(leadPassenger?.email || "");
  const [phone, setPhone] = useState(leadPassenger?.phone || "");
  const [countryCode, setCountryCode] = useState(leadPassenger?.countryCode || "+44");
  const [passport, setPassport] = useState(leadPassenger?.nationality || "India");
  const [otherTravellers, setOtherTravellers] = useState<Passenger[]>([]);

  // Booking for
  const [bookingFor, setBookingFor] = useState<"self" | "other">("self");
  const [otherTravellersExpanded, setOtherTravellersExpanded] = useState(false);

  // Special request
  const [specialRequest, setSpecialRequest] = useState("");

  // Arrival time
  const [arrivalTime, setArrivalTime] = useState("");

  // T&C
  const [tcAccepted, setTcAccepted] = useState(false);

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Track whether the lead passenger slot has been created in the store
  const passengerAdded = useRef(!!passengers[0]);

  // Auto-save passenger to store when form fields change
  useEffect(() => {
    if (firstName && lastName && dateOfBirth && email && phone) {
      const passenger: Passenger = {
        title,
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        email,
        phone,
        countryCode,
        nationality: passport,
        type: "adult" as PassengerType,
      };
      if (passengerAdded.current) {
        updatePassenger(0, passenger);
      } else {
        addPassenger(passenger);
        passengerAdded.current = true;
      }
      setPassengersSaved(true);
    } else {
      setPassengersSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, firstName, middleName, lastName, dateOfBirth, email, phone, countryCode, passport]);

  const summary = useMemo(() => {
    const hotelId = selectedHotel?.hotelId;
    const meta = hotelId ? hotelResultsMeta[hotelId] : undefined;
    return {
      hotelId,
      hotelName: selectedHotel?.hotelName || meta?.hotelName || "Selected hotel",
      searchResultId: meta?.searchResultId || meta?.srId,
      roomIds: selectedHotelRoomIds.map((roomId) => String(roomId).trim()).filter(Boolean),
    };
  }, [hotelResultsMeta, selectedHotel, selectedHotelRoomIds]);

  const selectedHotelMeta = useMemo(() => {
    if (!summary.hotelId) return undefined;
    return hotelResultsMeta?.[summary.hotelId];
  }, [hotelResultsMeta, summary.hotelId]);

  const effectiveProvider = useMemo(() => {
    if (selectedHotelMeta?.provider === "hotelbeds" || selectedHotelMeta?.provider === "vyspa") {
      return selectedHotelMeta.provider;
    }
    if (hotelSearch?.provider === "hotelbeds" || hotelSearch?.provider === "vyspa") {
      return hotelSearch.provider;
    }
    if (selectedHotelRoomSummary?.hotelbedsRateKey) {
      return "hotelbeds";
    }
    return "vyspa";
  }, [hotelSearch?.provider, selectedHotelMeta?.provider, selectedHotelRoomSummary?.hotelbedsRateKey]);

  const isHotelbedsMode = effectiveProvider === "hotelbeds";

  const hotelDetailsBackUrl = useMemo(() => {
    const hotelId = summary.hotelId;
    if (!hotelId) return undefined;
    const meta = hotelResultsMeta?.[hotelId];
    const params = new URLSearchParams();
    const searchCriteriaId = meta?.searchCriteriaId ?? hotelSearch?.searchCriteriaId;
    if (searchCriteriaId != null && String(searchCriteriaId).trim()) {
      params.set("searchCriteriaId", String(searchCriteriaId));
    }
    const srId = meta?.srId || meta?.searchResultId;
    if (srId && String(srId).trim()) {
      params.set("srId", String(srId));
    }
    const provider = meta?.provider || hotelSearch?.provider;
    if (provider) {
      params.set("provider", provider);
    }
    const query = params.toString();
    return query ? `/hotels/${hotelId}?${query}` : `/hotels/${hotelId}`;
  }, [summary.hotelId, hotelResultsMeta, hotelSearch?.searchCriteriaId, hotelSearch?.provider]);

  const expectedNetPrice = useMemo(() => {
    const hotelId = summary.hotelId;
    if (!hotelId) return undefined;
    const cachedRooms = hotelDetailsCache?.[hotelId]?.rooms;
    if (!Array.isArray(cachedRooms)) return undefined;
    const priceByRoomId = new Map(
      cachedRooms.map((room: any) => [String(room?.id || ""), Number(room?.price?.total || 0)])
    );
    const values = summary.roomIds
      .map((roomId) => priceByRoomId.get(String(roomId)))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
      .map((value) => value.toFixed(2));
    return values.length > 0 ? values : undefined;
  }, [hotelDetailsCache, summary.hotelId, summary.roomIds]);

  const roomDisplayData = useMemo(() => {
    const hotelId = summary.hotelId;
    const cached = hotelId ? hotelDetailsCache?.[hotelId] : undefined;
    const rooms = cached?.rooms || [];
    const counts: Record<string, { count: number; isRefundable?: boolean }> = {};

    for (const rid of selectedHotelRoomIds) {
      const room = rooms.find((r: any) => String(r.id) === String(rid));
      const name = room?.name || selectedHotelRoomSummary?.roomName || "Room";
      const isRefundable = room?.isRefundable ?? selectedHotelRoomSummary?.isRefundable;
      if (!counts[name]) counts[name] = { count: 0, isRefundable };
      counts[name].count += 1;
    }

    const result = Object.entries(counts).map(([name, data]) => ({
      name,
      count: data.count,
      isRefundable: data.isRefundable,
    }));

    return result.length > 0
      ? result
      : [{ name: selectedHotelRoomSummary?.roomName || "Room", count: 1, isRefundable: selectedHotelRoomSummary?.isRefundable }];
  }, [summary.hotelId, hotelDetailsCache, selectedHotelRoomIds, selectedHotelRoomSummary]);

  const passportCountryOptions = useMemo(() => {
    const uniqueByIso = new Map<string, string>();
    for (const country of countryCodes) {
      const iso = String(country.isoCode || "").toLowerCase();
      if (!iso || uniqueByIso.has(iso)) continue;
      uniqueByIso.set(iso, country.name);
    }
    return Array.from(uniqueByIso.entries()).map(([isoCode, name]) => ({ isoCode, name }));
  }, []);

  const travellerSlots = useMemo(() => {
    const adults = Math.max(1, Number(hotelSearch?.adults || 1));
    const children = Math.max(0, Number(hotelSearch?.children || 0));
    const childAges = flattenHotelChildAges(hotelSearch?.child_age ?? [], hotelSearch?.rooms || 1, children);
    const slots: PassengerType[] = [];
    for (let i = 0; i < Math.max(0, adults - 1); i += 1) slots.push("adult");
    for (let i = 0; i < children; i += 1) slots.push("child");
    return { slots, childAges };
  }, [hotelSearch?.adults, hotelSearch?.children, hotelSearch?.child_age, hotelSearch?.rooms]);

  const hasAdditionalTravellers = travellerSlots.slots.length > 0;

  useEffect(() => {
    setOtherTravellers((prev) =>
      travellerSlots.slots.map((slotType, idx) => {
        const fromStore = passengers[idx + 1];
        const existing = prev[idx];
        const source = fromStore || existing;
        const defaultTitle: PassengerTitle = slotType === "child" ? "Miss" : "Mr";
        const childAge = slotType === "child"
          ? travellerSlots.childAges[idx - Math.max(0, Number(hotelSearch?.adults || 1) - 1)]
          : undefined;
        return {
          title: (source?.title as PassengerTitle | undefined) || defaultTitle,
          firstName: source?.firstName || "",
          middleName: source?.middleName || "",
          lastName: source?.lastName || "",
          dateOfBirth: source?.dateOfBirth || "",
          email: source?.email || email || "",
          phone: source?.phone || phone || "",
          countryCode: source?.countryCode || countryCode || "+44",
          nationality: source?.nationality || passport || "",
          age: source?.age ?? childAge,
          type: slotType,
        };
      })
    );
  }, [travellerSlots, email, phone, countryCode, passport, passengers, hotelSearch?.adults]);

  const updateOtherTraveller = (index: number, patch: Partial<Passenger>) => {
    setOtherTravellers((prev) =>
      prev.map((traveller, i) => {
        if (i !== index) return traveller;
        const merged = { ...traveller, ...patch };
        if (merged.type === "child" && merged.title === "Mr") {
          merged.title = "Miss";
        }
        return merged;
      })
    );
  };

  useEffect(() => {
    if (bookingFor === "other") setOtherTravellersExpanded(true);
  }, [bookingFor]);

  const hasCustomizedTravellerDetails = (traveller: Passenger | undefined) =>
    !!(
      traveller?.firstName?.trim() ||
      traveller?.middleName?.trim() ||
      traveller?.lastName?.trim() ||
      traveller?.dateOfBirth ||
      (traveller?.email?.trim() && traveller.email.trim() !== email.trim()) ||
      (traveller?.phone?.trim() && traveller.phone.trim() !== phone.trim()) ||
      ((traveller?.countryCode || "+44") !== (countryCode || "+44")) ||
      ((traveller?.nationality || "") !== (passport || ""))
    );

  const hasCompleteTravellerDetails = (traveller: Passenger | undefined) =>
    !!(
      traveller?.firstName?.trim() &&
      traveller?.lastName?.trim() &&
      traveller?.dateOfBirth &&
      traveller?.email?.trim() &&
      traveller?.phone?.trim()
    );

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!dateOfBirth) errors.dateOfBirth = "Date of birth is required";
    if (!email.trim()) errors.email = "Email is required";
    if (email.trim() && !validateEmail(email.trim())) errors.email = "Please enter a valid email";
    if (!phone.trim()) errors.phone = "Phone number is required";
    if (phone.trim() && !validatePhone(phone.trim())) errors.phone = "Please enter a valid phone number";
    for (let i = 0; i < otherTravellers.length; i += 1) {
      const traveller = otherTravellers[i];
      if (!hasCustomizedTravellerDetails(traveller)) continue;
      if (!traveller?.firstName?.trim()) errors[`traveller_${i}_firstName`] = "First name is required";
      if (!traveller?.lastName?.trim()) errors[`traveller_${i}_lastName`] = "Last name is required";
      if (!traveller?.dateOfBirth) {
        errors[`traveller_${i}_dateOfBirth`] = "Date of birth is required";
      } else {
        const dobCheck = validateDateOfBirthForType(traveller.dateOfBirth, traveller.type === "child" ? "child" : "adult");
        if (!dobCheck.valid) errors[`traveller_${i}_dateOfBirth`] = dobCheck.error || "Invalid date of birth";
      }
      if (!traveller?.email?.trim()) errors[`traveller_${i}_email`] = "Email is required";
      if (traveller?.email?.trim() && !validateEmail(traveller.email.trim())) {
        errors[`traveller_${i}_email`] = "Please enter a valid email";
      }
      if (!traveller?.phone?.trim()) errors[`traveller_${i}_phone`] = "Phone number is required";
      if (traveller?.phone?.trim() && !validatePhone(traveller.phone.trim())) {
        errors[`traveller_${i}_phone`] = "Please enter a valid phone number";
      }
    }
    if (!tcAccepted) errors.tc = "You must accept the terms and conditions";
    setFormErrors(errors);
    if (Object.keys(errors).some((k) => k.startsWith("traveller_"))) {
      setOtherTravellersExpanded(true);
    }
    return Object.keys(errors).length === 0;
  }

  async function handleConfirm() {
    if (!hotelSearch || !summary.hotelId) return;
    if (!validateForm()) return;
    setSubmitting(true);
    setError(null);

    try {
      const lead: Passenger = {
        title,
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        email,
        phone,
        countryCode,
        nationality: passport,
        type: "adult" as PassengerType,
      };
      setContactInfo(lead.email, `${countryCode}${lead.phone}`);

      let folderNo = vyspaFolderNumber ? Number(vyspaFolderNumber) : null;
      if (!folderNo) {
        const folderResp = await hotelService.createCustomerFolder({
          title: lead.title || "Mr",
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          branchCode: hotelSearch.branches || "UK",
          desAirportCode: hotelSearch.arrivalPointCode,
          departureDate: hotelSearch.checkIn,
          address: "NA",
          zipCode: "NA",
        });

        folderNo = (() => {
          if (typeof folderResp === "number") return folderResp;
          if (typeof folderResp === "string" && /^\d+$/.test(folderResp)) return Number(folderResp);
          if (Array.isArray(folderResp)) return (folderResp as any)[0]?.folder_no;
          return (folderResp as any)?.folder_no;
        })();

        if (!folderNo) throw new Error("Vyspa did not return a folder number (folder_no).");
        setVyspaFolderInfo({ folderNumber: String(folderNo), emailAddress: lead.email });
      }

      const normalizedOtherTravellers = travellerSlots.slots.flatMap((slotType, index): Passenger[] => {
        const traveller = otherTravellers[index];
        const childAge =
          slotType === "child"
            ? travellerSlots.childAges[index - Math.max(0, Number(hotelSearch?.adults || 1) - 1)]
            : undefined;

        if (hasCustomizedTravellerDetails(traveller) && hasCompleteTravellerDetails(traveller)) {
          return [{
            title: traveller?.title || (slotType === "child" ? "Miss" : "Mr"),
            firstName: traveller.firstName,
            middleName: traveller.middleName || "",
            lastName: traveller.lastName,
            dateOfBirth: traveller.dateOfBirth,
            email: traveller.email || lead.email,
            phone: traveller.phone || lead.phone,
            countryCode: traveller.countryCode || lead.countryCode,
            nationality: traveller.nationality || lead.nationality,
            age: traveller.dateOfBirth
              ? calculateAge(traveller.dateOfBirth)
              : typeof traveller.age === "number"
              ? traveller.age
              : childAge,
            type: slotType,
          }];
        }

        if (slotType !== "child") return [];

        return [{
          title: "Miss",
          firstName: "unnamed",
          middleName: "",
          lastName: "unnamed",
          dateOfBirth: "",
          email: lead.email,
          phone: lead.phone,
          countryCode: lead.countryCode,
          nationality: lead.nationality,
          age: childAge,
          type: "child",
        }];
      });
      const allPassengers = [lead, ...normalizedOtherTravellers];
      if (passengers[0]) updatePassenger(0, lead);
      else addPassenger(lead);
      otherTravellers.forEach((traveller, index) => {
        if (hasCustomizedTravellerDetails(traveller) && hasCompleteTravellerDetails(traveller)) {
          const savedTraveller: Passenger = {
            title: traveller.title || (traveller.type === "child" ? "Miss" : "Mr"),
            firstName: traveller.firstName,
            middleName: traveller.middleName || "",
            lastName: traveller.lastName,
            dateOfBirth: traveller.dateOfBirth,
            email: traveller.email || lead.email,
            phone: traveller.phone || lead.phone,
            countryCode: traveller.countryCode || lead.countryCode,
            nationality: traveller.nationality || lead.nationality,
            age: traveller.dateOfBirth ? calculateAge(traveller.dateOfBirth) : traveller.age,
            type: traveller.type,
          };
          if (passengers[index + 1]) updatePassenger(index + 1, savedTraveller);
          else addPassenger(savedTraveller);
        }
      });
      const folderPassengers = allPassengers.map((p, idx) => ({
        pax_no: idx + 1,
        title: p.title as any,
        first_name: p.firstName,
        middle_name: "",
        last_name: p.lastName,
        birth_date: p.dateOfBirth || (typeof p.age === "number" ? approximateBirthDateFromAge(p.age) : undefined),
        age: p.dateOfBirth ? calculateAge(p.dateOfBirth) : p.age,
        pax_type: ((p as any).type === "child" ? "CHD" : (p as any).type === "infant" ? "INF" : "ADT") as any,
        api_gender: (p.title === "Mr" ? "M" : "F") as any,
        email: p.email,
        phone: p.phone,
      }));

      let bookingRoomIds = [...summary.roomIds];
      if (!isHotelbedsMode && bookingRoomIds.length > 0 && bookingRoomIds.some((roomId) => !/^\d+$/.test(String(roomId)))) {
        try {
          const accommodationDetailsResp = await hotelService.accommodationDetails([{ roomCode: bookingRoomIds }]) as any;
          const detailsRooms = Array.isArray(accommodationDetailsResp?.rooms) ? accommodationDetailsResp.rooms : [];
          const resolvedRoomIds = detailsRooms
            .map((row: any) => {
              const detail = row?.SearchResultRoomDetail || row;
              return String(detail?.id ?? detail?.search_result_detail_id ?? "").trim();
            })
            .filter(Boolean);

          if (resolvedRoomIds.length === bookingRoomIds.length) {
            bookingRoomIds = resolvedRoomIds;
          }
        } catch {
          // Fall back to the currently selected room ids; the API route will surface the exact failure.
        }
      }

      const roomPassengers = (() => {
        const roomIds = bookingRoomIds;
        const mapping: Record<string, string> = {};
        if (roomIds.length === 0) return mapping;
        const allocations = roomIds.map(() => [] as number[]);
        const byType = { adult: [] as number[], child: [] as number[], infant: [] as number[] };

        allPassengers.forEach((passenger, index) => {
          const paxNo = index + 1;
          const t = (passenger as any).type;
          if (t === "child") byType.child.push(paxNo);
          else if (t === "infant") byType.infant.push(paxNo);
          else byType.adult.push(paxNo);
        });

        const distribute = (indices: number[]) => {
          if (indices.length === 0) return;
          const rc = roomIds.length;
          const base = Math.floor(indices.length / rc);
          const rem = indices.length % rc;
          const cnts = Array.from({ length: rc }, () => base);
          for (let i = 0; i < rem; i++) cnts[rc - 1 - i] += 1;
          let cur = 0;
          cnts.forEach((count, ri) => {
            for (let i = 0; i < count; i++) {
              const pn = indices[cur];
              if (pn != null) allocations[ri]?.push(pn);
              cur += 1;
            }
          });
        };

        distribute(byType.adult);
        distribute(byType.child);
        distribute(byType.infant);

        roomIds.forEach((roomId, index) => {
          const pax = allocations[index] || [];
          if (pax.length > 0) {
            mapping[roomId] = mapping[roomId] ? `${mapping[roomId]},${pax.join(",")}` : pax.join(",");
          }
        });
        return mapping;
      })();

      const folderComments = [
        specialRequest.trim() ? `Special Request: ${specialRequest.trim()}` : "",
        arrivalTime.trim() ? `Arrival Time: ${arrivalTime.trim()}` : "",
      ].filter(Boolean);

      if (isHotelbedsMode) {
        const submitResp = await hotelService.submitHotelbedsToFolder({
          provider: "hotelbeds",
          folderNumber: Number(folderNo),
          currency: "GBP",
          hotel: { hotelId: summary.hotelId, hotelName: summary.hotelName },
          stay: {
            checkIn: hotelSearch.checkIn,
            checkOut: hotelSearch.checkOut,
            rooms: hotelSearch.rooms,
            adults: hotelSearch.adults,
            children: hotelSearch.children,
          },
          passengers: folderPassengers as any,
          selection: {
            total: selectedHotelRoomSummary?.total || 0,
            nightly: selectedHotelRoomSummary?.nightly,
            rateKey: selectedHotelRoomSummary?.hotelbedsRateKey,
            boardName: selectedHotelRoomSummary?.mealName,
            refundable: selectedHotelRoomSummary?.isRefundable,
          },
          comments: folderComments,
        });
        if (!submitResp?.success) throw new Error((submitResp as any)?.message || "Failed to submit HotelBeds hotel to folder");
      } else {
        const addToFolderRequest: AddToFolderRequest = {
          folderNumber: Number(folderNo),
          itineraryNumber: "1",
          foldcur: "GBP",
          travelPurpose: "Holiday",
          comments: folderComments,
          set_as_preferred_itinerary: true,
          passengers: folderPassengers as any,
          requestData: [
            {
              type: "hotel",
              search_result_id: summary.searchResultId,
              roomCodes: bookingRoomIds.join(","),
              roomIds: bookingRoomIds.join(","),
              passengers: roomPassengers,
              expectedNetPrice,
            } as any,
          ],
        };
        const addResp = await folderService.addToFolder(addToFolderRequest);
        if (!addResp.success) throw new Error(addResp.message || "Failed to add hotel to folder");
      }

      router.push("/payment?type=hotel");
    } catch (e: any) {
      setError(e?.message || "Failed to confirm hotel booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <BookingHeader currentStep={1} isHotel={true} backHref={hotelDetailsBackUrl} />

        <div className="flex flex-col lg:flex-row gap-4 mt-4">
          {/* LEFT COLUMN */}
          <div className="flex-1 flex flex-col gap-3">

            {/* Traveller Details */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <span className="text-sm font-semibold text-[#010D50]">Traveller Details</span>

              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-[#F5F7FF] rounded-full px-4 py-2">
                    <span className="text-sm font-semibold text-[#010D50]">Lead Traveller</span>
                  </div>
                  <span className="text-sm text-[#010D50]">(Must be 18 or older)</span>
                </div>

                {/* Name Row */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#010D50]">Name</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative w-full sm:w-[90px] sm:flex-shrink-0">
                      <select
                        value={title}
                        onChange={(e) => setTitle(e.target.value as PassengerTitle)}
                        className="h-12 w-full rounded-xl border border-[#DFE0E4] px-3 pr-8 text-sm text-[#010D50] outline-none focus:border-[#3754ED] appearance-none bg-white"
                      >
                        <option value="Mr">Mr.</option>
                        <option value="Mrs">Mrs.</option>
                        <option value="Miss">Miss</option>
                        <option value="Ms">Ms.</option>
                        <option value="Dr">Dr.</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A478A] pointer-events-none" />
                    </div>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={`w-full min-w-0 sm:flex-1 h-12 rounded-xl border ${formErrors.firstName ? "border-red-500" : "border-[#DFE0E4]"} px-4 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED]`}
                    />
                    <input
                      type="text"
                      placeholder="Middle Name"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full min-w-0 sm:flex-1 h-12 rounded-xl border border-[#DFE0E4] px-4 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED]"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={`w-full min-w-0 sm:flex-1 h-12 rounded-xl border ${formErrors.lastName ? "border-red-500" : "border-[#DFE0E4]"} px-4 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED]`}
                    />
                  </div>
                </div>

                {/* DOB + Email */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <InputField label="Date of Birth" placeholder="DD/MM/YYYY" value={dateOfBirth} onChange={setDateOfBirth} type="date" className="flex-1" error={formErrors.dateOfBirth} />
                  <InputField label="Email ID" placeholder="xyz123@gmail.com" value={email} onChange={setEmail} type="email" className="flex-1" error={formErrors.email} />
                </div>

                {/* Phone + Passport */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-xs font-medium text-[#010D50]">Phone no.</label>
                    <div className="flex gap-2">
                      <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
                      <input
                        type="tel"
                        placeholder="1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`flex-1 h-12 rounded-xl border px-4 text-sm text-[#010D50] placeholder:text-[#A0A3BD] outline-none focus:ring-2 focus:ring-[#3754ED]/30 ${formErrors.phone ? "border-red-400" : "border-[#DFE0E4]"}`}
                      />
                    </div>
                    {formErrors.phone && <span className="text-xs text-red-500">{formErrors.phone}</span>}
                  </div>
                  <SelectField label="Passport" value={passport} onChange={setPassport} className="flex-1">
                    {passportCountryOptions.map((country) => (
                      <option key={country.isoCode} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </div>

            {/* Who are you booking for? */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
              <span className="text-sm font-medium text-[#010D50]">Who are you booking for? (optional)</span>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="bookingFor" checked={bookingFor === "self"} onChange={() => setBookingFor("self")} className="w-5 h-5 accent-[#3754ED]" />
                  <span className="text-sm text-[#010D50]">I&apos;m the traveller</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="bookingFor" checked={bookingFor === "other"} onChange={() => setBookingFor("other")} className="w-5 h-5 accent-[#3754ED]" />
                  <span className="text-sm text-[#010D50]">I&apos;m booking for someone else</span>
                </label>
              </div>
            </div>

            {/* Room Cards */}
            {roomDisplayData.map((room, idx) => (
              <div key={idx} className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#010D50]">
                    {room.name} {room.count > 1 ? `x${room.count}` : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="border border-[#DFE0E4] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                    <Ban className="w-3 h-3 text-[#010D50]" />
                    <span className="text-xs text-[#010D50]">
                      {room.isRefundable === false ? "Non-refundable" : room.isRefundable === true ? "Refundable" : "Non-refundable"}
                    </span>
                  </div>
                  <div className="border border-[#DFE0E4] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3 text-[#010D50]" />
                    <span className="text-xs text-[#010D50]">Pay Online</span>
                  </div>
                </div>
              </div>
            ))}

            {hasAdditionalTravellers && (
              <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setOtherTravellersExpanded((prev) => !prev)}
                  className="flex items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold text-[#010D50]">Additional Traveller Details (optional)</span>
                  <ChevronDown className={`w-4 h-4 text-[#3A478A] transition-transform ${otherTravellersExpanded ? "rotate-180" : ""}`} />
                </button>
                <p className="text-xs text-[#3A478A]">
                  Only the lead traveller is required. If you skip these details, we will create the remaining passengers automatically using the searched occupancy and child ages.
                </p>
                {otherTravellersExpanded && otherTravellers.map((traveller, idx) => (
                  <div key={`traveller-${idx}`} className="border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-3">
                    <div className="text-xs font-semibold text-[#010D50]">
                      {traveller.type === "child"
                        ? `Child ${idx + 1 - Math.max(0, Number(hotelSearch?.adults || 1) - 1)}${typeof traveller.age === "number" ? ` • Age ${traveller.age}` : ""}`
                        : `Adult ${idx + 2}`}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[#010D50]">Name</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative w-full sm:w-[90px] sm:flex-shrink-0">
                          <select
                            value={traveller.title}
                            onChange={(e) => updateOtherTraveller(idx, { title: e.target.value as PassengerTitle })}
                            className="h-12 w-full rounded-xl border border-[#DFE0E4] px-3 pr-8 text-sm text-[#010D50] outline-none focus:border-[#3754ED] appearance-none bg-white"
                          >
                            <option value="Mr">Mr.</option>
                            <option value="Mrs">Mrs.</option>
                            <option value="Miss">Miss</option>
                            <option value="Ms">Ms.</option>
                            <option value="Dr">Dr.</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A478A] pointer-events-none" />
                        </div>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={traveller.firstName}
                          onChange={(e) => updateOtherTraveller(idx, { firstName: e.target.value })}
                          className="w-full min-w-0 sm:flex-1 h-12 rounded-xl border border-[#DFE0E4] px-4 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED]"
                        />
                        <input
                          type="text"
                          placeholder="Middle Name"
                          value={traveller.middleName || ""}
                          onChange={(e) => updateOtherTraveller(idx, { middleName: e.target.value })}
                          className="w-full min-w-0 sm:flex-1 h-12 rounded-xl border border-[#DFE0E4] px-4 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED]"
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={traveller.lastName}
                          onChange={(e) => updateOtherTraveller(idx, { lastName: e.target.value })}
                          className="w-full min-w-0 sm:flex-1 h-12 rounded-xl border border-[#DFE0E4] px-4 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <InputField
                        label="Date of Birth"
                        placeholder="DD/MM/YYYY"
                        value={traveller.dateOfBirth}
                        onChange={(value) => updateOtherTraveller(idx, { dateOfBirth: value })}
                        type="date"
                        className="flex-1"
                        error={formErrors[`traveller_${idx}_dateOfBirth`]}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <InputField
                        label="Email ID"
                        placeholder="xyz123@gmail.com"
                        value={traveller.email || ""}
                        onChange={(value) => updateOtherTraveller(idx, { email: value })}
                        type="email"
                        className="flex-1"
                        error={formErrors[`traveller_${idx}_email`]}
                      />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs font-medium text-[#010D50]">Phone no.</label>
                        <div className="flex gap-2">
                          <CountryCodeSelector
                            value={traveller.countryCode || "+44"}
                            onChange={(value) => updateOtherTraveller(idx, { countryCode: value })}
                          />
                          <input
                            type="tel"
                            placeholder="1234567890"
                            value={traveller.phone || ""}
                            onChange={(e) => updateOtherTraveller(idx, { phone: e.target.value })}
                            className={`flex-1 h-12 rounded-xl border px-4 text-sm text-[#010D50] placeholder:text-[#A0A3BD] outline-none focus:ring-2 focus:ring-[#3754ED]/30 ${formErrors[`traveller_${idx}_phone`] ? "border-red-400" : "border-[#DFE0E4]"}`}
                          />
                        </div>
                        {formErrors[`traveller_${idx}_phone`] && <span className="text-xs text-red-500">{formErrors[`traveller_${idx}_phone`]}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Special Request */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
              <span className="text-sm font-semibold text-[#010D50]">Special Request</span>
              <p className="text-xs text-[#3A478A]">
                Special requests can&apos;t be guaranteed, but the property will do its best to meet your needs.
                You can always make a special request after your booking is complete.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#010D50]">Please write your requests in English. (optional)</label>
                <textarea
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-[#DFE0E4] px-4 py-3 text-sm text-[#010D50] placeholder:text-[#3A478A] outline-none focus:border-[#3754ED] resize-none"
                />
              </div>
            </div>

            {/* Your arrival time */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
              <span className="text-sm font-semibold text-[#010D50]">Your arrival time</span>
              <SelectField label="Add your estimated arrival time. (optional)" value={arrivalTime} onChange={setArrivalTime} className="max-w-sm">
                <option value="">Select</option>
                <option value="14:00">14:00 - 15:00</option>
                <option value="15:00">15:00 - 16:00</option>
                <option value="16:00">16:00 - 17:00</option>
                <option value="17:00">17:00 - 18:00</option>
                <option value="18:00">18:00 - 19:00</option>
                <option value="19:00">19:00 - 20:00</option>
                <option value="20:00">20:00 - 21:00</option>
                <option value="21:00">21:00 - 22:00</option>
                <option value="22:00">22:00 - 23:00</option>
                <option value="23:00">23:00 - 00:00</option>
              </SelectField>
            </div>

            {/* T&C + Continue to payment */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={tcAccepted} onChange={(e) => setTcAccepted(e.target.checked)} className="w-5 h-5 accent-[#3754ED] flex-shrink-0 mt-0.5 rounded" />
                <span className="text-xs text-[#010D50] leading-relaxed">
                  By checking this box, I acknowledge that passenger information matches the passport or
                  official ID for travel, and that name changes are not allowed. I confirm that I have reviewed
                  the hotel itinerary and agree to the Refund &amp; Cancellation Policy. I understand tickets are
                  non-transferable and non-changeable unless stated otherwise. I accept full responsibility for
                  valid travel documentation and understand Globehunters cannot be held responsible for denied
                  boarding due to passport or visa validity.
                </span>
              </label>
              {formErrors.tc && <p className="text-xs text-red-600">{formErrors.tc}</p>}
              {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</div>}

              <div className="flex justify-end">
                <button
                  onClick={handleConfirm}
                  disabled={submitting || !tcAccepted}
                  className="bg-[#3754ED] hover:bg-[#2A3FB8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-3 rounded-full flex items-center gap-1 transition-colors"
                >
                  {submitting ? "Confirming…" : "Continue to payment"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <HotelCheckoutSidebar
            webRef={webRefNumber}
            phoneNumber={affiliatePhone}
            changeSelectionHref={hotelDetailsBackUrl}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}
