"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import SearchBar from "@/components/search/SearchBar";
import { PackageDestinationAutocomplete } from "@/components/search/search-bar/PackageDestinationAutocomplete";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { FlightSummaryCard, type FlightLeg } from "@/components/booking/FlightSummaryCard";
import { HotelFiltersSidebar, type HotelAmenityOption, type HotelFiltersState } from "@/components/hotels/HotelFiltersSidebar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { activityService } from "@/services/api/activityService";
import { flightService } from "@/services/api/flightService";
import { hotelService } from "@/services/api/hotelService";
import { useBookingStore } from "@/store/bookingStore";
import type { ActivityProduct } from "@/types/activities";
import type { Flight } from "@/types/flight";
import type { Hotel } from "@/types/hotel";
import type { SearchParams } from "@/types/flight";
import type { HolidayDestination } from "@/types/holidayPackage";
import type { PriceCheckResult, TransformedPriceOption } from "@/types/priceCheck";
import { calculateNights } from "@/lib/hotels/nights";
import { normalizeCabinClass } from "@/lib/utils";
import {
  DEFAULT_FILTERS,
  includesBreakfast,
  mapAvailability,
  mealPlanKey,
  normalizeNeighborhoodValue,
  shortWebRefFromToken,
  VYSPA_SEARCH_TIMEOUT_SEC,
} from "@/app/hotels/hotelUtils";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  Coffee,
  MessageCircle,
  Dumbbell,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  SendHorizontal,
  Sparkles,
  Star,
  Trash2,
  Utensils,
  Users,
  Waves,
  Wifi,
} from "lucide-react";

type ChainedDestination = {
  id: string;
  name: string;
  checkIn: string;
  checkOut: string;
  airportCode?: string;
  hiddenId?: string;
  hiddenKey?: string;
  fromCode?: string;
  fromName?: string;
};

type PackageDestinationSegment = ChainedDestination & {
  airportCode: string;
  hiddenId?: string;
  hiddenKey?: string;
};

type DestinationLiveState = {
  hotel: Hotel | null;
  hotelLoading?: boolean;
  hotelError?: string | null;
  hotelOptions: Hotel[];
  hotelSearch?: ReturnType<typeof useBookingStore.getState>["hotelSearch"];
  activitiesKey?: string;
  activities: ActivityProduct[];
  selectedActivityCodes: string[];
  activitiesError?: string | null;
  activitiesLoading?: boolean;
};

type LiveSearchState = {
  flight: Flight | null;
  flightRequestId: string | null;
  flightLoading: boolean;
  flightError: string | null;
  hotel: Hotel | null;
  hotelLoading: boolean;
  hotelError: string | null;
};

const AI_PACKAGE_CACHE_KEY = "aiPackageLiveSearchCache";
const AI_PACKAGE_SELECTION_PATCH_KEY = "aiPackageSelectionPatch";
const AI_PACKAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_PACKAGE_CACHE_VERSION = 8;
const HOTEL_CHANGE_PAGE_SIZE = 20;

type AiPackageLiveCache = {
  paramsKey: string;
  version?: number;
  expiresAt: number;
  flight: Flight | null;
  flightRequestId: string | null;
  hotel: Hotel | null;
  hotelOptions?: Hotel[];
  hotelSearch?: ReturnType<typeof useBookingStore.getState>["hotelSearch"];
  activitiesKey?: string;
  activities?: ActivityProduct[];
  selectedActivityCodes?: string[];
};

type RichHotelRoom = {
  name: string;
  board?: string;
  price?: number;
  currency?: string;
  refundable?: boolean | null;
  inclusions?: string[];
};

type RichHotelDetails = {
  description: string;
  amenities: string[];
  images: string[];
  coordinates: { lat: number; lng: number } | null;
  address: string;
  rooms: RichHotelRoom[];
  sourceLabel: string;
};

type HotelChangeSortMode = "recommended" | "price_low" | "review_score";

type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HotelRecommendationContext = {
  stayPreference: string;
  budget: number;
  destinationCount: number;
};

type TripDayEntry = {
  date: string;
  activity: ActivityProduct | null;
};

function textValue(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function numberValue(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "string" ? Number(value.replace(/[^\d.-]/g, "")) : Number(value);
  return Number.isFinite(num) ? num : null;
}

function rawRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function collectTextByKeys(value: unknown, keys: string[], limit = 8): string[] {
  const out = new Set<string>();
  const seen = new Set<unknown>();
  const wanted = new Set(keys.map((key) => key.toLowerCase()));

  const walk = (node: unknown, keyHint = "") => {
    if (out.size >= limit || node == null) return;
    if (typeof node === "string" || typeof node === "number") {
      if (wanted.has(keyHint.toLowerCase())) {
        const text = textValue(node);
        if (text.length > 2) out.add(text);
      }
      return;
    }
    if (typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry, keyHint);
      return;
    }
    for (const [key, entry] of Object.entries(node as Record<string, unknown>)) {
      walk(entry, key);
    }
  };

  walk(value);
  return Array.from(out);
}

