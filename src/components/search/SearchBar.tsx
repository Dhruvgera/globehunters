"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchForm } from "@/hooks/useSearchForm";
import { TripTypeSelector } from "./search-bar/TripTypeSelector";
import { PassengersSelector } from "./search-bar/PassengersSelector";
import { AirportAutocomplete } from "./search-bar/AirportAutocomplete";
import { HotelLocationAutocomplete } from "./search-bar/HotelLocationAutocomplete";
import { PackageDestinationAutocomplete } from "./search-bar/PackageDestinationAutocomplete";
import { PackageOriginAutocomplete } from "./search-bar/PackageOriginAutocomplete";
import { SwapLocationsButton } from "./search-bar/SwapLocationsButton";
import { DateSelector } from "./search-bar/DateSelector";
import { SearchButton } from "./search-bar/SearchButton";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, X, Building2, ChevronDown, Minus, Plane, Plus as PlusIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import type { VyspaCityHotelLookupItem } from "@/types/vyspaHotels";
import { useBookingStore } from "@/store/bookingStore";
import {
  buildHotelChildAgesFromFlat,
  flattenHotelChildAges,
  serializeHotelChildAges,
} from "@/lib/hotels/childAges";
import type { HolidayDestination } from "@/types/holidayPackage";

export interface PackageSearchFormData {
  from: { code: string; name: string; city: string; country: string; countryCode: string } | null;
  destination: HolidayDestination | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  childAges: number[];
}

interface SearchBarProps {
  compact?: boolean;
  /**
   * When true, renders only the inner content (no outer card).
   * Useful when the page provides its own container (e.g. hotel search header frame).
   */
  embedded?: boolean;
  /** Pre-select product tab on mount */
  defaultProduct?: "flight" | "hotel" | "package";
  /** When provided, called instead of navigating for package searches */
  onPackageSearch?: (data: PackageSearchFormData) => void;
}

type Product = "flight" | "hotel" | "package";

function isSamePackageDestination(
  current: HolidayDestination | null,
  next: HolidayDestination | null
) {
  if (!current && !next) return true;
  if (!current || !next) return false;

  return (
    String(current.id) === String(next.id) &&
    current.name === next.name &&
    (current.hiddenvalue || "") === (next.hiddenvalue || "") &&
    (current.airportcode || "") === (next.airportcode || "")
  );
}

function isSameHotelLocation(
  current: VyspaCityHotelLookupItem | null,
  next: VyspaCityHotelLookupItem | null
) {
  if (!current && !next) return true;
  if (!current || !next) return false;

  return (
    Number(current.id) === Number(next.id) &&
    current.label === next.label &&
    String(current.loc || "") === String(next.loc || "") &&
    (current.arrival_point_code || "") === (next.arrival_point_code || "")
  );
}

function ProductTab({
  active,
  onClick,
  icon,
  label,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2 border text-[#010D50]",
        "bg-gradient-to-b from-[#F5F7FF] to-white",
        compact ? "rounded-xl px-3 py-2" : "rounded-xl px-4 py-2.5",
        active ? "border-[#3754ED]" : "border-[#DFE0E4]",
      ].join(" ")}
    >
      <span className="shrink-0">{icon}</span>
      <span className={compact ? "text-sm font-medium leading-[1.21]" : "text-sm font-medium leading-[1.21]"}>
        {label}
      </span>
    </button>
  );
}

