import { shiftIsoDateByDays } from "@/lib/utils/dateFormat";

interface HotelSearchParams {
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
  adults?: number;
  children?: number;
  branches?: string;
}

interface PackageSearchParams {
  destinationName?: string;
  destinationHiddenValue?: string;
  destinationCode?: string;
  departureCode?: string;
  departureName?: string;
  checkIn?: string;
  nights?: number;
  rooms?: Array<{ adults: number; children: number }>;
}

export function buildChangeHotelHref(
  hotelSearch: HotelSearchParams | null | undefined,
  packageSearch: PackageSearchParams | null | undefined,
  fallbackCheckOutFromNights = false,
): string {
  const params = new URLSearchParams();
  params.set("type", "package");
  if (packageSearch?.destinationName) params.set("location", packageSearch.destinationName);
  if (packageSearch?.destinationHiddenValue)
    params.set("hidden_key", packageSearch.destinationHiddenValue);
  if (packageSearch?.destinationCode) params.set("hidden_id", packageSearch.destinationCode);
  if (packageSearch?.departureCode) params.set("fromCode", packageSearch.departureCode);
  if (packageSearch?.departureName) params.set("from", packageSearch.departureName);

  const checkIn = hotelSearch?.checkIn || packageSearch?.checkIn || "";
  let checkOut = hotelSearch?.checkOut || "";
  if (!checkOut && fallbackCheckOutFromNights && checkIn && packageSearch?.nights) {
    checkOut = shiftIsoDateByDays(checkIn, packageSearch.nights);
  }
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);

  const rooms = hotelSearch?.rooms || packageSearch?.rooms?.length || 1;
  const adults =
    hotelSearch?.adults || packageSearch?.rooms?.reduce((s, r) => s + r.adults, 0) || 2;
  const children =
    hotelSearch?.children || packageSearch?.rooms?.reduce((s, r) => s + r.children, 0) || 0;
  params.set("rooms", String(rooms));
  params.set("adults", String(adults));
  params.set("children", String(children));
  if (hotelSearch?.branches) params.set("branches", hotelSearch.branches);
  return `/hotels?${params.toString()}`;
}