function collectImageUrls(value: unknown, limit = 8): string[] {
  const out = new Set<string>();
  const seen = new Set<unknown>();
  const walk = (node: unknown) => {
    if (out.size >= limit || node == null) return;
    if (typeof node === "string") {
      const trimmed = node.trim();
      if (/^https?:\/\//i.test(trimmed) && /\.(jpe?g|png|webp)(\?|$)/i.test(trimmed)) out.add(trimmed);
      return;
    }
    if (typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    for (const entry of Object.values(node as Record<string, unknown>)) walk(entry);
  };
  walk(value);
  return Array.from(out);
}

function extractCoordinates(value: unknown): { lat: number; lng: number } | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown): { lat: number; lng: number } | null => {
    const record = rawRecord(node);
    if (!record || seen.has(node)) return null;
    seen.add(node);
    const lat = numberValue(record.lat ?? record.latitude ?? record.Latitude ?? record.geo_loc_latitude);
    const lng = numberValue(record.lng ?? record.lon ?? record.longitude ?? record.Longitude ?? record.geo_loc_longitude);
    if (lat != null && lng != null && lat !== 0 && lng !== 0) return { lat, lng };
    for (const entry of Object.values(record)) {
      if (Array.isArray(entry)) {
        for (const item of entry) {
          const found = walk(item);
          if (found) return found;
        }
      } else {
        const found = walk(entry);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(value);
}

function collectRooms(value: unknown, limit = 8): RichHotelRoom[] {
  const rooms: RichHotelRoom[] = [];
  const seen = new Set<unknown>();
  const seenRoomKeys = new Set<string>();
  const toTitleCase = (input: string) =>
    input
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => (word.length <= 3 && /^[a-z0-9]+$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(" ");
  const sanitizeRoomLabel = (input: string) => {
    const cleaned = textValue(input)
      .replace(/\*+/g, "")
      .replace(/\bnon[\s-]*refundable rate\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return cleaned ? toTitleCase(cleaned) : "";
  };
  const sanitizeInclusion = (input: string) => {
    const cleaned = textValue(input).replace(/\*+/g, "").replace(/\s{2,}/g, " ").trim();
    if (!cleaned) return "";
    if (/^non[\s-]*refundable$/i.test(cleaned)) return "";
    if (/^non[\s-]*refundable rate$/i.test(cleaned)) return "";
    return toTitleCase(cleaned);
  };
  const addRoom = (record: Record<string, unknown>) => {
    const name = sanitizeRoomLabel(
      textValue(record.roomName ?? record.RoomName ?? record.room_name ?? record.name ?? record.Name ?? record.description ?? record.room_type)
    );
    if (!name) return;
    const board = sanitizeInclusion(
      textValue(record.boardName ?? record.BoardName ?? record.mealPlan ?? record.meal_name ?? record.MealPlan ?? record.board)
    );
    const price = numberValue(record.total ?? record.Total ?? record.price ?? record.amount ?? record.net ?? record.net_price ?? record.cust_tot_sell_amt);
    const currency = textValue(record.currency ?? record.Currency ?? record.SellCur ?? record.sell_currency_code ?? record.currency_code);
    const refundableRaw = record.refundable ?? record.isRefundable;
    const nonRef = record.nonRef;
    const inclusions = uniqueStrings(
      [
        sanitizeInclusion(textValue(record.bedType ?? record.bed_type ?? record.bedding)),
        sanitizeInclusion(textValue(record.roomSize ?? record.room_size ?? record.size)),
        sanitizeInclusion(textValue(record.roomView ?? record.room_view ?? record.view)),
        sanitizeInclusion(textValue(record.rateDescription ?? record.rate_description)),
        ...collectTextByKeys(
          record,
          ["bedType", "bed_type", "bedding", "roomSize", "room_size", "roomView", "room_view", "facility", "facilities", "feature", "features"],
          12
        ).map(sanitizeInclusion),
      ].filter(Boolean),
      6
    );
    const refundable =
      typeof refundableRaw === "boolean"
        ? refundableRaw
        : nonRef != null
          ? Number(nonRef) === 0
          : null;
    const key = `${name.toLowerCase()}|${board.toLowerCase()}|${price || ""}|${currency}`;
    if (seenRoomKeys.has(key)) return;
    seenRoomKeys.add(key);
    rooms.push({
      name,
      board: board || undefined,
      price: price || undefined,
      currency: currency || undefined,
      refundable,
      inclusions: inclusions.length > 0 ? inclusions : undefined,
    });
  };
  const walk = (node: unknown) => {
    if (rooms.length >= limit || node == null || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    const record = node as Record<string, unknown>;
    if (
      record.roomName ||
      record.RoomName ||
      record.room_name ||
      record.room_type ||
      record.boardName ||
      record.BoardName ||
      record.meal_name ||
      record.cust_tot_sell_amt
    ) addRoom(record);
    for (const entry of Object.values(record)) walk(entry);
  };
  walk(value);
  return rooms;
}

function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatIsoDate(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBeforeDateOnly(date: Date, minDate: Date) {
  const dateOnly = new Date(date);
  const minOnly = new Date(minDate);
  dateOnly.setHours(0, 0, 0, 0);
  minOnly.setHours(0, 0, 0, 0);
  return dateOnly.getTime() < minOnly.getTime();
}

function AmenityIcon({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const Icon =
    lower.includes("wifi") || lower.includes("internet")
      ? Wifi
      : lower.includes("breakfast") || lower.includes("coffee")
        ? Coffee
        : lower.includes("gym") || lower.includes("fitness")
          ? Dumbbell
          : lower.includes("restaurant") || lower.includes("dining") || lower.includes("bar")
            ? Utensils
            : lower.includes("beach") || lower.includes("pool") || lower.includes("spa")
              ? Waves
              : lower.includes("airport") || lower.includes("shuttle") || lower.includes("parking")
                ? Car
                : CheckCircle2;
  return <Icon className="h-4 w-4 flex-shrink-0 text-[#3754ED]" />;
}

function isRealHotelImageUrl(value: string | undefined | null): value is string {
  const text = String(value || "").trim();
  if (!text) return false;
  if (text.includes("/hotel-placeholder")) return false;
  if (text.includes("/figma/")) return false;
  return /^https?:\/\//i.test(text) || text.startsWith("/");
}

function firstRealImage(values: Array<string | undefined | null>): string | undefined {
  return values.find(isRealHotelImageUrl);
}

function hotelImageKey(value: string | undefined | null) {
  const src = String(value || "").trim().toLowerCase();
  if (!src) return "";
  try {
    const url = new URL(src, "https://local.invalid");
    return `${url.origin}${url.pathname}`;
  } catch {
    return src.split("?")[0] || src;
  }
}

async function fetchPropertyContentImage(hotel: Hotel) {
  const raw = rawRecord(hotel.rawSearchResult);
  const code = numberValue(raw?.hotel_id ?? raw?.hotelId ?? hotel.id);
  if (!code || code <= 0) return null;
  const response = await fetch(`/api/hotels/content?code=${encodeURIComponent(String(code))}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) return null;
  return firstRealImage([data.imageUrl, ...(Array.isArray(data.hotelImages) ? data.hotelImages : [])]) || null;
}

async function fetchSelectedHotelImage(
  hotel: Hotel,
  hotelSearch?: ReturnType<typeof useBookingStore.getState>["hotelSearch"]
) {
  const contentImage = await fetchPropertyContentImage(hotel).catch(() => null);
  if (contentImage) return contentImage;

  const raw = rawRecord(hotel.rawSearchResult);
  const rawCriteriaId = raw?.searchCriteriaId ?? hotelSearch?.searchCriteriaId;
  const criteriaId =
    typeof rawCriteriaId === "string" || typeof rawCriteriaId === "number" ? rawCriteriaId : undefined;
  const srId = textValue(raw?.id ?? raw?.srId);
  const roomHotelId = textValue(raw?.hotel_id ?? raw?.hotelId ?? hotel.id);
  const numericHotelId = numberValue(raw?.hotel_id ?? raw?.hotelId ?? hotel.id);
  const vMapId = numberValue(raw?.VmapId ?? raw?.vMapId);
  const detailPayload =
    numericHotelId && numericHotelId > 0
      ? [numericHotelId]
      : vMapId && vMapId > 0
        ? [0, { vMapId }]
        : null;
  if (!criteriaId && !detailPayload) return null;

  const settled = await Promise.allSettled([
    detailPayload ? hotelService.hotelSearchDetails(detailPayload) : Promise.resolve(null),
    criteriaId ? hotelService.getRoomsV3(criteriaId, roomHotelId || hotel.id, srId || undefined) : Promise.resolve(null),
  ]);
  const payloads = settled.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []));
  return firstRealImage(collectImageUrls(payloads, 12)) || null;
}

function normalizedPlaceName(value: string | undefined | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hotelPlaceText(hotel: Hotel | null | undefined) {
  if (!hotel) return "";
  return normalizedPlaceName([hotel.name, hotel.distanceLabel, hotel.neighborhood, hotel.cityName, hotel.countryName].filter(Boolean).join(" "));
}

function stampHotelsForSegment(hotels: Hotel[], segment: PackageDestinationSegment, locationLabel?: string) {
  const cityName = locationLabel || segment.name;
  return hotels.map((hotel) => ({
    ...hotel,
    cityName: hotel.cityName || cityName,
    checkInDate: segment.checkIn || hotel.checkInDate,
    checkOutDate: segment.checkOut || hotel.checkOutDate,
  }));
}

function hotelMatchesSegment(hotel: Hotel | null | undefined, segment: PackageDestinationSegment, allSegments: PackageDestinationSegment[] = []) {
  if (!hotel) return false;
  const hasHotelDates = Boolean(hotel.checkInDate || hotel.checkOutDate);
  if (hasHotelDates && (hotel.checkInDate !== segment.checkIn || hotel.checkOutDate !== segment.checkOut)) return false;
  const text = hotelPlaceText(hotel);
  if (!text) return true;
  const target = normalizedPlaceName(segment.name);
  if (target && text.includes(target)) return true;
  const conflictsWithAnotherDestination = allSegments.some((candidate) => {
    if (candidate.id === segment.id) return false;
    const candidateName = normalizedPlaceName(candidate.name);
    return Boolean(candidateName && text.includes(candidateName));
  });
  if (conflictsWithAnotherDestination) return false;
  return allSegments.length <= 1;
}

function hotelOptionsMatchSegment(hotels: Hotel[] | undefined, segment: PackageDestinationSegment, allSegments: PackageDestinationSegment[] = []) {
  return (hotels || []).filter((hotel) => hotelMatchesSegment(hotel, segment, allSegments));
}

function hotelRecommendationScore(hotel: Hotel, context: HotelRecommendationContext) {
  const preference = context.stayPreference.toLowerCase();
  const total = hotel.price?.total || 0;
  const raw =
    hotel.rawSearchResult && typeof hotel.rawSearchResult === "object" && !Array.isArray(hotel.rawSearchResult)
      ? (hotel.rawSearchResult as Record<string, unknown>)
      : null;
  const provider = String(raw?.provider || "").trim().toLowerCase();
  const luxuryMode = preference.includes("best") || preference.includes("luxury");
  const valueMode = preference.includes("budget") || preference.includes("value") || preference.includes("econom");
  const hotelBudgetShare = luxuryMode ? 0.76 : valueMode ? 0.45 : 0.58;
  const perDestinationBudget =
    context.budget > 0 ? (context.budget * hotelBudgetShare) / Math.max(1, context.destinationCount || 1) : 0;
  const rating = hotel.starRating || 0;
  const reviewScore = hotel.reviews?.score || 0;
  const amenitiesCount = (hotel.amenities || []).length;
  const hasBreakfast = includesBreakfast(hotel.mealPlans || []) ? 1 : 0;
  const isOverBudget = perDestinationBudget > 0 && total > perDestinationBudget;
  const overBudgetPenalty = isOverBudget ? ((total - perDestinationBudget) / Math.max(perDestinationBudget, 1)) * 1800 : 0;
  const providerFitPremium = provider === "vyspa" ? 1400 : provider === "hotelbeds" ? 0 : 300;

  if (luxuryMode) {
    const targetGapPenalty = perDestinationBudget > 0 ? Math.abs(total - perDestinationBudget) * 0.42 : 0;
    return rating * 1050 + reviewScore * 85 + amenitiesCount * 10 + hasBreakfast * 70 + providerFitPremium - targetGapPenalty - overBudgetPenalty * 1.4;
  }

  const budgetUseRatio = perDestinationBudget > 0 ? Math.min(total / perDestinationBudget, 1.15) : 0;
  const budgetFitPremium = perDestinationBudget > 0 ? budgetUseRatio * (valueMode ? 250 : 850) : 0;

  if (valueMode) {
    return rating * 350 + reviewScore * 70 + amenitiesCount * 8 + hasBreakfast * 80 + budgetFitPremium + providerFitPremium - total * 1.2 - overBudgetPenalty;
  }

  return rating * 700 + reviewScore * 80 + amenitiesCount * 10 + hasBreakfast * 70 + budgetFitPremium + providerFitPremium - total * 0.25 - overBudgetPenalty;
}

function sortHotelsByRecommendation(hotels: Hotel[], context: HotelRecommendationContext) {
  return [...hotels].sort((a, b) => {
    const scoreDelta = hotelRecommendationScore(b, context) - hotelRecommendationScore(a, context);
    if (Math.abs(scoreDelta) > 0.01) return scoreDelta;
    return (a.price?.total || 0) - (b.price?.total || 0);
  });
}

function selectRecommendedHotel(hotels: Hotel[], context: HotelRecommendationContext) {
  if (hotels.length === 0) return null;
  return sortHotelsByRecommendation(hotels, context)[0] || hotels[0];
}

function withSearchTimeout<T>(promise: Promise<T>, label: string, timeoutSeconds = VYSPA_SEARCH_TIMEOUT_SEC + 10): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`${label} did not finish within ${timeoutSeconds} seconds.`)), timeoutSeconds * 1000);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function uniqueStrings(values: Array<string | undefined | null>, limit = 24): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const text = textValue(value);
    if (text) out.add(text);
    if (out.size >= limit) break;
  }
  return Array.from(out);
}

function compactFlightForSession(flight: Flight | null): Flight | null {
  if (!flight) return null;
  return JSON.parse(
    JSON.stringify(flight, (key, value) => {
      if (["raw", "_raw", "rawResponse", "rawSearchResult", "debug", "priceCheckData"].includes(key)) return undefined;
      return value;
    })
  ) as Flight;
}

function compactHotelForSession(hotel: Hotel | null): Hotel | null {
  if (!hotel) return null;
  const raw =
    hotel.rawSearchResult && typeof hotel.rawSearchResult === "object" && !Array.isArray(hotel.rawSearchResult)
      ? (hotel.rawSearchResult as Record<string, unknown>)
      : null;

  return {
    id: hotel.id,
    name: hotel.name,
    imageSrc: hotel.imageSrc,
    starRating: hotel.starRating,
    distanceLabel: hotel.distanceLabel,
    neighborhood: hotel.neighborhood,
    price: hotel.price,
    room: hotel.room,
    reviews: hotel.reviews,
    amenities: hotel.amenities?.slice(0, 8) || [],
    cityName: hotel.cityName,
    countryName: hotel.countryName,
    checkInDate: hotel.checkInDate,
    checkOutDate: hotel.checkOutDate,
    tyId: hotel.tyId,
    rawSearchResult: raw
      ? {
          id: raw.id,
          srId: raw.srId,
          hotel_id: raw.hotel_id,
          hotelId: raw.hotelId,
          VmapId: raw.VmapId,
          vMapId: raw.vMapId,
          searchCriteriaId: raw.searchCriteriaId,
          provider: raw.provider,
          address1: raw.address1,
          address2: raw.address2,
          cityName: raw.cityName,
          city_name: raw.city_name,
          countryName: raw.countryName,
          country_name: raw.country_name,
          latitude: raw.latitude,
          longitude: raw.longitude,
          geo_loc_latitude: raw.geo_loc_latitude,
          geo_loc_longitude: raw.geo_loc_longitude,
          suppliers: raw.suppliers,
          _hotelbeds: rawRecord(raw._hotelbeds)
            ? {
                cheapest: rawRecord((raw._hotelbeds as Record<string, unknown>).cheapest)
                  ? (raw._hotelbeds as Record<string, unknown>).cheapest
                  : undefined,
                searchToken: (raw._hotelbeds as Record<string, unknown>).searchToken,
              }
            : undefined,
        }
      : undefined,
  } as Hotel;
}

function compactHotelsForSession(hotels: Hotel[] | undefined): Hotel[] {
  return (hotels || []).slice(0, 24).map((hotel) => compactHotelForSession(hotel)).filter(Boolean) as Hotel[];
}

function compactActivitiesForSession(activities: ActivityProduct[] | undefined): ActivityProduct[] {
  return (activities || []).slice(0, 12).map((activity) => ({
    productCode: activity.productCode,
    title: activity.title,
    imageUrl: activity.imageUrl,
    price: activity.price,
    currency: activity.currency,
    duration: activity.duration,
    rating: activity.rating,
    reviewCount: activity.reviewCount,
    description: activity.description,
    flags: activity.flags || [],
    webUrl: activity.webUrl,
  }));
}

function readAiPackageLiveCache(paramsKey: string): AiPackageLiveCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AI_PACKAGE_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AiPackageLiveCache) : null;
    if (!parsed || parsed.version !== AI_PACKAGE_CACHE_VERSION || parsed.paramsKey !== paramsKey || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAiPackageLiveCache(cache: Omit<AiPackageLiveCache, "expiresAt">) {
  if (typeof window === "undefined") return;
  const current = readAiPackageLiveCache(cache.paramsKey);
  const next: AiPackageLiveCache = {
    ...(current || {}),
    ...cache,
    version: AI_PACKAGE_CACHE_VERSION,
    flight: compactFlightForSession(cache.flight ?? current?.flight ?? null),
    flightRequestId: cache.flightRequestId ?? current?.flightRequestId ?? null,
    hotel: compactHotelForSession(cache.hotel ?? current?.hotel ?? null),
    hotelOptions: compactHotelsForSession(cache.hotelOptions ?? current?.hotelOptions),
    hotelSearch: cache.hotelSearch ?? current?.hotelSearch,
    activitiesKey: cache.activitiesKey ?? current?.activitiesKey,
    activities: compactActivitiesForSession(cache.activities ?? current?.activities),
    selectedActivityCodes: cache.selectedActivityCodes ?? current?.selectedActivityCodes,
    expiresAt: Date.now() + AI_PACKAGE_CACHE_TTL_MS,
  };

  try {
    window.sessionStorage.setItem(AI_PACKAGE_CACHE_KEY, JSON.stringify(next));
  } catch (error) {
    if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      const fallback: AiPackageLiveCache = {
        paramsKey: next.paramsKey,
        version: AI_PACKAGE_CACHE_VERSION,
        expiresAt: next.expiresAt,
        flight: next.flight,
        flightRequestId: next.flightRequestId,
        hotel: next.hotel,
        hotelOptions: next.hotelOptions?.slice(0, 12) || [],
        activitiesKey: next.activitiesKey,
        activities: next.activities?.slice(0, 8) || [],
        selectedActivityCodes: next.selectedActivityCodes || [],
      };
      try {
        window.sessionStorage.setItem(AI_PACKAGE_CACHE_KEY, JSON.stringify(fallback));
      } catch {
        window.sessionStorage.removeItem(AI_PACKAGE_CACHE_KEY);
      }
      return;
    }
    throw error;
  }
}

function consumeAiSelectionPatch() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AI_PACKAGE_SELECTION_PATCH_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(AI_PACKAGE_SELECTION_PATCH_KEY);
    const parsed = JSON.parse(raw) as { type?: string; flight?: Flight; hotel?: Hotel; createdAt?: number };
    if (!parsed?.createdAt || Date.now() - parsed.createdAt > AI_PACKAGE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function shortDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function compactDateParts(value: string | null, fallbackDay = "--") {
  if (!value) return { month: "", day: fallbackDay };
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { month: "", day: fallbackDay };
  return {
    month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(date),
  };
}

function truncateWords(text: string | undefined | null, maxWords: number) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function addDaysIso(value: string | null, days: number) {
  if (!value) return "";
  const date = parseLocalDate(value, new Date());
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function money(value: number, currency = "GBP") {
  const normalizedCurrency = (() => {
    const raw = String(currency || "GBP").trim().toUpperCase();
    if (raw.charCodeAt(0) === 163) return "GBP";
    if (raw.charCodeAt(0) === 8364) return "EUR";
    if (raw === "£") return "GBP";
    if (raw === "$") return "USD";
    if (raw === "€") return "EUR";
    return /^[A-Z]{3}$/.test(raw) ? raw : "GBP";
  })();

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: 0,
  }).format(value);
}

function toTitleCase(value: string | undefined | null) {
  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length <= 3 && /^[a-z0-9]+$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
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
  return uniqueStrings(
    (highlights || [])
      .map((entry) => sanitizeRoomText(entry))
      .filter(Boolean)
      .map((entry) => toTitleCase(entry)),
    6
  );
}

function durationToMinutes(value: string | undefined | null) {
  const text = String(value || "");
  const hours = Number(text.match(/(\d+)\s*[Hh]/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*[Mm]/)?.[1] || 0);
  return hours * 60 + minutes;
}

function flightJourneyMinutes(flight: Flight) {
  const segments = flight.tripType === "multi-city" && flight.segments?.length
    ? flight.segments
    : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];
  return segments.reduce((sum, segment) => sum + durationToMinutes(segment.totalJourneyTime || segment.duration), 0);
}

function flightStopCount(flight: Flight) {
  const segments = flight.tripType === "multi-city" && flight.segments?.length
    ? flight.segments
    : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];
  return segments.reduce((sum, segment) => sum + Number(segment.stops || 0), 0);
}

function selectRecommendedFlight(flights: Flight[], context: { budget: number; stayPreference: string }) {
  if (flights.length === 0) return null;
  const preference = context.stayPreference.toLowerCase();
  const luxuryMode = preference.includes("best") || preference.includes("luxury");
  const valueMode = preference.includes("budget") || preference.includes("value") || preference.includes("econom");
  const flightBudgetShare = luxuryMode ? 0.32 : valueMode ? 0.42 : 0.36;
  const flightBudget = context.budget > 0 ? context.budget * flightBudgetShare : 0;
  return [...flights].sort((a, b) => {
    const score = (flight: Flight) => {
      const price = Number(flight.price || 0);
      const overBudgetPenalty =
        flightBudget > 0 && price > flightBudget ? ((price - flightBudget) / Math.max(flightBudget, 1)) * 1600 : 0;
      const budgetFitPremium = flightBudget > 0 ? Math.min(price / flightBudget, 1.1) * (luxuryMode ? 700 : 120) : 0;
      const durationPenalty = flightJourneyMinutes(flight) * (luxuryMode ? 0.35 : 0.18);
      const stopPenalty = flightStopCount(flight) * (luxuryMode ? 220 : 120);
      const pricePenalty = valueMode ? price * 1.1 : price * 0.35;
      return budgetFitPremium - overBudgetPenalty - durationPenalty - stopPenalty - pricePenalty;
    };
    const scoreDelta = score(b) - score(a);
    if (Math.abs(scoreDelta) > 0.01) return scoreDelta;
    return (a.price || 0) - (b.price || 0);
  })[0];
}

function destinationAirportCodeFromParams(params: { get(name: string): string | null }) {
  const explicitCode = params.get("arrival_point_code") || params.get("to") || "";
  const hiddenKeyCode = (params.get("hidden_key") || "").split(";")[0] || "";
  const hiddenIdCode = params.get("hidden_id") || "";
  const candidates = [explicitCode, hiddenKeyCode, hiddenIdCode];
  return candidates.find((candidate) => /^[A-Z]{3}$/i.test(candidate))?.toUpperCase() || explicitCode;
}

function flightWithUpgrade(flight: Flight, option: TransformedPriceOption): Flight {
  const cabinClass = option.cabinClassDisplay || option.cabinName || option.cabinClass || "Economy";
  return {
    ...flight,
    price: option.totalPrice || flight.price,
    pricePerPerson: option.pricePerPerson || flight.pricePerPerson,
    currency: option.currency || flight.currency,
    outbound: {
      ...flight.outbound,
      cabinClass,
      segmentBaggage: option.baggage?.description || flight.outbound.segmentBaggage,
    },
    inbound: flight.inbound
      ? {
          ...flight.inbound,
          cabinClass,
          segmentBaggage: option.baggage?.description || flight.inbound.segmentBaggage,
        }
      : undefined,
    segments: flight.segments?.map((segment) => ({
      ...segment,
      cabinClass,
      segmentBaggage: option.baggage?.description || segment.segmentBaggage,
    })),
  };
}

function buildPackageFlightHref(params: URLSearchParams, aiReturnHref?: string, chainedFlightSearch?: SearchParams | null) {
  if (chainedFlightSearch?.tripType === "multi-city" && chainedFlightSearch.segments?.length) {
    const flightParams = new URLSearchParams();
    const first = chainedFlightSearch.segments[0];
    flightParams.set("from", first.from);
    flightParams.set("to", first.to);
    flightParams.set("departureDate", formatIsoDate(first.departureDate));
    flightParams.set("tripType", "multi-city");
    flightParams.set("adults", String(chainedFlightSearch.passengers.adults));
    flightParams.set("children", String(chainedFlightSearch.passengers.children));
    flightParams.set("infants", String(chainedFlightSearch.passengers.infants || 0));
    chainedFlightSearch.segments.forEach((segment, index) => {
      const position = index + 1;
      flightParams.set(`from${position}`, segment.from);
      flightParams.set(`to${position}`, segment.to);
      flightParams.set(`departureDate${position}`, formatIsoDate(segment.departureDate));
    });
    if (aiReturnHref) flightParams.set("aiReturn", aiReturnHref);
    return `/search?${flightParams.toString()}`;
  }

  const hotelId = params.get("hotelId") || params.get("pkgHotelId");
  const flightResultId = params.get("flightResultId") || params.get("flightId") || "";
  const destinationCode = destinationAirportCodeFromParams(params);

  if (!hotelId) {
    const flightParams = new URLSearchParams();
    const fromCode = params.get("fromCode") || params.get("from") || "";
    if (fromCode) flightParams.set("from", fromCode);
    if (destinationCode) flightParams.set("to", destinationCode);
    if (params.get("checkIn")) flightParams.set("departureDate", params.get("checkIn") || "");
    if (params.get("checkOut")) flightParams.set("returnDate", params.get("checkOut") || "");
    flightParams.set("adults", params.get("adults") || "1");
    flightParams.set("children", params.get("children") || "0");
    flightParams.set("infants", params.get("infants") || "0");
    flightParams.set("tripType", "round-trip");
    if (aiReturnHref) flightParams.set("aiReturn", aiReturnHref);
    return `/search?${flightParams.toString()}`;
  }

  const next = new URLSearchParams(params.toString());
  next.set("type", "package");
  next.set("hotelId", hotelId);
  if (flightResultId) next.set("flightResultId", flightResultId);
  if (aiReturnHref) next.set("aiReturn", aiReturnHref);
  return `/search?${next.toString()}`;
}

function TripStepper() {
  const steps = ["Package Summary", "Choose your flight", "Traveler details", "Payment details", "Confirmation"];

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#3A478A]">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-3">
          <span className={index === 0 ? "text-[#3754ED]" : "text-[#3A478A]"}>
            {index === 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {step}
              </span>
            ) : (
              step
            )}
          </span>
          {index < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-[#8A91B4]" />}
        </div>
      ))}
    </div>
  );
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
    cabinClass: normalizeCabinClass(segment.cabinClass || "Economy"),
  };
}

function SummaryTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#DFE0E4] bg-white px-3 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#3A478A]">
        {icon}
        {label}
      </div>
      <div className="truncate text-sm font-semibold text-[#010D50]">{value}</div>
    </div>
  );
}

function parseLocalDate(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return new Date(year, month - 1, day);
}

function buildChainedFlightSearch(params: {
  originCode: string;
  originName: string;
  adults: number;
  children: number;
  infants: number;
  destinations: PackageDestinationSegment[];
}): SearchParams | null {
  const validDestinations = params.destinations.filter((segment) => segment.airportCode && segment.checkIn && segment.checkOut);
  if (validDestinations.length === 0) return null;

  const flightSegments = validDestinations.map((segment, index) => ({
    from: index === 0 ? params.originCode : validDestinations[index - 1]!.airportCode,
    to: segment.airportCode,
    departureDate: parseLocalDate(segment.checkIn, new Date()),
  }));
  const lastDestination = validDestinations[validDestinations.length - 1]!;
  flightSegments.push({
    from: lastDestination.airportCode,
    to: params.originCode,
    departureDate: parseLocalDate(lastDestination.checkOut, new Date()),
  });

  return {
    from: params.originCode,
    to: validDestinations[0]!.airportCode,
    departureDate: flightSegments[0]!.departureDate,
    passengers: {
      adults: params.adults,
      children: params.children,
      infants: params.infants,
    },
    class: "Economy",
    tripType: flightSegments.length > 2 ? "multi-city" : "round-trip",
    returnDate: flightSegments.length === 2 ? flightSegments[1]!.departureDate : undefined,
    segments: flightSegments.length > 2 ? flightSegments : undefined,
  };
}

function ActivityRow({
  activity,
  selected,
  itineraryLabel,
  onToggle,
  onDetails,
}: {
  activity: ActivityProduct;
  selected: boolean;
  itineraryLabel: string;
  onToggle: () => void;
  onDetails: () => void;
}) {
  return (
    <div
      className={[
        "grid w-full grid-cols-[74px_1fr_auto] items-center gap-3 rounded-xl border p-2 text-left transition-colors",
        selected ? "border-[#3754ED] bg-[#F5F7FF]" : "border-[#DFE0E4] bg-white hover:border-[#B8C2FF]",
      ].join(" ")}
    >
      <div className="h-[58px] overflow-hidden rounded-lg bg-[#F5F7FF]">
        {activity.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activity.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[#010D50]">{activity.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#3A478A]">
          {activity.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {activity.duration}
            </span>
          )}
          <span>{itineraryLabel}</span>
          {activity.rating && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]" />
              {activity.rating.toFixed(1)}
            </span>
          )}
        </div>
        <button type="button" onClick={onDetails} className="mt-1 text-xs font-medium text-[#3754ED]">
          View details
        </button>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-[#010D50]">
          {activity.price ? money(activity.price, activity.currency || "GBP") : "View"}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 rounded-full border border-[#DFE0E4] px-3 py-1 text-[11px] font-semibold text-[#3754ED] hover:border-[#3754ED]"
        >
          {selected ? "Remove" : "Add"}
        </button>
      </div>
    </div>
  );
}

function AiPackageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const destination = params.get("location") || "Tokyo";
  const fromCode = params.get("fromCode") || "DXB";
  const fromName = params.get("from") || "Dubai Emirate";
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  const adults = Number(params.get("adults") || "2") || 2;
  const children = Number(params.get("children") || "0") || 0;
  const rooms = Number(params.get("rooms") || "1") || 1;
  const lookingFor = params.get("lookingFor") || "A bit of everything";
  const stayPreference = params.get("stayPreference") || "At only the best";
  const budget = Number(params.get("budget") || "0") || 0;
  const paramsKey = params.toString();
  const toParam = params.get("to") || "";
  const hiddenIdParam = params.get("hidden_id") || "";
  const hiddenKeyParam = params.get("hidden_key") || "";
  const branchesParam = params.get("branches") || "UK";
  const infants = Number(params.get("infants") || "0") || 0;
  const primarySearchKey = [
    destination,
    fromCode,
    fromName,
    hiddenIdParam,
    hiddenKeyParam,
    checkIn || "",
    checkOut || "",
    adults,
    children,
    rooms,
    budget,
    lookingFor,
    stayPreference,
  ].join("|");
  const destinationCode = destinationAirportCodeFromParams(params);
  const [activities, setActivities] = useState<ActivityProduct[]>([]);
  const [selectedActivityCodes, setSelectedActivityCodes] = useState<string[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState("");
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [aiBriefError, setAiBriefError] = useState<string | null>(null);
  const [aiActivityNotes, setAiActivityNotes] = useState<Record<string, string>>({});
  const [aiChatMessages, setAiChatMessages] = useState<AiChatMessage[]>([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);
  const aiChatScrollRef = useRef<HTMLDivElement | null>(null);
  const [hotelOptions, setHotelOptions] = useState<Hotel[]>([]);
  const [destinationStateById, setDestinationStateById] = useState<Record<string, DestinationLiveState>>({});
  const destinationStateByIdRef = useRef<Record<string, DestinationLiveState>>({});
  const [activeDestinationIndex, setActiveDestinationIndex] = useState(0);
  const [liveSearch, setLiveSearch] = useState<LiveSearchState>({
    flight: null,
    flightRequestId: null,
    flightLoading: true,
    flightError: null,
    hotel: null,
    hotelLoading: true,
    hotelError: null,
  });
  const [activityQuery, setActivityQuery] = useState(lookingFor);
  const [selectedActivityDetails, setSelectedActivityDetails] = useState<ActivityProduct | null>(null);
  const [hotelDetailsOpen, setHotelDetailsOpen] = useState(false);
  const [hotelDetails, setHotelDetails] = useState<RichHotelDetails | null>(null);
  const [hotelDetailsLoading, setHotelDetailsLoading] = useState(false);
  const [hotelDetailsError, setHotelDetailsError] = useState<string | null>(null);
  const [hotelChangeOpen, setHotelChangeOpen] = useState(false);
  const [visibleHotelOptionCount, setVisibleHotelOptionCount] = useState(HOTEL_CHANGE_PAGE_SIZE);
  const [hotelFilters, setHotelFilters] = useState<HotelFiltersState>({ ...DEFAULT_FILTERS, priceMode: "total" });
  const [hotelFiltersExpanded, setHotelFiltersExpanded] = useState<Record<string, boolean>>({
    price: true,
    stars: true,
    amenities: true,
    mealPlans: true,
  });
  const [hotelSortMode, setHotelSortMode] = useState<HotelChangeSortMode>("recommended");
  const [expandedHotelRoomsId, setExpandedHotelRoomsId] = useState<string | null>(null);
  const [roomOptionsByHotelId, setRoomOptionsByHotelId] = useState<Record<string, RichHotelRoom[]>>({});
  const [roomOptionsLoadingByHotelId, setRoomOptionsLoadingByHotelId] = useState<Record<string, boolean>>({});
  const [roomOptionsErrorByHotelId, setRoomOptionsErrorByHotelId] = useState<Record<string, string | null>>({});
  const [hotelImageLoadingById, setHotelImageLoadingById] = useState<Record<string, boolean>>({});
  const [hotelImageFailedById, setHotelImageFailedById] = useState<Record<string, boolean>>({});
  const imageEnrichmentAttemptedRef = useRef<Set<string>>(new Set());
  const destinationHydrationAttemptedRef = useRef<Set<string>>(new Set());
  const [flightInfoOpen, setFlightInfoOpen] = useState(false);
  const [addDestinationOpen, setAddDestinationOpen] = useState(false);
  const [addDestinationLoading, setAddDestinationLoading] = useState(false);
  const [addDestinationError, setAddDestinationError] = useState<string | null>(null);
  const [newDestination, setNewDestination] = useState<HolidayDestination | null>(null);
  const [newDestinationCheckIn, setNewDestinationCheckIn] = useState(checkOut || checkIn || "");
  const [newDestinationCheckOut, setNewDestinationCheckOut] = useState("");
  const [chainedDestinations, setChainedDestinations] = useState<ChainedDestination[]>(() => {
    const raw = params.get("destinations");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as ChainedDestination[];
      return Array.isArray(parsed) ? parsed.filter((item) => item?.name) : [];
    } catch {
      return [];
    }
  });

  destinationStateByIdRef.current = destinationStateById;
  const aiReturnHref = useMemo(() => `/packages/ai?${paramsKey}`, [paramsKey]);
  const setStoreSearchParams = useBookingStore((state) => state.setSearchParams);
  const setSearchRequestId = useBookingStore((state) => state.setSearchRequestId);
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const setHotelSearch = useBookingStore((state) => state.setHotelSearch);
  const setHotelResultsMeta = useBookingStore((state) => state.setHotelResultsMeta);
  const storeHotelSearch = useBookingStore((state) => state.hotelSearch);
  const primaryDestinationId = useMemo(() => `primary:${destinationCode || destination}:${checkIn || ""}:${checkOut || ""}`, [checkIn, checkOut, destination, destinationCode]);
  const destinationSegments = useMemo<PackageDestinationSegment[]>(() => {
    const primaryAirport = destinationCode || toParam || "";
    const primary: PackageDestinationSegment = {
      id: primaryDestinationId,
      name: destination,
      checkIn: checkIn || "",
      checkOut: checkOut || "",
      airportCode: primaryAirport,
      hiddenId: hiddenIdParam || undefined,
      hiddenKey: hiddenKeyParam || undefined,
      fromCode,
      fromName,
    };
    return [
      primary,
      ...chainedDestinations.map((item) => ({
        ...item,
        airportCode: item.airportCode || "",
      })),
    ];
  }, [chainedDestinations, checkIn, checkOut, destination, destinationCode, fromCode, fromName, hiddenIdParam, hiddenKeyParam, primaryDestinationId, toParam]);
  const chainedFlightSearchParams = useMemo(
    () =>
      destinationSegments.length > 1
        ? buildChainedFlightSearch({
            originCode: fromCode,
            originName: fromName,
            adults,
            children,
            infants,
            destinations: destinationSegments,
          })
        : null,
    [adults, children, destinationSegments, fromCode, fromName, infants]
  );
  const flightChangeHref = useMemo(
    () => buildPackageFlightHref(new URLSearchParams(paramsKey), aiReturnHref, chainedFlightSearchParams),
    [aiReturnHref, chainedFlightSearchParams, paramsKey]
  );
  const activeDestination = destinationSegments[Math.min(activeDestinationIndex, Math.max(0, destinationSegments.length - 1))] || destinationSegments[0];
  const activeDestinationId = activeDestination?.id || primaryDestinationId;
  const activeActivitiesKey = useMemo(
    () =>
      [
        activeDestinationId,
        activeDestination?.name || destination,
        activeDestination?.checkIn || checkIn || "",
        activeDestination?.checkOut || checkOut || "",
        adults,
        children,
        activityQuery,
      ].join("|"),
    [activeDestination?.checkIn, activeDestination?.checkOut, activeDestination?.name, activeDestinationId, activityQuery, adults, checkIn, checkOut, children, destination]
  );

  useEffect(() => {
    imageEnrichmentAttemptedRef.current.clear();
    destinationHydrationAttemptedRef.current.clear();
    setHotelOptions([]);
    setDestinationStateById({});
    setHotelImageLoadingById({});
  }, [primarySearchKey]);

  const persistVisibleDestinationState = useCallback((destinationId = activeDestinationId) => {
    const segment = destinationSegments.find((item) => item.id === destinationId) || activeDestination;
    const segmentHotel = segment && hotelMatchesSegment(liveSearch.hotel, segment, destinationSegments) ? liveSearch.hotel : null;
    setDestinationStateById((current) => ({
      ...current,
      [destinationId]: {
        hotel: segmentHotel,
        hotelLoading: destinationId === activeDestinationId ? liveSearch.hotelLoading && !segmentHotel : false,
        hotelError: destinationId === activeDestinationId ? liveSearch.hotelError : null,
        hotelOptions,
        hotelSearch: storeHotelSearch,
        activitiesKey: activeActivitiesKey,
        activities,
        selectedActivityCodes,
        activitiesError,
        activitiesLoading,
      },
    }));
  }, [activeActivitiesKey, activeDestination, activeDestinationId, activities, activitiesError, activitiesLoading, destinationSegments, hotelOptions, liveSearch.hotel, liveSearch.hotelError, liveSearch.hotelLoading, selectedActivityCodes, storeHotelSearch]);

  const showDestinationState = useCallback((index: number) => {
    const nextSegment = destinationSegments[index];
    if (!nextSegment) return;
    persistVisibleDestinationState(activeDestinationId);
    const nextState = destinationStateByIdRef.current[nextSegment.id];
    const nextHotelOptions = hotelOptionsMatchSegment(nextState?.hotelOptions, nextSegment, destinationSegments);
    const nextHotel =
      nextState?.hotel && hotelMatchesSegment(nextState.hotel, nextSegment, destinationSegments)
        ? nextState.hotel
        : selectRecommendedHotel(nextHotelOptions, { stayPreference, budget, destinationCount: destinationSegments.length });
    setActiveDestinationIndex(index);
    setHotelDetailsOpen(false);
    setHotelChangeOpen(false);
    setExpandedHotelRoomsId(null);
    if (!nextHotelOptions.length) destinationHydrationAttemptedRef.current.delete(nextSegment.id);
    setHotelOptions(nextHotelOptions);
    setActivities(nextState?.activities || []);
    setSelectedActivityCodes(nextState?.selectedActivityCodes || []);
    setActivitiesError(nextState?.activitiesError || null);
    setActivitiesLoading(Boolean(nextState?.activitiesLoading));
    if (nextState?.hotelSearch) setHotelSearch(nextState.hotelSearch);
    setLiveSearch((current) => ({
      ...current,
      hotel: nextHotel,
      hotelLoading: !nextHotel && !nextHotelOptions.length,
      hotelError: null,
    }));
  }, [activeDestinationId, budget, destinationSegments, persistVisibleDestinationState, setHotelSearch, stayPreference]);

  useEffect(() => {
    let cancelled = false;
    if (!checkIn || !checkOut) {
      setLiveSearch({
        flight: null,
        flightRequestId: null,
        flightLoading: false,
        flightError: "Live flight search requires check-in and check-out dates.",
        hotel: null,
        hotelLoading: false,
        hotelError: "Live hotel search requires check-in and check-out dates.",
      });
      return () => {
        cancelled = true;
      };
    }
    const explicitTo = toParam;
    const flightTo =
      destinationCode ||
      (/^[A-Z]{3}$/i.test(explicitTo) ? explicitTo.toUpperCase() : destination.slice(0, 3).toUpperCase());
    const flightSearch: SearchParams =
      chainedFlightSearchParams || {
        from: fromCode,
        to: flightTo,
        departureDate: parseLocalDate(checkIn, new Date()),
        returnDate: parseLocalDate(checkOut, new Date()),
        passengers: {
          adults,
          children,
          infants,
        },
        class: "Economy",
        tripType: "round-trip",
      };
    flightSearch.aiBudget = budget;

    setStoreSearchParams(flightSearch);

    const cached = readAiPackageLiveCache(paramsKey);
    const patch = consumeAiSelectionPatch();
    const cachedFlightCandidate = patch?.type === "flight" && patch.flight ? patch.flight : cached?.flight || null;
    const cachedFlight =
      flightSearch.tripType === "multi-city" && cachedFlightCandidate?.tripType !== "multi-city"
        ? null
        : cachedFlightCandidate;
    const primarySegment = destinationSegments[0];
    const existingPrimaryState = primarySegment ? destinationStateByIdRef.current[primarySegment.id] : undefined;
    const existingPrimaryHotel =
      primarySegment && hotelMatchesSegment(existingPrimaryState?.hotel, primarySegment, destinationSegments)
        ? existingPrimaryState?.hotel || null
        : null;
    const existingPrimaryHotelOptions = primarySegment ? hotelOptionsMatchSegment(existingPrimaryState?.hotelOptions, primarySegment, destinationSegments) : [];
    const cachedHotelCandidate = patch?.type === "hotel" && patch.hotel ? patch.hotel : existingPrimaryHotel || cached?.hotel || null;
    const cachedHotel = primarySegment && hotelMatchesSegment(cachedHotelCandidate, primarySegment, destinationSegments) ? cachedHotelCandidate : null;
    const cachedHotelOptions = existingPrimaryHotelOptions.length
      ? existingPrimaryHotelOptions
      : primarySegment
        ? hotelOptionsMatchSegment(cached?.hotelOptions, primarySegment, destinationSegments)
        : [];
    const cachedFlightRequestId = cached?.flightRequestId || null;
    const primaryIsActive = primarySegment?.id === activeDestinationId;

    if (primaryIsActive) {
      const nextHotelSearch = existingPrimaryState?.hotelSearch || cached?.hotelSearch || null;
      if (nextHotelSearch) setHotelSearch(nextHotelSearch);
    }
    if (primaryIsActive) setHotelOptions(cachedHotelOptions);
    if (cachedFlightRequestId) setSearchRequestId(cachedFlightRequestId);
    if (cachedFlight) setSelectedFlight(cachedFlight, normalizeCabinClass(cachedFlight.outbound?.cabinClass));

    if (cachedFlight || cachedHotel) {
      setLiveSearch((current) => ({
        ...current,
        flight: cachedFlight,
        hotel: primaryIsActive ? cachedHotel : current.hotel,
        flightRequestId: cachedFlightRequestId,
        flightLoading: !cachedFlight,
        hotelLoading: primaryIsActive ? !cachedHotel : current.hotelLoading,
        flightError: cachedFlight ? null : current.flightError,
        hotelError: primaryIsActive && cachedHotel ? null : current.hotelError,
      }));
    } else {
      setLiveSearch((current) => ({
        ...current,
        flight: null,
        hotel: primaryIsActive ? null : current.hotel,
        flightLoading: true,
        hotelLoading: primaryIsActive ? true : current.hotelLoading,
        flightError: null,
        hotelError: primaryIsActive ? null : current.hotelError,
      }));
    }

    if (cachedFlight && cachedHotel) {
      writeAiPackageLiveCache({
        paramsKey,
        flight: cachedFlight,
        flightRequestId: cachedFlightRequestId,
        hotel: cachedHotel,
        hotelOptions: cachedHotelOptions,
        hotelSearch: cached?.hotelSearch,
      });
      return () => {
        cancelled = true;
      };
    }

    const loadFlights = async () => {
      if (cachedFlight) return;
      try {
        const response = await flightService.searchFlights(flightSearch);
        if (cancelled) return;
        const firstFlight = selectRecommendedFlight(response.flights, { budget, stayPreference });
        setLiveSearch((current) => ({
          ...current,
          flight: firstFlight,
          flightRequestId: response.requestId || null,
          flightLoading: false,
          flightError: firstFlight ? null : "No live flights returned for this search.",
        }));
        if (response.requestId) setSearchRequestId(response.requestId);
        if (firstFlight) setSelectedFlight(firstFlight, normalizeCabinClass(firstFlight.outbound?.cabinClass));
        writeAiPackageLiveCache({
          paramsKey,
          flight: firstFlight,
          flightRequestId: response.requestId || cachedFlightRequestId,
          hotel: cachedHotel,
          hotelOptions: cachedHotelOptions,
          hotelSearch: cached?.hotelSearch,
        });
      } catch (error) {
        if (!cancelled) {
          setLiveSearch((current) => ({
            ...current,
            flight: null,
            flightLoading: false,
            flightError: error instanceof Error ? error.message : "Failed to load live flights.",
          }));
        }
      }
    };

    const loadHotels = async () => {
      if (cachedHotel) return;
      try {
        const hiddenId = hiddenIdParam;
        const hiddenKey = hiddenKeyParam;
        const pick:
          | { id: string | number; label: string; loc: string; arrival_point_code?: string }
          | null =
          hiddenId && hiddenKey
            ? { id: hiddenId, label: destination, loc: hiddenKey, arrival_point_code: destinationCode || undefined }
            : null;
        const lookup = pick ? [] : await hotelService.lookupCities(destination);
        const resolvedPick = pick || lookup.find((item) => String(item.loc).toLowerCase() === "city") || lookup[0];

        if (!resolvedPick?.id || !resolvedPick?.label || !resolvedPick?.loc) {
          throw new Error("No matching live hotel destination was found.");
        }

        const availability = await withSearchTimeout(
          hotelService.searchAvailabilityV3({
            location: resolvedPick.label,
            hidden_id: String(resolvedPick.id),
            hidden_key: String(resolvedPick.loc),
            checkIn,
            checkOut,
            rooms,
            adults,
            children,
            branches: branchesParam,
            timeout: VYSPA_SEARCH_TIMEOUT_SEC,
            includeFeesInTotal: true,
          }),
          `Live hotels for ${resolvedPick.label || destination}`
        );
        if (cancelled) return;

        const nights = calculateNights(checkIn, checkOut) || 1;
        const parsed = mapAvailability(availability, nights, rooms);
        const stampedHotels = primarySegment
          ? stampHotelsForSegment(parsed.mapped, primarySegment, resolvedPick.label || destination)
          : parsed.mapped;
        const recommendedHotel = selectRecommendedHotel(stampedHotels, {
          stayPreference,
          budget,
          destinationCount: destinationSegments.length,
        });
        setDestinationStateById((current) => ({
          ...current,
          [primarySegment.id]: {
            ...(current[primarySegment.id] || {
              activities: [],
              selectedActivityCodes: [],
            }),
            hotel: recommendedHotel,
            hotelLoading: false,
            hotelError: recommendedHotel ? null : "No live hotels returned for this search.",
            hotelOptions: stampedHotels,
            hotelSearch: undefined,
          },
        }));
        if (primaryIsActive) {
          setHotelOptions(stampedHotels);
          setLiveSearch((current) => ({
            ...current,
            hotel: recommendedHotel,
            hotelLoading: false,
            hotelError: recommendedHotel ? null : "No live hotels returned for this search.",
          }));
        }
        setHotelResultsMeta(parsed.meta);
        const nextHotelSearch = {
          provider:
            parsed.criteriaProvider === "hotelbeds" || typeof parsed.criteriaId === "string"
              ? "hotelbeds"
              : "vyspa",
          location: resolvedPick.label,
          hidden_id: String(resolvedPick.id),
          hidden_key: String(resolvedPick.loc),
          checkIn,
          checkOut,
          rooms,
          adults,
          children,
          branches: branchesParam,
          searchCriteriaId:
            typeof parsed.criteriaId === "string" || typeof parsed.criteriaId === "number"
              ? parsed.criteriaId
              : undefined,
          arrivalPointCode: "arrival_point_code" in resolvedPick ? resolvedPick.arrival_point_code : destinationCode || undefined,
        } as const;
        setDestinationStateById((current) => ({
          ...current,
          [primarySegment.id]: {
            ...(current[primarySegment.id] || {
              hotel: recommendedHotel,
              hotelOptions: stampedHotels,
              activities: [],
              selectedActivityCodes: [],
            }),
            hotelSearch: nextHotelSearch,
          },
        }));
        if (primaryIsActive) setHotelSearch(nextHotelSearch);
        if (parsed.criteriaId) {
          setSearchRequestId(
            typeof parsed.criteriaId === "string" ? shortWebRefFromToken(parsed.criteriaId) : String(parsed.criteriaId)
          );
        }
        writeAiPackageLiveCache({
          paramsKey,
          flight: cachedFlight,
          flightRequestId: cachedFlightRequestId,
          hotel: recommendedHotel,
          hotelOptions: stampedHotels,
          hotelSearch: nextHotelSearch,
        });
      } catch (error) {
        if (!cancelled) {
          setLiveSearch((current) => ({
            ...current,
            hotel: null,
            hotelLoading: false,
            hotelError: error instanceof Error ? error.message : "Failed to load live hotels.",
          }));
        }
      }
    };

    void Promise.allSettled([loadFlights(), loadHotels()]);

    return () => {
      cancelled = true;
    };
  }, [
    activeDestinationId,
    adults,
    checkIn,
    checkOut,
    children,
    chainedFlightSearchParams,
    branchesParam,
    budget,
    destination,
    destinationCode,
    destinationSegments,
    fromCode,
    hiddenIdParam,
    hiddenKeyParam,
    infants,
    paramsKey,
    rooms,
    stayPreference,
    setHotelResultsMeta,
    setHotelSearch,
    setSearchRequestId,
    setSelectedFlight,
    setStoreSearchParams,
    toParam,
  ]);

  useEffect(() => {
    if (destinationSegments.length <= 1) return;
    let cancelled = false;
    const segmentsToHydrate = destinationSegments
      .slice(1)
      .filter((segment) => !destinationStateByIdRef.current[segment.id]?.hotelOptions.length && !destinationHydrationAttemptedRef.current.has(segment.id));

    if (segmentsToHydrate.length === 0) return;

    for (const segment of segmentsToHydrate) {
      destinationHydrationAttemptedRef.current.add(segment.id);
      setDestinationStateById((current) => ({
        ...current,
        [segment.id]: {
          ...(current[segment.id] || {
            hotel: null,
            hotelError: null,
            hotelOptions: [],
            activities: [],
            selectedActivityCodes: [],
          }),
          hotelLoading: true,
          activitiesLoading: true,
        },
      }));

      void (async () => {
        const [hotelResult, activityResult] = await Promise.allSettled([
          (async () => {
            const hiddenId = segment.hiddenId;
            const hiddenKey = segment.hiddenKey;
            const lookup = hiddenId && hiddenKey ? [] : await hotelService.lookupCities(segment.name);
            const resolvedPick =
              hiddenId && hiddenKey
                ? { id: hiddenId, label: segment.name, loc: hiddenKey, arrival_point_code: segment.airportCode || undefined }
                : lookup.find((item) => String(item.loc).toLowerCase() === "city") || lookup[0];
            if (!resolvedPick?.id || !resolvedPick?.loc) throw new Error(`No matching live hotel destination was found for ${segment.name}.`);
            const availability = await withSearchTimeout(
              hotelService.searchAvailabilityV3({
                location: resolvedPick.label || segment.name,
                hidden_id: String(resolvedPick.id),
                hidden_key: String(resolvedPick.loc),
                checkIn: segment.checkIn,
                checkOut: segment.checkOut,
                rooms,
                adults,
                children,
                branches: branchesParam,
                timeout: VYSPA_SEARCH_TIMEOUT_SEC,
                includeFeesInTotal: true,
              }),
              `Live hotels for ${resolvedPick.label || segment.name}`
            );
            const nights = calculateNights(segment.checkIn, segment.checkOut) || 1;
            const parsed = mapAvailability(availability, nights, rooms);
            const stampedHotels = stampHotelsForSegment(parsed.mapped, segment, resolvedPick.label || segment.name);
            const recommendedHotel = selectRecommendedHotel(stampedHotels, {
              stayPreference,
              budget,
              destinationCount: destinationSegments.length,
            });
            const provider: "hotelbeds" | "vyspa" =
              parsed.criteriaProvider === "hotelbeds" || typeof parsed.criteriaId === "string"
                ? "hotelbeds"
                : "vyspa";
            return {
              hotelOptions: stampedHotels,
              hotel: recommendedHotel,
              hotelSearch: {
                provider,
                location: resolvedPick.label || segment.name,
                hidden_id: String(resolvedPick.id),
                hidden_key: String(resolvedPick.loc),
                checkIn: segment.checkIn,
                checkOut: segment.checkOut,
                rooms,
                adults,
                children,
                branches: branchesParam,
                searchCriteriaId:
                  typeof parsed.criteriaId === "string" || typeof parsed.criteriaId === "number"
                    ? parsed.criteriaId
                    : undefined,
                arrivalPointCode: "arrival_point_code" in resolvedPick ? resolvedPick.arrival_point_code : segment.airportCode || undefined,
              },
            };
          })(),
          activityService.searchActivities({
            destinationName: segment.name,
            startDate: segment.checkIn || undefined,
            endDate: segment.checkOut || undefined,
            adults,
            children,
            count: 6,
            query: activityQuery,
            currency: "GBP",
          }),
        ]);

        if (cancelled) return;
        const hotelPayload = hotelResult.status === "fulfilled" ? hotelResult.value : null;
        const activityProducts = activityResult.status === "fulfilled" ? activityResult.value.products : [];
        const selectedCodes = activityProducts.slice(0, 2).map((activity) => activity.productCode);
        const activitiesKey = [segment.id, segment.name, segment.checkIn, segment.checkOut, adults, children, activityQuery].join("|");

        setDestinationStateById((current) => ({
          ...current,
          [segment.id]: {
            hotel: hotelPayload?.hotel || null,
            hotelLoading: false,
            hotelError:
              hotelResult.status === "rejected"
                ? hotelResult.reason instanceof Error
                  ? hotelResult.reason.message
                  : "Failed to load live hotels."
                : hotelPayload?.hotel
                  ? null
                  : "No live hotels returned for this search.",
            hotelOptions: hotelPayload?.hotelOptions || [],
            hotelSearch: hotelPayload?.hotelSearch,
            activitiesKey,
            activities: activityProducts,
            selectedActivityCodes: selectedCodes,
            activitiesError:
              activityResult.status === "rejected"
                ? activityResult.reason instanceof Error
                  ? activityResult.reason.message
                  : "Failed to load activities"
                : null,
            activitiesLoading: false,
          },
        }));

        if (activeDestinationId === segment.id) {
          setHotelOptions(hotelPayload?.hotelOptions || []);
          if (hotelPayload?.hotelSearch) setHotelSearch(hotelPayload.hotelSearch);
          setActivities(activityProducts);
          setSelectedActivityCodes(selectedCodes);
          setActivitiesError(
            activityResult.status === "rejected"
              ? activityResult.reason instanceof Error
                ? activityResult.reason.message
                : "Failed to load activities"
              : null
          );
          setActivitiesLoading(false);
          setLiveSearch((current) => ({
            ...current,
            hotel: hotelPayload?.hotel || null,
            hotelLoading: false,
            hotelError:
              hotelResult.status === "rejected"
                ? hotelResult.reason instanceof Error
                  ? hotelResult.reason.message
                  : "Failed to load live hotels."
                : null,
          }));
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [activeDestinationId, activityQuery, adults, branchesParam, budget, children, destinationSegments, rooms, setHotelSearch, stayPreference]);

  useEffect(() => {
    if (!hotelDetailsOpen || !liveSearch.hotel) return;

    let cancelled = false;
    const selectedHotel = liveSearch.hotel;
    const raw = rawRecord(selectedHotel.rawSearchResult);
    const address = uniqueStrings([
      raw?.address1 as string | undefined,
      raw?.address2 as string | undefined,
      raw?.cityName as string | undefined,
      raw?.city_name as string | undefined,
      raw?.countryName as string | undefined,
      raw?.country_name as string | undefined,
    ], 6).join(", ") || selectedHotel.distanceLabel;
    const seed: RichHotelDetails = {
      description: selectedHotel.description || "",
      amenities: uniqueStrings([...(selectedHotel.amenities || []), ...(selectedHotel.mealPlans || [])], 24),
      images: uniqueStrings([isRealHotelImageUrl(selectedHotel.imageSrc) ? selectedHotel.imageSrc : undefined], 6),
      coordinates: extractCoordinates(raw),
      address,
      rooms: selectedHotel.room?.name
        ? [
            {
              name: selectedHotel.room.name,
              board: selectedHotel.room.highlights?.join(" - ") || undefined,
              price: selectedHotel.price.total,
              currency: selectedHotel.price.currency,
              refundable: selectedHotel.refundable ?? null,
            },
          ]
        : [],
      sourceLabel: "Live availability result",
    };

    setHotelDetails(seed);
    setHotelDetailsError(null);

    const rawCriteriaId = raw?.searchCriteriaId ?? storeHotelSearch?.searchCriteriaId;
    const criteriaId =
      typeof rawCriteriaId === "string" || typeof rawCriteriaId === "number" ? rawCriteriaId : undefined;
    const srId = textValue(raw?.id ?? raw?.srId);
    const roomHotelId = textValue(raw?.hotel_id ?? raw?.hotelId ?? selectedHotel.id);
    const numericHotelId = numberValue(raw?.hotel_id ?? raw?.hotelId ?? selectedHotel.id);
    const vMapId = numberValue(raw?.VmapId ?? raw?.vMapId);
    const detailPayload =
      numericHotelId && numericHotelId > 0
        ? [numericHotelId]
        : vMapId && vMapId > 0
          ? [0, { vMapId }]
          : null;

    if (!criteriaId && !detailPayload) {
      setHotelDetailsLoading(false);
      return;
    }

    setHotelDetailsLoading(true);

    async function loadRichHotelDetails() {
      const requests: Promise<unknown>[] = [];
      if (criteriaId) requests.push(hotelService.getRoomsV3(criteriaId, roomHotelId || selectedHotel.id, srId || undefined));
      if (detailPayload) requests.push(hotelService.hotelSearchDetails(detailPayload));

      const settled = await Promise.allSettled(requests);
      if (cancelled) return;

      const payloads = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failures = settled.filter((result) => result.status === "rejected");
      const detailDescriptions = collectTextByKeys(
        payloads,
        ["description", "hotelDescription", "overview", "amenitiesIntro", "otherDetail", "importantInfo"],
        5
      );
      const detailAmenities = collectTextByKeys(
        payloads,
        ["amenity", "amenities", "facility", "facilities", "facilityName", "facility_name"],
        32
      );
      const detailRooms = collectRooms(payloads, 48);
      const detailImages = collectImageUrls(payloads, 10);
      const promotedImage = !isRealHotelImageUrl(selectedHotel.imageSrc) ? firstRealImage(detailImages) : undefined;
      const detailCoordinates = extractCoordinates(payloads);

      setHotelDetails({
        ...seed,
        description: detailDescriptions.length > 0 ? detailDescriptions.join("\n\n") : seed.description,
        amenities: uniqueStrings([...seed.amenities, ...detailAmenities], 32),
        images: uniqueStrings([...detailImages, ...seed.images], 10),
        coordinates: detailCoordinates || seed.coordinates,
        rooms: detailRooms.length > 0 ? detailRooms : seed.rooms,
        sourceLabel: payloads.length > 0 ? "Live hotel details and room availability" : seed.sourceLabel,
      });
      if (promotedImage) {
        setLiveSearch((current) => {
          if (!current.hotel || current.hotel.id !== selectedHotel.id) return current;
          return { ...current, hotel: { ...current.hotel, imageSrc: promotedImage } };
        });
        setHotelOptions((current) =>
          current.map((hotel) => (hotel.id === selectedHotel.id ? { ...hotel, imageSrc: promotedImage } : hotel))
        );
      }
      setHotelDetailsLoading(false);
      setHotelDetailsError(payloads.length === 0 && failures.length > 0 ? "Live hotel detail fetch failed; showing availability summary." : null);
    }

    void loadRichHotelDetails();

    return () => {
      cancelled = true;
    };
  }, [hotelDetailsOpen, liveSearch.hotel, storeHotelSearch?.searchCriteriaId]);

  useEffect(() => {
    if (!liveSearch.hotel) return;
    const shouldRetryFailedImage = hotelImageFailedById[liveSearch.hotel.id];
    if (!shouldRetryFailedImage && isRealHotelImageUrl(liveSearch.hotel.imageSrc)) return;
    let cancelled = false;
    const selectedHotel = liveSearch.hotel;

    async function enrichSelectedHotelImage() {
      const imageSrc = await fetchSelectedHotelImage(selectedHotel, storeHotelSearch).catch(() => null);
      if (cancelled || !imageSrc) return;
      setLiveSearch((current) => {
        if (!current.hotel || current.hotel.id !== selectedHotel.id) return current;
        return { ...current, hotel: { ...current.hotel, imageSrc } };
      });
      setHotelOptions((current) =>
        current.map((hotel) => (hotel.id === selectedHotel.id ? { ...hotel, imageSrc } : hotel))
      );
      setDestinationStateById((current) => {
        const state = current[activeDestinationId];
        if (!state?.hotel || state.hotel.id !== selectedHotel.id) return current;
        return {
          ...current,
          [activeDestinationId]: {
            ...state,
            hotel: { ...state.hotel, imageSrc },
            hotelOptions: state.hotelOptions.map((hotel) => (hotel.id === selectedHotel.id ? { ...hotel, imageSrc } : hotel)),
          },
        };
      });
      setHotelImageFailedById((current) => ({ ...current, [selectedHotel.id]: false }));
    }

    void enrichSelectedHotelImage();
    return () => {
      cancelled = true;
    };
  }, [activeDestinationId, hotelImageFailedById, liveSearch.hotel, storeHotelSearch]);

  useEffect(() => {
    let cancelled = false;
    const activityDestinationName = activeDestination?.name || destination;
    const activityStartDate = activeDestination?.checkIn || checkIn || "";
    const activityEndDate = activeDestination?.checkOut || checkOut || "";
    const activitiesKey = activeActivitiesKey;
    const savedDestinationState = destinationStateByIdRef.current[activeDestinationId];
    if (savedDestinationState?.activitiesKey === activitiesKey && savedDestinationState.activities.length) {
      setActivities(savedDestinationState.activities);
      setSelectedActivityCodes(savedDestinationState.selectedActivityCodes);
      setActivitiesError(savedDestinationState.activitiesError || null);
      setActivitiesLoading(false);
      return () => {
        cancelled = true;
      };
    }
    const cached = readAiPackageLiveCache(paramsKey);
    if (cached?.activitiesKey === activitiesKey && cached.activities?.length) {
      setActivities(cached.activities);
      setSelectedActivityCodes((current) =>
        current.length > 0
          ? current.filter((code) => cached.activities?.some((product) => product.productCode === code))
          : cached.selectedActivityCodes?.length
            ? cached.selectedActivityCodes
            : cached.activities!.slice(0, 2).map((product) => product.productCode)
      );
      setActivitiesLoading(false);
      setActivitiesError(null);
      return () => {
        cancelled = true;
      };
    }

    async function run() {
      setActivitiesLoading(true);
      setActivitiesError(null);
      setActivities([]);
      setSelectedActivityCodes([]);
      setDestinationStateById((current) => ({
        ...current,
        [activeDestinationId]: {
          ...(current[activeDestinationId] || {
            hotel: liveSearch.hotel,
            hotelLoading: liveSearch.hotelLoading && !liveSearch.hotel,
            hotelError: liveSearch.hotelError,
            hotelOptions,
            hotelSearch: storeHotelSearch,
          }),
          activitiesKey,
          activities: [],
          selectedActivityCodes: [],
          activitiesError: null,
          activitiesLoading: true,
        },
      }));
      try {
        const response = await activityService.searchActivities({
          destinationName: activityDestinationName,
          startDate: activityStartDate || undefined,
          endDate: activityEndDate || undefined,
          adults,
          children,
          count: 6,
          query: activityQuery,
          currency: "GBP",
        });

        if (!cancelled) {
          const defaultSelectedCodes = response.products.slice(0, 2).map((product) => product.productCode);
          setActivities(response.products);
          setSelectedActivityCodes((current) => {
            if (current.length > 0) return current.filter((code) => response.products.some((product) => product.productCode === code));
            return defaultSelectedCodes;
          });
          setDestinationStateById((current) => ({
            ...current,
            [activeDestinationId]: {
              ...(current[activeDestinationId] || {
                hotel: liveSearch.hotel,
                hotelLoading: liveSearch.hotelLoading && !liveSearch.hotel,
                hotelError: liveSearch.hotelError,
                hotelOptions,
                hotelSearch: storeHotelSearch,
              }),
              activitiesKey,
              activities: response.products,
              selectedActivityCodes: defaultSelectedCodes,
              activitiesError: null,
              activitiesLoading: false,
            },
          }));
          writeAiPackageLiveCache({
            paramsKey,
            flight: cached?.flight || liveSearch.flight,
            flightRequestId: cached?.flightRequestId || liveSearch.flightRequestId,
            hotel: cached?.hotel || liveSearch.hotel,
            hotelOptions: cached?.hotelOptions?.length ? cached.hotelOptions : hotelOptions,
            hotelSearch: cached?.hotelSearch || storeHotelSearch,
            activitiesKey,
            activities: response.products,
            selectedActivityCodes: defaultSelectedCodes,
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load activities";
          setActivitiesError(message);
          if (cached?.activitiesKey === activitiesKey && cached.activities?.length) {
            setActivities(cached.activities);
            setSelectedActivityCodes(cached.selectedActivityCodes?.length ? cached.selectedActivityCodes : cached.activities.slice(0, 2).map((product) => product.productCode));
          } else {
            setActivities([]);
            setSelectedActivityCodes([]);
          }
          setDestinationStateById((current) => ({
            ...current,
            [activeDestinationId]: {
              ...(current[activeDestinationId] || {
                hotel: liveSearch.hotel,
                hotelLoading: liveSearch.hotelLoading && !liveSearch.hotel,
                hotelError: liveSearch.hotelError,
                hotelOptions,
                hotelSearch: storeHotelSearch,
              }),
              activitiesKey,
              activities: cached?.activitiesKey === activitiesKey && cached.activities?.length ? cached.activities : [],
              selectedActivityCodes:
                cached?.activitiesKey === activitiesKey && cached.selectedActivityCodes?.length
                  ? cached.selectedActivityCodes
                  : cached?.activitiesKey === activitiesKey && cached.activities?.length
                    ? cached.activities.slice(0, 2).map((product) => product.productCode)
                    : [],
              activitiesError: message,
              activitiesLoading: false,
            },
          }));
        }
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [activeActivitiesKey, activeDestination?.checkIn, activeDestination?.checkOut, activeDestination?.name, activeDestinationId, activityQuery, adults, checkIn, checkOut, children, destination, hotelOptions, liveSearch.flight, liveSearch.flightRequestId, liveSearch.hotel, liveSearch.hotelError, liveSearch.hotelLoading, paramsKey, storeHotelSearch]);

  useEffect(() => {
    const activeMatchedHotel =
      activeDestination && hotelMatchesSegment(liveSearch.hotel, activeDestination, destinationSegments) ? liveSearch.hotel : null;
    setDestinationStateById((current) => ({
      ...current,
      [activeDestinationId]: {
        hotel: activeMatchedHotel,
        hotelLoading: liveSearch.hotelLoading && !activeMatchedHotel,
        hotelError: activeMatchedHotel ? null : liveSearch.hotelError,
        hotelOptions,
        hotelSearch: storeHotelSearch,
        activitiesKey: activeActivitiesKey,
        activities,
        selectedActivityCodes,
        activitiesError,
        activitiesLoading,
      },
    }));
  }, [activeActivitiesKey, activeDestination, activeDestinationId, activities, activitiesError, activitiesLoading, destinationSegments, hotelOptions, liveSearch.hotel, liveSearch.hotelError, liveSearch.hotelLoading, selectedActivityCodes, storeHotelSearch]);

  useEffect(() => {
    const state = destinationStateById[activeDestinationId];
    const activeCheckIn = activeDestination?.checkIn;
    const activeCheckOut = activeDestination?.checkOut;
    if (!state?.hotel || !activeCheckIn || !activeCheckOut) return;
    const liveHotelMatchesActiveDestination =
      activeDestination && hotelMatchesSegment(liveSearch.hotel, activeDestination, destinationSegments);
    if (liveHotelMatchesActiveDestination) return;
    if (!activeDestination || !hotelMatchesSegment(state.hotel, activeDestination, destinationSegments)) return;
    setHotelOptions(state.hotelOptions);
    if (state.hotelSearch) setHotelSearch(state.hotelSearch);
    setLiveSearch((current) => ({
      ...current,
      hotel: state.hotel,
      hotelLoading: false,
      hotelError: null,
    }));
  }, [
    activeDestination,
    activeDestination?.checkIn,
    activeDestination?.checkOut,
    activeDestinationId,
    destinationStateById,
    destinationSegments,
    liveSearch.hotel,
    setHotelSearch,
  ]);

  useEffect(() => {
    if (!activeDestination || !liveSearch.hotel) return;
    if (hotelMatchesSegment(liveSearch.hotel, activeDestination, destinationSegments)) return;
    const validOptions = hotelOptionsMatchSegment(hotelOptions, activeDestination, destinationSegments);
    const replacement = selectRecommendedHotel(validOptions, { stayPreference, budget, destinationCount: destinationSegments.length });
    setLiveSearch((current) => ({
      ...current,
      hotel: replacement,
      hotelLoading: !replacement,
      hotelError: replacement ? null : current.hotelError,
    }));
    if (validOptions.length !== hotelOptions.length) setHotelOptions(validOptions);
  }, [activeDestination, budget, destinationSegments, hotelOptions, liveSearch.hotel, stayPreference]);

  const itinerarySlots = useMemo(
    () => ["10:00", "14:30", "17:30", "09:30", "13:30", "18:00"],
    []
  );
  const selectedActivities = useMemo(
    () => activities.filter((activity) => selectedActivityCodes.includes(activity.productCode)),
    [activities, selectedActivityCodes]
  );
  const activeDestinationCheckIn = activeDestination?.checkIn || checkIn || formatIsoDate(new Date());
  const activeDestinationCheckOut = activeDestination?.checkOut || checkOut || activeDestinationCheckIn;
  const totalTripDays = Math.max(1, calculateNights(activeDestinationCheckIn, activeDestinationCheckOut) || 1);
  const itineraryActivities = useMemo(
    () => (selectedActivities.length > 0 ? selectedActivities : activities.slice(0, 2)).slice(0, totalTripDays),
    [activities, selectedActivities, totalTripDays]
  );
  const tripDayEntries = useMemo<TripDayEntry[]>(
    () =>
      Array.from({ length: totalTripDays }, (_, index) => ({
        date: addDaysIso(activeDestinationCheckIn, index),
        activity: itineraryActivities[index] || null,
      })),
    [activeDestinationCheckIn, itineraryActivities, totalTripDays]
  );
  const aiActivityContext = useMemo(() => {
    const selectedSet = new Set(selectedActivityCodes);
    return activities
      .map((activity, index) => ({
        productCode: activity.productCode,
        title: activity.title,
        description: activity.description,
        duration: activity.duration,
        rating: activity.rating,
        price: activity.price,
        currency: activity.currency || "GBP",
        dateLabel: `${formatDate(addDaysIso(activeDestinationCheckIn, index), `Day ${index + 1}`)} - ${itinerarySlots[index % itinerarySlots.length]}`,
        selected: selectedSet.has(activity.productCode),
      }))
      .sort((first, second) => Number(second.selected) - Number(first.selected))
      .slice(0, 12);
  }, [activeDestinationCheckIn, activities, itinerarySlots, selectedActivityCodes]);
  const aiHotelContext = useMemo(() => {
    const hotel = liveSearch.hotel;
    if (!hotel || (activeDestination && !hotelMatchesSegment(hotel, activeDestination, destinationSegments))) return null;
    return {
      name: hotel.name,
      city: hotel.cityName || activeDestination?.name || destination,
      room: hotel.room?.name,
      board: hotel.room?.highlights?.join(", "),
      checkIn: activeDestination?.checkIn || checkIn,
      checkOut: activeDestination?.checkOut || checkOut,
      price: hotel.price?.total,
      currency: hotel.price?.currency || "GBP",
      starRating: hotel.starRating,
      reviewScore: hotel.reviews?.score,
      reviewLabel: hotel.reviews?.label,
      reviewCount: hotel.reviews?.count,
      distanceLabel: hotel.distanceLabel,
      amenities: hotel.amenities,
    };
  }, [activeDestination, checkIn, checkOut, destination, destinationSegments, liveSearch.hotel]);
  const aiFlightContext = useMemo(() => {
    const flight = liveSearch.flight;
    if (!flight) return null;
    const segments = flight.tripType === "multi-city" && flight.segments?.length
      ? flight.segments
      : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])];
    const legs = segments.map((segment) => flightSegmentToSummaryLeg(flight, segment));
    return {
      airline: flight.airline?.name,
      price: flight.price,
      pricePerPerson: flight.pricePerPerson || flight.price / Math.max(1, adults + children),
      currency: flight.currency || "GBP",
      cabinClass: legs.find((leg) => leg.cabinClass)?.cabinClass,
      legs,
    };
  }, [adults, children, liveSearch.flight]);
  const aiContextKey = useMemo(
    () =>
      [
        activeDestinationId,
        activeActivitiesKey,
        selectedActivityCodes.join(","),
        aiActivityContext.map((activity) => `${activity.productCode}:${activity.dateLabel}`).join("|"),
        aiHotelContext ? `${aiHotelContext.name}:${aiHotelContext.room}:${aiHotelContext.price}` : "no-hotel",
        aiFlightContext ? `${aiFlightContext.airline}:${aiFlightContext.price}:${aiFlightContext.legs.map((leg) => `${leg.fromCode}-${leg.toCode}-${leg.date}`).join("|")}` : "no-flight",
      ].join("::"),
    [activeActivitiesKey, activeDestinationId, aiActivityContext, aiFlightContext, aiHotelContext, selectedActivityCodes]
  );
  const activeMatchedHotel =
    activeDestination && hotelMatchesSegment(liveSearch.hotel, activeDestination, destinationSegments) ? liveSearch.hotel : null;
  const effectiveDestinationStateById = useMemo(
    () => ({
      ...destinationStateById,
      [activeDestinationId]: {
        hotel: activeMatchedHotel,
        hotelLoading: liveSearch.hotelLoading && !activeMatchedHotel,
        hotelError: activeMatchedHotel ? null : liveSearch.hotelError,
        hotelOptions,
        hotelSearch: storeHotelSearch,
        activitiesKey: activeActivitiesKey,
        activities,
        selectedActivityCodes,
        activitiesError,
        activitiesLoading,
      },
    }),
    [activeActivitiesKey, activeDestinationId, activeMatchedHotel, activities, activitiesError, activitiesLoading, destinationStateById, hotelOptions, liveSearch.hotelError, liveSearch.hotelLoading, selectedActivityCodes, storeHotelSearch]
  );
  const allSelectedActivities = useMemo(
    () =>
      destinationSegments.flatMap((segment) => {
        const state = effectiveDestinationStateById[segment.id];
        if (!state) return [];
        return state.activities.filter((activity) => state.selectedActivityCodes.includes(activity.productCode));
      }),
    [destinationSegments, effectiveDestinationStateById]
  );
  const itineraryLabelFor = (index: number) => {
    const date = addDaysIso(activeDestination?.checkIn || checkIn, index);
    const dayLabel = date ? formatDate(date, `Day ${index + 1}`) : `Day ${index + 1}`;
    return `${dayLabel} - ${itinerarySlots[index % itinerarySlots.length]}`;
  };

  const activityTotal = allSelectedActivities.reduce((sum, activity) => sum + (activity.price || 0), 0);
  const destinationAddOnTotal = 0;
  const liveFlightTotal = liveSearch.flight?.price || 0;
  const destinationPricingReady = destinationSegments.every((segment) => {
    const state = effectiveDestinationStateById[segment.id];
    return Boolean(
      state &&
        state.activitiesLoading !== true &&
        state.hotelLoading !== true &&
        (state.hotel || state.hotelError || state.hotelOptions.length === 0)
    );
  });
  const activitiesPricingReady = destinationSegments.every((segment) => {
    const state = effectiveDestinationStateById[segment.id];
    return Boolean(state && state.activitiesLoading !== true);
  });
  const packagePricingReady =
    !liveSearch.flightLoading &&
    Boolean(liveSearch.flight || liveSearch.flightError) &&
    destinationPricingReady &&
    activitiesPricingReady;
  const liveHotelTotal = destinationSegments.reduce((sum, segment) => {
    const stateHotel = effectiveDestinationStateById[segment.id]?.hotel;
    const matchedLiveHotel = hotelMatchesSegment(liveSearch.hotel, segment, destinationSegments) ? liveSearch.hotel : null;
    return sum + ((matchedLiveHotel || stateHotel)?.price.total || 0);
  }, 0);
  const packageCost = liveFlightTotal + liveHotelTotal + activityTotal + destinationAddOnTotal;
  const tripDates = `${shortDate(activeDestination?.checkIn || checkIn, "Select date")} - ${shortDate(activeDestination?.checkOut || checkOut, "Select date")}`;
  const liveHotelImage =
    liveSearch.hotel?.id && !hotelImageFailedById[liveSearch.hotel.id] && isRealHotelImageUrl(liveSearch.hotel?.imageSrc)
      ? liveSearch.hotel?.imageSrc
      : undefined;
  const destinationImageById = useMemo(() => {
    const images: Record<string, string | undefined> = {};
    for (const segment of destinationSegments) {
      const state = effectiveDestinationStateById[segment.id];
      images[segment.id] = firstRealImage([
        isRealHotelImageUrl(state?.hotel?.imageSrc) ? state?.hotel?.imageSrc : undefined,
        ...(state?.activities || []).map((activity) => activity.imageUrl),
      ]);
    }
    return images;
  }, [destinationSegments, effectiveDestinationStateById]);
  const liveHotelName = liveSearch.hotel?.name || "Live hotel search";
  const liveHotelRating = liveSearch.hotel?.starRating || 0;
  const liveFlight = liveSearch.flight;
  const nextDestinationMinDate = useMemo(() => {
    const lastDestination = chainedDestinations[chainedDestinations.length - 1];
    return parseIsoDate(lastDestination?.checkOut || checkOut || checkIn) || new Date();
  }, [chainedDestinations, checkIn, checkOut]);

  useEffect(() => {
    setAiChatMessages([]);
    setAiChatInput("");
    setAiChatError(null);
  }, [activeDestinationId]);

  useEffect(() => {
    const container = aiChatScrollRef.current;
    if (!container) return;
    window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [aiBrief, aiBriefError, aiBriefLoading, aiChatLoading, aiChatMessages.length]);

  useEffect(() => {
    const controller = new AbortController();
    if (activitiesLoading) {
      setAiBriefLoading(true);
      setAiBriefError(null);
      return () => controller.abort();
    }
    if (aiActivityContext.length === 0) {
      setAiBrief("");
      setAiActivityNotes({});
      setAiBriefLoading(false);
      setAiBriefError(activitiesError ? "AI brief unavailable until live activities return." : null);
      return () => controller.abort();
    }

    async function loadAiBrief() {
      setAiBriefLoading(true);
      setAiBriefError(null);
      try {
        const response = await fetch("/api/packages/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode: "itinerary",
            destination: activeDestination?.name || destination,
            dateRange: tripDates,
            lookingFor,
            stayPreference,
            hotel: aiHotelContext,
            flight: aiFlightContext,
            activities: aiActivityContext,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
          notes?: Array<{ productCode?: string; note?: string }>;
        };
        if (!response.ok) throw new Error(data.error || "AI brief failed.");
        setAiBrief(data.text || "");
        setAiActivityNotes(
          Object.fromEntries(
            (data.notes || [])
              .filter((note) => note.productCode && note.note)
              .map((note) => [String(note.productCode), String(note.note)])
          )
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setAiBrief("");
        setAiActivityNotes({});
        setAiBriefError(error instanceof Error ? error.message : "AI brief failed.");
      } finally {
        if (!controller.signal.aborted) setAiBriefLoading(false);
      }
    }

    loadAiBrief();
    return () => controller.abort();
  }, [activeDestination?.name, activitiesError, activitiesLoading, aiActivityContext, aiContextKey, aiFlightContext, aiHotelContext, destination, lookingFor, stayPreference, tripDates]);

  useEffect(() => {
    if (!addDestinationOpen) return;
    const minIso = formatIsoDate(nextDestinationMinDate);
    setAddDestinationError(null);
    setNewDestinationCheckIn((current) => {
      if (current && current >= minIso) return current;
      return minIso;
    });
    setNewDestinationCheckOut((current) => {
      if (current && current >= minIso) return current;
      return "";
    });
  }, [addDestinationOpen, nextDestinationMinDate]);
  const hotelFilterPriceBounds = useMemo(() => {
    const values = hotelOptions
      .map((hotel) => (hotelFilters.priceMode === "nightly" ? hotel.price.nightly : hotel.price.total))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === 0) return { min: 0, max: 1 };
    return {
      min: Math.floor(Math.min(...values)),
      max: Math.ceil(Math.max(...values)),
    };
  }, [hotelFilters.priceMode, hotelOptions]);

  useEffect(() => {
    if (hotelOptions.length === 0) return;
    setHotelFilters((current) => {
      const isDefaultRange =
        current.priceRange[0] === DEFAULT_FILTERS.priceRange[0] &&
        current.priceRange[1] === DEFAULT_FILTERS.priceRange[1];
      const outsideBounds =
        current.priceRange[0] < hotelFilterPriceBounds.min ||
        current.priceRange[1] > hotelFilterPriceBounds.max ||
        current.priceRange[0] > hotelFilterPriceBounds.max;
      if (!isDefaultRange && !outsideBounds) return current;
      return { ...current, priceRange: [hotelFilterPriceBounds.min, hotelFilterPriceBounds.max] };
    });
  }, [hotelFilterPriceBounds.max, hotelFilterPriceBounds.min, hotelOptions.length]);

  const availableHotelMealPlans = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const hotel of hotelOptions) {
      for (const plan of hotel.mealPlans || []) {
        const label = textValue(plan);
        const key = mealPlanKey(label);
        if (!label || !key) continue;
        if (!byKey.has(key)) byKey.set(key, label);
      }
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [hotelOptions]);

  const availableHotelAmenities = useMemo<HotelAmenityOption[]>(() => {
    const byKey = new Map<string, { label: string; count: number }>();
    for (const hotel of hotelOptions) {
      for (const amenity of hotel.amenities || []) {
        const label = textValue(amenity);
        if (!label) continue;
        const key = label.toLowerCase();
        const current = byKey.get(key);
        if (current) current.count += 1;
        else byKey.set(key, { label, count: 1 });
      }
    }
    return Array.from(byKey.values())
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.label.localeCompare(b.label)))
      .slice(0, 24);
  }, [hotelOptions]);

  const availableHotelNeighborhoods = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const hotel of hotelOptions) {
      const { key, label } = normalizeNeighborhoodValue(hotel.neighborhood || "", {
        city: hotel.cityName,
        country: hotel.countryName,
        searchLocation: activeDestination?.name || destination,
      });
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing || label.length < existing.length) byKey.set(key, label);
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [activeDestination?.name, destination, hotelOptions]);

  const hotelMinPriceByStarRating = useMemo(() => {
    const minByRating: Record<number, number> = {};
    for (const hotel of hotelOptions) {
      const rating = hotel.starRating;
      const price = hotel.price.nightly;
      if (minByRating[rating] === undefined || price < minByRating[rating]) minByRating[rating] = price;
    }
    return minByRating;
  }, [hotelOptions]);

  const hotelRefundableFilterEnabled = useMemo(
    () => hotelOptions.some((hotel) => hotel.refundable === true || hotel.refundable === false),
    [hotelOptions]
  );
  const duplicateHotelImageIds = useMemo(() => {
    const imageOwners = new Map<string, string[]>();
    for (const hotel of hotelOptions) {
      if (!isRealHotelImageUrl(hotel.imageSrc)) continue;
      const key = hotelImageKey(hotel.imageSrc);
      if (!key) continue;
      const owners = imageOwners.get(key) || [];
      owners.push(hotel.id);
      imageOwners.set(key, owners);
    }
    const duplicates = new Set<string>();
    for (const owners of imageOwners.values()) {
      if (owners.length <= 1) continue;
      owners.forEach((id) => duplicates.add(id));
    }
    return duplicates;
  }, [hotelOptions]);

  const filteredHotelOptions = useMemo(() => {
    const query = hotelFilters.propertyQuery.trim().toLowerCase();
    const [minPrice, maxPrice] = hotelFilters.priceRange;
    const selectedNeighborhoodKeys = new Set(
      hotelFilters.neighborhoods
        .map((neighborhood) => normalizeNeighborhoodValue(neighborhood, { searchLocation: activeDestination?.name || destination }).key)
        .filter(Boolean)
    );

    const base = hotelOptions.filter((hotel) => {
      if (query && !hotel.name.toLowerCase().includes(query)) return false;
      if (hotelFilters.starRatings.length > 0 && !hotelFilters.starRatings.includes(hotel.starRating)) return false;
      if (hotelFilters.fullyRefundableOnly && hotel.refundable !== true) return false;
      if (selectedNeighborhoodKeys.size > 0) {
        const hotelNeighborhoodKey = normalizeNeighborhoodValue(hotel.neighborhood || "", {
          city: hotel.cityName,
          country: hotel.countryName,
          searchLocation: activeDestination?.name || destination,
        }).key;
        if (!hotelNeighborhoodKey || !selectedNeighborhoodKeys.has(hotelNeighborhoodKey)) return false;
      }
      if (hotelFilters.amenities.length > 0) {
        const amenitySet = new Set((hotel.amenities || []).map((amenity) => String(amenity).toLowerCase().trim()));
        if (!hotelFilters.amenities.every((amenity) => amenitySet.has(String(amenity).toLowerCase().trim()))) return false;
      }
      if (hotelFilters.mealPlans.length > 0) {
        const hotelMealKeys = new Set((hotel.mealPlans || []).map((plan) => mealPlanKey(plan)).filter(Boolean));
        if (!hotelFilters.mealPlans.some((plan) => hotelMealKeys.has(mealPlanKey(plan)))) return false;
      }
      if (hotelFilters.popular.breakfastIncluded && !includesBreakfast(hotel.mealPlans || [])) return false;
      const priceValue = hotelFilters.priceMode === "nightly" ? hotel.price.nightly : hotel.price.total;
      return priceValue >= minPrice && priceValue <= maxPrice;
    });

    const sorted = [...base];
    if (hotelSortMode === "price_low") {
      sorted.sort((a, b) => (a.price.total || 0) - (b.price.total || 0));
    } else if (hotelSortMode === "review_score") {
      sorted.sort((a, b) => {
        const scoreDelta = (b.reviews?.score || 0) - (a.reviews?.score || 0);
        if (scoreDelta !== 0) return scoreDelta;
        return b.starRating - a.starRating;
      });
    } else {
      sorted.sort((a, b) => {
        const scoreDelta =
          hotelRecommendationScore(b, { stayPreference, budget, destinationCount: destinationSegments.length }) -
          hotelRecommendationScore(a, { stayPreference, budget, destinationCount: destinationSegments.length });
        if (Math.abs(scoreDelta) > 0.01) return scoreDelta;
        return (a.price.total || 0) - (b.price.total || 0);
      });
    }
    return sorted;
  }, [activeDestination?.name, budget, destination, destinationSegments.length, hotelFilters, hotelOptions, hotelSortMode, stayPreference]);
  const displayedHotelOptions = useMemo(
    () => filteredHotelOptions.slice(0, visibleHotelOptionCount),
    [filteredHotelOptions, visibleHotelOptionCount]
  );
  const hasMoreHotelOptions = displayedHotelOptions.length < filteredHotelOptions.length;
  const hotelThumbnailById = useMemo(() => {
    const used = new Set<string>();
    const images: Record<string, string> = {};
    for (const hotel of displayedHotelOptions) {
      if (hotelImageFailedById[hotel.id] || !isRealHotelImageUrl(hotel.imageSrc)) continue;
      const key = hotelImageKey(hotel.imageSrc);
      if (!key || used.has(key)) continue;
      used.add(key);
      images[hotel.id] = hotel.imageSrc;
    }
    return images;
  }, [displayedHotelOptions, hotelImageFailedById]);

  useEffect(() => {
    if (!hotelChangeOpen) return;
    setVisibleHotelOptionCount(HOTEL_CHANGE_PAGE_SIZE);
  }, [activeDestinationId, hotelChangeOpen, hotelFilters, hotelSortMode]);

  useEffect(() => {
    if (!hotelChangeOpen || hotelOptions.length > 0 || !activeDestination) return;
    let cancelled = false;

    async function reloadHotelOptionsForActiveDestination() {
      setLiveSearch((current) => ({
        ...current,
        hotelLoading: true,
        hotelError: null,
      }));
      try {
        const pickedCity =
          activeDestination.hiddenId && activeDestination.hiddenKey
            ? {
                id: activeDestination.hiddenId,
                label: activeDestination.name,
                loc: activeDestination.hiddenKey,
                arrival_point_code: activeDestination.airportCode || undefined,
              }
            : null;
        const lookup = pickedCity ? [] : await hotelService.lookupCities(activeDestination.name);
        const resolvedPick =
          pickedCity ||
          lookup.find((item) => String(item.loc).toLowerCase() === "city") ||
          lookup.find((item) => item.arrival_point_code) ||
          lookup[0];

        if (!resolvedPick?.id || !resolvedPick?.loc) {
          throw new Error("No matching live hotel destination was found.");
        }

        const availability = await withSearchTimeout(
          hotelService.searchAvailabilityV3({
            location: resolvedPick.label || activeDestination.name,
            hidden_id: String(resolvedPick.id),
            hidden_key: String(resolvedPick.loc),
            checkIn: activeDestination.checkIn,
            checkOut: activeDestination.checkOut,
            rooms,
            adults,
            children,
            branches: branchesParam,
            timeout: VYSPA_SEARCH_TIMEOUT_SEC,
            includeFeesInTotal: true,
          }),
          `Live hotels for ${resolvedPick.label || activeDestination.name}`
        );
        if (cancelled) return;

        const nights = calculateNights(activeDestination.checkIn, activeDestination.checkOut) || 1;
        const parsed = mapAvailability(availability, nights, rooms);
        const stampedHotels = stampHotelsForSegment(parsed.mapped, activeDestination, resolvedPick.label || activeDestination.name);
        const recommendedHotel = selectRecommendedHotel(stampedHotels, {
          stayPreference,
          budget,
          destinationCount: destinationSegments.length,
        });
        const nextHotelSearch = {
          provider:
            parsed.criteriaProvider === "hotelbeds" || typeof parsed.criteriaId === "string"
              ? "hotelbeds"
              : "vyspa",
          location: resolvedPick.label || activeDestination.name,
          hidden_id: String(resolvedPick.id),
          hidden_key: String(resolvedPick.loc),
          checkIn: activeDestination.checkIn,
          checkOut: activeDestination.checkOut,
          rooms,
          adults,
          children,
          branches: branchesParam,
          searchCriteriaId:
            typeof parsed.criteriaId === "string" || typeof parsed.criteriaId === "number"
              ? parsed.criteriaId
              : undefined,
          arrivalPointCode: "arrival_point_code" in resolvedPick ? resolvedPick.arrival_point_code : activeDestination.airportCode,
        } as const;

        setHotelOptions(stampedHotels);
        setHotelSearch(nextHotelSearch);
        setLiveSearch((current) => ({
          ...current,
          hotel: recommendedHotel,
          hotelLoading: false,
          hotelError: recommendedHotel ? null : "No live hotels returned for this search.",
        }));
        setDestinationStateById((current) => ({
          ...current,
          [activeDestination.id]: {
            ...(current[activeDestination.id] || {
              activities: [],
              selectedActivityCodes: [],
            }),
            hotel: recommendedHotel,
            hotelLoading: false,
            hotelError: recommendedHotel ? null : "No live hotels returned for this search.",
            hotelOptions: stampedHotels,
            hotelSearch: nextHotelSearch,
          },
        }));
      } catch (error) {
        if (cancelled) return;
        setLiveSearch((current) => ({
          ...current,
          hotelLoading: false,
          hotelError: error instanceof Error ? error.message : "Failed to load live hotels.",
        }));
      }
    }

    void reloadHotelOptionsForActiveDestination();
    return () => {
      cancelled = true;
    };
  }, [activeDestination, adults, branchesParam, budget, children, destinationSegments.length, hotelChangeOpen, hotelOptions.length, rooms, setHotelSearch, stayPreference]);

  const toggleActivity = (productCode: string) => {
    setSelectedActivityCodes((current) => {
      const next = current.includes(productCode)
        ? current.filter((code) => code !== productCode)
        : [...current, productCode];
      const cached = readAiPackageLiveCache(paramsKey);
      writeAiPackageLiveCache({
        paramsKey,
        flight: cached?.flight || liveSearch.flight,
        flightRequestId: cached?.flightRequestId || liveSearch.flightRequestId,
        hotel: cached?.hotel || liveSearch.hotel,
        hotelOptions: cached?.hotelOptions?.length ? cached.hotelOptions : hotelOptions,
        hotelSearch: cached?.hotelSearch || storeHotelSearch,
        activitiesKey: cached?.activitiesKey,
        activities: cached?.activities?.length ? cached.activities : activities,
        selectedActivityCodes: next,
      });
      return next;
    });
  };

  const submitAiChat = async () => {
    const question = aiChatInput.trim().slice(0, 600);
    if (!question || aiChatLoading) return;
    const nextMessages: AiChatMessage[] = [...aiChatMessages, { role: "user", content: question } as AiChatMessage].slice(-8);
    setAiChatMessages(nextMessages);
    setAiChatInput("");
    setAiChatLoading(true);
    setAiChatError(null);
    try {
      const response = await fetch("/api/packages/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          destination: activeDestination?.name || destination,
          dateRange: tripDates,
          lookingFor,
          stayPreference,
          hotel: aiHotelContext,
          flight: aiFlightContext,
          activities: aiActivityContext,
          history: nextMessages,
          question,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "AI chat failed.");
      setAiChatMessages((current) => [...current, { role: "assistant", content: data.text || "I could not answer from the current itinerary." } as AiChatMessage].slice(-8));
    } catch (error) {
      setAiChatError(error instanceof Error ? error.message : "AI chat failed.");
    } finally {
      setAiChatLoading(false);
    }
  };

  const continueToNextStep = () => {
    const destinationDrafts = destinationSegments.map((segment, segmentIndex) => {
      const state = effectiveDestinationStateById[segment.id];
      const segmentHotel =
        (hotelMatchesSegment(liveSearch.hotel, segment, destinationSegments) ? liveSearch.hotel : null) ||
        destinationStateByIdRef.current[segment.id]?.hotel ||
        state?.hotel ||
        null;
      const segmentActivities = (state?.activities || []).filter((activity) => (state?.selectedActivityCodes || []).includes(activity.productCode));
      return {
        ...segment,
        hotel: compactHotelForSession(segmentHotel),
        activities: segmentActivities.map((activity, index) => ({
          ...activity,
          itineraryDate: addDaysIso(segment.checkIn, index),
          itineraryTime: itinerarySlots[index % itinerarySlots.length],
        })),
        order: segmentIndex + 1,
      };
    });
    const next = new URLSearchParams(params.toString());
    const selectedCodesForUrl = destinationDrafts.flatMap((segment) => segment.activities.map((activity) => activity.productCode));
    if (selectedCodesForUrl.length > 0) next.set("activities", selectedCodesForUrl.join(","));
    if (chainedDestinations.length > 0) next.set("destinations", JSON.stringify(chainedDestinations));
    next.set("type", "ai-package");

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "aiPackageBookingDraft",
        JSON.stringify({
          search: {
            destination,
            fromCode,
            fromName,
            checkIn,
            checkOut,
            adults,
            children,
            rooms,
            lookingFor,
            stayPreference,
          },
          hotel: compactHotelForSession(liveSearch.hotel),
          flight: compactFlightForSession(liveSearch.flight),
          activities: destinationDrafts.flatMap((segment) => segment.activities),
          totals: {
            flight: liveFlightTotal,
            hotel: liveHotelTotal,
            activities: activityTotal,
            package: packageCost,
            currency: liveSearch.flight?.currency || liveSearch.hotel?.price.currency || "GBP",
          },
          chainedDestinations,
          destinations: destinationDrafts,
        })
      );
    }

    router.push(`/packages/ai/checkout?${next.toString()}`);
  };

  const addDestination = async () => {
    const selectedDestination = newDestination;
    const name = selectedDestination?.name.trim() || "";
    const nextCheckIn = newDestinationCheckIn || formatIsoDate(nextDestinationMinDate);
    const nextCheckOut = newDestinationCheckOut;
    if (!selectedDestination || !name || !nextCheckIn || !nextCheckOut) return;
    setAddDestinationLoading(true);
    setAddDestinationError(null);

    try {
      persistVisibleDestinationState(activeDestinationId);
      const selectedPick =
        selectedDestination.id && selectedDestination.hiddenvalue
          ? {
              id: selectedDestination.id,
              label: name,
              loc: selectedDestination.hiddenvalue,
              arrival_point_code: selectedDestination.airportcode || undefined,
            }
          : null;
      const hotelLookup = selectedPick ? [] : await hotelService.lookupCities(name).catch(() => []);
      const resolvedPick =
        selectedPick ||
        hotelLookup.find((item) => String(item.loc).toLowerCase() === "city") ||
        hotelLookup.find((item) => item.arrival_point_code) ||
        hotelLookup[0];
      const airportCode = String(selectedDestination.airportcode || resolvedPick?.arrival_point_code || "").toUpperCase();
      const nextDestination: ChainedDestination = {
        id: `${Date.now()}`,
        name,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        airportCode,
        hiddenId: String(selectedDestination.id || resolvedPick?.id || ""),
        hiddenKey: String(selectedDestination.hiddenvalue || resolvedPick?.loc || ""),
        fromCode: activeDestination.airportCode || destinationCode || fromCode,
        fromName: activeDestination.name || destination,
      };
      const nextDestinations = [...chainedDestinations, nextDestination];
      const nextSegment: PackageDestinationSegment = { ...nextDestination, airportCode };
      if (!resolvedPick?.id || !resolvedPick?.loc) throw new Error("No matching hotel destination was found for this stop.");

      const [hotelResult, activityResult, flightResult] = await Promise.allSettled([
        withSearchTimeout(
          hotelService.searchAvailabilityV3({
            location: resolvedPick.label || name,
            hidden_id: String(resolvedPick.id),
            hidden_key: String(resolvedPick.loc),
            checkIn: nextCheckIn,
            checkOut: nextCheckOut,
            rooms,
            adults,
            children,
            branches: branchesParam,
            timeout: VYSPA_SEARCH_TIMEOUT_SEC,
            includeFeesInTotal: true,
          }),
          `Live hotels for ${resolvedPick.label || name}`
        ),
        activityService.searchActivities({
          destinationName: name,
          startDate: nextCheckIn,
          endDate: nextCheckOut,
          adults,
          children,
          count: 6,
          query: activityQuery,
          currency: "GBP",
        }),
        (async () => {
          const chainedFlightSearch = buildChainedFlightSearch({
            originCode: fromCode,
            originName: fromName,
            adults,
            children,
            infants,
            destinations: [...destinationSegments, nextSegment],
          });
          if (!chainedFlightSearch) return null;
          chainedFlightSearch.aiBudget = budget;
          setStoreSearchParams(chainedFlightSearch);
          return flightService.searchFlights(chainedFlightSearch);
        })(),
      ]);

      let nextHotelOptions: Hotel[] = [];
      let nextHotel: Hotel | null = null;
      let nextHotelSearch: ReturnType<typeof useBookingStore.getState>["hotelSearch"] | undefined;
      if (hotelResult.status === "fulfilled") {
        const nights = calculateNights(nextCheckIn, nextCheckOut) || 1;
        const parsed = mapAvailability(hotelResult.value, nights, rooms);
        nextHotelOptions = stampHotelsForSegment(parsed.mapped, nextSegment, resolvedPick.label || name);
        nextHotel = selectRecommendedHotel(nextHotelOptions, {
          stayPreference,
          budget,
          destinationCount: nextDestinations.length + 1,
        });
        nextHotelSearch = {
          provider:
            parsed.criteriaProvider === "hotelbeds" || typeof parsed.criteriaId === "string"
              ? "hotelbeds"
              : "vyspa",
          location: resolvedPick.label || name,
          hidden_id: String(resolvedPick.id),
          hidden_key: String(resolvedPick.loc),
          checkIn: nextCheckIn,
          checkOut: nextCheckOut,
          rooms,
          adults,
          children,
          branches: branchesParam,
          searchCriteriaId:
            typeof parsed.criteriaId === "string" || typeof parsed.criteriaId === "number"
              ? parsed.criteriaId
              : undefined,
          arrivalPointCode: "arrival_point_code" in resolvedPick ? resolvedPick.arrival_point_code : airportCode,
        };
      }
      const nextActivities = activityResult.status === "fulfilled" ? activityResult.value.products : [];
      const nextSelectedActivityCodes = nextActivities.slice(0, 2).map((activity) => activity.productCode);
      const nextIndex = destinationSegments.length;
      const nextActivitiesKey = [nextDestination.id, name, nextCheckIn, nextCheckOut, adults, children, activityQuery].join("|");
      setChainedDestinations(nextDestinations);
      setDestinationStateById((current) => ({
        ...current,
        [nextDestination.id]: {
          hotel: nextHotel,
          hotelLoading: false,
          hotelError: hotelResult.status === "rejected" ? hotelResult.reason instanceof Error ? hotelResult.reason.message : "Failed to load live hotels." : nextHotel ? null : "No live hotels returned for this search.",
          hotelOptions: nextHotelOptions,
          hotelSearch: nextHotelSearch,
          activitiesKey: nextActivitiesKey,
          activities: nextActivities,
          selectedActivityCodes: nextSelectedActivityCodes,
          activitiesError: activityResult.status === "rejected" ? activityResult.reason instanceof Error ? activityResult.reason.message : "Failed to load activities" : null,
          activitiesLoading: false,
        },
      }));
      setActiveDestinationIndex(nextIndex);
      setHotelOptions(nextHotelOptions);
      setActivities(nextActivities);
      setSelectedActivityCodes(nextSelectedActivityCodes);
      setActivitiesError(activityResult.status === "rejected" ? activityResult.reason instanceof Error ? activityResult.reason.message : "Failed to load activities" : null);
      setActivitiesLoading(false);
      if (nextHotelSearch) setHotelSearch(nextHotelSearch);
      setLiveSearch((current) => ({
        ...current,
        flight:
          flightResult.status === "fulfilled" && flightResult.value?.flights?.[0]
            ? selectRecommendedFlight(flightResult.value.flights, { budget, stayPreference })
            : current.flight,
        flightRequestId:
          flightResult.status === "fulfilled" && flightResult.value?.requestId
            ? flightResult.value.requestId
            : current.flightRequestId,
        flightLoading: false,
        flightError:
          flightResult.status === "rejected"
            ? flightResult.reason instanceof Error ? flightResult.reason.message : "Failed to refresh chained flights."
            : flightResult.status === "fulfilled" && flightResult.value && flightResult.value.flights.length === 0
              ? "No live flights returned for the chained journey."
              : null,
        hotel: nextHotel,
        hotelLoading: false,
        hotelError: hotelResult.status === "rejected" ? hotelResult.reason instanceof Error ? hotelResult.reason.message : "Failed to load live hotels." : null,
      }));
      if (flightResult.status === "fulfilled" && flightResult.value?.requestId) setSearchRequestId(flightResult.value.requestId);
      if (flightResult.status === "fulfilled" && flightResult.value?.flights?.[0]) {
        const recommendedFlight = selectRecommendedFlight(flightResult.value.flights, { budget, stayPreference });
        if (recommendedFlight) setSelectedFlight(recommendedFlight, normalizeCabinClass(recommendedFlight.outbound?.cabinClass));
      }
      if (typeof window !== "undefined") {
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.set("destinations", JSON.stringify(nextDestinations));
        window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
      }
      setNewDestination(null);
      setNewDestinationCheckIn(nextCheckOut);
      setNewDestinationCheckOut("");
      setAddDestinationOpen(false);
    } catch (error) {
      setAddDestinationError(error instanceof Error ? error.message : "Could not add this destination.");
    } finally {
      setAddDestinationLoading(false);
    }
  };

  const openHotelDetailsPopup = () => {
    if (liveSearch.hotelLoading || liveSearch.hotelError || !liveSearch.hotel) return;
    setHotelDetailsOpen(true);
  };

  useEffect(() => {
    if (!hotelChangeOpen || hotelOptions.length === 0) return;
    let cancelled = false;
    const targets = displayedHotelOptions
      .filter((hotel) => {
        if (imageEnrichmentAttemptedRef.current.has(hotel.id)) return false;
        return hotelImageFailedById[hotel.id] || !isRealHotelImageUrl(hotel.imageSrc) || duplicateHotelImageIds.has(hotel.id);
      })
      .slice(0, HOTEL_CHANGE_PAGE_SIZE);
    if (targets.length === 0) return;
    targets.forEach((hotel) => imageEnrichmentAttemptedRef.current.add(hotel.id));
    setHotelImageLoadingById((current) => ({
      ...current,
      ...Object.fromEntries(targets.map((hotel) => [hotel.id, true])),
    }));

    async function enrichMissingHotelImages() {
      const existingKeys = new Set(
        hotelOptions
          .filter((hotel) => !targets.some((target) => target.id === hotel.id))
          .map((hotel) => (isRealHotelImageUrl(hotel.imageSrc) ? hotelImageKey(hotel.imageSrc) : ""))
          .filter(Boolean)
      );
      const enriched = await Promise.allSettled(
        targets.map(async (hotel) => ({ id: hotel.id, imageSrc: await fetchSelectedHotelImage(hotel, storeHotelSearch) }))
      );
      if (cancelled) return;
      setHotelImageLoadingById((current) => ({
        ...current,
        ...Object.fromEntries(targets.map((hotel) => [hotel.id, false])),
      }));
      const imageByHotelId = new Map<string, string>();
      enriched.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.imageSrc) {
          const key = hotelImageKey(result.value.imageSrc);
          if (!key || existingKeys.has(key)) return;
          existingKeys.add(key);
          imageByHotelId.set(result.value.id, result.value.imageSrc);
        }
      });
      if (imageByHotelId.size === 0) return;
      setHotelOptions((current) =>
        current.map((hotel) => {
          const imageSrc = imageByHotelId.get(hotel.id);
          return imageSrc ? { ...hotel, imageSrc } : hotel;
        })
      );
      setLiveSearch((current) => {
        if (!current.hotel) return current;
        const imageSrc = imageByHotelId.get(current.hotel.id);
        return imageSrc ? { ...current, hotel: { ...current.hotel, imageSrc } } : current;
      });
    }

    void enrichMissingHotelImages();
    return () => {
      cancelled = true;
    };
  }, [displayedHotelOptions, duplicateHotelImageIds, hotelChangeOpen, hotelImageFailedById, hotelOptions, storeHotelSearch]);

  const loadHotelRoomOptions = async (hotel: Hotel) => {
    if (roomOptionsByHotelId[hotel.id]?.length || roomOptionsLoadingByHotelId[hotel.id]) return;
    setRoomOptionsLoadingByHotelId((current) => ({ ...current, [hotel.id]: true }));
    setRoomOptionsErrorByHotelId((current) => ({ ...current, [hotel.id]: null }));
    try {
      const raw = rawRecord(hotel.rawSearchResult);
      const criteriaIdRaw = raw?.searchCriteriaId ?? storeHotelSearch?.searchCriteriaId;
      const criteriaId = typeof criteriaIdRaw === "string" || typeof criteriaIdRaw === "number" ? criteriaIdRaw : undefined;
      if (!criteriaId) throw new Error("Room availability criteria is not available for this hotel.");
      const roomHotelId = textValue(raw?.hotel_id ?? raw?.hotelId ?? hotel.id);
      const srId = textValue(raw?.id ?? raw?.srId);
      const response = await hotelService.getRoomsV3(criteriaId, roomHotelId || hotel.id, srId || undefined);
      const roomsFromResponse = collectRooms(response, 48);
      const seedRoom: RichHotelRoom = {
        name: hotel.room?.name || "Selected room",
        board: hotel.room?.highlights?.join(" - ") || undefined,
        price: hotel.price.total,
        currency: hotel.price.currency,
        refundable: hotel.refundable ?? null,
      };
      const options = roomsFromResponse.length > 0 ? roomsFromResponse : [seedRoom];
      setRoomOptionsByHotelId((current) => ({ ...current, [hotel.id]: options }));
    } catch (error) {
      setRoomOptionsErrorByHotelId((current) => ({
        ...current,
        [hotel.id]: error instanceof Error ? error.message : "Failed to load room options.",
      }));
      setRoomOptionsByHotelId((current) => ({
        ...current,
        [hotel.id]: [
          {
            name: hotel.room?.name || "Selected room",
            board: hotel.room?.highlights?.join(" - ") || undefined,
            price: hotel.price.total,
            currency: hotel.price.currency,
            refundable: hotel.refundable ?? null,
          },
        ],
      }));
    } finally {
      setRoomOptionsLoadingByHotelId((current) => ({ ...current, [hotel.id]: false }));
    }
  };

  const toggleHotelRooms = (hotel: Hotel) => {
    setExpandedHotelRoomsId((current) => (current === hotel.id ? null : hotel.id));
    void loadHotelRoomOptions(hotel);
  };

  const selectHotelOption = (hotel: Hotel, room?: RichHotelRoom) => {
    const nextHotel: Hotel = room
      ? {
          ...hotel,
          room: {
            name: room.name,
            highlights: [room.board, room.refundable === true ? "Refundable" : room.refundable === false ? "Non-refundable" : ""].filter(Boolean) as string[],
          },
          refundable: room.refundable ?? hotel.refundable,
          price: room.price
            ? {
                ...hotel.price,
                total: room.price,
                nightly: hotel.price.nights > 0 ? Math.round((room.price / hotel.price.nights) * 100) / 100 : room.price,
                currency: room.currency || hotel.price.currency,
              }
            : hotel.price,
        }
      : hotel;
    const compactHotel = compactHotelForSession(nextHotel);
    setLiveSearch((current) => ({
      ...current,
      hotel: compactHotel || nextHotel,
      hotelLoading: false,
      hotelError: null,
    }));
    setDestinationStateById((current) => ({
      ...current,
      [activeDestinationId]: {
        ...(current[activeDestinationId] || {
          activities,
          selectedActivityCodes,
        }),
        hotel: compactHotel || nextHotel,
        hotelLoading: false,
        hotelError: null,
        hotelOptions,
        hotelSearch: storeHotelSearch,
        activitiesKey: activeActivitiesKey,
        activities,
        selectedActivityCodes,
        activitiesError,
        activitiesLoading,
      },
    }));
    const cached = readAiPackageLiveCache(paramsKey);
    writeAiPackageLiveCache({
      paramsKey,
      flight: cached?.flight || liveSearch.flight,
      flightRequestId: cached?.flightRequestId || liveSearch.flightRequestId,
      hotel: compactHotel || nextHotel,
      hotelOptions,
      hotelSearch: cached?.hotelSearch || storeHotelSearch,
      activitiesKey: cached?.activitiesKey,
      activities: cached?.activities?.length ? cached.activities : activities,
      selectedActivityCodes: selectedActivityCodes,
    });
    setHotelChangeOpen(false);
    setExpandedHotelRoomsId(null);
  };

  const applyFlightUpgrade = (option: TransformedPriceOption, priceCheck: PriceCheckResult | null) => {
    if (!liveSearch.flight) return;
    const nextFlight = flightWithUpgrade(liveSearch.flight, option);
    setLiveSearch((current) => ({
      ...current,
      flight: nextFlight,
      flightLoading: false,
      flightError: null,
    }));
    const cached = readAiPackageLiveCache(paramsKey);
    writeAiPackageLiveCache({
      paramsKey,
      flight: nextFlight,
      flightRequestId: cached?.flightRequestId || liveSearch.flightRequestId,
      hotel: cached?.hotel || liveSearch.hotel,
      hotelOptions: cached?.hotelOptions?.length ? cached.hotelOptions : hotelOptions,
      hotelSearch: cached?.hotelSearch || storeHotelSearch,
      activitiesKey: cached?.activitiesKey,
      activities: cached?.activities?.length ? cached.activities : activities,
      selectedActivityCodes,
    });
    setSelectedFlight(nextFlight, option.cabinClassDisplay || option.cabinName || option.cabinClass);
    if (priceCheck) {
      // FlightInfoModal persists the full price check in the booking store; this keeps package state in sync.
      setSearchRequestId(priceCheck.sessionInfo?.pswResultId || liveSearch.flightRequestId);
    }
  };

  const flightSummaryLegs = liveFlight
    ? (liveFlight.tripType === "multi-city" && liveFlight.segments?.length
        ? liveFlight.segments
        : [liveFlight.outbound, ...(liveFlight.inbound ? [liveFlight.inbound] : [])]
      ).map((segment) => flightSegmentToSummaryLeg(liveFlight, segment))
    : [];
  const passengerLabel = `${adults + children} passenger${adults + children === 1 ? "" : "s"}`;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-[1564px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-7 rounded-[28px] border border-[#DFE0E4] bg-white p-4 shadow-[0_8px_28px_rgba(1,13,80,0.08)]">
          <SearchBar compact embedded defaultProduct="ai" />
        </div>

        <div className="mb-5">
          <TripStepper />
        </div>

        {destinationSegments.length > 1 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {destinationSegments.map((segment, index) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => showDestinationState(index)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  index === activeDestinationIndex
                    ? "border-[#3754ED] bg-[#3754ED] text-white"
                    : "border-[#DFE0E4] bg-white text-[#010D50] hover:border-[#3754ED]",
                ].join(" ")}
              >
                {segment.name}
                <span className={index === activeDestinationIndex ? "ml-2 text-white/80" : "ml-2 text-[#3A478A]"}>
                  {shortDate(segment.checkIn, "Date")} - {shortDate(segment.checkOut, "Date")}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[430px_1fr]">
          <aside className="flex flex-col gap-4">
            <section className="rounded-xl border border-[#DFE0E4] bg-white p-4">
              <h2 className="mb-4 text-lg font-semibold text-[#010D50]">Package Cost</h2>
              {packagePricingReady ? (
                <div className="text-3xl font-bold text-[#010D50]">
                  {packageCost > 0 ? money(packageCost, liveSearch.flight?.currency || liveSearch.hotel?.price.currency || "GBP") : "Live price unavailable"}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-base font-semibold text-[#3754ED]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="animate-pulse">Calculating the best price for you...</span>
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#3A478A]">
                <div>Flight: {liveSearch.flightLoading ? "Loading" : liveFlightTotal ? money(liveFlightTotal, liveSearch.flight?.currency || "GBP") : "Unavailable"}</div>
                <div>Hotel: {destinationPricingReady ? liveHotelTotal ? money(liveHotelTotal, liveSearch.hotel?.price.currency || "GBP") : "Unavailable" : "Calculating"}</div>
                <div>Activities: {activitiesPricingReady ? money(activityTotal, "GBP") : "Calculating"}</div>
                <div>Live sources only</div>
              </div>
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-4">
              <h2 className="pb-4 text-lg font-semibold text-[#010D50]">Trip Activity</h2>
              <div className="border-t border-[#EEF0F6] pt-4">
                <div className="flex items-center gap-3 rounded-lg bg-[#F5F7FF] px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#010D50] text-white">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-[#010D50]">{activeDestination?.name || destination}</div>
                    <div className="mt-0.5 text-xs text-[#3A478A]">{tripDates}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[54px_1fr] gap-x-4">
                  <div className="flex flex-col items-center">
                    <div className="rounded-t-lg bg-[#EEF2FF] px-2 py-2 text-center text-xs font-bold leading-tight text-[#010D50]">
                      <div>{compactDateParts(activeDestination?.checkIn || checkIn, "01").month}</div>
                      <div>{compactDateParts(activeDestination?.checkIn || checkIn, "01").day}</div>
                    </div>
                    <div className="min-h-16 flex-1 border-l border-dashed border-[#010D50]" />
                  </div>
                  <div className="pb-5">
                    {liveSearch.hotelLoading ? (
                      <div className="text-sm text-[#3A478A]">Searching live hotel...</div>
                    ) : liveSearch.hotel ? (
                      <div className="flex gap-3">
                        <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#010D50] text-white">
                          <BedDouble className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-sm font-bold text-[#010D50]">{liveHotelName}</div>
                          {liveSearch.hotel.room?.name ? (
                            <div className="mt-1 text-xs text-[#3A478A]">{formatRoomName(liveSearch.hotel.room.name)}</div>
                          ) : null}
                          {liveSearch.hotel.reviews?.score ? (
                            <div className="mt-3 inline-grid grid-cols-[auto_1fr] items-center gap-2">
                              <span className="rounded-lg bg-[#008A5B] px-2 py-2 text-xs font-bold text-white">
                                {liveSearch.hotel.reviews.score.toFixed(1)}
                              </span>
                              <span className="text-xs leading-tight text-[#010D50]">
                                <span className="block font-semibold">{liveSearch.hotel.reviews.label || "Guest rated"}</span>
                                <span className="text-[#3A478A]">{liveSearch.hotel.reviews.count || 0} reviews</span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {tripDayEntries.map((entry, index) => {
                    const activity = entry.activity;
                    const dateParts = compactDateParts(entry.date, String(index + 1).padStart(2, "0"));
                    const note = activity ? aiActivityNotes[activity.productCode] : null;
                    return (
                      <Fragment key={`${entry.date}-${activity?.productCode || "leisure"}`}>
                        <div className="flex flex-col items-center">
                          <div className="bg-[#EEF2FF] px-2 py-2 text-center text-xs font-bold leading-tight text-[#010D50]">
                            <div>{dateParts.month}</div>
                            <div>{dateParts.day}</div>
                          </div>
                          <div className="min-h-20 flex-1 border-l border-dashed border-[#010D50]" />
                        </div>
                        <div className="pb-5">
                          <div className="flex gap-3">
                            <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#010D50] text-white">
                              {activity ? <Sparkles className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold leading-snug text-[#010D50]">{activity ? activity.title : "Day at Leisure"}</div>
                              <div className="mt-1 text-xs font-medium text-[#3A478A]">
                                {activity ? itinerarySlots[index % itinerarySlots.length] : "Flexible time"}
                              </div>
                              {activity ? (
                                <>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {activity.duration ? (
                                      <span className="rounded-full bg-[#F5F7FF] px-2 py-1 text-[11px] font-semibold text-[#3A478A]">
                                        {activity.duration}
                                      </span>
                                    ) : null}
                                    {activity.rating ? (
                                      <span className="rounded-full bg-[#FFF7E0] px-2 py-1 text-[11px] font-semibold text-[#7A5200]">
                                        {activity.rating.toFixed(1)} rated
                                      </span>
                                    ) : null}
                                    {activity.price ? (
                                      <span className="rounded-full bg-[#F5F7FF] px-2 py-1 text-[11px] font-semibold text-[#3A478A]">
                                        {money(activity.price, activity.currency || "GBP")}
                                      </span>
                                    ) : null}
                                  </div>
                                  {note ? (
                                    <p className="mt-2 text-xs leading-relaxed text-[#3A478A]">{note}</p>
                                  ) : aiBriefLoading ? (
                                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-[#3A478A]">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3754ED]" />
                                      Writing AI activity note...
                                    </p>
                                  ) : activity.description ? (
                                    <p className="mt-2 text-xs leading-relaxed text-[#3A478A]">{truncateWords(activity.description, 64)}</p>
                                  ) : null}
                                </>
                              ) : (
                                <p className="mt-2 text-xs leading-relaxed text-[#3A478A]">
                                  Free time for your own plans, rest, or any extra activity you add later.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>

                {activitiesLoading && <div className="rounded-lg bg-[#F5F7FF] px-3 py-2 text-sm text-[#3A478A]">Loading Viator activities...</div>}
                {activitiesError && (
                  <div className="mt-3 max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-600">
                    {activitiesError}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[#010D50]">
                  <MessageCircle className="h-4 w-4 text-[#3754ED]" />
                  AI Activity Guide
                </h2>
                <span className="rounded-full bg-[#F5F7FF] px-2 py-1 text-[11px] font-semibold text-[#3A478A]">120 words</span>
              </div>
              <div ref={aiChatScrollRef} className="max-h-72 space-y-2 overflow-auto pr-1">
                <div className="mr-6 whitespace-pre-line rounded-xl bg-[#F5F7FF] px-4 py-3 text-sm leading-6 text-[#26356F]">
                  {aiBriefLoading ? (
                    <span className="inline-flex items-center gap-2 text-[#3A478A]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#3754ED]" />
                      Writing activity brief...
                    </span>
                  ) : aiBriefError ? (
                    <span className="break-words text-red-600">{aiBriefError}</span>
                  ) : aiBrief ? (
                    aiBrief
                  ) : (
                    "Select live activities to generate a trip brief."
                  )}
                </div>
                {aiChatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={[
                      "whitespace-pre-line rounded-xl px-3 py-2 text-xs leading-relaxed",
                      message.role === "user"
                        ? "ml-6 bg-[#3754ED] text-white"
                        : "mr-6 bg-[#F5F7FF] text-[#010D50]",
                    ].join(" ")}
                  >
                    {message.content}
                  </div>
                ))}
                {aiChatLoading ? (
                  <div className="mr-6 inline-flex items-center gap-2 rounded-xl bg-[#F5F7FF] px-3 py-2 text-xs text-[#3A478A]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3754ED]" />
                    Checking itinerary...
                  </div>
                ) : null}
              </div>
              {aiChatError ? <div className="mt-2 break-words text-xs text-red-600">{aiChatError}</div> : null}
              <div className="mt-3 flex gap-2">
                <input
                  value={aiChatInput}
                  onChange={(event) => setAiChatInput(event.target.value.slice(0, 600))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitAiChat();
                    }
                  }}
                  placeholder="Ask about the itinerary"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-[#DFE0E4] px-3 text-sm text-[#010D50] outline-none placeholder:text-[#98A0C2] focus:border-[#3754ED]"
                />
                <Button
                  type="button"
                  onClick={submitAiChat}
                  disabled={aiChatLoading || !aiChatInput.trim() || (!aiActivityContext.length && !aiHotelContext && !aiFlightContext)}
                  className="h-10 rounded-xl bg-[#3754ED] px-3 text-white hover:bg-[#2942D1] disabled:bg-[#AEB8F8]"
                  aria-label="Send AI itinerary question"
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <div className="rounded-xl border border-[#DFE0E4] bg-white p-4 text-center">
              <div className="mb-3 text-sm font-semibold text-[#010D50]">Your trip ends here</div>
              <Button
                type="button"
                onClick={() => setAddDestinationOpen(true)}
                className="w-full rounded-xl bg-[#3754ED] text-white hover:bg-[#2942D1]"
              >
                Click here to add destination
              </Button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-5">
            <section className="rounded-xl border border-[#DFE0E4] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#010D50]">Flight Details</h2>
                <Link href={flightChangeHref} className="inline-flex items-center gap-1 text-xs font-medium text-[#3754ED]">
                  <Edit3 className="h-3.5 w-3.5" />
                  Change selection
                </Link>
              </div>
              {liveSearch.flightLoading ? (
                <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">Searching live flights...</div>
              ) : liveSearch.flightError ? (
                <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-red-600">{liveSearch.flightError}</div>
              ) : liveFlight ? (
                <div className="rounded-xl border border-[#DFE0E4] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#010D50]">{liveFlight.airline.name}</div>
                      <div className="text-xs text-[#3A478A]">
                        {money(liveFlight.pricePerPerson || liveFlight.price / Math.max(1, adults + children), liveFlight.currency)} per person
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFlightInfoOpen(true)}
                      className="h-9 rounded-full border-[#DFE0E4] px-4 text-xs font-semibold text-[#3754ED]"
                    >
                      View flight info
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {flightSummaryLegs.map((leg, index) => (
                      <FlightSummaryCard
                        key={`${leg.fromCode}-${leg.toCode}-${index}`}
                        leg={leg}
                        passengers={passengerLabel}
                        cabinLabel={leg.cabinClass}
                        onViewDetails={() => setFlightInfoOpen(true)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">No live flights returned for this search.</div>
              )}
              <div className="my-4 flex items-center justify-center gap-3 rounded-xl bg-white py-2 text-xs font-medium text-[#3A478A]">
                <Sparkles className="h-4 w-4 text-[#3754ED]" />
                Curated for your perfect {lookingFor.toLowerCase()} getaway
              </div>
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#010D50]">Stay Details</h2>
                <div className="flex gap-3 text-xs font-medium text-[#3754ED]">
                  <button type="button" onClick={openHotelDetailsPopup}>View Details</button>
                  <button type="button" onClick={() => setHotelChangeOpen(true)}>Change selection</button>
                </div>
              </div>
              {liveSearch.hotelLoading ? (
                <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">Searching live hotels...</div>
              ) : liveSearch.hotelError ? (
                <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-red-600">{liveSearch.hotelError}</div>
              ) : (
              <div className="grid gap-4 md:grid-cols-[290px_1fr]">
                {liveHotelImage ? (
                  <div className="relative h-[210px] overflow-hidden rounded-xl bg-[#F5F7FF]">
                    <Image
                      src={liveHotelImage}
                      alt={liveHotelName}
                      fill
                      className="object-cover"
                      onError={() => {
                        imageEnrichmentAttemptedRef.current.delete(liveSearch.hotel?.id || "");
                        setHotelImageFailedById((current) => ({ ...current, [liveSearch.hotel?.id || ""]: true }));
                        setLiveSearch((current) =>
                          current.hotel ? { ...current, hotel: { ...current.hotel, imageSrc: "" } } : current
                        );
                        setHotelOptions((current) =>
                          current.map((hotel) => (hotel.id === liveSearch.hotel?.id ? { ...hotel, imageSrc: "" } : hotel))
                        );
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-[210px] items-center justify-center rounded-xl bg-[#F5F7FF] text-xs font-medium text-[#3A478A]">
                    {liveSearch.hotel ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#3754ED]" />
                        Loading hotel image
                      </span>
                    ) : null}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-[#010D50]">{liveHotelName}</h3>
                  <div className="mt-3 flex items-center gap-1">
                    {Array.from({ length: Math.max(1, liveHotelRating) }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                    ))}
                    {liveSearch.hotel?.reviews.score ? (
                      <span className="ml-2 rounded bg-[#008A5B] px-2 py-0.5 text-xs font-semibold text-white">
                        {liveSearch.hotel.reviews.score.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[#3A478A]">{liveSearch.hotel?.distanceLabel || stayPreference}</p>
                  <div className="mt-3 text-sm font-semibold text-[#010D50]">
                    {liveSearch.hotel?.price.total ? money(liveSearch.hotel.price.total, liveSearch.hotel.price.currency || "GBP") : null}
                  </div>
                  {liveSearch.hotel?.room?.name ? (
                    <div className="mt-3 rounded-xl border border-[#DFE0E4] bg-[#F5F7FF] p-3">
                      <div className="text-xs font-medium text-[#3A478A]">Selected room</div>
                      <div className="mt-1 text-sm font-semibold text-[#010D50]">{formatRoomName(liveSearch.hotel.room.name)}</div>
                      {formatRoomHighlights(liveSearch.hotel.room.highlights).length ? (
                        <div className="mt-1 text-xs text-[#3A478A]">{formatRoomHighlights(liveSearch.hotel.room.highlights).join(" · ")}</div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SummaryTile label="Check-in" value={formatDate(activeDestination?.checkIn || checkIn, "Select date")} icon={<CalendarDays className="h-4 w-4" />} />
                    <SummaryTile label="Check-out" value={formatDate(activeDestination?.checkOut || checkOut, "Select date")} icon={<CalendarDays className="h-4 w-4" />} />
                    <SummaryTile label="Travelers" value={`${adults} adult${adults === 1 ? "" : "s"}${children ? `, ${children} children` : ""}`} icon={<Users className="h-4 w-4" />} />
                    <SummaryTile label="Rooms" value={`${rooms} room${rooms === 1 ? "" : "s"}`} icon={<BedDouble className="h-4 w-4" />} />
                  </div>
                </div>
              </div>
              )}
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#010D50]">
                  Activities
                  <span className="ml-2 text-sm font-medium text-[#3A478A]">{activeDestination?.name || destination}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActivityQuery("")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#3754ED]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add activities
                </button>
              </div>
              {destinationSegments.length > 1 ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {destinationSegments.map((segment, index) => (
                    <button
                      key={segment.id}
                      type="button"
                      onClick={() => showDestinationState(index)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        index === activeDestinationIndex
                          ? "border-[#3754ED] bg-[#3754ED] text-white"
                          : "border-[#DFE0E4] bg-white text-[#010D50] hover:border-[#3754ED]",
                      ].join(" ")}
                    >
                      {segment.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={activityQuery}
                  onChange={(event) => setActivityQuery(event.target.value)}
                  placeholder="Search Viator activities"
                  className="h-10 flex-1 rounded-xl border border-[#DFE0E4] px-3 text-sm text-[#010D50] outline-none focus:border-[#3754ED]"
                />
                <Button
                  type="button"
                  onClick={() => setActivityQuery(activityQuery.trim() || lookingFor)}
                  className="rounded-xl bg-[#3754ED] text-white hover:bg-[#2942D1]"
                >
                  Search
                </Button>
              </div>
              <div className="grid gap-3">
                {activitiesLoading && (
                  <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">Finding relevant Viator activities...</div>
                )}
                {!activitiesLoading && activities.length === 0 && (
                  <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">
                    No Viator activities returned for this destination yet.
                  </div>
                )}
                {activities.map((activity, index) => (
                  <ActivityRow
                    key={activity.productCode}
                    activity={activity}
                    selected={selectedActivityCodes.includes(activity.productCode)}
                    itineraryLabel={itineraryLabelFor(index)}
                    onToggle={() => toggleActivity(activity.productCode)}
                    onDetails={() => setSelectedActivityDetails(activity)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#DFE0E4] bg-white p-4">
              <h2 className="mb-4 text-lg font-semibold text-[#010D50]">Add more destinations</h2>
              <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
                {destinationSegments.map((item, index) => (
                  <div key={item.id} className="grid min-h-[150px] overflow-hidden rounded-xl border border-[#DFE0E4] bg-[#F5F7FF] sm:grid-cols-[160px_1fr]">
                    <div className="relative min-h-[150px] bg-[#F5F7FF]">
                      {destinationImageById[item.id] ? (
                        <Image src={destinationImageById[item.id] || ""} alt={item.name} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <div className="flex h-full min-h-[150px] flex-col justify-between p-4">
                        <div>
                          <div className="text-sm font-semibold text-[#010D50]">{item.name}</div>
                          <div className="mt-1 text-xs text-[#3A478A]">
                            {shortDate(item.checkIn, "Add date")} - {shortDate(item.checkOut, "Add date")}
                          </div>
                        </div>
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const nextIndex = activeDestinationIndex >= index ? Math.max(0, activeDestinationIndex - 1) : activeDestinationIndex;
                              setChainedDestinations((current) => current.filter((row) => row.id !== item.id));
                              setDestinationStateById((current) => {
                                const next = { ...current };
                                delete next[item.id];
                                return next;
                              });
                              setActiveDestinationIndex(nextIndex);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAddDestinationOpen(true)}
                  className="flex min-h-[150px] items-center justify-center gap-2 rounded-xl border border-dashed border-[#B7BFEA] text-sm font-semibold text-[#3754ED]"
                >
                  <Plus className="h-4 w-4" />
                  Add a destination
                </button>
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={continueToNextStep}
                disabled={!packagePricingReady || !liveSearch.hotel || !liveSearch.flight}
                className="h-12 w-full rounded-xl bg-[#3754ED] text-white hover:bg-[#2942D1] sm:w-[360px]"
              >
                Book this AI trip
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {liveFlight ? (
        <FlightInfoModal
          flight={liveFlight}
          open={flightInfoOpen}
          onOpenChange={setFlightInfoOpen}
          stayOnCurrentPage
          isPackageMode
          onPackageApply={applyFlightUpgrade}
        />
      ) : null}

      <Dialog open={hotelDetailsOpen} onOpenChange={setHotelDetailsOpen}>
        <DialogContent className="max-h-[min(92vh,860px)] max-w-[min(100vw-24px,1080px)] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="pr-6 text-[#010D50]">{liveHotelName}</DialogTitle>
          </DialogHeader>
          {liveSearch.hotel ? (
            <div className="space-y-5">
                <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
                  <div className="relative min-h-[260px] overflow-hidden rounded-xl bg-[#F5F7FF]">
                    {(hotelDetails?.images?.[0] || liveHotelImage) ? (
                      <Image src={hotelDetails?.images?.[0] || liveHotelImage || ""} alt={liveHotelName} fill className="object-cover" />
                    ) : null}
                  </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  {(hotelDetails?.images || []).slice(1, 3).map((image, index) => (
                    <div key={`${image}-${index}`} className="relative min-h-[124px] overflow-hidden rounded-xl bg-[#F5F7FF]">
                      <Image src={image} alt="" fill className="object-cover" />
                    </div>
                  ))}
                  {(hotelDetails?.images || []).length <= 1 ? (
                    <div className="rounded-xl border border-[#DFE0E4] p-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.max(1, liveHotelRating) }).map((_, index) => (
                          <Star key={index} className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-[#3A478A]">{liveSearch.hotel.distanceLabel || stayPreference}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#3A478A]">
                      <span>{hotelDetails?.sourceLabel || "Live availability result"}</span>
                      {hotelDetailsLoading ? <span>Fetching full hotel details...</span> : null}
                      {hotelDetailsError ? <span className="text-[#B42318]">{hotelDetailsError}</span> : null}
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: Math.max(1, liveHotelRating) }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                      ))}
                    </div>
                    {hotelDetails?.address ? (
                      <div className="mt-2 flex items-start gap-2 text-sm text-[#3A478A]">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#3754ED]" />
                        <span>{hotelDetails.address}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryTile label="Check-in" value={formatDate(activeDestination?.checkIn || checkIn, "Select date")} icon={<CalendarDays className="h-4 w-4" />} />
                    <SummaryTile label="Check-out" value={formatDate(activeDestination?.checkOut || checkOut, "Select date")} icon={<CalendarDays className="h-4 w-4" />} />
                    <SummaryTile label="Travelers" value={`${adults} adult${adults === 1 ? "" : "s"}${children ? `, ${children} children` : ""}`} icon={<Users className="h-4 w-4" />} />
                    <SummaryTile label="Rooms" value={`${rooms} room${rooms === 1 ? "" : "s"}`} icon={<BedDouble className="h-4 w-4" />} />
                  </div>

                  <section>
                    <h3 className="text-base font-semibold text-[#010D50]">About</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#3A478A]">
                      {hotelDetails?.description || liveSearch.hotel.description || "Detailed supplier description is not available for this hotel yet."}
                    </p>
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-[#010D50]">Amenities</h3>
                    {(hotelDetails?.amenities || []).length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(hotelDetails?.amenities || []).slice(0, 12).map((amenity) => (
                          <div key={amenity} className="flex items-center gap-2 rounded-lg border border-[#DFE0E4] px-3 py-2 text-sm text-[#010D50]">
                            <AmenityIcon label={amenity} />
                            <span>{amenity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-[#3A478A]">Amenities were not returned by the supplier for this hotel.</p>
                    )}
                  </section>

                  <section>
                    <h3 className="text-base font-semibold text-[#010D50]">Room Options</h3>
                    <div className="mt-3 space-y-2">
                      {(hotelDetails?.rooms || []).slice(0, 5).map((room, index) => (
                        <div key={`${room.name}-${index}`} className="rounded-xl border border-[#DFE0E4] p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[#010D50]">{formatRoomName(room.name)}</div>
                              {room.board ? <div className="mt-1 text-xs text-[#3A478A]">{room.board}</div> : null}
                              {room.inclusions?.length ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {room.inclusions.slice(0, 5).map((item) => (
                                    <span key={item} className="rounded-full bg-[#F5F7FF] px-2 py-1 text-[11px] text-[#3A478A]">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {room.refundable != null ? (
                                <div className="mt-1 text-xs text-[#3A478A]">{room.refundable ? "Refundable" : "Non-refundable"}</div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-3">
                              {room.price ? (
                                <div className="text-sm font-bold text-[#010D50]">{money(room.price, room.currency || liveSearch.hotel?.price.currency || "GBP")}</div>
                              ) : null}
                              {liveSearch.hotel ? (
                                <Button
                                  type="button"
                                  onClick={() => {
                                    if (!liveSearch.hotel) return;
                                    selectHotelOption(liveSearch.hotel, room);
                                    setHotelDetailsOpen(false);
                                  }}
                                  className="h-8 rounded-full bg-[#3754ED] px-4 text-xs font-semibold text-white hover:bg-[#2942D1]"
                                >
                                  Select room
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-xl border border-[#DFE0E4] p-4">
                    <div className="text-sm text-[#3A478A]">Selected package room</div>
                    <div className="mt-1 text-base font-semibold text-[#010D50]">{formatRoomName(liveSearch.hotel.room?.name) || "Selected room"}</div>
                    {formatRoomHighlights(liveSearch.hotel.room?.highlights).length ? (
                      <div className="mt-1 text-xs text-[#3A478A]">{formatRoomHighlights(liveSearch.hotel.room?.highlights).join(" | ")}</div>
                    ) : null}
                    <div className="mt-2 text-2xl font-bold text-[#010D50]">
                      {money(liveSearch.hotel.price.total, liveSearch.hotel.price.currency || "GBP")}
                    </div>
                    <div className="mt-1 text-xs text-[#3A478A]">
                      Total for {liveSearch.hotel.price.nights} nights, {liveSearch.hotel.price.rooms} room{liveSearch.hotel.price.rooms === 1 ? "" : "s"}.
                    </div>
                    <div className="mt-3 rounded-lg bg-[#F5F7FF] p-3 text-xs leading-5 text-[#3A478A]">
                      Default selection is ranked from live availability using stay preference, star rating, reviews,
                      amenities, meal plan, and budget fit. Pricing uses the provider total with fees included when returned.
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#DFE0E4]">
                    {hotelDetails?.coordinates ? (
                      <iframe
                        src={`https://www.google.com/maps?q=${encodeURIComponent(`${hotelDetails.coordinates.lat},${hotelDetails.coordinates.lng}`)}&z=14&output=embed&hl=en`}
                        title={`Map showing ${liveHotelName}`}
                        className="h-[260px] w-full border-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-[260px] items-center justify-center bg-[#F5F7FF] p-6 text-center text-sm text-[#3A478A]">
                        Map coordinates were not returned for this property.
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={hotelChangeOpen} onOpenChange={setHotelChangeOpen}>
        <DialogContent className="max-h-[min(94vh,900px)] max-w-[min(100vw-24px,1180px)] overflow-hidden bg-white p-0">
          <DialogHeader className="border-b border-[#DFE0E4] px-5 py-4">
            <DialogTitle className="text-[#010D50]">Choose a hotel</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[calc(min(94vh,900px)-76px)] min-h-[560px] grid-cols-1 overflow-hidden lg:grid-cols-[300px_1fr]">
            {liveSearch.hotelLoading && hotelOptions.length === 0 ? (
              <div className="col-span-full m-5 rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">Loading hotel options...</div>
            ) : hotelOptions.length === 0 ? (
              <div className="col-span-full m-5 rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">
                No live hotel options are available for this search yet.
              </div>
            ) : (
              <>
                <aside className="overflow-y-auto border-b border-[#DFE0E4] bg-[#F7F8FE] p-4 lg:border-b-0 lg:border-r">
                  <HotelFiltersSidebar
                    resultCount={filteredHotelOptions.length}
                    value={hotelFilters}
                    onChange={setHotelFilters}
                    onPriceModeChange={(mode) => setHotelFilters((current) => ({ ...current, priceMode: mode }))}
                    onPriceRangeChange={(range) => setHotelFilters((current) => ({ ...current, priceRange: range }))}
                    minPrice={hotelFilterPriceBounds.min}
                    maxPrice={hotelFilterPriceBounds.max}
                    currencySymbol={liveSearch.hotel?.price.currency || hotelOptions[0]?.price.currency || String.fromCharCode(163)}
                    expanded={hotelFiltersExpanded}
                    onToggleExpanded={(key) => setHotelFiltersExpanded((current) => ({ ...current, [key]: !current[key] }))}
                    availableMealPlans={availableHotelMealPlans}
                    availableNeighborhoods={availableHotelNeighborhoods}
                    availableAmenities={availableHotelAmenities}
                    minPriceByStarRating={hotelMinPriceByStarRating}
                    refundableFilterEnabled={hotelRefundableFilterEnabled}
                  />
                </aside>

                <div className="overflow-y-auto p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[#3A478A]">
                      Showing <span className="font-semibold text-[#010D50]">{displayedHotelOptions.length}</span> of{" "}
                      <span className="font-semibold text-[#010D50]">{filteredHotelOptions.length}</span> matching hotels
                    </div>
                    <select
                      value={hotelSortMode}
                      onChange={(event) => setHotelSortMode(event.target.value as HotelChangeSortMode)}
                      className="h-10 rounded-xl border border-[#DFE0E4] bg-white px-3 text-sm text-[#010D50]"
                    >
                      <option value="recommended">Recommended order</option>
                      <option value="price_low">Price low to high</option>
                      <option value="review_score">Rating</option>
                    </select>
                  </div>

                  {filteredHotelOptions.length === 0 ? (
                    <div className="rounded-xl bg-[#F5F7FF] p-4 text-sm text-[#3A478A]">No hotels match the selected filters.</div>
                  ) : (
                    <div className="grid gap-3">
                      {displayedHotelOptions.map((hotel) => {
                        const roomsOpen = expandedHotelRoomsId === hotel.id;
                        const roomOptions = roomOptionsByHotelId[hotel.id] || [];
                        const roomLoading = !!roomOptionsLoadingByHotelId[hotel.id];
                        const roomError = roomOptionsErrorByHotelId[hotel.id];
                        const thumbnailSrc = hotelThumbnailById[hotel.id];
                        return (
                          <div key={hotel.id} className="rounded-xl border border-[#DFE0E4] bg-white p-3">
                            <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
                              <div className="relative h-[92px] overflow-hidden rounded-lg bg-[#F5F7FF]">
                                {thumbnailSrc ? (
                                  <Image
                                    src={thumbnailSrc}
                                    alt={hotel.name}
                                    fill
                                    className="object-cover"
                                    onError={() => {
                                      imageEnrichmentAttemptedRef.current.delete(hotel.id);
                                      setHotelImageFailedById((current) => ({ ...current, [hotel.id]: true }));
                                      setHotelOptions((current) =>
                                        current.map((item) => (item.id === hotel.id ? { ...item, imageSrc: "" } : item))
                                      );
                                    }}
                                  />
                                ) : hotelImageLoadingById[hotel.id] ? (
                                  <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-[#3A478A]">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3754ED]" />
                                      Loading image
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-medium text-[#3A478A]">
                                    No live image available
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[#010D50]">{hotel.name}</div>
                                <div className="mt-2 flex items-center gap-1">
                                  {Array.from({ length: Math.max(1, hotel.starRating || 0) }).map((_, index) => (
                                    <Star key={index} className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]" />
                                  ))}
                                </div>
                                <div className="mt-1 text-xs text-[#3A478A]">{hotel.distanceLabel || hotel.neighborhood || stayPreference}</div>
                                <div className="mt-2 text-xs text-[#3A478A]">
                                  {formatRoomName(hotel.room?.name) || "Room returned by hotel search"}
                                </div>
                                {formatRoomHighlights(hotel.room?.highlights).length ? (
                                  <div className="mt-1 text-xs text-[#3A478A]">{formatRoomHighlights(hotel.room?.highlights).join(" · ")}</div>
                                ) : null}
                                {(hotel.amenities || []).length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {(hotel.amenities || []).slice(0, 3).map((amenity) => (
                                      <span key={amenity} className="rounded-full bg-[#F5F7FF] px-2 py-1 text-[11px] text-[#3A478A]">
                                        {amenity}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-start justify-between gap-3 sm:items-end">
                                <div className="text-base font-bold text-[#010D50]">{money(hotel.price.total, hotel.price.currency || "GBP")}</div>
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => toggleHotelRooms(hotel)}
                                    className="h-9 rounded-full px-4 text-xs font-semibold"
                                  >
                                    {roomsOpen ? "Hide rooms" : "Choose room"}
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => selectHotelOption(hotel)}
                                    className="h-9 rounded-full bg-[#3754ED] px-5 text-xs font-semibold text-white hover:bg-[#2942D1]"
                                  >
                                    Select hotel
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {roomsOpen ? (
                              <div className="mt-3 border-t border-[#DFE0E4] pt-3">
                                {roomLoading ? (
                                  <div className="rounded-lg bg-[#F5F7FF] p-3 text-sm text-[#3A478A]">Loading room options...</div>
                                ) : roomError ? (
                                  <div className="rounded-lg bg-[#FFF7ED] p-3 text-sm text-[#9A3412]">{roomError}</div>
                                ) : null}
                                {roomOptions.length > 0 ? (
                                  <div className="grid gap-2">
                                    {roomOptions.map((room, index) => (
                                      <div key={`${hotel.id}-${room.name}-${index}`} className="flex flex-col gap-3 rounded-lg border border-[#DFE0E4] p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                          <div className="text-sm font-semibold text-[#010D50]">{formatRoomName(room.name)}</div>
                                          {room.board ? <div className="mt-1 text-xs text-[#3A478A]">{room.board}</div> : null}
                                          {room.inclusions?.length ? (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {room.inclusions.slice(0, 4).map((item) => (
                                                <span key={item} className="rounded-full bg-[#F5F7FF] px-2 py-1 text-[11px] text-[#3A478A]">
                                                  {item}
                                                </span>
                                              ))}
                                            </div>
                                          ) : null}
                                          {room.refundable != null ? (
                                            <div className="mt-1 text-xs text-[#3A478A]">{room.refundable ? "Refundable" : "Non-refundable"}</div>
                                          ) : null}
                                        </div>
                                        <div className="flex items-center gap-3 sm:justify-end">
                                          {room.price ? (
                                            <div className="text-sm font-bold text-[#010D50]">{money(room.price, room.currency || hotel.price.currency || "GBP")}</div>
                                          ) : null}
                                          <Button
                                            type="button"
                                            onClick={() => selectHotelOption(hotel, room)}
                                            className="h-9 rounded-full bg-[#3754ED] px-4 text-xs font-semibold text-white hover:bg-[#2942D1]"
                                          >
                                            Select room
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : !roomLoading ? (
                                  <div className="rounded-lg bg-[#F5F7FF] p-3 text-sm text-[#3A478A]">No additional room options returned for this hotel.</div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {hasMoreHotelOptions ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setVisibleHotelOptionCount((current) =>
                              Math.min(current + HOTEL_CHANGE_PAGE_SIZE, filteredHotelOptions.length)
                            )
                          }
                          className="h-11 rounded-xl border-[#DFE0E4] text-sm font-semibold text-[#3754ED]"
                        >
                          Show more hotels
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedActivityDetails)} onOpenChange={(open) => !open && setSelectedActivityDetails(null)}>
        <DialogContent className="max-w-[min(100vw-24px,720px)] bg-white">
          <DialogHeader>
            <DialogTitle className="pr-6 text-[#010D50]">{selectedActivityDetails?.title}</DialogTitle>
          </DialogHeader>
          {selectedActivityDetails && (
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="h-[160px] overflow-hidden rounded-xl bg-[#F5F7FF]">
                {selectedActivityDetails.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedActivityDetails.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Sparkles className="h-6 w-6 text-[#3754ED]" />
                  </div>
                )}
              </div>
              <div>
                <div className="mb-3 flex flex-wrap gap-3 text-xs text-[#3A478A]">
                  {selectedActivityDetails.duration && <span>{selectedActivityDetails.duration}</span>}
                  {selectedActivityDetails.rating && <span>{selectedActivityDetails.rating.toFixed(1)} rating</span>}
                  {selectedActivityDetails.reviewCount && <span>{selectedActivityDetails.reviewCount} reviews</span>}
                  {selectedActivityDetails.price && <span>{money(selectedActivityDetails.price, selectedActivityDetails.currency || "GBP")}</span>}
                </div>
                <p className="line-clamp-6 text-sm leading-6 text-[#3A478A]">
                  {selectedActivityDetails.description || "Viator activity details are available from the supplier."}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => toggleActivity(selectedActivityDetails.productCode)}
                    className="flex-1 rounded-xl bg-[#3754ED] text-white hover:bg-[#2942D1]"
                  >
                    {selectedActivityCodes.includes(selectedActivityDetails.productCode) ? "Remove from trip" : "Add to trip"}
                  </Button>
                  {selectedActivityDetails.webUrl && (
                    <a
                      href={selectedActivityDetails.webUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#DFE0E4] px-4 text-sm font-semibold text-[#010D50]"
                    >
                      Supplier page
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addDestinationOpen} onOpenChange={setAddDestinationOpen}>
        <DialogContent className="max-w-[min(100vw-24px,680px)] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#010D50]">Add a destination</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-[#010D50]">Destination</span>
              <PackageDestinationAutocomplete
                value={newDestination}
                onChange={setNewDestination}
                placeholder="Search destination"
              />
            </label>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-[#010D50]">Stay dates</span>
              <DatePicker
                startDate={parseIsoDate(newDestinationCheckIn)}
                endDate={parseIsoDate(newDestinationCheckOut)}
                minDate={nextDestinationMinDate}
                onStartDateChange={(date) => {
                  if (!date || isBeforeDateOnly(date, nextDestinationMinDate)) return;
                  const nextStart = formatIsoDate(date);
                  setNewDestinationCheckIn(nextStart);
                  const currentEnd = parseIsoDate(newDestinationCheckOut);
                  if (currentEnd && isBeforeDateOnly(currentEnd, date)) setNewDestinationCheckOut("");
                }}
                onEndDateChange={(date) => {
                  if (!date || isBeforeDateOnly(date, nextDestinationMinDate)) return;
                  setNewDestinationCheckOut(formatIsoDate(date));
                }}
                onDone={() => undefined}
                className="max-w-none border border-[#DFE0E4] shadow-none"
              />
              <p className="text-xs text-[#5E6B8A]">
                Next stays start from {shortDate(formatIsoDate(nextDestinationMinDate), "the current trip end date")} or later.
              </p>
            </div>
            {addDestinationError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {addDestinationError}
              </div>
            )}
            <Button
              type="button"
              onClick={addDestination}
              disabled={addDestinationLoading || !newDestination || !newDestinationCheckIn || !newDestinationCheckOut}
              className="h-11 rounded-xl bg-[#3754ED] text-white hover:bg-[#2942D1]"
            >
              {addDestinationLoading ? "Refreshing search..." : "Add destination"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

export default function AiPackagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AiPackageContent />
    </Suspense>
  );
}