export default function SearchBar({ compact = false, embedded = false, defaultProduct, onPackageSearch }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();

  const productFromUrl: Product = useMemo(() => {
    if (defaultProduct) return defaultProduct;
    if (pathname?.startsWith("/hotels")) {
      const typeParam = urlParams.get("type");
      if (typeParam === "package") {
        return "package";
      }
      return "hotel";
    }
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname.startsWith("package")) return "package";
      if (hostname.startsWith("flight")) return "flight";
      if (hostname.startsWith("hotel")) return "hotel";
    }
    return "flight";
  }, [pathname, urlParams, defaultProduct]);

  // Animated, in-place switching between flight/hotel forms.
  // We still navigate on search, but tab switches don't hard-navigate.
  const [activeProduct, setActiveProduct] = useState<Product>(productFromUrl);
  useEffect(() => {
    setActiveProduct(productFromUrl);
  }, [productFromUrl]);

  const [hotelLocationItem, setHotelLocationItem] = useState<VyspaCityHotelLookupItem | null>(null);
  const [packageDestinationItem, setPackageDestinationItem] = useState<HolidayDestination | null>(null);
  const [hotelStartDate, setHotelStartDate] = useState<Date | undefined>(undefined);
  const [hotelEndDate, setHotelEndDate] = useState<Date | undefined>(undefined);
  const [hotelGuests, setHotelGuests] = useState(2);
  const [hotelChildren, setHotelChildren] = useState(0);
  const [hotelRooms, setHotelRooms] = useState(1);
  const [hotelChildAges, setHotelChildAges] = useState<number[]>([]);
  const [isHotelDatesOpen, setIsHotelDatesOpen] = useState(false);
  const [isHotelGuestsOpen, setIsHotelGuestsOpen] = useState(false);
  const [openMultiCityDateIndex, setOpenMultiCityDateIndex] = useState<number | null>(null);

  const savedHotelLocation = useBookingStore((s) => s.hotelLocationSelection);
  const setHotelLocationSelection = useBookingStore((s) => s.setHotelLocationSelection);
  const savedHotelSearch = useBookingStore((s) => s.hotelSearch);
  const savedPackageDestination = useBookingStore((s) => s.packageDestination);
  const setPackageDestination = useBookingStore((s) => s.setPackageDestination);
  const savedPackageSearch = useBookingStore((s) => s.packageSearch);

  useEffect(() => {
    setHotelChildAges((prev) => {
      const childCount = Math.max(0, hotelChildren);
      const next = Array.from({ length: childCount }, (_, index) => {
        const age = prev[index];
        return Number.isFinite(age) ? age : 9;
      });
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [hotelChildren]);

  const {
    tripType,
    from,
    to,
    departureDate,
    returnDate,
    passengers,
    travelClass,
    isDatePickerOpen,
    multiCitySegments,
    setTripType,
    setFrom,
    setTo,
    setDepartureDate,
    setReturnDate,
    setPassengers,
    setTravelClass,
    setIsDatePickerOpen,
    swapLocations,
    addMultiCitySegment,
    removeMultiCitySegment,
    updateMultiCitySegment,
    getSearchParams,
  } = useSearchForm();

  const hotelLocationItemRef = useRef<VyspaCityHotelLookupItem | null>(hotelLocationItem);
  const packageDestinationItemRef = useRef<HolidayDestination | null>(packageDestinationItem);
  const fromRef = useRef(from);

  useEffect(() => {
    hotelLocationItemRef.current = hotelLocationItem;
  }, [hotelLocationItem]);

  useEffect(() => {
    packageDestinationItemRef.current = packageDestinationItem;
  }, [packageDestinationItem]);

  useEffect(() => {
    fromRef.current = from;
  }, [from]);

  // Hydrate hotel location selection from URL (preferred) or store (like flights).
  useEffect(() => {
    const urlLocation = urlParams.get("location");
    const hid = urlParams.get("hidden_id");
    const hkey = urlParams.get("hidden_key");
    const apc = urlParams.get("arrival_point_code");
    const isPackageHotelsPage = pathname?.startsWith("/hotels") && urlParams.get("type") === "package";

    if (isPackageHotelsPage && urlLocation && hid && hkey && hkey.includes(";")) {
      const nextPackageDestination = {
        id: String(hid),
        name: urlLocation,
        country_name: "",
        airportcode: hkey.split(";")[0] || "",
        featured_image: "",
        hiddenvalue: hkey,
      } satisfies HolidayDestination;

      if (!isSamePackageDestination(packageDestinationItemRef.current, nextPackageDestination)) {
        setPackageDestinationItem(nextPackageDestination);
      }
    } else if (!packageDestinationItemRef.current && savedPackageDestination) {
      setPackageDestinationItem((current) =>
        isSamePackageDestination(current, savedPackageDestination) ? current : savedPackageDestination
      );
    }

    if (pathname?.startsWith("/hotels") && urlLocation && hid && hkey && !hkey.includes(";")) {
      const nextHotelLocation = {
        id: Number(hid),
        label: urlLocation,
        loc: hkey,
        arrival_point_code: apc || undefined,
      } as VyspaCityHotelLookupItem;

      if (!isSameHotelLocation(hotelLocationItemRef.current, nextHotelLocation)) {
        setHotelLocationItem(nextHotelLocation);
      }
    } else if (!hotelLocationItemRef.current) {
      if (savedHotelLocation) {
        setHotelLocationItem((current) =>
          isSameHotelLocation(current, savedHotelLocation) ? current : savedHotelLocation
        );
      } else if (savedHotelSearch?.location && savedHotelSearch?.hidden_id && savedHotelSearch?.hidden_key) {
        const nextHotelLocation = {
          id: Number(savedHotelSearch.hidden_id),
          label: savedHotelSearch.location,
          loc: savedHotelSearch.hidden_key,
          arrival_point_code: savedHotelSearch.arrivalPointCode,
        } as VyspaCityHotelLookupItem;

        setHotelLocationItem((current) =>
          isSameHotelLocation(current, nextHotelLocation) ? current : nextHotelLocation
        );
      }
    }

    if (pathname?.startsWith("/hotels")) {
      const urlFromCode = urlParams.get("fromCode");
      const fromCode = urlFromCode || savedPackageSearch?.departureCode || "";
      const fromLabel = urlParams.get("from") || savedPackageSearch?.departureName || "";
      if (urlParams.get("type") === "package" && fromCode && (!fromRef.current || urlFromCode)) {
        setFrom({
          code: fromCode,
          name: fromLabel || fromCode,
          city: fromLabel || fromCode,
          country: "",
          countryCode: "",
        });
      }
    }

    if (savedHotelSearch) {
      const inStr = urlParams.get("checkIn") || savedHotelSearch.checkIn || "";
      const outStr = urlParams.get("checkOut") || savedHotelSearch.checkOut || "";
      const adults = Number(urlParams.get("adults") || savedHotelSearch.adults || "") || undefined;
      const children = Number(urlParams.get("children") || savedHotelSearch.children || "") || 0;
      const rms = Number(urlParams.get("rooms") || savedHotelSearch.rooms || "") || undefined;
      const childAgeParam = urlParams.get("child_age");

      if (inStr) {
        const d = new Date(inStr);
        if (!Number.isNaN(d.getTime())) setHotelStartDate(d);
      }
      if (outStr) {
        const d = new Date(outStr);
        if (!Number.isNaN(d.getTime())) setHotelEndDate(d);
      }
      if (adults) setHotelGuests(adults);
      setHotelChildren(Math.max(0, Number(children) || 0));
      if (rms) setHotelRooms(rms);
      setHotelChildAges(
        flattenHotelChildAges(
          childAgeParam ?? savedHotelSearch.child_age ?? [],
          Math.max(1, Number(rms) || savedHotelSearch.rooms || 1),
          Math.max(0, Number(children) || 0)
        )
      );
    }
  }, [pathname, savedHotelLocation, savedHotelSearch, savedPackageDestination, savedPackageSearch, setFrom, urlParams]);

  const setProduct = (next: Product) => {
    setActiveProduct(next);
  };

  // Validation: Check if all required fields are filled
  const isSearchValid = () => {
    if (tripType === "multi-city") {
      const filledSegments = multiCitySegments.filter(
        (seg) => seg.from && seg.to && seg.departureDate
      );
      if (filledSegments.length < 2) return false;
      return filledSegments.every(
        (seg) => seg.from && seg.to && seg.departureDate
      );
    }
    return (
      from !== null &&         // Origin selected
      to !== null &&           // Destination selected
      departureDate !== undefined && // Departure date selected
      (tripType === 'one-way' || returnDate !== undefined) // Return date if round-trip
    );
  };

  const isPackageSearchValid = useMemo(() => {
    return (
      from !== null &&
      packageDestinationItem !== null &&
      hotelStartDate !== undefined &&
      hotelEndDate !== undefined
    );
  }, [from, hotelEndDate, hotelStartDate, packageDestinationItem]);

  const handleSearch = async () => {
    const effectiveProduct: Product =
      pathname?.startsWith("/hotels") && urlParams.get("type") === "package"
        ? "package"
        : activeProduct;

    if (effectiveProduct === "package") {
      if (!isPackageSearchValid) {
        return;
      }
      // Flight+Hotel packages: navigate to /hotels?type=package with query params
      const loc = packageDestinationItem?.name?.trim() || "London";
      const checkIn = hotelStartDate ? format(hotelStartDate, "yyyy-MM-dd") : "";
      const checkOut = hotelEndDate ? format(hotelEndDate, "yyyy-MM-dd") : "";
      const packageHiddenValue = packageDestinationItem?.hiddenvalue || "";
      const packageHiddenId = packageDestinationItem?.id ? String(packageDestinationItem.id) : "";
      const params = new URLSearchParams();
      params.set("type", "package");
      params.set("location", loc);
      if (checkIn) params.set("checkIn", checkIn);
      if (checkOut) params.set("checkOut", checkOut);
      params.set("adults", String(Math.max(1, hotelGuests)));
      params.set("children", String(Math.max(0, hotelChildren)));
      params.set("rooms", String(Math.max(1, hotelRooms)));
      if (hotelChildren > 0) {
        params.set(
          "child_age",
          serializeHotelChildAges(
            buildHotelChildAgesFromFlat(hotelChildAges, Math.max(1, hotelRooms), Math.max(0, hotelChildren)),
            Math.max(1, hotelRooms),
            Math.max(0, hotelChildren)
          )
        );
      }
      // Include flight origin if available
      if (from?.code) params.set("fromCode", from.code);
      if (from?.name || from?.city) params.set("from", from?.name || from?.city || "");
      if (packageHiddenId) params.set("hidden_id", packageHiddenId);
      if (packageHiddenValue) params.set("hidden_key", packageHiddenValue);
      if (onPackageSearch) {
        onPackageSearch({
          from: from ? { code: from.code, name: from.name || "", city: from.city, country: from.country || "", countryCode: from.countryCode || "" } : null,
          destination: packageDestinationItem,
          checkIn,
          checkOut,
          adults: Math.max(1, hotelGuests),
          children: Math.max(0, hotelChildren),
          rooms: Math.max(1, hotelRooms),
          childAges: [...hotelChildAges],
        });
        return;
      }
      if (packageDestinationItem) setPackageDestination(packageDestinationItem);
      router.push(`/hotels?${params.toString()}`);
      return;
    }
    if (effectiveProduct === "hotel") {
      // Hotels: navigate to /hotels with query params so results page can call Vyspa
      const loc = hotelLocationItem?.label?.trim() || "London";
      const checkIn = hotelStartDate ? format(hotelStartDate, "yyyy-MM-dd") : "";
      const checkOut = hotelEndDate ? format(hotelEndDate, "yyyy-MM-dd") : "";
      const params = new URLSearchParams();
      params.set("location", loc);
      if (checkIn) params.set("checkIn", checkIn);
      if (checkOut) params.set("checkOut", checkOut);
      params.set("adults", String(Math.max(1, hotelGuests)));
      params.set("children", String(Math.max(0, hotelChildren)));
      params.set("rooms", String(Math.max(1, hotelRooms)));
      if (hotelChildren > 0) {
        params.set(
          "child_age",
          serializeHotelChildAges(
            buildHotelChildAgesFromFlat(hotelChildAges, Math.max(1, hotelRooms), Math.max(0, hotelChildren)),
            Math.max(1, hotelRooms),
            Math.max(0, hotelChildren)
          )
        );
      }
      if (hotelLocationItem?.id != null) params.set("hidden_id", String(hotelLocationItem.id));
      if (hotelLocationItem?.loc) params.set("hidden_key", String(hotelLocationItem.loc));
      if (hotelLocationItem?.arrival_point_code) params.set("arrival_point_code", String(hotelLocationItem.arrival_point_code));
      // Persist selection for back-navigation (like flights).
      if (hotelLocationItem) setHotelLocationSelection(hotelLocationItem);
      router.push(`/hotels?${params.toString()}`);
      return;
    }
    if (!isSearchValid()) {
      return; // Don't search if validation fails
    }
    const params = new URLSearchParams(getSearchParams());
    router.push(`/search?${params.toString()}`);
  };

  const hotelDateLabel = useMemo(() => {
    if (!hotelStartDate) return "Add Date";
    if (!hotelEndDate) return format(hotelStartDate, "EEE, dd MMM yyyy");
    return `${format(hotelStartDate, "dd MMM")} - ${format(hotelEndDate, "dd MMM")}`;
  }, [hotelStartDate, hotelEndDate]);

  const hotelGuestLabel = useMemo(() => {
    const adults = Math.max(1, hotelGuests);
    const kids = Math.max(0, hotelChildren);
    const rooms = Math.max(1, hotelRooms);
    const parts = [
      `${adults} Adult${adults === 1 ? "" : "s"}`,
      ...(kids > 0 ? [`${kids} Child${kids === 1 ? "" : "ren"}`] : []),
      `${rooms} Room${rooms === 1 ? "" : "s"}`,
    ];
    return parts.join(", ");
  }, [hotelGuests, hotelChildren, hotelRooms]);

  return (
    <div className={
      embedded
        ? "w-full"
        : `w-full bg-white rounded-[32px] ${compact ? "p-3 shadow-sm" : "p-5 border border-[#E8E8EE] shadow-[0px_16px_44px_rgba(0,0,0,0.18)]"}`
    }>
      {/* Product Tabs */}
      <div className={compact ? "mb-3" : "mb-5"}>
        <div className="flex flex-wrap items-center gap-4">
          <ProductTab
            active={activeProduct === "flight"}
            onClick={() => setProduct("flight")}
            icon={<Plane className="h-4 w-4 text-[#3754ED]" />}
            label="Flight"
            compact={compact}
          />
          <ProductTab
            active={activeProduct === "hotel"}
            onClick={() => setProduct("hotel")}
            icon={<Building2 className="h-4 w-4 text-[#3754ED]" />}
            label="Hotel"
            compact={compact}
          />
          <ProductTab
            active={activeProduct === "package"}
            onClick={() => setProduct("package")}
            icon={
              <span className="flex items-center gap-1">
                <Plane className="h-4 w-4 text-[#3754ED]" />
                <Building2 className="h-4 w-4 text-[#3754ED]" />
              </span>
            }
            label="Flight + Hotels"
            compact={compact}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeProduct === "flight" ? (
          <motion.div
            key="flight-form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <div className="border border-[#E8E8EE] rounded-[28px] p-4 sm:p-5">
            {/* Top Row - Trip Type (pill) */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4">
              <TripTypeSelector
                tripType={tripType}
                onTripTypeChange={setTripType}
                onRoundTripSelected={() => setIsDatePickerOpen(true)}
              />
            </div>

            {/* Main Search Row */}
            {tripType !== "multi-city" ? (
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <AirportAutocomplete value={from} onChange={setFrom} />
                <SwapLocationsButton onSwap={swapLocations} />
                <AirportAutocomplete value={to} onChange={setTo} />
                <DateSelector
                  tripType={tripType}
                  departureDate={departureDate}
                  returnDate={returnDate}
                  onDepartureDateChange={setDepartureDate}
                  onReturnDateChange={setReturnDate}
                  isOpen={isDatePickerOpen}
                  onOpenChange={setIsDatePickerOpen}
                />
                <PassengersSelector
                  passengers={passengers}
                  travelClass={travelClass}
                  onPassengersChange={setPassengers}
                  onTravelClassChange={setTravelClass}
                />
                <SearchButton onClick={handleSearch} disabled={!isSearchValid()} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {multiCitySegments.map((segment, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row items-stretch md:items-center gap-3"
                  >
                    <AirportAutocomplete
                      value={segment.from}
                      onChange={(airport) =>
                        updateMultiCitySegment(index, { from: airport })
                      }
                    />
                    <AirportAutocomplete
                      value={segment.to}
                      onChange={(airport) =>
                        updateMultiCitySegment(index, { to: airport })
                      }
                    />
                    <Popover
                      open={openMultiCityDateIndex === index}
                      onOpenChange={(open) => setOpenMultiCityDateIndex(open ? index : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 flex-1 border-[#DFE0E4] rounded-2xl px-3 py-2.5 h-auto justify-start bg-white hover:bg-white hover:border-[#3754ED] focus:border-[#3754ED] transition-colors"
                        >
                          <Calendar className="w-5 h-5 text-[#3754ED]" />
                          <span className="text-sm font-medium text-[#010D50]">
                            {segment.departureDate
                              ? format(segment.departureDate, "EEE, dd MMM yyyy")
                              : "Select date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 bg-white border shadow-lg max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)] overflow-auto overscroll-contain"
                        align="start"
                        side="bottom"
                        sideOffset={8}
                        avoidCollisions={true}
                        collisionPadding={{ top: 80, bottom: 16, left: 16, right: 16 }}
                      >
                        <DatePicker
                          startDate={segment.departureDate}
                          onStartDateChange={(date) =>
                            updateMultiCitySegment(index, { departureDate: date })
                          }
                          onDone={() => setOpenMultiCityDateIndex(null)}
                        />
                      </PopoverContent>
                    </Popover>
                    {multiCitySegments.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="md:w-10 md:h-10 w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeMultiCitySegment(index)}
                      >
                        <X className="w-4 h-4" />
                        <span className="sr-only">Remove segment</span>
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 justify-center border-dashed"
                    onClick={addMultiCitySegment}
                    disabled={multiCitySegments.length >= 6}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add flight
                  </Button>
                  <PassengersSelector
                    passengers={passengers}
                    travelClass={travelClass}
                    onPassengersChange={setPassengers}
                    onTravelClassChange={setTravelClass}
                  />
                  <SearchButton onClick={handleSearch} disabled={!isSearchValid()} />
                </div>
              </div>
            )}
          </div>
          </motion.div>
        ) : (
          <motion.div
            key="hotel-form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {activeProduct === "package" && (
            <PackageOriginAutocomplete
              value={from}
              onChange={setFrom}
              placeholder="Flying from"
            />
          )}
          {/* Location */}
          {activeProduct === "package" ? (
            <PackageDestinationAutocomplete
              value={packageDestinationItem}
              onChange={setPackageDestinationItem}
              placeholder="Find Location"
            />
          ) : (
            <HotelLocationAutocomplete
              value={hotelLocationItem}
              onChange={setHotelLocationItem}
              placeholder="Find Location"
            />
          )}

          {/* Dates */}
          <Popover open={isHotelDatesOpen} onOpenChange={setIsHotelDatesOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 flex-1 border border-[#D3D3D3] rounded-xl px-3 py-2.5 h-auto justify-start bg-white hover:border-[#3754ED] focus:border-[#3754ED] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Image
                    src="/figma/hotels/icon-calendar.svg"
                    alt=""
                    width={18}
                    height={20}
                    className="opacity-90 flex-shrink-0"
                  />
                  <span className="truncate text-sm font-medium text-[#010D50]">
                    {hotelDateLabel}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-[#010D50] ml-auto" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-white border shadow-lg max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)] overflow-auto overscroll-contain"
              align="start"
              side="bottom"
              sideOffset={8}
            >
              <DatePicker
                startDate={hotelStartDate}
                endDate={hotelEndDate}
                onStartDateChange={setHotelStartDate}
                onEndDateChange={setHotelEndDate}
                onDone={() => setIsHotelDatesOpen(false)}
              />
            </PopoverContent>
          </Popover>

          {/* Guests */}
          <Popover open={isHotelGuestsOpen} onOpenChange={setIsHotelGuestsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 flex-1 border border-[#D3D3D3] rounded-xl px-3 py-2.5 h-auto justify-start bg-white hover:border-[#3754ED] focus:border-[#3754ED] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Image
                    src="/figma/hotels/icon-person.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="opacity-90 flex-shrink-0"
                  />
                  <span className="truncate text-sm font-medium text-[#010D50]">
                    {hotelGuestLabel}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-[#010D50] ml-auto" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" align="start" side="bottom" sideOffset={8}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#010D50]">Adults</div>
                    <div className="text-xs text-[#3A478A]">Ages 18+</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setHotelGuests((g) => Math.max(1, g - 1))}
                      className="h-9 w-9 rounded-full"
                    >
                      <Minus />
                    </Button>
                    <div className="w-8 text-center text-sm font-semibold text-[#010D50]">
                      {hotelGuests}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setHotelGuests((g) => Math.min(16, g + 1))}
                      className="h-9 w-9 rounded-full"
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#010D50]">Children</div>
                    <div className="text-xs text-[#3A478A]">Ages 0–17</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setHotelChildren((c) => Math.max(0, c - 1))}
                      className="h-9 w-9 rounded-full"
                    >
                      <Minus />
                    </Button>
                    <div className="w-8 text-center text-sm font-semibold text-[#010D50]">
                      {hotelChildren}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setHotelChildren((c) => Math.min(16, c + 1))}
                      className="h-9 w-9 rounded-full"
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                </div>

                {hotelChildren > 0 && (
                  <div className="rounded-xl border border-[#DFE0E4] p-3">
                    <div className="text-sm font-semibold text-[#010D50] mb-3">Child ages</div>
                    <div className="grid grid-cols-1 gap-3">
                      {Array.from({ length: hotelChildren }, (_, index) => (
                        <label key={`hotel-child-age-${index}`} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-[#010D50]">Child {index + 1}</span>
                          <select
                            value={hotelChildAges[index] ?? 9}
                            onChange={(e) =>
                              setHotelChildAges((prev) =>
                                prev.map((age, ageIndex) => (ageIndex === index ? Number(e.target.value) : age))
                              )
                            }
                            className="h-10 min-w-[110px] rounded-lg border border-[#DFE0E4] px-3 text-sm text-[#010D50] outline-none focus:border-[#3754ED] bg-white"
                          >
                            {Array.from({ length: 18 }, (_, age) => (
                              <option key={age} value={age}>
                                {age} years
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#010D50]">Rooms</div>
                    <div className="text-xs text-[#3A478A]">Number of rooms</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setHotelRooms((r) => Math.max(1, r - 1))}
                      className="h-9 w-9 rounded-full"
                    >
                      <Minus />
                    </Button>
                    <div className="w-8 text-center text-sm font-semibold text-[#010D50]">
                      {hotelRooms}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setHotelRooms((r) => Math.min(8, r + 1))}
                      className="h-9 w-9 rounded-full"
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="bg-[#3754ED] hover:bg-[#2942D1] text-white rounded-lg"
                    onClick={() => setIsHotelGuestsOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            onClick={handleSearch}
            disabled={activeProduct === "package" ? !isPackageSearchValid : false}
            className="rounded-xl px-5 py-2.5 h-auto gap-2 text-sm font-medium w-full md:w-auto bg-[#3754ED] hover:bg-[#2A3FB8] text-white"
          >
            Search
          </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
