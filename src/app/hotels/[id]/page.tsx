"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Star,
  Building2,
  Calendar,
  Plane,
  Users,
  SlidersHorizontal,
  Wifi,
  Maximize,
  Users as UsersIcon,
  Bed,
  Trees,
  Building,
  PawPrint,
  Bus,
  Dumbbell,
  Sparkles,
  Wind,
  Bath,
  X,
  Loader2,
  MapPin,
} from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import HotelGallery from "@/components/hotels/HotelGallery";
import { hotelService } from "@/services/api/hotelService";
import { packageService } from "@/services/api/packageService";
import { useBookingStore, useStoreHydration } from "@/store/bookingStore";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import { resolveTrustYouHotelId } from "@/lib/trustyou/hotelMapping";
import type { TrustYouHotelReviewSummary } from "@/types/trustyou";
import type { HolidayPackageViewResponse, AccommodationViewResponse, ViewRoomOption } from "@/types/holidayPackage";
import { resolvePackagePricing } from "@/lib/package/pricing";
import { calculatePackagePerPersonPrice } from "@/lib/package/passengers";
import {
  buildHotelChildAgesFromFlat,
  flattenHotelChildAges,
  serializeHotelChildAges,
} from "@/lib/hotels/childAges";
import { ensureGiataImageUrl, fixStubaImageUrl } from "@/lib/hotels/imageUrl";
import { syncPdpUrl } from "@/lib/hotels/syncPdpUrl";
import { decodeHotelSearchContext } from "@/lib/hotels/searchContextCodec";
import { convertHotelLocalTaxTotal, formatMoneyFromCode, normalizeCurrencyCode } from "@/lib/currency/localTaxDisplay";
import { parsePackageHotelContent, type PackageHotelNearbyPlace } from "@/lib/package/hotelContent";
import { usePackageDeeplink } from "@/hooks/usePackageDeeplink";

function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200/70 rounded-xl ${className}`} />;
}

function formatIsoDateLabel(d?: string): string {
  const s = String(d || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "Add Date";
  return s;
}

function formatStayDate(d?: string): string {
  const s = String(d || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const dt = new Date(`${s}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function calculateStayNights(checkIn?: string, checkOut?: string): number {
  const inDate = new Date(`${String(checkIn || "").slice(0, 10)}T00:00:00`);
  const outDate = new Date(`${String(checkOut || "").slice(0, 10)}T00:00:00`);
  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) return 0;
  const nights = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, nights);
}

function shiftIsoDateByDays(isoDate: string, days: number): string {
  const s = String(isoDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDisplayPrice(currency: string | undefined, amount: number | undefined): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "";
  const normalizedCurrency = String(currency || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(normalizedCurrency)) {
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: normalizedCurrency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fall back to prefix formatting below.
    }
  }

  const prefix = String(currency || "").trim() || "£";
  return `${prefix}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatFlightClock(value: number | string | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "—";
  const normalized = digits.slice(-4).padStart(4, "0");
  const hh = Number(normalized.slice(0, 2));
  const mm = Number(normalized.slice(2, 4));
  if (hh > 23 || mm > 59) return "—";
  return `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}`;
}

function formatMinutesToDuration(totalMinutes: number | undefined): string {
  const minutes = Number(totalMinutes || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

type UnknownRecord = Record<string, unknown>;

interface RoomAmenity {
  label: string;
  icon: string;
}

interface RoomCardData {
  id: string;
  sourceRoomOptionId?: string;
  name: string;
  bedType: string;
  reviews: {
    score: number;
    label: string;
    count: number;
  };
  isRefundable: boolean;
  paymentType: string;
  amenities: RoomAmenity[];
  price: {
    currency: string;
    nightly: number;
    total: number;
  };
  _raw: UnknownRecord;
}

function selectedRoomIdsFromCounts(counts: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [roomId, countRaw] of Object.entries(counts)) {
    const count = Math.max(0, Number(countRaw || 0));
    for (let i = 0; i < count; i += 1) out.push(roomId);
  }
  return out;
}

function countSelectedRooms(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + Math.max(0, Number(count || 0)), 0);
}

function buildSelectedRoomSummary(
  hotelId: string,
  selectedRoomIds: string[],
  allRooms: RoomCardData[]
) {
  if (!hotelId || selectedRoomIds.length === 0) return null;

  const selectedRooms = selectedRoomIds
    .map((roomId) => allRooms.find((room) => String(room.id) === String(roomId)))
    .filter((room): room is RoomCardData => !!room);
  if (selectedRooms.length === 0) return null;

  const firstRoom = selectedRooms[0];
  const currency = firstRoom.price?.currency;
  const total = selectedRooms.reduce((sum, room) => sum + Number(room.price?.total || 0), 0);
  const nightly = selectedRooms.reduce((sum, room) => sum + Number(room.price?.nightly || 0), 0);
  const uniqueRoomNames = Array.from(new Set(selectedRooms.map((room) => room.name).filter(Boolean)));
  const uniqueMealPlans = Array.from(new Set(selectedRooms.map((room) => room.bedType).filter(Boolean)));
  const allRefundable = selectedRooms.every((room) => room.isRefundable);

  const aggregatedTaxes = (() => {
    const allTaxItems: import('@/types/hotel').HotelBedsTaxItem[] = [];
    let hasAny = false;
    let allInc = true;
    for (const room of selectedRooms) {
      const raw = room._raw as Record<string, unknown>;
      const hbTaxes = (raw.hotelBedsTaxes ?? (raw._hotelbeds as any)?.taxes) as
        import('@/types/hotel').HotelTaxBreakdown | null | undefined;
      if (hbTaxes && Array.isArray(hbTaxes.taxes)) {
        hasAny = true;
        if (!hbTaxes.allIncluded) allInc = false;
        allTaxItems.push(...hbTaxes.taxes);
      }
    }
    if (!hasAny) return null;
    return { allIncluded: allInc, taxes: allTaxItems } as import('@/types/hotel').HotelTaxBreakdown;
  })();

  return {
    hotelId,
    roomId: String(firstRoom.id),
    roomName: uniqueRoomNames.length === 1 ? uniqueRoomNames[0] : `${selectedRooms.length} rooms selected`,
    mealName: uniqueMealPlans.length === 1 ? uniqueMealPlans[0] : "Multiple meal plans",
    isRefundable: allRefundable,
    currency,
    total,
    nightly,
    hotelbedsRateKey:
      selectedRooms.length === 1 ? (selectedRooms[0]?._raw?.rateKey as string | undefined) : undefined,
    hotelBedsTaxes: aggregatedTaxes,
  };
}

interface HotelContentApiResponse {
  ok?: boolean;
  imageUrl?: string;
  hotelImages?: string[];
  amenities?: string[];
  roomImages?: Record<string, string[]>;
  description?: string;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  const maybeRecord = asRecord(error);
  if (typeof maybeRecord.message === "string" && maybeRecord.message.trim()) return maybeRecord.message.trim();
  return fallback;
}

// Icon mapping for amenities
const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pets: PawPrint,
  shuttle: Bus,
  gym: Dumbbell,
  spa: Sparkles,
  ac: Wind,
  hot_tub: Bath,
  pool: Bath,
  wifi: Wifi,
  restaurant: Building,
  parking: Building,
  fullscreen: Maximize,
  group: UsersIcon,
  bed: Bed,
  nature: Trees,
  city: Building,
  bathtub: Bath,
  kitchen: Building,
};

function getAmenityIcon(iconName: string) {
  const Icon = amenityIcons[iconName];
  return Icon ? <Icon className="w-[18px] h-[18px] text-[#010D50]" /> : null;
}

function normalizeAmenityLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (!value || typeof value !== "object") return "";

  const entry = value as Record<string, unknown>;
  const candidate =
    entry.label ??
    entry.name ??
    entry.description ??
    entry.title ??
    entry.Text ??
    entry.text ??
    entry.amenity ??
    entry.value;

  return typeof candidate === "string" || typeof candidate === "number" ? String(candidate).trim() : "";
}

// Map raw amenity text from API to { label, icon } format
function mapAmenityTextToIcon(text: unknown): string {
  const label = normalizeAmenityLabel(text);
  if (!label) return "";

  const lowered = label.toLowerCase();
  if (lowered.includes("wi-fi") || lowered.includes("wifi") || lowered.includes("internet")) return "wifi";
  if (lowered.includes("pool") || lowered.includes("swim")) return "pool";
  if (lowered.includes("gym") || lowered.includes("fitness")) return "gym";
  if (lowered.includes("spa") || lowered.includes("massage") || lowered.includes("sauna")) return "spa";
  if (lowered.includes("restaurant") || lowered.includes("dining") || lowered.includes("breakfast")) return "restaurant";
  if (lowered.includes("parking") || lowered.includes("car park")) return "parking";
  if (lowered.includes("shuttle") || lowered.includes("transfer") || lowered.includes("airport")) return "shuttle";
  if (lowered.includes("pet") || lowered.includes("animal")) return "pets";
  if (lowered.includes("air condition") || lowered.includes("a/c") || lowered.includes("cooling")) return "ac";
  if (lowered.includes("hot tub") || lowered.includes("jacuzzi") || lowered.includes("whirlpool")) return "hot_tub";
  if (lowered.includes("bath") || lowered.includes("shower")) return "bathtub";
  if (lowered.includes("kitchen") || lowered.includes("cooking")) return "kitchen";
  if (lowered.includes("bed") || lowered.includes("room")) return "bed";
  if (lowered.includes("city") || lowered.includes("urban")) return "city";
  if (lowered.includes("garden") || lowered.includes("nature") || lowered.includes("outdoor")) return "nature";
  if (lowered.includes("group") || lowered.includes("conference") || lowered.includes("meeting")) return "group";
  return ""; // No icon match
}

function transformAmenities(rawAmenities: unknown[]): { label: string; icon: string }[] {
  return rawAmenities
    .map((amenity) => {
      const label = normalizeAmenityLabel(amenity);
      if (!label) return null;
      return {
        label,
        icon: mapAmenityTextToIcon(label),
      };
    })
    .filter((amenity): amenity is { label: string; icon: string } => Boolean(amenity));
}

function sanitizeHotelText(value: unknown): string {
  const text = String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r/g, "")
    .trim();

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

function sanitizeRoomDisplayText(value: unknown): string {
  const text = sanitizeHotelText(value).replace(/\s+/g, " ").trim();
  if (!text) return "";

  const lettersOnly = text.replace(/[^A-Za-z]/g, "");
  const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
  if (!isAllCaps) return text;

  return text
    .toLowerCase()
    .replace(/\b[a-z]/g, (match) => match.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOr\b/g, "or")
    .replace(/\bOf\b/g, "of");
}

function splitHotelTextIntoParagraphs(value: unknown): string[] {
  return sanitizeHotelText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function extractAmenitiesFromDescription(description: string): string[] {
  const text = description.toLowerCase();
  const amenityByKeyword: Array<[string, string]> = [
    ["wifi", "Free WiFi"],
    ["internet", "Internet access"],
    ["restaurant", "Restaurant"],
    ["bar", "Bar"],
    ["fitness", "Fitness centre"],
    ["gym", "Gym"],
    ["pool", "Swimming pool"],
    ["laundry", "Laundry service"],
    ["concierge", "Concierge service"],
    ["currency exchange", "Currency exchange"],
    ["24-hour reception", "24-hour reception"],
    ["business centre", "Business centre"],
    ["meeting room", "Meeting rooms"],
  ];

  const matches = amenityByKeyword
    .filter(([keyword]) => text.includes(keyword))
    .map(([, label]) => label);

  return Array.from(new Set(matches));
}

function extractAmenitiesFromGetRoomsResponse(payload: unknown): string[] {
  const row = payload as Record<string, unknown> | null;
  const labels = new Set<string>();

  const pushAmenity = (value: unknown) => {
    const normalized = sanitizeHotelText(value);
    if (normalized) labels.add(normalized);
  };

  const collectFromArray = (source: unknown) => {
    if (!Array.isArray(source)) return;
    source.forEach((row) => {
      if (typeof row === "string") {
        pushAmenity(row);
        return;
      }
      if (!row || typeof row !== "object") return;
      const entry = row as Record<string, unknown>;
      pushAmenity(
        entry.label ??
        entry.name ??
        entry.description ??
        entry.title ??
        entry.Text ??
        entry.amenity ??
        entry.value
      );
    });
  };

  collectFromArray(row?.amenities);
  collectFromArray(row?.attributes);
  collectFromArray(row?.facilities);
  collectFromArray(row?.hotelAmenities);
  collectFromArray(row?.hotel_facilities);

  const descriptionAmenities = extractAmenitiesFromDescription(
    sanitizeHotelText(row?.quickDescription ?? row?.description ?? "")
  );
  descriptionAmenities.forEach((label) => labels.add(label));

  return Array.from(labels).slice(0, 24);
}

function extractTextSnippets(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number") {
    const text = sanitizeHotelText(value);
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractTextSnippets(entry));
  }
  if (typeof value !== "object") return [];

  const row = value as Record<string, unknown>;
  const candidates = [
    row.text,
    row.Text,
    row.description,
    row.label,
    row.value,
    row.title,
    row.content,
    row.message,
    row.policy,
    row.cancellationPolicy,
    row.cancellation_policy,
    row.note,
    row.notes,
    row.remarks,
    row.information,
    row.instructions,
  ];

  return candidates
    .map((candidate) => sanitizeHotelText(candidate))
    .filter(Boolean);
}

function joinUniqueTextBlocks(blocks: string[], separator = "\n\n"): string {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const block of blocks) {
    const normalized = sanitizeHotelText(block);
    if (!normalized) continue;
    const key = normalized.replace(/\s+/g, " ").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out.join(separator);
}

function mergeTextContent(existing: string, incoming: string, separator = "\n\n"): string {
  return joinUniqueTextBlocks([existing, incoming], separator);
}

function extractRoomOptions(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const row = payload as Record<string, unknown>;
  const rooms = row.rooms && typeof row.rooms === "object" ? (row.rooms as Record<string, unknown>) : null;
  const room1options = Array.isArray(rooms?.room1options)
    ? rooms.room1options
    : Array.isArray(row.room1options)
      ? row.room1options
      : [];

  return room1options.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
}

function extractPoliciesFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const row = payload as Record<string, unknown>;
  const policyBlocks: string[] = [];
  const add = (value: unknown) => {
    policyBlocks.push(...extractTextSnippets(value));
  };

  add(row.cancellation_policy);
  add(row.cancellationPolicy);
  add(row.policy);
  add(row.policies);
  add(row.cancellation);
  add(row.Cancellation);
  add(row.refundPolicy);
  add(row.refundableInfo);
  add(row.termsAndConditions);
  add(row.terms_conditions);
  add(row.accommodation_rules);
  add(row.accomodation_rules);

  const cancellations = Array.isArray(row.Cancellation) ? row.Cancellation : [];
  cancellations.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const cancellationRow = (entry as Record<string, unknown>).SearchResultCancellation;
    if (cancellationRow && typeof cancellationRow === "object") {
      add((cancellationRow as Record<string, unknown>).cancellationPolicy);
    }
  });

  extractRoomOptions(payload).forEach((option) => {
    add(option.cancellation_policy);
    add(option.cancellationPolicy);

    const hotelbeds = option._hotelbeds;
    if (!hotelbeds || typeof hotelbeds !== "object") return;
    const hbRow = hotelbeds as Record<string, unknown>;
    const cancellationPolicies = Array.isArray(hbRow.cancellationPolicies) ? hbRow.cancellationPolicies : [];
    cancellationPolicies.forEach((cancellation) => {
      if (!cancellation || typeof cancellation !== "object") {
        add(cancellation);
        return;
      }
      const cancellationRow = cancellation as Record<string, unknown>;
      add(cancellationRow.policy);
      add(cancellationRow.description);
      add(cancellationRow.text);
    });
  });

  return joinUniqueTextBlocks(policyBlocks);
}

function extractImportantInfoFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const row = payload as Record<string, unknown>;
  const lines: string[] = [];

  const addLine = (value: unknown) => {
    const normalized = normalizeImportantInfoLine(value);
    if (normalized) lines.push(normalized);
  };

  const addLabeledLine = (label: string, value: unknown) => {
    const normalized = sanitizeHotelText(value);
    if (!normalized) return;
    addLine(`${label}: ${normalized}`);
  };

  const collectImportantInfoFromArray = (source: unknown) => {
    if (!Array.isArray(source)) return;
    source.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        const normalized = normalizeImportantInfoLine(entry);
        if (normalized && isLikelyImportantInfoLabel(normalized)) lines.push(normalized);
        return;
      }

      const rowEntry = entry as Record<string, unknown>;
      const candidate = sanitizeFacilityText(
        rowEntry.name ??
        rowEntry.label ??
        rowEntry.description ??
        rowEntry.value ??
        rowEntry.title ??
        rowEntry.Text ??
        rowEntry.text
      );
      if (!candidate) return;
      if (isLikelyImportantInfoLabel(candidate)) {
        lines.push(candidate);
      }
    });
  };

  addLine(row.importantInfo);
  addLine(row.important_information);
  addLine(row.importantInformation);

  normalizeImportantInfoText(row.accommodation_rules)
    .split("\n")
    .forEach((line) => addLine(line));
  normalizeImportantInfoText(row.accomodation_rules)
    .split("\n")
    .forEach((line) => addLine(line));
  normalizeImportantInfoText(row.hotel_information)
    .split("\n")
    .forEach((line) => addLine(line));
  normalizeImportantInfoText(row.roomDetail)
    .split("\n")
    .forEach((line) => addLine(line));
  normalizeImportantInfoText(row.otherDetail)
    .split("\n")
    .forEach((line) => addLine(line));

  addLabeledLine("Check-in", row.checkInHour ?? row.check_in_hour ?? row.check_in);
  addLabeledLine("Check-out", row.checkOutHour ?? row.check_out_hour ?? row.check_out);

  collectImportantInfoFromArray(row.Facility);
  collectImportantInfoFromArray(row.facilities);
  collectImportantInfoFromArray(row.attributes);
  collectImportantInfoFromArray(row.hotel_facilities);

  return joinUniqueTextBlocks(lines, "\n");
}

function extractSearchResultHotelData(payload: unknown): {
  description: string;
  amenities: string[];
  policies: string;
  importantInfo: string;
  coordinates: { lat: number; lng: number } | null;
} {
  if (!payload || typeof payload !== "object") {
    return {
      description: "",
      amenities: [],
      policies: "",
      importantInfo: "",
      coordinates: null,
    };
  }

  const row = payload as Record<string, unknown>;
  const description = joinUniqueTextBlocks([
    sanitizeHotelText(row.quickDescription),
    sanitizeHotelText(row.shortDescription),
    sanitizeHotelText(row.description),
    sanitizeHotelText((row.hotels as Record<string, unknown> | undefined)?.quickDescription),
  ]);

  const lat = Number(row.geo_loc_latitude ?? row.latitude);
  const lng = Number(row.geo_loc_longitude ?? row.longitude);
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
    ? { lat, lng }
    : null;

  return {
    description,
    amenities: extractAmenitiesFromGetRoomsResponse(row),
    policies: extractPoliciesFromPayload(row),
    importantInfo: extractImportantInfoFromPayload(row),
    coordinates,
  };
}

function normalizeRemoteImageUrl(value: unknown): string {
  const url = String(value || "").trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : "";
}

function imageDedupKey(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const pathname = parsed.pathname
      .replace(/\/+$/, "")
      // Hotelbeds often returns the same photo under size variants like
      // `/giata/bigger/...` and `/giata/original/...`; treat them as one image.
      .replace(/\/giata\/(?:bigger|xl|original)\//i, "/giata/");
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${pathname.toLowerCase()}`;
  } catch {
    return raw
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "")
      .replace(/\/giata\/(?:bigger|xl|original)\//i, "/giata/")
      .toLowerCase();
  }
}

function mergeUniqueImages(...sources: Array<Array<unknown> | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      const url = String(entry || "").trim();
      if (!url) continue;
      const key = imageDedupKey(url);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(url);
    }
  }

  return out;
}

function flattenRoomImages(roomImages: Record<string, string[]> | null | undefined): string[] {
  if (!roomImages || typeof roomImages !== "object") return [];
  return Object.values(roomImages).flatMap((urls) => (Array.isArray(urls) ? urls.filter(Boolean) : []));
}

function normalizeDeeplinkImageCandidate(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const fixed = fixStubaImageUrl(raw);
  if (fixed) return fixed;
  return normalizeRemoteImageUrl(raw);
}

function extractDeeplinkImagesFromRow(row: UnknownRecord): string[] {
  const directCandidates = [
    row.image_name,
    row.image,
    row.image_url,
    row.imageUrl,
    row.room_image,
    row.roomImage,
    row.printed_image_url,
    row.source_image_url,
    row.url,
  ]
    .map(normalizeDeeplinkImageCandidate)
    .filter(Boolean);

  const groupedCandidates = [
    ...asArray(row.images),
    ...asArray(row.room_images),
    ...asArray(row.roomImages),
    ...asArray(row.gallery),
    ...asArray(row.photos),
    ...asArray(row.VendorImages),
  ]
    .flatMap((entry) => {
      if (typeof entry === "string") return [normalizeDeeplinkImageCandidate(entry)];
      const nested = asRecord(entry);
      const vendorImage = asRecord(nested.VendorImage);
      return [
        normalizeDeeplinkImageCandidate(vendorImage.printed_image_url),
        normalizeDeeplinkImageCandidate(vendorImage.source_image_url),
        normalizeDeeplinkImageCandidate(vendorImage.url),
        normalizeDeeplinkImageCandidate(nested.url),
        normalizeDeeplinkImageCandidate(nested.image),
        normalizeDeeplinkImageCandidate(nested.image_url),
        normalizeDeeplinkImageCandidate(nested.image_name),
      ];
    })
    .filter(Boolean);

  return mergeUniqueImages(directCandidates, groupedCandidates);
}

function sanitizeFacilityText(value: unknown): string {
  const text = sanitizeHotelText(value).replace(/^[^A-Za-z0-9]+/, "").trim();
  if (!text || /^\d+$/.test(text)) return "";
  return text;
}

function isLikelyAmenityLabel(text: string): boolean {
  if (!text) return false;
  const lowered = text.toLowerCase();
  if (["hotel", "resort", "apartment", "apartments", "hostel"].includes(lowered)) return false;
  if (/^(year of|total number of|number of|check-in|check out|check-out|minimum age|minimum check-in age|credit card|visa|mastercard|american express|tax|deposit|identity card|identification)/i.test(text)) {
    return false;
  }

  if (mapAmenityTextToIcon(text)) return true;

  return /(wifi|internet|pool|gym|fitness|spa|sauna|restaurant|bar|breakfast|parking|shuttle|airport|laundry|concierge|business centre|meeting room|air condition|room service|wheelchair|accessible|lift|elevator|pet|garden|terrace|sun terrace)/i.test(
    text
  );
}

function isLikelyImportantInfoLabel(text: string): boolean {
  if (!text || isLikelyAmenityLabel(text)) return false;
  if (/(total number of|number of floors|number of rooms|year of (construction|renovation|last renovation|build))/i.test(text)) return false;
  return /(check-in|check out|check-out|minimum check-in age|minimum age|credit card|identity card|identification|small pets allowed|pets allowed|deposit|city tax|tourism tax)/i.test(
    text
  );
}

function normalizeImportantInfoLine(value: unknown): string {
  const text = sanitizeHotelText(value).replace(/\s+/g, " ").trim();
  if (!text) return "";

  if (
    /^(check[-\s]?in|check[-\s]?out)(\s+(hour|time))?$/i.test(text) ||
    /^total number of rooms:?$/i.test(text) ||
    /^(hour|time)$/i.test(text)
  ) {
    return "";
  }

  if (/(total number of rooms|number of floors|number of rooms|year of (construction|renovation|last renovation|build))/i.test(text)) {
    return "";
  }

  if (/(check[-\s]?in|check[-\s]?out)/i.test(text) && !/\d/.test(text) && !/\b(am|pm)\b/i.test(text)) {
    return "";
  }

  if (/(number of|minimum age|check[-\s]?in age|year of|floors?)/i.test(text) && !/\d/.test(text)) {
    return "";
  }

  if (/^[^A-Za-z0-9]*$/.test(text)) return "";
  return text;
}

function normalizeImportantInfoText(value: unknown): string {
  const text = sanitizeHotelText(value);
  if (!text) return "";

  const lines = text
    .split("\n")
    .map((line) => normalizeImportantInfoLine(line))
    .filter(Boolean);

  return joinUniqueTextBlocks(lines, "\n");
}

function extractVyspaGetHotelDetailsData(payload: unknown): {
  description: string;
  amenities: string[];
  importantInfo: string;
  policies: string;
  galleryImages: string[];
  coordinates: { lat: number; lng: number } | null;
} {
  if (!payload || typeof payload !== "object") {
    return {
      description: "",
      amenities: [],
      importantInfo: "",
      policies: "",
      galleryImages: [],
      coordinates: null,
    };
  }

  const row = payload as Record<string, unknown>;
  const hotelInfo = row.HotelInfo && typeof row.HotelInfo === "object"
    ? (row.HotelInfo as Record<string, unknown>)
    : null;
  const hotelContent = hotelInfo?.HotelContent && typeof hotelInfo.HotelContent === "object"
    ? (hotelInfo.HotelContent as Record<string, unknown>)
    : null;

  const description = joinUniqueTextBlocks([
    sanitizeHotelText(row.description),
    sanitizeHotelText(row.quickDescription),
    sanitizeHotelText((row.hotels as Record<string, unknown> | undefined)?.quickDescription),
    sanitizeHotelText(hotelContent?.quickDescription),
    sanitizeHotelText(hotelContent?.accomIntro),
    sanitizeHotelText(hotelContent?.diningIntro),
    sanitizeHotelText(hotelContent?.recreationIntro),
    sanitizeHotelText(hotelContent?.businessIntro),
    sanitizeHotelText(hotelContent?.amenitiesIntro),
    sanitizeHotelText(hotelContent?.locationIntro),
    sanitizeHotelText(hotelContent?.othersIntro),
    sanitizeHotelText(hotelContent?.otherDetail),
  ]);

  const facilityTexts = new Set<string>();
  const hotelFacilities = Array.isArray((row.HotelFacility as Record<string, unknown> | undefined)?.HotelFacilities)
    ? ((row.HotelFacility as Record<string, unknown>).HotelFacilities as unknown[])
    : [];
  hotelFacilities.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const facilityRow = (entry as Record<string, unknown>).HotelFacility;
    const normalized = sanitizeFacilityText(
      facilityRow && typeof facilityRow === "object"
        ? (facilityRow as Record<string, unknown>).name
        : (entry as Record<string, unknown>).name
    );
    if (normalized) facilityTexts.add(normalized);
  });

  const flatFacilities = Array.isArray(row.Facility) ? row.Facility : [];
  flatFacilities.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      const normalized = sanitizeFacilityText(entry);
      if (normalized) facilityTexts.add(normalized);
      return;
    }
    const facilityRow = entry as Record<string, unknown>;
    const normalized = sanitizeFacilityText(
      facilityRow.name ??
      facilityRow.label ??
      facilityRow.description ??
      facilityRow.value ??
      facilityRow.title
    );
    if (normalized) facilityTexts.add(normalized);
  });

  const amenities = Array.from(facilityTexts).filter((text) => isLikelyAmenityLabel(text)).slice(0, 24);

  const importantInfo = joinUniqueTextBlocks([
    ...Array.from(facilityTexts)
      .filter((text) => isLikelyImportantInfoLabel(text))
      .map((line) => normalizeImportantInfoLine(line))
      .filter(Boolean),
    ...normalizeImportantInfoText(hotelContent?.roomDetail)
      .split("\n")
      .filter(Boolean),
    ...normalizeImportantInfoText(hotelContent?.otherDetail)
      .split("\n")
      .filter(Boolean),
  ], "\n");

  const policies = joinUniqueTextBlocks([
    ...extractTextSnippets(hotelInfo?.HotelRemarks),
    ...extractTextSnippets(row.accomodation_rules),
    ...extractTextSnippets(row.Cancellation),
  ]);

  const vendorImages = Array.isArray(row.VendorImages) ? row.VendorImages : [];
  const galleryImages = vendorImages
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const vendorRow = (entry as Record<string, unknown>).VendorImage;
      if (vendorRow && typeof vendorRow === "object") {
        const v = vendorRow as Record<string, unknown>;
        return normalizeRemoteImageUrl(v.printed_image_url || v.source_image_url || v.url);
      }
      return normalizeRemoteImageUrl((entry as Record<string, unknown>).url);
    })
    .filter(Boolean)
    .slice(0, 24);

  const lat = Number(hotelContent?.latitude ?? row.geo_loc_latitude ?? row.latitude);
  const lng = Number(hotelContent?.longitude ?? row.geo_loc_longitude ?? row.longitude);
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
    ? { lat, lng }
    : null;

  return {
    description,
    amenities,
    importantInfo,
    policies,
    galleryImages: Array.from(new Set(galleryImages)),
    coordinates,
  };
}

function toPositiveNumericId(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return s;
}

function trustYouIdFromRecord(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const nestedHotelBeds = asRecord(row._hotelbeds);
  return resolveTrustYouHotelId({
    candidateIds: [
      row.ty_id,
      row.tyId,
      row.trustyou_id,
      row.trustyouId,
      row.trust_you_id,
      nestedHotelBeds.ty_id,
      nestedHotelBeds.tyId,
      nestedHotelBeds.trustyou_id,
      nestedHotelBeds.trustyouId,
    ].map((value) => String(value || "").trim()),
  });
}

function resolveHotelResultId(result: unknown): string {
  const row = asRecord(result);
  const hotelId = toPositiveNumericId(row.hotel_id ?? row.hotelId);
  if (hotelId) return hotelId;
  const srId = toPositiveNumericId(row.id ?? row.srId);
  if (srId) return srId;
  return "";
}

export default function HotelRoomsPage() {
  const params = useParams();
  const hasHydrated = useStoreHydration();

  const hotelId = params?.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchCriteriaId = searchParams.get("searchCriteriaId");
  const urlSrId = searchParams.get("srId");
  const urlProvider = searchParams.get("provider");
  const urlTyId = searchParams.get("tyId");

  // Detect if we're in package (flight+hotel) mode
  const isPackageMode = searchParams.get("type") === "package";

  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const packageSearch = useBookingStore((s) => s.packageSearch);
  const packageResults = useBookingStore((s) => s.packageResults);
  const packageResultsMeta = useBookingStore((s) => s.packageResultsMeta);
  const selectedPackage = useBookingStore((s) => s.selectedPackage);
  const hotelResultsMeta = useBookingStore((s) => s.hotelResultsMeta);
  const setSelectedHotel = useBookingStore((s) => s.setSelectedHotel);
  const setSelectedHotelRoomIds = useBookingStore((s) => s.setSelectedHotelRoomIds);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const setHotelDetailsCache = useBookingStore((s) => s.setHotelDetailsCache);
  const setSelectedHotelRoomSummary = useBookingStore((s) => s.setSelectedHotelRoomSummary);
  const setHotelSearch = useBookingStore((s) => s.setHotelSearch);
  const setHotelResultsMeta = useBookingStore((s) => s.setHotelResultsMeta);
  const hotelFiltersCache = useBookingStore((s) => s.hotelFiltersCache);
  const setSearchRequestId = useBookingStore((s) => s.setSearchRequestId);
  const deeplinkViewData = useBookingStore((s) => s.deeplinkViewData);
  const setDeeplinkViewData = useBookingStore((s) => s.setDeeplinkViewData);
  const isFromDeeplink = useBookingStore((s) => s.isFromDeeplink);

  // Handle deeplink entry (packageKey/hotelKey URL params)
  usePackageDeeplink();

  // Hydrate hotelSearch from URL params when the store is empty (fresh browser tab).
  // This ensures the page can load rooms even without prior session state.
  useEffect(() => {
    if (!hasHydrated) return;
    if (hotelSearch) return;
    if (isPackageMode) return;
    if (deeplinkViewData?.success) return;

    const urlCtx = searchParams.get("ctx");
    const decoded = urlCtx ? decodeHotelSearchContext(urlCtx) : null;

    if (decoded) {
      setHotelSearch({
        ...decoded,
        provider: decoded.provider ?? (urlProvider === "hotelbeds" || urlProvider === "vyspa" ? urlProvider as "hotelbeds" | "vyspa" : undefined),
        searchCriteriaId: decoded.searchCriteriaId ?? (urlSearchCriteriaId ? (Number(urlSearchCriteriaId) || urlSearchCriteriaId) : undefined),
      });
      if (decoded.searchCriteriaId) {
        setSearchRequestId(String(decoded.searchCriteriaId));
      }
      return;
    }

    const urlLocation = searchParams.get("location");
    const urlHiddenId = searchParams.get("hidden_id");
    const urlHiddenKey = searchParams.get("hidden_key");
    const urlCheckIn = searchParams.get("checkIn");
    const urlCheckOut = searchParams.get("checkOut");
    const urlRooms = searchParams.get("rooms");
    const urlAdults = searchParams.get("adults");
    const urlChildren = searchParams.get("children");
    const urlChildAge = searchParams.get("child_age");
    const urlBranches = searchParams.get("branches");
    const urlArrivalPointCode = searchParams.get("arrivalPointCode");

    if (!urlSearchCriteriaId && !urlLocation) return;

    const children = urlChildren != null ? Number(urlChildren) : 0;
    const rooms = urlRooms != null ? Number(urlRooms) : 1;
    const adults = urlAdults != null ? Number(urlAdults) : 2;

    setHotelSearch({
      provider: (urlProvider === "hotelbeds" || urlProvider === "vyspa") ? urlProvider as "hotelbeds" | "vyspa" : undefined,
      location: urlLocation || "",
      hidden_id: urlHiddenId || "",
      hidden_key: urlHiddenKey || "",
      checkIn: urlCheckIn || "",
      checkOut: urlCheckOut || "",
      rooms,
      adults,
      children,
      child_age: urlChildAge ? buildHotelChildAgesFromFlat(
        flattenHotelChildAges(
          serializeHotelChildAges(urlChildAge, rooms, children),
          rooms,
          children
        ),
        rooms,
        children,
      ) : undefined,
      branches: urlBranches || undefined,
      searchCriteriaId: urlSearchCriteriaId ? (Number(urlSearchCriteriaId) || urlSearchCriteriaId) : undefined,
      arrivalPointCode: urlArrivalPointCode || undefined,
    });

    if (urlSearchCriteriaId) {
      setSearchRequestId(String(urlSearchCriteriaId));
    }
  }, [hasHydrated, hotelSearch, isPackageMode, deeplinkViewData?.success]);

  // State
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [activeSection, setActiveSection] = useState("Overview");
  const [remoteHotelHeader, setRemoteHotelHeader] = useState<{
    name: string;
    rating: number;
    image?: string;
    address?: string;
  } | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [detailsText, setDetailsText] = useState<string>("");
  const [cancellationText, setCancellationText] = useState<string>("");
  const [importantInfoText, setImportantInfoText] = useState<string>("");
  const [remoteAmenities, setRemoteAmenities] = useState<string[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PackageHotelNearbyPlace[]>([]);
  const [remoteRooms, setRemoteRooms] = useState<RoomCardData[]>([]);
  const [convertedLocalTaxByRoomId, setConvertedLocalTaxByRoomId] = useState<Record<string, string>>({});
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [selectedRoomCounts, setSelectedRoomCounts] = useState<Record<string, number>>({});
  const [stayEditorOpen, setStayEditorOpen] = useState(false);
  const [stayUpdateLoading, setStayUpdateLoading] = useState(false);
  const [roomsFilterOpen, setRoomsFilterOpen] = useState(false);
  const [expandedRoomInfoById, setExpandedRoomInfoById] = useState<Record<string, boolean>>({});
  const [stayCheckIn, setStayCheckIn] = useState<string>(() => hotelSearch?.checkIn || "");
  const [stayCheckOut, setStayCheckOut] = useState<string>(() => hotelSearch?.checkOut || "");
  const [stayAdults, setStayAdults] = useState<number>(() => hotelSearch?.adults || 2);
  const [stayChildren, setStayChildren] = useState<number>(() => hotelSearch?.children || 0);
  const [stayRooms, setStayRooms] = useState<number>(() => hotelSearch?.rooms || 1);
  const [stayChildAges, setStayChildAges] = useState<number[]>(() =>
    flattenHotelChildAges(hotelSearch?.child_age ?? [], hotelSearch?.rooms || 1, hotelSearch?.children || 0)
  );
  const [filterRefundableOnly, setFilterRefundableOnly] = useState(false);
  const [filterBoardQuery, setFilterBoardQuery] = useState<string>("");
  const [trustYouReview, setTrustYouReview] = useState<TrustYouHotelReviewSummary | null>(null);
  const [activeRoomCardId, setActiveRoomCardId] = useState<string | null>(null);
  const [rawGetRoomsV3Response, setRawGetRoomsV3Response] = useState<unknown>(null);
  const [rawAccommodationDetailsResponse, setRawAccommodationDetailsResponse] = useState<unknown>(null);
  const trustYouFetchKeyRef = useRef<string>("");
  const lastRoomsLoadKeyRef = useRef<string>("");
  const isHotelDatesDebugMode = process.env.NEXT_PUBLIC_DEBUG_HOTEL_DATES === "true";
  const checkoutRef = useRef<HTMLInputElement>(null)

  // Reset rooms-load dedup guard when navigating to a different hotel,
  // or when hotelSearch transitions from null to populated (URL hydration).
  const prevHotelSearchRef = useRef(hotelSearch);
  useEffect(() => {
    if (!prevHotelSearchRef.current && hotelSearch) {
      lastRoomsLoadKeyRef.current = "";
    }
    prevHotelSearchRef.current = hotelSearch;
  }, [hotelSearch]);

  useEffect(() => {
    lastRoomsLoadKeyRef.current = "";
  }, [hotelId]);

  useEffect(() => {
    // Keep local editor state in sync with global search state when navigating between hotels.
    setStayCheckIn(hotelSearch?.checkIn || "");
    setStayCheckOut(hotelSearch?.checkOut || "");
    setStayAdults(hotelSearch?.adults || 2);
    setStayChildren(hotelSearch?.children || 0);
    setStayRooms(hotelSearch?.rooms || 1);
    setStayChildAges(
      flattenHotelChildAges(hotelSearch?.child_age ?? [], hotelSearch?.rooms || 1, hotelSearch?.children || 0)
    );
  }, [hotelSearch?.checkIn, hotelSearch?.checkOut, hotelSearch?.adults, hotelSearch?.children, hotelSearch?.rooms, hotelSearch?.child_age]);

  useEffect(() => {
    setStayChildAges((prev) => {
      const next = Array.from({ length: Math.max(0, stayChildren) }, (_, index) => {
        const age = prev[index];
        return Number.isFinite(age) ? age : 9;
      });
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [stayChildren]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const entries = await Promise.all(
        remoteRooms.map(async (room) => {
          const rawForTax = room._raw as Record<string, unknown>;
          const hbTaxes = (rawForTax.hotelBedsTaxes ?? (rawForTax._hotelbeds as any)?.taxes) as
            import("@/types/hotel").HotelTaxBreakdown | null | undefined;
          const localTaxes = hbTaxes?.taxes?.filter((tax) => !tax?.included) ?? [];
          const converted = await convertHotelLocalTaxTotal(hbTaxes?.taxes, room.price.currency);
          const localTotal = localTaxes.reduce((sum, tax) => sum + Number(tax?.clientAmount || tax?.amount || 0), 0);
          const localCurrency = normalizeCurrencyCode(localTaxes[0]?.clientCurrency || localTaxes[0]?.currency);
          const localLabel =
            localTotal > 0 && localCurrency
              ? formatMoneyFromCode(localCurrency, localTotal)
              : "";
          const convertedLabel =
            converted && converted.currencyCode !== localCurrency
              ? `${formatMoneyFromCode(converted.currencyCode, converted.amount)}`
              : "";
          return [
            room.id,
            localLabel
              ? `+ ${localLabel}${convertedLabel ? ` (${convertedLabel})` : ""} local taxes included`
              : converted
                ? `+ ${formatMoneyFromCode(converted.currencyCode, converted.amount)} local taxes included`
                : "",
          ] as const;
        })
      );

      if (cancelled) return;
      setConvertedLocalTaxByRoomId(Object.fromEntries(entries));
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [remoteRooms]);

  function shortWebRefFromToken(token: string): string {
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `HB-${(h >>> 0).toString(16).padStart(8, "0").slice(0, 8).toUpperCase()}`;
  }

  function parseVyspaHotelDetailsMedia(payload: unknown): {
    hotelImages: string[];
    roomImages: Record<string, string[]>;
  } {
    const normalizeUrl = (value: unknown): string => {
      const url = String(value || "").trim();
      if (!url) return "";
      return /^https?:\/\//i.test(url) ? url : "";
    };

    const payloadRow = asRecord(payload);
    const vendorImages = asArray(payloadRow.VendorImages);
    const hotelImages = vendorImages.length > 0
      ? vendorImages
        .map((row) => {
          const source = asRecord(asRecord(row).VendorImage ?? row);
          return normalizeUrl(source.printed_image_url || source.source_image_url || source.url);
        })
        .filter(Boolean)
      : [];

    const roomImages: Record<string, string[]> = {};
    const visit = (node: unknown, roomCodeHint = "") => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach((entry) => visit(entry, roomCodeHint));
        return;
      }
      const nodeRow = asRecord(node);

      const roomCode = String(
        nodeRow.room_code || nodeRow.roomCode || nodeRow.code || nodeRow.room_id || nodeRow.roomId || roomCodeHint || ""
      ).trim();
      const url = normalizeUrl(nodeRow.printed_image_url || nodeRow.source_image_url || nodeRow.image_url || nodeRow.photo_url || nodeRow.url);
      if (roomCode && url) {
        if (!roomImages[roomCode]) roomImages[roomCode] = [];
        roomImages[roomCode].push(url);
      }

      Object.values(nodeRow).forEach((value) => {
        if (value && typeof value === "object") visit(value, roomCode || roomCodeHint);
      });
    };
    visit(payloadRow.HotelRoom);

    const dedupedRoomImages: Record<string, string[]> = {};
    Object.entries(roomImages).forEach(([roomCode, urls]) => {
      const unique = Array.from(new Set((urls || []).filter(Boolean)));
      if (unique.length > 0) dedupedRoomImages[roomCode] = unique;
    });

    return { hotelImages: Array.from(new Set(hotelImages)), roomImages: dedupedRoomImages };
  }

  async function updateAvailabilityFromDateChanges(next: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    rooms: number;
    childAges: number[];
  }) {
    try {
      setStayUpdateLoading(true);
      setRoomsError(null);
      setRoomsLoading(true);
      let retries = 1;
      let searchResultsSuccess = await runStaySearch(next);

      while (retries < 5 && !searchResultsSuccess) {
        searchResultsSuccess = await runStaySearch(next);
        retries++;
      }

      // Sync URL with the new search context so refreshes / shares use the correct criteria.
      const latestState = useBookingStore.getState();
      const latestMeta = latestState.hotelResultsMeta?.[hotelId];
      syncPdpUrl({
        router,
        hotelId,
        searchParams: new URLSearchParams(searchParams?.toString() || ""),
        searchCriteriaId: latestState.hotelSearch?.searchCriteriaId,
        provider: latestState.hotelSearch?.provider,
        srId: latestMeta?.srId || latestMeta?.searchResultId,
        prevSearchCriteriaId: urlSearchCriteriaId,
        prevSrId: urlSrId,
        hotelSearch: latestState.hotelSearch,
      });

      setStayEditorOpen(false);
    } catch (e: any) {
      setRoomsError(e?.message || "Failed to update availability");
    } finally {
      setRoomsLoading(false);
      setStayUpdateLoading(false);
    }
  }

  async function runStaySearch(next: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    rooms: number;
    childAges: number[];
  }) {
    if (!hotelSearch?.location || !hotelSearch?.hidden_id || !hotelSearch?.hidden_key) {
      throw new Error("Missing search context (destination) to update availability.");
    }
    const availability = await hotelService.searchAvailabilityV3({
      location: hotelSearch.location,
      hidden_id: hotelSearch.hidden_id,
      hidden_key: hotelSearch.hidden_key,
      checkIn: next.checkIn,
      checkOut: next.checkOut,
      rooms: next.rooms,
      adults: next.adults,
      children: next.children,
      child_age: buildHotelChildAgesFromFlat(next.childAges, next.rooms, next.children),
      branches: hotelSearch.branches,
    });
    const shouldPollMore =
      (availability.Criteria?.provider === "hybrid" || availability.Criteria?.provider === "vyspa") &&
      (
        availability.Criteria?.searchComplete === false && availability.Results?.length === 0)


    const availabilityRow = asRecord(availability);
    const criteriaIdAny = asRecord(availabilityRow.Criteria).searchCriteriaId;
    const criteriaId =
      typeof criteriaIdAny === "number" || typeof criteriaIdAny === "string" ? criteriaIdAny : null;
    if (!criteriaId) {
      if (shouldPollMore) {
        return false;

      }
      setStayEditorOpen(false);
      throw new Error("No searchCriteriaId returned from availability search.");
    }
    const results = asArray(availabilityRow.Results);
    const hit = results.find((row) => resolveHotelResultId(row) === String(hotelId));
    const hitRow = asRecord(hit);
    const hitProvider = String(hitRow.provider || "").trim().toLowerCase() === "hotelbeds" ? "hotelbeds" : null;
    const hitSearchCriteriaAny =
      hitProvider === "hotelbeds"
        ? (hitRow.searchCriteriaId ?? asRecord(hitRow._hotelbeds).searchToken ?? criteriaId)
        : criteriaId;
    const effectiveProvider: "vyspa" | "hotelbeds" =
      hitProvider || (typeof hitSearchCriteriaAny === "string" ? "hotelbeds" : "vyspa");
    const effectiveSearchCriteriaId =
      typeof hitSearchCriteriaAny === "number" || typeof hitSearchCriteriaAny === "string"
        ? hitSearchCriteriaAny
        : criteriaId;

    // Update global search state so room loader effect re-runs.
    setHotelSearch({
      provider: effectiveProvider,
      location: hotelSearch.location,
      hidden_id: hotelSearch.hidden_id,
      hidden_key: hotelSearch.hidden_key,
      checkIn: next.checkIn,
      checkOut: next.checkOut,
      rooms: next.rooms,
      adults: next.adults,
      children: next.children,
      child_age: buildHotelChildAgesFromFlat(next.childAges, next.rooms, next.children),
      branches: hotelSearch.branches,
      searchCriteriaId: effectiveSearchCriteriaId,
      arrivalPointCode: hotelSearch.arrivalPointCode,
    });
    setSearchRequestId(
      typeof effectiveSearchCriteriaId === "string"
        ? shortWebRefFromToken(effectiveSearchCriteriaId)
        : String(effectiveSearchCriteriaId)
    );

    // Update booking meta for this hotel if present in the new availability response (Vyspa needs srId for booking).
    if (hit) {
      const srId = hitRow.id != null ? String(hitRow.id) : undefined;
      const nextMeta = { ...useBookingStore.getState().hotelResultsMeta };
      nextMeta[String(hotelId)] = {
        ...(nextMeta[String(hotelId)] || { hotelId: String(hotelId) }),
        hotelId: String(hotelId),
        hotelName: String(hitRow.hotel_name || hitRow.hotelName || nextMeta[String(hotelId)]?.hotelName || ""),
        provider: effectiveProvider,
        searchCriteriaId: effectiveSearchCriteriaId,
        searchResultId: srId || nextMeta[String(hotelId)]?.searchResultId,
        srId: srId || nextMeta[String(hotelId)]?.srId,
        vyspaHotelId: toPositiveNumericId(hitRow.hotel_id ?? hitRow.hotelId) || nextMeta[String(hotelId)]?.vyspaHotelId,
        vMapId: toPositiveNumericId(hitRow.VmapId ?? hitRow.vMapId) || nextMeta[String(hotelId)]?.vMapId,
        imageName: typeof hitRow.image_name === "string" ? fixStubaImageUrl(hitRow.image_name) : nextMeta[String(hotelId)]?.imageName,
        address1: typeof hitRow.address1 === "string" ? hitRow.address1 : nextMeta[String(hotelId)]?.address1,
        address2: typeof hitRow.address2 === "string" ? hitRow.address2 : nextMeta[String(hotelId)]?.address2,
        hotelRating:
          Number.isFinite(Number(hitRow.hotel_rating)) ? Number(hitRow.hotel_rating) : nextMeta[String(hotelId)]?.hotelRating,
        trustyouId:
          trustYouIdFromRecord(hitRow) ||
          resolveTrustYouHotelId({
            hotelName: String(hitRow.hotel_name || hitRow.hotelName || ""),
            location: [hitRow.address1, hitRow.address2].filter(Boolean).join(", "),
          }) ||
          nextMeta[String(hotelId)]?.trustyouId,
        rawSearchResult: hitRow ?? nextMeta[String(hotelId)]?.rawSearchResult,
      };
      setHotelResultsMeta(nextMeta);
      return true;
    }
    return false;
  }

  function parseRemoteDataXml(remoteData: string) {
    try {
      if (typeof window === "undefined") return null;
      const xml = String(remoteData || "").trim();
      if (!xml) return null;

      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");

      // Hotelbeds images are hosted at photos.hotelbeds.com
      const HOTELBEDS_CDN = "https://photos.hotelbeds.com/giata/";

      const normalizeUrl = (u: string) => {
        const s = String(u || "").trim();
        if (!s) return "";
        if (s.startsWith("http://") || s.startsWith("https://")) return s;
        // For Hotelbeds-style paths like "15/156652/156652a_hb_l_015.jpeg"
        if (/^\d+\/\d+\//.test(s)) return `${HOTELBEDS_CDN}${s}`;
        if (s.startsWith("/")) return `https://photos.hotelbeds.com${s}`;
        return s;
      };

      // Try both formats: <Photo><Url> and <images><image path="...">
      let photos: string[] = [];
      // Room-specific images: { roomCode: string, images: string[] }
      const roomImages: Record<string, string[]> = {};

      // Format 1: <Photo><Url>...</Url></Photo> (older XML)
      const photoUrlNodes = Array.from(doc.querySelectorAll("Photo > Url"));
      if (photoUrlNodes.length > 0) {
        photos = photoUrlNodes
          .map((n) => normalizeUrl(n.textContent || ""))
          .filter(Boolean);
      }

      // Format 2: <images><image path="..."> (Hotelbeds XML)
      // Always parse this too; some payloads include both formats.
      const imageNodes = Array.from(doc.querySelectorAll("images > image"));
      imageNodes.forEach((img) => {
        const path = normalizeUrl(img.getAttribute("path") || "");
        if (!path) return;

        const roomCode = img.getAttribute("roomCode");
        if (roomCode) {
          if (!roomImages[roomCode]) roomImages[roomCode] = [];
          roomImages[roomCode].push(path);
        }
        // Keep all images in the hotel gallery (no separate room-image gallery).
        photos.push(path);
      });

      // Try both formats for amenities: <Amenity><Text> and <facilities><facility><description>
      let amenities: string[] = [];

      // Format 1: <Amenity><Text>...</Text></Amenity>
      const amenityTextNodes = Array.from(doc.querySelectorAll("Amenity > Text"));
      if (amenityTextNodes.length > 0) {
        amenities = amenityTextNodes
          .map((n) => String(n.textContent || "").trim())
          .filter(Boolean);
      }

      // Format 2: <facilities><facility><description>...</description></facility></facilities>
      if (amenities.length === 0) {
        const facilityNodes = Array.from(doc.querySelectorAll("facilities > facility > description"));
        amenities = facilityNodes
          .map((n) => String(n.textContent || "").trim())
          .filter(Boolean);
      }

      // Try both formats for description
      let descriptions: string[] = [];

      // Format 1: <Description><Text>...</Text></Description>
      const descTextNodes = Array.from(doc.querySelectorAll("Description > Text"));
      if (descTextNodes.length > 0) {
        descriptions = descTextNodes
          .map((n) =>
            String(n.textContent || "")
              .replace(/<br\s*\/?\s*>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .trim()
          )
          .filter(Boolean);
      }

      // Format 2: <hotel><description>...</description></hotel> (Hotelbeds)
      if (descriptions.length === 0) {
        const hotelDesc = doc.querySelector("hotel > description");
        if (hotelDesc?.textContent) {
          descriptions = [
            String(hotelDesc.textContent)
              .replace(/<br\s*\/?\s*>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .trim()
          ].filter(Boolean);
        }
      }

      const getText = (sel: string) => (doc.querySelector(sel)?.textContent || "").trim();

      // Try both address formats
      let address = "";

      // Format 1: <Address><Address1>...
      const addr1 = getText("Address > Address1");
      const addr2 = getText("Address > Address2");
      const city1 = getText("Address > City");
      const zip1 = getText("Address > Zip");
      const country1 = getText("Address > Country");
      address = [addr1, addr2, city1, zip1, country1].filter(Boolean).join(", ");

      // Format 2: <address street="...">...</address> + <city> + <postalCode>
      if (!address) {
        const addressNode = doc.querySelector("address");
        const streetAttr = addressNode?.getAttribute("street") || "";
        const addressText = addressNode?.textContent?.trim() || "";
        const city2 = getText("city");
        const zip2 = getText("postalCode");
        const countryDesc = getText("country > description");
        address = [streetAttr || addressText, city2, zip2, countryDesc].filter(Boolean).join(", ");
      }

      // Extract coordinates from XML: <coordinates latitude="..." longitude="..."/>
      let coords: { lat: number; lng: number } | null = null;
      const coordsNode = doc.querySelector("coordinates");
      if (coordsNode) {
        const lat = parseFloat(coordsNode.getAttribute("latitude") || "");
        const lng = parseFloat(coordsNode.getAttribute("longitude") || "");
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          coords = { lat, lng };
        }
      }

      return {
        photos: mergeUniqueImages(photos, ...Object.values(roomImages)),
        amenities: Array.from(new Set(amenities)),
        descriptions,
        address: address || undefined,
        coordinates: coords,
      };
    } catch {
      return null;
    }
  }

  // Refs for sections
  const overviewRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const accessibilitiesRef = useRef<HTMLDivElement>(null);
  const policiesRef = useRef<HTMLDivElement>(null);

  // Hydrate from cache to avoid first-render flicker.
  useEffect(() => {
    const cached = hotelId ? hotelDetailsCache[hotelId] : undefined;
    if (!cached) {
      setNearbyPlaces([]);
      return;
    }

    if (cached.hotelName || cached.mainImage || cached.hotelRating) {
      setRemoteHotelHeader({
        name: cached.hotelName || remoteHotelHeader?.name || "",
        rating: cached.hotelRating || remoteHotelHeader?.rating || 0,
        image: cached.mainImage || remoteHotelHeader?.image,
        address: cached.address || remoteHotelHeader?.address,
      });
    }
    if (Array.isArray(cached.galleryImages)) setGalleryImages(cached.galleryImages);
    if (Array.isArray(cached.amenities)) setRemoteAmenities(cached.amenities);
    if (Array.isArray(cached.nearbyPlaces)) setNearbyPlaces(cached.nearbyPlaces);
    else setNearbyPlaces([]);
    if (Array.isArray(cached.rooms)) setRemoteRooms(cached.rooms);
    if (typeof cached.detailsText === "string") setDetailsText(cached.detailsText);
    if (typeof cached.cancellationText === "string") setCancellationText(cached.cancellationText);
    if (cached.trustYou) setTrustYouReview(cached.trustYou);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  useEffect(() => {
    const meta = hotelResultsMeta?.[hotelId];
    const rawSearchResult = asRecord(meta?.rawSearchResult);
    const dedupe = asRecord(rawSearchResult._dedupe);
    const partnerHotelIds = Array.from(
      new Set(
        [
          hotelId,
          String(meta?.vyspaHotelId || ""),
          String(rawSearchResult.hotel_id || ""),
          String(rawSearchResult.hotelId || ""),
          String(rawSearchResult.id || ""),
          String(rawSearchResult.code || ""),
          String(rawSearchResult.providerHotelCode || ""),
          String(rawSearchResult.hotelbedsCode || ""),
          String(dedupe.hbCode || ""),
          String(asRecord(rawSearchResult._hotelbeds).providerHotelCode || ""),
          String(asRecord(rawSearchResult._hotelbeds).hotelCode || ""),
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
    const resolvedTyId = resolveTrustYouHotelId({
      hotelName: remoteHotelHeader?.name || meta?.hotelName,
      location: [remoteHotelHeader?.address, meta?.address1, meta?.address2].filter(Boolean).join(", "),
      candidateIds: [urlTyId, meta?.trustyouId, trustYouIdFromRecord(rawSearchResult)],
    });

    const hotelName = (remoteHotelHeader?.name || meta?.hotelName || "").trim();
    const location = [remoteHotelHeader?.address, meta?.address1, meta?.address2].filter(Boolean).join(", ");
    if (!resolvedTyId && !hotelName) return;

    const requestParams = new URLSearchParams();
    if (resolvedTyId) requestParams.set("tyId", resolvedTyId);
    if (hotelName) requestParams.set("hotelName", hotelName);
    if (location) requestParams.set("location", location);
    if (hotelId) requestParams.set("hotelId", hotelId);
    if (partnerHotelIds.length > 0) requestParams.set("partnerHotelIds", partnerHotelIds.join(","));
    requestParams.set("details", "1");

    const requestKey = `${hotelId}:${requestParams.toString()}`;
    if (trustYouFetchKeyRef.current === requestKey) return;
    trustYouFetchKeyRef.current = requestKey;

    let cancelled = false;
    const run = async () => {
      const response = await fetch(`/api/hotels/trustyou?${requestParams.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !data?.review) return;
      if (cancelled) return;
      setTrustYouReview(data.review as TrustYouHotelReviewSummary);
    };

    run().catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [
    hotelId,
    hotelResultsMeta,
    remoteHotelHeader?.address,
    remoteHotelHeader?.name,
    urlTyId,
  ]);

  useEffect(() => {
    if (!hotelId || !trustYouReview) return;
    const cached = hotelDetailsCache?.[hotelId];
    if (!cached) return;
    const previous = cached.trustYou;
    if (
      previous &&
      previous.tyId === trustYouReview.tyId &&
      previous.score === trustYouReview.score &&
      previous.reviewsCount === trustYouReview.reviewsCount
    ) {
      return;
    }

    setHotelDetailsCache(hotelId, {
      ...cached,
      trustYou: trustYouReview,
      fetchedAt: cached.fetchedAt || Date.now(),
    });
  }, [hotelDetailsCache, hotelId, setHotelDetailsCache, trustYouReview]);

  const hotel = useMemo(() => {
    const mapQuery = (() => {
      if (!coordinates) return "";
      const name = (remoteHotelHeader?.name || "").trim();
      const address = (remoteHotelHeader?.address || "").trim();
      const placeText = [name, address].filter(Boolean).join(", ");
      if (placeText) return `${placeText} (${coordinates.lat}, ${coordinates.lng})`;
      return `${coordinates.lat},${coordinates.lng}`;
    })();
    const trustYouBreakdown = (trustYouReview?.categoryBreakdown || []).reduce<Record<string, number>>(
      (acc, item) => {
        if (!item?.label || !Number.isFinite(item.score) || item.score <= 0) return acc;
        acc[item.label] = Math.round(item.score * 10) / 10;
        return acc;
      },
      {}
    );

    return {
      name: remoteHotelHeader?.name || "",
      starRating: remoteHotelHeader?.rating || 0,
      mainImage: remoteHotelHeader?.image || galleryImages[0] || "",
      galleryImages: galleryImages.length > 0 ? galleryImages : (remoteHotelHeader?.image ? [remoteHotelHeader.image] : []),
      address: remoteHotelHeader?.address || "",
      about: {
        description: sanitizeHotelText(detailsText || ""),
      },
      amenities: transformAmenities(remoteAmenities || []),
      reviews: {
        score: trustYouReview?.score || 0,
        label: trustYouReview?.scoreDescription || "",
        count: trustYouReview?.reviewsCount || 0,
        breakdown: trustYouBreakdown,
      },
      policies: cancellationText || "",
      nearby: nearbyPlaces,
      mapUrl: coordinates
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}&hl=en`
        : "#",
      importantInfo: importantInfoText || "",
      coordinates,
      mapQuery,
    };
  }, [
    cancellationText,
    coordinates,
    detailsText,
    galleryImages,
    importantInfoText,
    nearbyPlaces,
    remoteAmenities,
    remoteHotelHeader,
    trustYouReview,
  ]);
  const staySummary = useMemo(() => {
    const checkIn = hotelSearch?.checkIn || stayCheckIn || "";
    const checkOut = hotelSearch?.checkOut || stayCheckOut || "";
    const nights = calculateStayNights(checkIn, checkOut);
    return {
      nights,
      checkInLabel: formatStayDate(checkIn),
      checkOutLabel: formatStayDate(checkOut),
    };
  }, [hotelSearch?.checkIn, hotelSearch?.checkOut, stayCheckIn, stayCheckOut]);
  const hasPolicies = hotel.policies.trim().length > 0;
  const hasImportantInfo = hotel.importantInfo.trim().length > 0;
  const hasAccessibilitySection = hasImportantInfo;
  const hasAboutProperty = hotel.about.description.trim().length > 0;
  const aboutParagraphs = useMemo(
    () => splitHotelTextIntoParagraphs(hotel.about.description).filter((p) => !/^Type is:/i.test(p)),
    [hotel.about.description]
  );
  const hasNearbySection = hotel.nearby.length > 0;
  const hasAmenitiesSection = hotel.amenities.length > 0;
  const hasAboutSection = hasAboutProperty || hasNearbySection || hasAmenitiesSection;
  const navSections = useMemo(
    () => [
      "Overview",
      ...(hasAboutSection ? ["About"] : []),
      "Rooms",
      "Reviews",
      ...(hasAccessibilitySection ? ["Accessibilities"] : []),
      ...(hasPolicies ? ["Policies"] : []),
    ],
    [hasAboutSection, hasAccessibilitySection, hasPolicies]
  );
  const rooms = useMemo(() => {
    const q = filterBoardQuery.trim().toLowerCase();
    return remoteRooms.filter((room) => {
      if (filterRefundableOnly && !room.isRefundable) return false;
      if (q) {
        const s = `${room.name || ""} ${room.bedType || ""}`.toLowerCase();
        if (!s.includes(q)) return false;
      }
      return true;
    });
  }, [filterBoardQuery, filterRefundableOnly, remoteRooms]);
  const minRoomPrice = useMemo(
    () => (rooms.length > 0 ? Math.min(...rooms.map((r) => r.price.total)) : 0),
    [rooms]
  );
  const roomBoardOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const room of remoteRooms) {
      const board = String(room?.bedType || "").trim();
      if (!board) continue;
      const key = board.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(board);
    }
    return out;
  }, [remoteRooms]);
  const requiredRoomCount = Math.max(1, Number(stayRooms || 1));
  const selectedRoomIds = useMemo(() => selectedRoomIdsFromCounts(selectedRoomCounts), [selectedRoomCounts]);
  const selectedRoomCount = useMemo(() => countSelectedRooms(selectedRoomCounts), [selectedRoomCounts]);
  const canProceedWithRooms = selectedRoomCount === requiredRoomCount && selectedRoomCount > 0;
  const matchedPackageResult = useMemo(
    () => packageResults?.find((row) => String(row.id) === String(hotelId)),
    [hotelId, packageResults]
  );
  const activePackageRoom = useMemo(
    () =>
      isPackageMode
        ? remoteRooms.find((room) => String(room.id) === String(activeRoomCardId || ""))
        : undefined,
    [activeRoomCardId, isPackageMode, remoteRooms]
  );
  const resolvedPackagePrice = useMemo(() => {
    if (!isPackageMode) return null;

    if (activePackageRoom?.price?.total) {
      return {
        amount: activePackageRoom.price.total,
        currency: activePackageRoom.price.currency,
      };
    }

    const fallback = resolvePackagePricing({
      packagePriceAmount: selectedPackage?.totalPrice,
      packagePriceCurrency: selectedPackage?.hotel?.currency,
      fallbackStartingPrice: matchedPackageResult?.startingPrice,
      fallbackCurrency: matchedPackageResult?.currency,
    });

    return fallback.amount != null
      ? {
        amount: fallback.amount,
        currency: fallback.currency,
      }
      : null;
  }, [
    activePackageRoom?.price?.currency,
    activePackageRoom?.price?.total,
    isPackageMode,
    matchedPackageResult?.currency,
    matchedPackageResult?.startingPrice,
    selectedPackage?.hotel?.currency,
    selectedPackage?.totalPrice,
  ]);
  const packagePriceLabel = resolvedPackagePrice
    ? formatDisplayPrice(resolvedPackagePrice.currency, resolvedPackagePrice.amount)
    : "";
  const packagePerPersonLabel =
    resolvedPackagePrice?.amount != null
      ? formatDisplayPrice(
        resolvedPackagePrice.currency,
        calculatePackagePerPersonPrice(resolvedPackagePrice.amount, packageSearch?.rooms)
      )
      : "";
  const reviews: Array<{
    id: string;
    author: string;
    date: string;
    title: string;
    body: string;
    rating: number;
  }> = (trustYouReview?.snippets || []).map((snippet, index) => ({
    id: `trustyou-snippet-${index}`,
    author: "TrustYou insight",
    date: "",
    title: "",
    body: snippet,
    rating: trustYouReview?.score || 0,
  }));
  const hasReviewData =
    hotel.reviews.count > 0 ||
    hotel.reviews.score > 0 ||
    reviews.length > 0 ||
    (trustYouReview?.highlights?.length || 0) > 0;
  const faqs: Array<{ id: string; question: string; answer: string }> = [];

  const displayedAmenities = showAllAmenities ? hotel.amenities : hotel.amenities.slice(0, 6);
  const backToResultsHref = useMemo(() => {
    const params = new URLSearchParams();
    if (hotelSearch?.location) params.set("location", hotelSearch.location);
    if (hotelSearch?.checkIn) params.set("checkIn", hotelSearch.checkIn);
    if (hotelSearch?.checkOut) params.set("checkOut", hotelSearch.checkOut);
    if (hotelSearch?.rooms != null) params.set("rooms", String(hotelSearch.rooms));
    if (hotelSearch?.adults != null) params.set("adults", String(hotelSearch.adults));
    if (hotelSearch?.children != null) params.set("children", String(hotelSearch.children));
    if (hotelSearch?.children && hotelSearch.child_age) {
      params.set("child_age", serializeHotelChildAges(hotelSearch.child_age, hotelSearch.rooms, hotelSearch.children));
    }
    if (hotelSearch?.branches) params.set("branches", hotelSearch.branches);
    if (hotelSearch?.hidden_id) params.set("hidden_id", hotelSearch.hidden_id);
    if (hotelSearch?.hidden_key) params.set("hidden_key", hotelSearch.hidden_key);
    if (hotelSearch?.arrivalPointCode) params.set("arrival_point_code", hotelSearch.arrivalPointCode);
    if (isPackageMode) params.set("type", "package");
    const query = params.toString();
    return query ? `/hotels?${query}` : "/hotels";
  }, [hotelSearch, isPackageMode]);

  useEffect(() => {
    setSelectedHotelRoomIds(selectedRoomIds);
    const summary = buildSelectedRoomSummary(hotelId, selectedRoomIds, remoteRooms);
    setSelectedHotelRoomSummary(summary);
  }, [hotelId, remoteRooms, selectedRoomIds, setSelectedHotelRoomIds, setSelectedHotelRoomSummary]);

  useEffect(() => {
    if (filterBoardQuery.trim()) return;
    const selectedMeals = hotelFiltersCache?.filters?.mealPlans || [];
    const hasBreakfastFilter = Boolean(hotelFiltersCache?.filters?.popular?.breakfastIncluded);
    const preferredFromSearch = selectedMeals.find(Boolean) || (hasBreakfastFilter ? "Breakfast" : "");
    if (!preferredFromSearch) return;
    const matched = roomBoardOptions.find((board) =>
      board.toLowerCase().includes(preferredFromSearch.toLowerCase())
    );
    if (matched) setFilterBoardQuery(matched);
  }, [filterBoardQuery, hotelFiltersCache, roomBoardOptions]);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      if (!hasHydrated) {
        return;
      }
      // ─── Deeplink view data path (self-contained, no session needed) ───
      if (deeplinkViewData?.success) {
        const viewHotel = deeplinkViewData.results.HotelDetails;
        const isDeeplinkMatch = String(viewHotel.hotel_id) === String(hotelId);

        if (isDeeplinkMatch) {
          setRoomsLoading(true);
          setRoomsError(null);

          try {
            const roomGroups = Object.values(viewHotel.rooms || {}).filter(
              (entry): entry is ViewRoomOption[] => Array.isArray(entry)
            );
            const flattenedRooms = roomGroups.flat().map((option): RoomCardData => {
              const total = Number(option.cust_tot_sell_amt ?? option.net_price ?? 0);
              const nights = Math.max(1, Number(option.days_spent ?? 1));
              const currencyCode = String(option.sell_currency_code || option.currency_code || viewHotel.SellCur || "GBP").toUpperCase();
              const currency = currencyCode === "GBP" ? "£" : currencyCode;
              return {
                id: String(option.id || ""),
                sourceRoomOptionId: String(option.id || ""),
                name: String(option.room_name || "Room"),
                bedType: String(option.meal_name || option.MealPlan || "Meal plan"),
                reviews: { score: 0, label: "No reviews", count: 0 },
                isRefundable: Number(option.nonRef ?? 1) === 0,
                paymentType: "Pay now",
                amenities: [] as RoomAmenity[],
                price: { currency, nightly: nights > 0 ? total / nights : total, total },
                _raw: option as unknown as Record<string, unknown>,
              };
            });

            flattenedRooms.sort((a, b) => (a.price.total || 0) - (b.price.total || 0));

            const headerImage = fixStubaImageUrl(viewHotel.image_name) || "";
            const headerAddress = [viewHotel.address1, viewHotel.address2].filter(Boolean).join(", ");
            const roomImageCandidates = roomGroups
              .flat()
              .flatMap((option) => extractDeeplinkImagesFromRow(option as unknown as UnknownRecord));
            const hotelImageCandidates = extractDeeplinkImagesFromRow(viewHotel as unknown as UnknownRecord);
            const deeplinkGallery = mergeUniqueImages(
              [headerImage],
              hotelImageCandidates,
              roomImageCandidates
            ).slice(0, 24);
            const latitude = Number(
              (viewHotel as unknown as UnknownRecord).geo_loc_latitude ??
              (viewHotel as unknown as UnknownRecord).latitude ??
              0
            );
            const longitude = Number(
              (viewHotel as unknown as UnknownRecord).geo_loc_longitude ??
              (viewHotel as unknown as UnknownRecord).longitude ??
              0
            );
            const hasCoordinates =
              Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              latitude !== 0 &&
              longitude !== 0;

            setRemoteHotelHeader({
              name: viewHotel.hotel_name,
              rating: Number(viewHotel.hotel_rating || 0),
              image: headerImage,
              address: headerAddress,
            });

            setRemoteRooms(flattenedRooms);
            setSelectedHotel({ hotelId, hotelName: viewHotel.hotel_name });
            if (deeplinkGallery.length > 0) setGalleryImages(deeplinkGallery);
            if (hasCoordinates) setCoordinates({ lat: latitude, lng: longitude });
            setHotelDetailsCache(hotelId, {
              hotelId,
              hotelName: viewHotel.hotel_name,
              hotelRating: Number(viewHotel.hotel_rating || 0) || undefined,
              mainImage: headerImage || deeplinkGallery[0] || undefined,
              address: headerAddress || undefined,
              galleryImages: deeplinkGallery,
              rooms: flattenedRooms,
              fetchedAt: Date.now(),
            });

            // Enrich deeplink payload with the same details API used in normal flow.
            // package_view/accommodationView usually has one primary image, while
            // get_hotel_details can provide VendorImages and richer media metadata.
            const resolvedHotelId = Number((viewHotel as unknown as UnknownRecord).hotel_id);
            const resolvedVMapId = Number((viewHotel as unknown as UnknownRecord).VmapId);
            const detailsPayload: any[] = Number.isFinite(resolvedHotelId) && resolvedHotelId > 0
              ? [String(resolvedHotelId)]
              : Number.isFinite(resolvedVMapId) && resolvedVMapId > 0
                ? [0, { vMapId: resolvedVMapId }]
                : [];

            if (detailsPayload.length > 0) {
              hotelService
                .hotelSearchDetails(detailsPayload)
                .then((detailsResponse: any) => {
                  if (cancelled) return;

                  const detailsData = extractVyspaGetHotelDetailsData(detailsResponse);
                  const vyspaMedia = parseVyspaHotelDetailsMedia(detailsResponse);
                  const nextGallery = mergeUniqueImages(
                    detailsData.galleryImages || [],
                    vyspaMedia.hotelImages || [],
                    flattenRoomImages(vyspaMedia.roomImages),
                    deeplinkGallery
                  ).slice(0, 24);

                  if (nextGallery.length > 0) {
                    setGalleryImages(nextGallery);
                  }
                  if (detailsData.coordinates && !hasCoordinates) {
                    setCoordinates(detailsData.coordinates);
                  }
                  if (detailsData.description) {
                    setDetailsText((previous) =>
                      previous.trim() ? mergeTextContent(previous, detailsData.description) : detailsData.description
                    );
                  }
                  if (detailsData.policies) {
                    setCancellationText((previous) => mergeTextContent(previous, detailsData.policies));
                  }
                  if (detailsData.importantInfo) {
                    setImportantInfoText((previous) => mergeTextContent(previous, detailsData.importantInfo));
                  }
                  if (detailsData.amenities.length > 0) {
                    setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...detailsData.amenities])));
                  }

                  setHotelDetailsCache(hotelId, {
                    hotelId,
                    hotelName: viewHotel.hotel_name,
                    hotelRating: Number(viewHotel.hotel_rating || 0) || undefined,
                    mainImage: headerImage || nextGallery[0] || undefined,
                    address: headerAddress || undefined,
                    galleryImages: nextGallery.length > 0 ? nextGallery : deeplinkGallery,
                    rooms: flattenedRooms,
                    detailsText: detailsData.description || "",
                    cancellationText: detailsData.policies || "",
                    amenities: detailsData.amenities,
                    fetchedAt: Date.now(),
                  });
                })
                .catch(() => { });
            }

            if (!cancelled) {
              setRoomsLoading(false);
            }

            return; // Skip normal flow
          } catch (err) {
            console.error("[loadRooms] Failed to process deeplink view data:", err);
            if (!cancelled) {
              setRoomsError(err instanceof Error ? err.message : "Failed to load room details");
              setRoomsLoading(false);
            }
            // Clear stale deeplink data so user can retry normal flow
            setDeeplinkViewData(null);
            return;
          }
        }
      }
      // ─── End deeplink path ───

      const meta = hotelResultsMeta?.[hotelId];
      const metaProvider =
        meta?.provider === "hotelbeds" || meta?.provider === "vyspa" ? meta.provider : undefined;
      const urlProviderNormalized =
        urlProvider === "hotelbeds" || urlProvider === "vyspa" ? (urlProvider as "hotelbeds" | "vyspa") : undefined;
      let effectiveProvider: "vyspa" | "hotelbeds" =
        urlProviderNormalized || metaProvider || (hotelSearch?.provider === "hotelbeds" ? "hotelbeds" : "vyspa");
      let effectiveSearchCriteriaId = hotelSearch?.searchCriteriaId ?? urlSearchCriteriaId ?? meta?.searchCriteriaId;
      if (!effectiveSearchCriteriaId) return;

      const srId = urlSrId || meta?.srId || meta?.searchResultId;
      const roomsLoadKey = `${hotelId}|${effectiveProvider}|${String(effectiveSearchCriteriaId)}|${srId || ""}|${isPackageMode ? "pkg" : "std"}`;
      if (lastRoomsLoadKeyRef.current === roomsLoadKey) {
        return;
      }
      lastRoomsLoadKeyRef.current = roomsLoadKey;

      // 🔍 DIAGNOSTIC: log why loadRooms effect fired
      console.log("[loadRooms] effect fired", {
        hotelId,
        "hotelSearch.provider": hotelSearch?.provider,
        "hotelSearch.searchCriteriaId": hotelSearch?.searchCriteriaId,
        effectiveProvider,
        effectiveSearchCriteriaId,
        urlSearchCriteriaId,
        urlProvider,
        metaProvider,
      });

      const searchResultSeed = extractSearchResultHotelData(meta?.rawSearchResult);
      setRoomsLoading(true);
      setRoomsError(null);

      try {
        if (isPackageMode) {
          const packageHotel = packageResults?.find((row) => String(row.id) === String(hotelId));
          const roomResponse = await packageService.getPackageRooms({
            hotelResultId: Number(hotelId),
            requestId: packageResultsMeta?.requestId,
            flightResultId: packageResultsMeta?.selectedFlightResultId || undefined,
          });

          const roomHotel =
            roomResponse.results.find((row) => String(row.id) === String(hotelId)) ||
            roomResponse.results[0];

          if (!packageHotel || !roomHotel) {
            throw new Error("No live package rooms were returned for the selected hotel.");
          }

          const roomGroups = Object.values(roomHotel.rooms || {}).filter(
            (entry) => Array.isArray(entry)
          );
          const flattenedRooms = roomGroups.flat().map((option) => {
            const total = Number(option.cust_tot_sell_amt ?? option.net_price ?? 0);
            const nights = Math.max(1, Number(option.days_spent ?? packageSearch?.nights ?? 1));
            const currencyCode = String(option.sell_currency_code || option.currency_code || roomHotel.SellCur || "GBP").toUpperCase();
            const currency = currencyCode === "GBP" ? "£" : currencyCode;
            const roomAmenities = extractAmenitiesFromGetRoomsResponse(option);
            return {
              id: String(option.id || ""),
              sourceRoomOptionId: String(option.id || ""),
              name: String(option.room_name || "Room"),
              bedType: String(option.meal_name || option.MealPlan || "Meal plan"),
              reviews: { score: 0, label: "No reviews", count: 0 },
              isRefundable: Number(option.nonRef ?? 1) === 0,
              paymentType: "Pay now",
              amenities: transformAmenities(roomAmenities),
              price: {
                currency,
                nightly: nights > 0 ? total / nights : total,
                total,
              },
              _raw: option,
            } satisfies RoomCardData;
          });

          flattenedRooms.sort((a, b) => (a.price.total || 0) - (b.price.total || 0));

          const roomCount = Math.max(1, Number(packageSearch?.rooms?.length || hotelSearch?.rooms || 1));
          const defaultSelectedCounts = (() => {
            const next: Record<string, number> = {};
            if (flattenedRooms.length === 0 || roomCount > 1) return next;
            const firstRoomId = String(flattenedRooms[0]?.id || "");
            if (firstRoomId) next[firstRoomId] = 1;
            return next;
          })();

          const headerImage = fixStubaImageUrl(roomHotel.image_name) || packageHotel.imageUrl || "";
          const headerAddress = [roomHotel.address1, roomHotel.address2, packageHotel.address?.street1]
            .filter(Boolean)
            .join(", ");
          const parsedPackageContent = parsePackageHotelContent(packageHotel.description || roomHotel.quickDescription || "");
          const packageDescription = sanitizeHotelText(
            parsedPackageContent.description || packageHotel.description || roomHotel.quickDescription || ""
          );
          const extractedPackageAmenities = Array.from(
            new Set([
              ...parsedPackageContent.amenities,
              ...extractAmenitiesFromGetRoomsResponse(roomHotel),
              ...flattenedRooms.flatMap((room) => room.amenities.map((amenity) => amenity.label)),
            ])
          ).slice(0, 24);
          const latitude = Number(roomHotel.geo_loc_latitude ?? packageHotel.address?.latitude ?? 0);
          const longitude = Number(roomHotel.geo_loc_longitude ?? packageHotel.address?.longitude ?? 0);

          if (!cancelled) {
            setRawGetRoomsV3Response(roomResponse);
            setRawAccommodationDetailsResponse(null);
            setRemoteHotelHeader({
              name: roomHotel.hotel_name || packageHotel.hotelName,
              rating: Number(roomHotel.hotel_rating || packageHotel.starRating || 0),
              image: headerImage || undefined,
              address: headerAddress || undefined,
            });
            if (packageDescription) {
              setDetailsText(packageDescription);
            }
            setNearbyPlaces(parsedPackageContent.nearby);
            if (extractedPackageAmenities.length > 0) {
              setRemoteAmenities(extractedPackageAmenities);
            }
            if (parsedPackageContent.policyText) {
              setCancellationText(parsedPackageContent.policyText);
            }
            if (headerImage) setGalleryImages([headerImage]);
            if (latitude && longitude) {
              setCoordinates({ lat: latitude, lng: longitude });
            }
            setRemoteRooms(flattenedRooms);
            setSelectedHotel({ hotelId, hotelName: roomHotel.hotel_name || packageHotel.hotelName });
            setHotelDetailsCache(hotelId, {
              hotelId,
              hotelName: roomHotel.hotel_name || packageHotel.hotelName,
              hotelRating: Number(roomHotel.hotel_rating || packageHotel.starRating || 0) || undefined,
              mainImage: headerImage || undefined,
              address: headerAddress || undefined,
              galleryImages: headerImage ? [headerImage] : [],
              rooms: flattenedRooms,
              detailsText: packageDescription,
              cancellationText: parsedPackageContent.policyText || "",
              amenities: extractedPackageAmenities,
              nearbyPlaces: parsedPackageContent.nearby,
              fetchedAt: Date.now(),
            });
            setSelectedRoomCounts(defaultSelectedCounts);
            setActiveRoomCardId(flattenedRooms.length > 0 ? String(flattenedRooms[0].id) : null);
          }

          const packageHotelDetailsId = Number(roomHotel.hotel_id ?? packageHotel.hotelId);
          if (packageHotelDetailsId > 0) {
            hotelService
              .hotelSearchDetails([String(packageHotelDetailsId)])
              .then((detailsResponse: any) => {
                if (cancelled) return;

                const detailsData = extractVyspaGetHotelDetailsData(detailsResponse);
                const vyspaMedia = parseVyspaHotelDetailsMedia(detailsResponse);
                const nextGallery = mergeUniqueImages(
                  detailsData.galleryImages || [],
                  vyspaMedia.hotelImages || [],
                  flattenRoomImages(vyspaMedia.roomImages),
                  headerImage ? [headerImage] : []
                ).map((u) => ensureGiataImageUrl(u, 'original') as string).slice(0, 24);

                if (detailsData.description) {
                  setDetailsText((previous) =>
                    previous.trim() ? mergeTextContent(previous, detailsData.description) : detailsData.description || previous
                  );
                }

                if (detailsData.amenities.length > 0) {
                  setRemoteAmenities((previous) =>
                    Array.from(new Set([...(previous || []), ...detailsData.amenities]))
                  );
                }

                if (detailsData.policies) {
                  setCancellationText((previous) => mergeTextContent(previous, detailsData.policies));
                }

                if (detailsData.importantInfo) {
                  setImportantInfoText((previous) => mergeTextContent(previous, detailsData.importantInfo, "\n"));
                }

                if (detailsData.coordinates && !coordinates) {
                  setCoordinates(detailsData.coordinates);
                }

                if (nextGallery.length > 0) {
                  setGalleryImages(nextGallery);
                  setRemoteHotelHeader((prev) =>
                    prev ? { ...prev, image: prev.image || nextGallery[0] } : prev
                  );
                }

                setHotelDetailsCache(hotelId, {
                  hotelId,
                  hotelName: roomHotel.hotel_name || packageHotel.hotelName,
                  hotelRating: Number(roomHotel.hotel_rating || packageHotel.starRating || 0) || undefined,
                  mainImage: nextGallery[0] || headerImage || undefined,
                  address: headerAddress || undefined,
                  galleryImages: nextGallery.length > 0 ? nextGallery : (headerImage ? [headerImage] : []),
                  rooms: flattenedRooms,
                  detailsText: detailsData.description || packageDescription,
                  cancellationText: detailsData.policies || parsedPackageContent.policyText || "",
                  amenities:
                    detailsData.amenities.length > 0
                      ? Array.from(new Set([...extractedPackageAmenities, ...detailsData.amenities]))
                      : extractedPackageAmenities,
                  nearbyPlaces: parsedPackageContent.nearby,
                  fetchedAt: Date.now(),
                });
              })
              .catch(() => {
                // Keep the base package room response if detail enrichment fails.
              });
          }

          return;
        }
        /** standard hotel flow starts */

        /**extracting initial results from search results */
        if (searchResultSeed.description) {
          setDetailsText((previous) => (previous.trim() ? previous : searchResultSeed.description));
        }
        if (searchResultSeed.amenities.length > 0) {
          setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...searchResultSeed.amenities])));
        }
        if (searchResultSeed.policies) {
          setCancellationText((previous) => mergeTextContent(previous, searchResultSeed.policies));
        }
        if (searchResultSeed.importantInfo) {
          setImportantInfoText((previous) => mergeTextContent(previous, searchResultSeed.importantInfo, "\n"));
        }
        if (searchResultSeed.coordinates) {
          setCoordinates((previous) => previous || searchResultSeed.coordinates);
        }

        const rawResult = asRecord(meta?.rawSearchResult);
        const hbMeta = asRecord(rawResult._hotelbeds);
        const dedupeMeta = asRecord(rawResult._dedupe);
        const hybridHotelbedsToken = String(hbMeta.searchToken || "").trim();
        const hybridHotelbedsCode = String(
          rawResult.providerHotelCode ?? hbMeta.providerHotelCode ?? dedupeMeta.hbCode ?? rawResult.hotel_id ?? rawResult.id ?? ""
        ).trim();

        const canFallbackToHotelbeds =
          hybridHotelbedsToken.length > 0 &&
          hybridHotelbedsCode.length > 0 &&
          /^\d+$/.test(hybridHotelbedsCode) &&
          isPackageMode === false;
        const hybridSuppliers = Array.isArray(rawResult.suppliers)
          ? rawResult.suppliers.map((supplier) => String(supplier || "").trim().toLowerCase())
          : [];
        const shouldPreferHotelbedsRooms =
          canFallbackToHotelbeds &&
          effectiveProvider !== "hotelbeds" &&
          hybridSuppliers.includes("hotelbeds");

        let resp: any;
        if (shouldPreferHotelbedsRooms) {
          try {
            resp = await hotelService.getRoomsV3(hybridHotelbedsToken, hybridHotelbedsCode);
            effectiveProvider = "hotelbeds";
            effectiveSearchCriteriaId = hybridHotelbedsToken;
          } catch {

            resp = await hotelService.getRoomsV3(effectiveSearchCriteriaId, hotelId, srId);

          }
        } else {
          try {
            resp = await hotelService.getRoomsV3(effectiveSearchCriteriaId, hotelId, srId);

          } catch (initialError) {
            if (!canFallbackToHotelbeds) throw initialError;
            resp = await hotelService.getRoomsV3(hybridHotelbedsToken, hybridHotelbedsCode);

            effectiveProvider = "hotelbeds";
            effectiveSearchCriteriaId = hybridHotelbedsToken;
          }
        }
        const initialResp = resp;
        let respRoot: any = Array.isArray(resp) ? resp[0] : resp;
        const noHotelsFound =
          respRoot && typeof respRoot === "object" && !!respRoot.error && /no hotels found/i.test(String(respRoot.desc || ""));

        if (noHotelsFound && canFallbackToHotelbeds) {
          try {
            resp = await hotelService.getRoomsV3(hybridHotelbedsToken, hybridHotelbedsCode);
            respRoot = Array.isArray(resp) ? resp[0] : resp;
            effectiveProvider = "hotelbeds";
            effectiveSearchCriteriaId = hybridHotelbedsToken;
          } catch {
            // keep Vyspa response and continue existing fallback flow below
          }
        }

        if (
          noHotelsFound &&
          effectiveProvider === "vyspa" &&
          hotelSearch?.location &&
          hotelSearch?.hidden_id &&
          hotelSearch?.hidden_key
        ) {
          try {
            const refreshedAvailability = await hotelService.searchAvailabilityV3({
              location: hotelSearch.location,
              hidden_id: hotelSearch.hidden_id,
              hidden_key: hotelSearch.hidden_key,
              checkIn: hotelSearch.checkIn,
              checkOut: hotelSearch.checkOut,
              rooms: hotelSearch.rooms,
              adults: hotelSearch.adults,
              children: hotelSearch.children,
              child_age: hotelSearch.child_age,
              branches: hotelSearch.branches,
            });
            const refreshedCriteriaId = (refreshedAvailability as any)?.Criteria?.searchCriteriaId;
            const refreshedResults = Array.isArray((refreshedAvailability as any)?.Results)
              ? (refreshedAvailability as any).Results
              : [];
            const normalizeName = (s: unknown) => String(s || "").trim().toLowerCase();
            const targetName = meta?.hotelName || remoteHotelHeader?.name || "";
            const refreshedHit =
              refreshedResults.find((r: any) => String(r?.id || "") === String(srId || "")) ||
              refreshedResults.find((r: any) => String(r?.hotel_id || r?.hotelId || "") === String(hotelId || "")) ||
              (targetName
                ? refreshedResults.find((r: any) => normalizeName(r?.hotel_name || r?.hotelName) === normalizeName(targetName))
                : null);

            const refreshedSrId = refreshedHit?.id != null ? String(refreshedHit.id) : undefined;
            if (refreshedCriteriaId && refreshedSrId) {

              resp = await hotelService.getRoomsV3(refreshedCriteriaId, hotelId, refreshedSrId);
              respRoot = Array.isArray(resp) ? resp[0] : resp;
              if (hotelSearch) {
                setHotelSearch({
                  ...hotelSearch,
                  provider: "vyspa",
                  searchCriteriaId: refreshedCriteriaId,
                });
              }
            }

            setRawGetRoomsV3Response({
              initial: {
                searchCriteriaId: effectiveSearchCriteriaId,
                srId,
                response: initialResp,
              },
              refreshed: {
                searchCriteriaId: refreshedCriteriaId ?? null,
                srId: refreshedSrId ?? null,
                found: !!refreshedHit,
              },
              final: resp,
            });
          } catch {
            setRawGetRoomsV3Response(resp ?? null);
          }
        } else {
          setRawGetRoomsV3Response(resp ?? null);
        }

        const respAny: any = respRoot as any;
        const headerName = respAny?.hotel_name || meta?.hotelName || remoteHotelHeader?.name || "";
        const headerRating = Number(respAny?.hotel_rating || meta?.hotelRating || remoteHotelHeader?.rating || 0) || 0;
        const headerImage = ensureGiataImageUrl(fixStubaImageUrl(respAny?.image_name || meta?.imageName || ""), 'original') as string;
        const headerAddress =
          respAny?.address1 || respAny?.address2
            ? [respAny?.address1, respAny?.address2].filter(Boolean).join(", ")
            : meta?.address1 || meta?.address2
              ? [meta?.address1, meta?.address2].filter(Boolean).join(", ")
              : undefined;
        const useGetRoomsContent = effectiveProvider !== "hotelbeds";
        const getRoomsDescription = useGetRoomsContent
          ? sanitizeHotelText(respAny?.quickDescription ?? respAny?.description ?? "")
          : "";
        const getRoomsAmenities = useGetRoomsContent ? extractAmenitiesFromGetRoomsResponse(respAny) : [];

        setRemoteHotelHeader({
          name: headerName,
          rating: headerRating,
          image: headerImage,
          address: headerAddress,
        });
        if (getRoomsDescription) {
          setDetailsText((previous) => (previous.trim() ? previous : getRoomsDescription));
        }
        if (getRoomsAmenities.length > 0) {
          setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...getRoomsAmenities])));
        }

        // Extract coordinates from API response (geo_loc_latitude/longitude or latitude/longitude)
        const lat = respAny?.geo_loc_latitude || respAny?.latitude;
        const lng = respAny?.geo_loc_longitude || respAny?.longitude;
        if (lat && lng && lat !== 0 && lng !== 0) {
          setCoordinates({ lat: Number(lat), lng: Number(lng) });
        }

        // Use available image(s) for gallery/thumbnails. Typically only one image URL is provided.
        const imgs = headerImage ? [headerImage] : [];
        setGalleryImages(imgs);

        // HotelBeds: enrich amenities + gallery + room images from Content API (best effort).
        if (
          hotelSearch &&
          (hotelSearch.provider !== effectiveProvider || hotelSearch.searchCriteriaId !== effectiveSearchCriteriaId)
        ) {
          // 🔍 DIAGNOSTIC: this setHotelSearch call likely triggers the feedback loop
          console.log("[loadRooms] setHotelSearch (feedback loop candidate)", {
            "prev.provider": hotelSearch.provider,
            "prev.searchCriteriaId": hotelSearch.searchCriteriaId,
            "next.provider": effectiveProvider,
            "next.searchCriteriaId": effectiveSearchCriteriaId,
          });
          setHotelSearch({
            ...hotelSearch,
            provider: effectiveProvider,
            searchCriteriaId: effectiveSearchCriteriaId,
          });
        }

        if (effectiveProvider === "hotelbeds") {
          fetch(`/api/hotels/content?code=${encodeURIComponent(hotelId)}`)
            .then((r) => r.json().catch(() => null))
            .then((data: any) => {
              if (cancelled) return;
              if (!data?.ok) return;

              const nextHeaderImage = data?.imageUrl || headerImage;
              if (nextHeaderImage && nextHeaderImage !== headerImage) {
                setRemoteHotelHeader((prev) =>
                  prev
                    ? { ...prev, image: nextHeaderImage }
                    : { name: headerName, rating: headerRating, image: nextHeaderImage, address: headerAddress }
                );
              }

              const hotelImages: string[] = Array.isArray(data?.hotelImages) ? data.hotelImages.filter(Boolean) : [];
              const roomImagesNext: Record<string, string[]> =
                data?.roomImages && typeof data.roomImages === "object" ? data.roomImages : {};
              const mergedGallery = mergeUniqueImages(
                hotelImages,
                flattenRoomImages(roomImagesNext),
                imgs || []
              ).slice(0, 24);
              if (mergedGallery.length > 0) setGalleryImages(mergedGallery);

              const amenities: string[] = Array.isArray(data?.amenities) ? data.amenities.filter(Boolean) : [];
              if (amenities.length > 0) {
                setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...amenities])));
              }

              const desc = typeof data?.description === "string" ? data.description.trim() : "";
              if (desc) setDetailsText(desc);
            })
            .catch(() => { });
        }

        // Real schema (seen in stage): rooms.room1options[] with {id, room_name, meal_name, cust_tot_sell_amt, net_price, nonRef, ...}
        const roomsObj: any = respAny?.rooms;
        const room1options: any[] = Array.isArray(roomsObj?.room1options)
          ? roomsObj.room1options
          : Array.isArray((respAny as any)?.room1options)
            ? (respAny as any).room1options
            : [];
        const roomsApiDesc = typeof respAny?.desc === "string" ? respAny.desc.trim() : "";

        let accommodationDetailsResp: any = null;
        let accommodationFallbackRooms: any[] = [];
        const bookingRoomIdBySourceId = new Map<string, string>();
        if (effectiveProvider === "vyspa") {
          const roomCodes = room1options
            .map((opt: any) => String(opt?.id ?? "").trim())
            .filter(Boolean);

          if (roomCodes.length > 0) {
            try {
              accommodationDetailsResp = await hotelService.accommodationDetails([{ roomCode: roomCodes }]);
              if (!cancelled) setRawAccommodationDetailsResponse(accommodationDetailsResp ?? null);
              const detailsRooms = Array.isArray(accommodationDetailsResp?.rooms) ? accommodationDetailsResp.rooms : [];
              detailsRooms.forEach((row: any, index: number) => {
                const d = row?.SearchResultRoomDetail || row;
                const bookingRoomId = String(d?.id ?? d?.search_result_detail_id ?? "").trim();
                if (!bookingRoomId) return;

                const candidates = [
                  row?.roomCode,
                  row?.room_code,
                  d?.roomCode,
                  d?.room_code,
                  d?.source_room_code,
                  d?.request_room_code,
                  roomCodes[index],
                ]
                  .map((value) => String(value ?? "").trim())
                  .filter(Boolean);

                for (const candidate of candidates) {
                  if (!bookingRoomIdBySourceId.has(candidate)) {
                    bookingRoomIdBySourceId.set(candidate, bookingRoomId);
                  }
                }
              });

              accommodationFallbackRooms = detailsRooms
                .map((row: any) => {
                  const d = row?.SearchResultRoomDetail || row;
                  const id = String(d?.id ?? d?.search_result_detail_id ?? "").trim();
                  if (!id) return null;
                  const total = Number(d?.cust_tot_sell_amt ?? d?.net_price ?? d?.room_price ?? 0);
                  const days = Number(d?.days_spent ?? 0);
                  const sellCur = String(d?.branch_currency || d?.currency_code || "GBP").toUpperCase();
                  return {
                    id,
                    name: d?.room_name || "Room",
                    bedType: d?.meal_name || d?.display_meal_code || d?.meal_code || "Meal plan",
                    reviews: { score: 0, label: "No reviews", count: 0 },
                    isRefundable: String(d?.nonRef ?? "").trim() === "0",
                    paymentType: "Pay now",
                    amenities: [],
                    price: {
                      currency: sellCur === "GBP" ? "£" : sellCur,
                      nightly: days > 0 ? total / days : total,
                      total,
                    },
                    _raw: d,
                  };
                })
                .filter(Boolean);
            } catch {
              if (!cancelled) setRawAccommodationDetailsResponse(null);
            }
          } else if (!cancelled) {
            setRawAccommodationDetailsResponse(null);
          }
        } else if (!cancelled) {
          setRawAccommodationDetailsResponse(null);
        }

        const flattened: any[] = room1options.map((opt: any) => {
          const sourceRoomOptionId = String(opt?.id ?? "").trim();
          const bookingRoomId = bookingRoomIdBySourceId.get(sourceRoomOptionId) || sourceRoomOptionId;
          return {
            id: bookingRoomId,
            sourceRoomOptionId,
            name: opt?.room_name || "Room",
            bedType: opt?.meal_name || opt?.MealPlan || "Meal plan",
            reviews: { score: 0, label: "No reviews", count: 0 },
            isRefundable: opt?.nonRef === 0,
            paymentType: "Pay now",
            amenities: [],
            price: {
              currency: opt?.sell_currency_code === "GBP" ? "£" : opt?.sell_currency_code || "£",
              nightly:
                Number(opt?.days_spent) > 0
                  ? Number(opt?.cust_tot_sell_amt ?? opt?.net_price ?? 0) / Number(opt?.days_spent)
                  : Number(opt?.cust_tot_sell_amt ?? opt?.net_price ?? 0),
              total: Number(opt?.cust_tot_sell_amt ?? opt?.net_price ?? 0),
            },
            _raw: {
              ...opt,
              sourceRoomOptionId,
              bookingRoomId,
            },
          };
        });

        const effectiveRooms = flattened.length > 0 ? flattened : accommodationFallbackRooms;
        // Sort rooms low -> high (user request)
        effectiveRooms.sort((a, b) => (a.price.total || 0) - (b.price.total || 0));
        const requiredRoomsForSelection = Math.max(1, Number(hotelSearch?.rooms || 1));
        const defaultSelectedCounts = (() => {
          const next: Record<string, number> = {};
          if (effectiveRooms.length === 0) return next;
          // For multi-room bookings, do not preselect rooms. User must choose explicitly.
          if (requiredRoomsForSelection > 1) return next;
          for (let i = 0; i < requiredRoomsForSelection; i += 1) {
            const room = effectiveRooms[i % effectiveRooms.length];
            const roomId = String(room?.id || "");
            if (!roomId) continue;
            next[roomId] = (next[roomId] || 0) + 1;
          }
          return next;
        })();

        if (!cancelled) {
          setRemoteRooms(effectiveRooms);
          if (roomsApiDesc && effectiveRooms.length === 0) {
            setRoomsError(roomsApiDesc);
          }
          setSelectedHotel({ hotelId, hotelName: headerName });
          setSelectedRoomCounts(defaultSelectedCounts);
          if (effectiveRooms.length > 0) {
            setActiveRoomCardId(String(effectiveRooms[0]?.id || null));
          } else {
            setActiveRoomCardId(null);
          }

          // Persist header + rooms even when provider doesn't return room options.
          setHotelDetailsCache(hotelId, {
            hotelId,
            hotelName: headerName,
            hotelRating: headerRating,
            mainImage: headerImage,
            address: headerAddress,
            galleryImages: imgs,
            rooms: effectiveRooms,
            detailsText,
            cancellationText,
            fetchedAt: Date.now(),
          });
        }

        // Populate additional hotel fields from get_hotel_details/hotel_search_details.
        if (effectiveProvider === "vyspa" && hotelSearch?.location && hotelSearch?.hidden_id && hotelSearch?.hidden_key) {
          const resolvedHotelId = Number(respAny?.hotel_id ?? meta?.vyspaHotelId);
          const resolvedVMapId = Number(respAny?.VmapId ?? meta?.vMapId);
          const detailsPayload: any[] = Number.isFinite(resolvedHotelId) && resolvedHotelId > 0
            ? [String(resolvedHotelId)]
            : Number.isFinite(resolvedVMapId) && resolvedVMapId > 0
              ? [0, { vMapId: resolvedVMapId }]
              : [];

          if (detailsPayload.length > 0) {
            hotelService
              .hotelSearchDetails(detailsPayload)
              .then((d: any) => {
                if (cancelled) return;
                const detailsData = extractVyspaGetHotelDetailsData(d);
                const vyspaMedia = parseVyspaHotelDetailsMedia(d);
                const desc = joinUniqueTextBlocks([
                  (d?.description || d?.hotels?.quickDescription || "").toString(),
                  detailsData.description,
                ]);
                if (desc) {
                  setDetailsText((previous) => (previous.trim() ? mergeTextContent(previous, desc) : desc));
                }
                const detailsPolicies = extractPoliciesFromPayload(d);
                if (detailsPolicies) {
                  setCancellationText((previous) => mergeTextContent(previous, detailsPolicies));
                }
                if (detailsData.policies) {
                  setCancellationText((previous) => mergeTextContent(previous, detailsData.policies));
                }
                if (detailsData.importantInfo) {
                  setImportantInfoText((previous) => mergeTextContent(previous, detailsData.importantInfo, "\n"));
                }

                const remoteData = d?.liveDetails?.SupplierMapVendor?.remoteData;
                const parsed = remoteData ? parseRemoteDataXml(String(remoteData)) : null;
                const nextGallery = mergeUniqueImages(
                  detailsData.galleryImages || [],
                  vyspaMedia.hotelImages || [],
                  flattenRoomImages(vyspaMedia.roomImages),
                  parsed?.photos || [],
                  imgs || []
                ).map((u) => ensureGiataImageUrl(u, 'original') as string);
                if (detailsData.amenities.length > 0) {
                  setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...detailsData.amenities])));
                }
                if (parsed?.amenities?.length) {
                  setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...parsed.amenities])));
                }
                if (parsed?.descriptions?.length && !desc) {
                  setDetailsText(parsed.descriptions.slice(0, 3).join("\n\n"));
                }
                if (parsed?.address && !headerAddress) {
                  setRemoteHotelHeader((prev) =>
                    prev
                      ? { ...prev, address: parsed.address }
                      : { name: headerName, rating: headerRating, image: headerImage, address: parsed.address }
                  );
                }
                if (nextGallery.length > 0) setGalleryImages(nextGallery);
                if (nextGallery.length > 0 && !headerImage) {
                  setRemoteHotelHeader((prev) =>
                    prev ? { ...prev, image: nextGallery[0] } : { name: headerName, rating: headerRating, image: nextGallery[0], address: headerAddress }
                  );
                }
                if (detailsData.coordinates && !coordinates) {
                  setCoordinates(detailsData.coordinates);
                }
                if (parsed?.coordinates && !coordinates) {
                  setCoordinates(parsed.coordinates);
                }
              })
              .catch(() => {
                // no-op (keep available content only)
              });
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setRoomsError(e?.message || "Failed to load rooms");
          setRemoteRooms([]);
          setRawGetRoomsV3Response(null);
          setRawAccommodationDetailsResponse(null);
        }
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    }
    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [
    hotelId,
    hasHydrated,
    hotelSearch?.provider,
    hotelSearch?.searchCriteriaId,
    hotelSearch?.location,
    hotelSearch?.hidden_id,
    hotelSearch?.hidden_key,
    hotelSearch?.checkIn,
    hotelSearch?.checkOut,
    hotelSearch?.rooms,
    hotelSearch?.adults,
    hotelSearch?.children,
    hotelSearch?.child_age,
    hotelSearch?.branches,
    isPackageMode,
    packageResults,
    packageResultsMeta,
    packageSearch,
    setHotelSearch,
    setSelectedHotel,
    urlProvider,
    urlSearchCriteriaId,
    urlSrId,
  ]);

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      Overview: overviewRef,
      About: aboutRef,
      Rooms: roomsRef,
      Reviews: reviewsRef,
      Accessibilities: accessibilitiesRef,
      Policies: policiesRef,
    };
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hard loader: avoid showing incomplete first-render UI */}
      {!remoteHotelHeader && roomsLoading && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <LoadingBlock className="h-10 w-2/3" />
            <LoadingBlock className="h-6 w-1/2" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <LoadingBlock className="h-[320px] lg:h-[450px] lg:col-span-2" />
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                <LoadingBlock className="h-[100px] lg:h-[140px]" />
                <LoadingBlock className="h-[100px] lg:h-[140px]" />
                <LoadingBlock className="h-[100px] lg:h-[140px]" />
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <LoadingBlock className="h-[220px]" />
              <LoadingBlock className="h-[220px]" />
              <LoadingBlock className="h-[220px]" />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Navigation Bar */}
      <div className="sticky top-[73px] z-40 bg-white shadow-sm border-b border-[#DFE0E4]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            {/* Back to Search */}
            <button
              onClick={() => router.push(backToResultsHref)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F6F6F6] text-sm font-medium text-[#010D50] whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
              Back to search results
            </button>

            {/* Section Tabs */}
            <div className="flex items-center gap-3">
              {navSections.map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeSection === section
                    ? "border border-[#DFE0E4] text-[#010D50]"
                    : "text-[#010D50] hover:bg-gray-100"
                    }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Package Mode: Step Progress */}
      {isPackageMode && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-7 pb-2">
          <PackageStepProgress currentStep="stay" />
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 pb-10">
        <div className="bg-white rounded-3xl overflow-hidden">
          {/* Overview Section */}
          <div ref={overviewRef}>
            {/* Hotel Header + Gallery */}
            <div className="p-5 lg:p-8 space-y-7">
              {/* Hotel Name & Address */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h1 className="text-2xl lg:text-[32px] font-semibold text-[#010D50] leading-tight">
                    {hotel.name}
                  </h1>
                  <p className="text-base lg:text-lg text-[#3A478A]">{hotel.address}</p>
                  {/* Star Rating */}
                  <div className="flex items-center gap-1 py-1.5">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {isHotelDatesDebugMode && (
                    <details className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2">
                      <summary className="cursor-pointer text-xs font-semibold text-yellow-800">
                        🔧 Raw getRoomsV3 Response
                      </summary>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-yellow-100 p-2 text-[10px] text-yellow-900">
                        {JSON.stringify(rawGetRoomsV3Response, null, 2)}
                      </pre>
                    </details>
                  )}
                  {isHotelDatesDebugMode && (
                    <details className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2">
                      <summary className="cursor-pointer text-xs font-semibold text-yellow-800">
                        🔧 Raw accommodationDetails Response
                      </summary>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-yellow-100 p-2 text-[10px] text-yellow-900">
                        {JSON.stringify(rawAccommodationDetailsResponse, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>

              {/* Flight summary — only shown for package deeplink with flight data */}
              {deeplinkViewData?.success && "FlightResultId" in deeplinkViewData.results && (() => {
                const flights = (deeplinkViewData as HolidayPackageViewResponse).results.FlightDetails;
                if (flights?.length > 0) {
                  return (
                    <div className="mt-4 bg-white border border-[#DFE0E4] rounded-2xl overflow-hidden">
                      <div className="px-4 sm:px-6 py-4 border-b border-[#DFE0E4] flex items-center gap-2">
                        <Plane className="w-4 h-4 text-[#3754ED]" />
                        <h2 className="text-xl font-semibold text-[#010D50]">Flight Details</h2>
                      </div>
                      <div className="p-4 sm:p-6 flex flex-col gap-3">
                        {flights.map((seg, idx) => {
                          const legs = seg.Flights || [];
                          const firstLeg = legs[0];
                          const lastLeg = legs[legs.length - 1];
                          const airlineCode = String(firstLeg?.airline_code || "").trim().toUpperCase();
                          const airlineLogo = airlineCode
                            ? `https://images.kiwi.com/airlines/64/${airlineCode}.png`
                            : null;
                          const routeFrom = firstLeg?.departure_airport || "—";
                          const routeTo = lastLeg?.arrival_airport || "—";
                          const departureTime = formatFlightClock(firstLeg?.departure_time);
                          const arrivalTime = formatFlightClock(lastLeg?.arrival_time);
                          const duration = formatMinutesToDuration(seg.Total_travel_time || seg.Flying_time);
                          const stopsLabel = Number(seg.Stops || 0) > 0
                            ? `${seg.Stops} stop${Number(seg.Stops) > 1 ? "s" : ""}`
                            : "Direct";
                          const flightClass = firstLeg?.class_name || "Economy";

                          return (
                            <div key={`${seg.Route}-${idx}`} className="bg-[#F5F7FF] rounded-xl p-4 flex flex-col gap-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {airlineLogo ? (
                                    <img
                                      src={airlineLogo}
                                      alt={`${firstLeg?.airline_name || seg.Majority_carrier} logo`}
                                      className="w-8 h-8 object-contain rounded"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-[#3754ED] text-white flex items-center justify-center">
                                      <Plane className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-[#010D50] truncate">
                                      {firstLeg?.airline_name || seg.Majority_carrier || "Selected airline"}
                                    </div>
                                    <div className="text-xs text-[#3A478A] truncate">
                                      {idx === 0 ? "Outbound" : "Inbound"} · {routeFrom} to {routeTo}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-[#010D50] font-medium whitespace-nowrap">
                                  {flightClass}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 flex-wrap text-sm text-[#010D50]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[#3A478A]">{routeFrom}</span>
                                  <span className="font-semibold">{departureTime}</span>
                                </div>
                                <svg width="60" height="5" viewBox="0 0 60 5" fill="none" aria-hidden="true">
                                  <circle cx="20" cy="2.5" r="2.5" fill="#010D50" />
                                  <line x1="0" y1="2.5" x2="60" y2="2.5" stroke="#010D50" strokeDasharray="4 4" />
                                </svg>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{arrivalTime}</span>
                                  <span className="text-xs text-[#3A478A]">{routeTo}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap text-xs text-[#3A478A]">
                                <span>{stopsLabel}</span>
                                <span className="w-1 h-1 rounded-full bg-[#3A478A]" />
                                <span>{duration}</span>
                                {legs.length > 0 ? (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-[#3A478A]" />
                                    <span>{legs.length} flight leg{legs.length > 1 ? "s" : ""}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <HotelGallery
                images={hotel.galleryImages}
                mainImage={hotel.mainImage}
                hotelName={hotel.name}
              />
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-4 lg:p-6 space-y-8">
            <div className={hasAboutSection ? "grid lg:grid-cols-[1fr_380px] gap-8" : "grid lg:grid-cols-1 gap-8"}>
              {/* Left Column - About & Amenities */}
              {hasAboutSection && (
                <div ref={aboutRef} className="space-y-8">
                  {/* About Section */}
                  {hasAboutProperty && (
                    <div className={`space-y-4 ${hasAmenitiesSection ? "pb-6 border-b border-[#DFE0E4]" : ""}`}>
                      <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                        About this property
                      </h2>
                      <div className="space-y-4 text-[15px] leading-7 text-[#3A478A]">
                        {aboutParagraphs.map((paragraph, index) => (
                          <p key={`${paragraph.slice(0, 32)}-${index}`} className="max-w-[78ch]">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasNearbySection && (
                    <div className={`space-y-4 ${hasAmenitiesSection ? "pb-6 border-b border-[#DFE0E4]" : ""}`}>
                      <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                        Nearby
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {hotel.nearby.slice(0, 12).map((place) => (
                          <div
                            key={`${place.kind}-${place.name}`}
                            className="rounded-2xl border border-[#DFE0E4] px-4 py-3 bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <MapPin className="w-4 h-4 mt-0.5 text-[#3754ED] flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[#010D50]">
                                  {place.name}
                                </div>
                                <div className="text-xs text-[#3A478A] mt-1">
                                  {typeof place.distanceKm === "number" && typeof place.distanceMi === "number"
                                    ? `${place.distanceKm} km / ${place.distanceMi} mi`
                                    : typeof place.distanceKm === "number"
                                      ? `${place.distanceKm} km`
                                      : typeof place.distanceMi === "number"
                                        ? `${place.distanceMi} mi`
                                        : ""}
                                  {place.kind === "airport" ? " • Airport" : ""}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amenities Section */}
                  {hasAmenitiesSection && (
                    <div className="space-y-4">
                      <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                        Amenities
                      </h2>
                      <div className="flex flex-wrap gap-3">
                        {displayedAmenities.map((amenity) => (
                          <div
                            key={amenity.label}
                            className="flex items-center gap-2 px-4 py-3 border border-[#DFE0E4] rounded-xl"
                          >
                            {getAmenityIcon(amenity.icon)}
                            <span className="text-sm text-[#010D50]">{amenity.label}</span>
                          </div>
                        ))}
                      </div>
                      {hotel.amenities.length > 6 && (
                        <button
                          onClick={() => setShowAllAmenities(!showAllAmenities)}
                          className="text-sm font-medium text-[#3754ED] hover:underline"
                        >
                          {showAllAmenities ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Right Column - Reviews Card & Map */}
              <div className="space-y-4">
                {/* Reviews Summary Card */}
                {hotel.reviews?.count > 0 && (
                  <div className="border border-[#DFE0E4] rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-[#010D50]">Reviews</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-medium text-[#010D50]">
                          {hotel.reviews.label}
                        </span>
                        <span className="text-xs text-[#010D50]">
                          {hotel.reviews.count} reviews
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-[#008234] text-white flex items-center justify-center font-medium text-sm">
                        {hotel.reviews.score.toFixed(1)}
                      </div>
                    </div>

                    {/* Featured Review */}
                    <div className="bg-[#F5F7FF] rounded-xl p-4 space-y-3">
                      <p className="text-sm text-[#010D50] leading-relaxed">
                        {trustYouReview?.summaryText || reviews[0]?.body || "Guest sentiment summary unavailable."}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-300" />
                        <span className="text-sm font-medium text-[#010D50]">TrustYou</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Map Card */}
                <div className="border border-[#DFE0E4] rounded-2xl overflow-hidden">
                  <div className="relative aspect-[4/3] bg-gray-200">
                    {hotel.coordinates ? (
                      <iframe
                        src={`https://www.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || `${hotel.coordinates.lat},${hotel.coordinates.lng}`)}&z=14&output=embed&hl=en`}
                        className="absolute inset-0 w-full h-full border-0"
                        style={{ border: 0 }}
                        loading="lazy"
                        title={`Map showing ${hotel.name}`}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-[#3A478A] bg-[#F6F6F6]">
                        Map unavailable
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-end p-6 bg-gradient-to-t from-black/50 to-transparent">
                      <Link
                        href={hotel.mapUrl}
                        target="_blank"
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#3754ED] text-white text-sm font-bold hover:bg-[#2A3FB8] transition-colors"
                      >
                        View on map
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Availability / Rooms Section */}
          <div ref={roomsRef} className="border border-[#DFE0E4] rounded-3xl mx-4 lg:mx-6 mb-6">
            {/* Search Bar */}
            <div className="p-6 lg:p-8 border-b border-[#DFE0E4] space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                  Availability
                </h2>

                {isPackageMode && packagePriceLabel && (
                  <div className="flex flex-col justify-center px-4 py-3 border border-[#DFE0E4] rounded-2xl min-w-[220px] bg-[#F8FAFF] sm:ml-auto">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3A478A]">
                      Total Package Price
                    </span>
                    <span className="text-lg font-semibold text-[#010D50]">
                      {packagePriceLabel}
                    </span>
                    {packagePerPersonLabel && (
                      <span className="text-xs font-medium text-[#3A478A]">
                        {packagePerPersonLabel} per person
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Hotel Name Input */}
                <div className="flex items-center gap-2 px-4 py-3 border border-[#DFE0E4] rounded-2xl flex-1 min-w-[200px]">
                  <Building2 className="w-[18px] h-[18px] text-[#3A478A]" />
                  <span className="text-sm font-medium text-[#010D50] truncate">
                    {hotel.name}
                  </span>
                </div>

                {/* Date Selector */}
                <button
                  type="button"
                  onClick={() => setStayEditorOpen(true)}
                  className="flex items-start gap-2 px-4 py-3 border border-[#DFE0E4] rounded-2xl min-w-[180px] hover:border-[#3754ED]/60"
                >
                  <Calendar className="w-[18px] h-[18px] text-[#3A478A]" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-[#010D50]">
                      {stayCheckIn && stayCheckOut
                        ? `${formatIsoDateLabel(stayCheckIn)} → ${formatIsoDateLabel(stayCheckOut)}`
                        : "Add Date"}
                    </span>
                    {isHotelDatesDebugMode && (
                      <span className="mt-1 text-[10px] font-mono text-orange-600 bg-orange-50 px-1 py-0.5 rounded w-fit">
                        API: checkIn={stayCheckIn || "—"} → checkOut={stayCheckOut || "—"}
                      </span>
                    )}
                  </div>
                </button>

                {/* Guests */}
                <button
                  type="button"
                  onClick={() => setStayEditorOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 border border-[#DFE0E4] rounded-2xl min-w-[180px] hover:border-[#3754ED]/60"
                >
                  <Users className="w-[18px] h-[18px] text-[#3A478A]" />
                  <span className="text-sm font-medium text-[#010D50]">
                    {stayAdults} Adult{stayAdults === 1 ? "" : "s"}
                    {stayChildren > 0 ? `, ${stayChildren} Child${stayChildren === 1 ? "" : "ren"}` : ""}
                    , {stayRooms} Room{stayRooms === 1 ? "" : "s"}
                  </span>
                </button>

                {/* Filters Button */}
                <Button
                  variant="default"
                  className="flex items-center gap-2 px-5 py-3 h-auto rounded-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white"
                  onClick={() => setRoomsFilterOpen(true)}
                >
                  <SlidersHorizontal className="w-[18px] h-[18px]" />
                  <span className="text-sm font-medium">Filters</span>
                </Button>

                {/* Search Button */}
                <Button
                  variant="default"
                  className="flex items-center gap-2 px-6 py-3 h-auto rounded-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                  onClick={async () => updateAvailabilityFromDateChanges({
                    checkIn: stayCheckIn,
                    checkOut: stayCheckOut,
                    adults: stayAdults,
                    children: stayChildren,
                    rooms: stayRooms,
                    childAges: stayChildAges,
                  })}
                >
                  Search
                </Button>
              </div>
            </div>

            <Dialog open={stayEditorOpen} onOpenChange={(open) => !stayUpdateLoading && setStayEditorOpen(open)}>
              <DialogContent className="max-w-lg bg-white text-[#010D50]">
                <DialogHeader>
                  <DialogTitle>Update stay</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-sm text-[#010D50]">
                      Check-in
                      <input
                        type="date"
                        value={stayCheckIn}
                        onChange={(e) => {
                          setStayCheckIn(e.target.value)
                          if (checkoutRef.current)
                            checkoutRef.current.showPicker();
                        }}
                        disabled={stayUpdateLoading}
                        className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-[#010D50]">
                      Check-out
                      <input
                        type="date"
                        value={stayCheckOut}
                        ref={checkoutRef}
                        onChange={(e) => setStayCheckOut(e.target.value)}
                        disabled={stayUpdateLoading}
                        className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex flex-col gap-1 text-sm text-[#010D50]">
                      Adults
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={stayAdults}
                        onChange={(e) => setStayAdults(Math.max(1, Number(e.target.value || 1)))}
                        disabled={stayUpdateLoading}
                        className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-[#010D50]">
                      Children
                      <input
                        type="number"
                        min={0}
                        max={16}
                        value={stayChildren}
                        onChange={(e) => setStayChildren(Math.max(0, Number(e.target.value || 0)))}
                        disabled={stayUpdateLoading}
                        className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-[#010D50]">
                      Rooms
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={stayRooms}
                        onChange={(e) => setStayRooms(Math.max(1, Number(e.target.value || 1)))}
                        disabled={stayUpdateLoading}
                        className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                      />
                    </label>
                  </div>
                  {stayChildren > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-[#010D50]">Child ages</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.from({ length: stayChildren }, (_, index) => (
                          <label key={`stay-child-age-${index}`} className="flex flex-col gap-1 text-sm text-[#010D50]">
                            Child {index + 1}
                            <select
                              value={stayChildAges[index] ?? 9}
                              onChange={(e) =>
                                setStayChildAges((prev) =>
                                  prev.map((age, ageIndex) => (ageIndex === index ? Number(e.target.value) : age))
                                )
                              }
                              disabled={stayUpdateLoading}
                              className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
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
                  {stayUpdateLoading && (
                    <div className="flex items-center gap-2 text-sm text-[#3A478A]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading updated rates and room options...
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStayEditorOpen(false)} disabled={stayUpdateLoading}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => updateAvailabilityFromDateChanges({
                        checkIn: stayCheckIn,
                        checkOut: stayCheckOut,
                        adults: stayAdults,
                        children: stayChildren,
                        rooms: stayRooms,
                        childAges: stayChildAges,
                      })}
                      disabled={stayUpdateLoading}
                      className="bg-[#3754ED] hover:bg-[#2A3FB8]"
                    >
                      {stayUpdateLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </span>
                      ) : (
                        "Update"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={roomsFilterOpen} onOpenChange={setRoomsFilterOpen}>
              <DialogContent className="max-w-lg bg-white text-[#010D50]">
                <DialogHeader>
                  <DialogTitle>Room filters</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filterRefundableOnly}
                      onChange={(e) => setFilterRefundableOnly(e.target.checked)}
                      className="h-4 w-4 accent-[#3754ED]"
                    />
                    <span className="text-sm text-[#010D50]">Refundable only</span>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-[#010D50]">
                    Search room / board
                    <input
                      type="text"
                      value={filterBoardQuery}
                      onChange={(e) => setFilterBoardQuery(e.target.value)}
                      placeholder="e.g. Breakfast, Deluxe"
                      className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                    />
                  </label>
                  {roomBoardOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {roomBoardOptions.map((board) => (
                        <button
                          key={board}
                          type="button"
                          onClick={() => setFilterBoardQuery(board)}
                          className={`px-3 py-1.5 text-xs rounded-full border ${filterBoardQuery.trim().toLowerCase() === board.toLowerCase()
                            ? "bg-[#3754ED] text-white border-[#3754ED]"
                            : "bg-white text-[#010D50] border-[#DFE0E4]"
                            }`}
                        >
                          {board}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterRefundableOnly(false);
                        setFilterBoardQuery("");
                      }}
                    >
                      Clear
                    </Button>
                    <Button onClick={() => setRoomsFilterOpen(false)} className="bg-[#3754ED] hover:bg-[#2A3FB8]">
                      Done
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Room Cards Grid */}
            <div className="p-6 lg:p-8 space-y-8">
              {rooms.length === 0 && !roomsLoading && (
                <div className="text-sm text-[#3A478A]">
                  No room options returned for this stay.
                </div>
              )}
              <div className="grid lg:grid-cols-3 gap-6">
                {roomsError && (
                  <div className="lg:col-span-3 text-sm text-red-600">{roomsError}</div>
                )}
                {roomsLoading && (
                  <div className="lg:col-span-3 text-sm text-[#3A478A]">Loading room options…</div>
                )}
                {!isPackageMode && requiredRoomCount > 1 && (
                  <div className="lg:col-span-3 border border-[#DFE0E4] rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-[#010D50]">
                      Select {requiredRoomCount} room{requiredRoomCount === 1 ? "" : "s"}: {selectedRoomCount}/{requiredRoomCount} selected
                    </div>
                    <Button
                      className="rounded-full px-6 py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold disabled:bg-[#A8B3F5]"
                      disabled={!canProceedWithRooms}
                      onClick={() => router.push("/hotels/checkout")}
                    >
                      Continue
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                )}
                {rooms.map((room) => {
                  const roomSelectionCount = Math.max(0, Number(selectedRoomCounts[room.id] || 0));
                  const roomIsSelected = roomSelectionCount > 0;
                  const isMultiRoomSelectionMode = !isPackageMode && requiredRoomCount > 1;
                  const isActiveRoomCard = isPackageMode
                    ? String(activeRoomCardId || "") === String(room.id)
                    : isMultiRoomSelectionMode
                      ? String(activeRoomCardId || "") === String(room.id)
                      : roomIsSelected;
                  const roomRaw = room._raw as Record<string, unknown>;
                  const hbRaw = roomRaw._hotelbeds && typeof roomRaw._hotelbeds === "object"
                    ? (roomRaw._hotelbeds as Record<string, unknown>)
                    : null;
                  const hbCancellationPolicies = Array.isArray(hbRaw?.cancellationPolicies)
                    ? hbRaw.cancellationPolicies
                    : [];
                  const roomCode = String(roomRaw.room_code ?? roomRaw.roomCode ?? "").trim();
                  const hbRateClass = String(hbRaw?.rateClass || "").trim();
                  const hbOffers: any[] = Array.isArray(hbRaw?.offers) ? hbRaw.offers
                    : [];
                  const hbPromotions: any[] = Array.isArray(hbRaw?.promotions)
                    ? hbRaw.promotions
                    : [];
                  const roomCancellationPolicy = sanitizeHotelText(room?._raw?.cancellation_policy ?? room?._raw?.cancellationPolicy);
                  const hbCancellationSummary = (() => {
                    const firstCancellation = hbCancellationPolicies[0] ?? null;
                    if (!firstCancellation || typeof firstCancellation !== "object") return "";

                    const cancellationRow = firstCancellation as Record<string, unknown>;
                    return sanitizeHotelText(
                      cancellationRow.policy ??
                      cancellationRow.description ??
                      cancellationRow.text
                    );
                  })();
                  const roomCancellationSummary = roomCancellationPolicy || hbCancellationSummary;
                  const roomCancellationSummaryShort =
                    roomCancellationSummary.length > 240
                      ? `${roomCancellationSummary.slice(0, 237)}...`
                      : roomCancellationSummary;
                  const hasMoreInfo =
                    hbOffers.length > 0 ||
                    hbPromotions.length > 0 ||
                    (Array.isArray(room?.amenities) && room.amenities.length > 0);
                  const expanded = !!expandedRoomInfoById[room.id];
                  const handlePackageRoomActivate = () => {
                    setActiveRoomCardId(String(room.id));
                  };
                  const handlePackageRoomContinue = () => {
                    setActiveRoomCardId(String(room.id));
                    const chosenRoom = room;
                    const rid = chosenRoom.id;
                    const chosenRaw = chosenRoom._raw as Record<string, unknown>;
                    const chosenTaxes = (chosenRaw.hotelBedsTaxes ?? (chosenRaw._hotelbeds as any)?.taxes) as
                      import('@/types/hotel').HotelTaxBreakdown | null | undefined;
                    setSelectedHotelRoomIds([String(rid)]);
                    setSelectedHotelRoomSummary({
                      hotelId,
                      roomId: String(rid),
                      roomName: chosenRoom?.name,
                      mealName: chosenRoom?.bedType,
                      isRefundable: chosenRoom?.isRefundable,
                      currency: chosenRoom?.price?.currency,
                      total: chosenRoom?.price?.total,
                      nightly: chosenRoom?.price?.nightly,
                      hotelbedsRateKey: (chosenRoom as any)?._raw?.rateKey,
                      hotelBedsTaxes: chosenTaxes ?? null,
                    });
                    const params = new URLSearchParams();
                    params.set("type", "package");
                    params.set("hotelId", hotelId);
                    params.set("hotelName", hotel.name);
                    params.set("roomId", String(rid));
                    if (packageResultsMeta?.selectedFlightResultId) {
                      params.set("flightResultId", packageResultsMeta.selectedFlightResultId);
                    }
                    const checkIn = searchParams.get("checkIn") || hotelSearch?.checkIn || packageSearch?.checkIn || "";
                    const nights = Number(packageSearch?.nights || 0);
                    const checkOut = searchParams.get("checkOut") || hotelSearch?.checkOut || (checkIn && nights > 0 ? shiftIsoDateByDays(checkIn, nights) : "");
                    const adults = searchParams.get("adults") || String(hotelSearch?.adults || packageSearch?.rooms?.reduce((sum, room) => sum + room.adults, 0) || 2);
                    const children = searchParams.get("children") || String(hotelSearch?.children || packageSearch?.rooms?.reduce((sum, room) => sum + room.children, 0) || 0);
                    const guests = String(Math.max(1, Number(adults || "0")) + Math.max(0, Number(children || "0")));
                    const rooms = searchParams.get("rooms") || String(hotelSearch?.rooms || packageSearch?.rooms?.length || 1);
                    if (checkIn) {
                      params.set("departureDate", checkIn);
                      params.set("checkIn", checkIn);
                    }
                    if (checkOut) {
                      params.set("returnDate", checkOut);
                      params.set("checkOut", checkOut);
                    }
                    params.set("guests", guests);
                    params.set("rooms", rooms);
                    if (packageSearch?.departureCode) params.set("from", packageSearch.departureCode);
                    if (packageSearch?.destinationCode) params.set("to", packageSearch.destinationCode);
                    if (packageSearch?.departureName) params.set("fromName", packageSearch.departureName);
                    if (packageSearch?.destinationName) params.set("toName", packageSearch.destinationName);
                    params.set("adults", adults);
                    params.set("children", children);
                    params.set("tripType", "round-trip");
                    // Deeplink: flight already selected, skip flight selection → go to review
                    if (isFromDeeplink) {
                      router.push(`/packages/review?${params.toString()}`);
                    } else {
                      router.push(`/search?${params.toString()}`);
                    }
                  };
                  const handleMultiRoomCardSelect = () => {
                    setActiveRoomCardId(String(room.id));
                  };
                  const handleSingleRoomCardSelect = () => {
                    const roomId = String(room.id);
                    setActiveRoomCardId(roomId);
                    setSelectedRoomCounts({ [roomId]: 1 });
                  };
                  const isSingleRoomSelectionMode = !isPackageMode && requiredRoomCount === 1;

                  return (
                    <div
                      key={room.id}
                      className={[
                        "border rounded-[32px] bg-white overflow-hidden flex flex-col h-full transform-gpu transition-all duration-200",
                        isActiveRoomCard ? "border-[#3754ED] scale-[1.01] shadow-md" : "border-[#DFE0E4] scale-100",
                        isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode
                          ? "cursor-pointer hover:scale-[1.005] hover:shadow-md"
                          : "",
                      ].join(" ")}
                      role={isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode ? "button" : undefined}
                      tabIndex={isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode ? 0 : undefined}
                      onClick={
                        isPackageMode
                          ? handlePackageRoomActivate
                          : isMultiRoomSelectionMode
                            ? handleMultiRoomCardSelect
                            : isSingleRoomSelectionMode
                              ? handleSingleRoomCardSelect
                              : undefined
                      }
                      onKeyDown={
                        isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode
                          ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (isPackageMode) handlePackageRoomActivate();
                              else if (isMultiRoomSelectionMode) handleMultiRoomCardSelect();
                              else handleSingleRoomCardSelect();
                            }
                          }
                          : undefined
                      }
                    >
                      {/* Room Info */}
                      <div className="flex-1 p-6 flex flex-col">
                        {/* Room Name & Bed Type */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-[#010D50]">
                            {sanitizeRoomDisplayText(room.name)}
                          </h3>
                          <p className="text-sm text-[#3A478A]">{sanitizeRoomDisplayText(room.bedType)}</p>
                          {(roomCode || hbRateClass) && (
                            <p className="text-xs text-[#3A478A]">
                              {roomCode ? `Code: ${roomCode}` : ""}
                              {roomCode && hbRateClass ? " · " : ""}
                              {hbRateClass ? `Rate: ${hbRateClass}` : ""}
                            </p>
                          )}
                        </div>

                        {(room.reviews.score > 0 || room.reviews.count > 0) && (
                          <div className="flex items-center gap-2 mt-4">
                            <div className="w-10 h-10 rounded-xl bg-[#008234] text-white flex items-center justify-center font-medium text-sm">
                              {room.reviews.score.toFixed(1)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#010D50]">
                                {room.reviews.label}
                              </span>
                              <span className="text-xs text-[#010D50]">
                                {room.reviews.count} reviews
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Refund & Payment Tags */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${room.isRefundable
                            ? "bg-green-100 text-green-700"
                            : "bg-[rgba(0,0,0,0.08)] text-[#FF1414]"
                            }`}>
                            <X className="w-3.5 h-3.5" />
                            {room.isRefundable ? "Refundable" : "Non-refundable"}
                          </div>
                        </div>
                        {roomCancellationSummaryShort && (
                          <p className="mt-3 text-xs text-[#3A478A] leading-relaxed">
                            {roomCancellationSummaryShort}
                          </p>
                        )}

                        {/* Room Amenities */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {room.amenities.slice(0, 5).map((amenity: any) => (
                            <div
                              key={amenity.label}
                              className="flex items-center gap-1.5 px-2 py-1 border border-[#DFE0E4] rounded-xl"
                            >
                              {getAmenityIcon(amenity.icon) || (
                                <div className="w-3.5 h-3.5 bg-gray-300 rounded" />
                              )}
                              <span className="text-xs text-[#010D50]">{amenity.label}</span>
                            </div>
                          ))}
                        </div>

                        {hasMoreInfo && (
                          <button
                            type="button"
                            className="mt-4 text-sm text-[#3754ED] font-medium text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRoomInfoById((prev) => ({ ...prev, [room.id]: !prev[room.id] }));
                            }}
                          >
                            {expanded ? "Hide details" : "More"}
                          </button>
                        )}

                        {hasMoreInfo && expanded && (
                          <div className="mt-3 space-y-3">
                            {(hbPromotions.length > 0 || hbOffers.length > 0) && (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-[#010D50]">Notes</div>
                                {hbPromotions.length > 0 && (
                                  <div className="text-xs text-[#3A478A]">
                                    Promotions: {hbPromotions.length}
                                  </div>
                                )}
                                {hbOffers.length > 0 && (
                                  <div className="text-xs text-[#3A478A]">
                                    Offers: {hbOffers.length}
                                  </div>
                                )}
                              </div>
                            )}
                            {Array.isArray(room?.amenities) && room.amenities.length > 5 && (
                              <div className="text-xs text-[#3A478A]">
                                +{room.amenities.length - 5} more amenities
                              </div>
                            )}
                          </div>
                        )}

                        {isHotelDatesDebugMode && (
                          <details
                            className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <summary className="cursor-pointer text-xs font-semibold text-yellow-800">
                              🔧 Room Raw Data
                            </summary>
                            <pre
                              className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-yellow-100 p-2 text-[10px] text-yellow-900"
                              onWheel={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                            >
                              {JSON.stringify(room?._raw ?? room, null, 2)}
                            </pre>
                          </details>
                        )}

                        {/* Pricing & CTA */}
                        <div className="mt-auto pt-6 space-y-4">
                          <div className="flex flex-col items-end gap-1">
                            {staySummary.nights > 0 && (
                              <span className="text-xs text-[#3A478A]">
                                {staySummary.nights} {staySummary.nights === 1 ? "night" : "nights"} • Check-in {staySummary.checkInLabel} • Check-out {staySummary.checkOutLabel}
                              </span>
                            )}
                            {isPackageMode && (
                              <span className="text-xs font-medium text-[#008234]">
                                ✓ Return Flights Included
                              </span>
                            )}
                            {isPackageMode ? (
                              (() => {
                                const delta = room.price.total - minRoomPrice;
                                if (Math.abs(delta) < 0.01) {
                                  return (
                                    <span className="text-xl font-semibold text-[#008234]">
                                      Included
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-xl font-semibold text-[#010D50]">
                                    +{room.price.currency}{delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                );
                              })()
                            ) : (
                              <>
                                <span className="text-base text-[#010D50]">
                                  {room.price.currency}{room.price.nightly.toLocaleString()} nightly
                                </span>
                                <span className="text-xl font-semibold text-[#010D50]">
                                  {room.price.currency}{room.price.total.toLocaleString()} total
                                </span>
                              </>
                            )}
                            {(() => {
                              const rawForTax = room._raw as Record<string, unknown>;
                              const hbTaxes = (rawForTax.hotelBedsTaxes ?? (rawForTax._hotelbeds as any)?.taxes) as
                                import('@/types/hotel').HotelTaxBreakdown | null | undefined;
                              const notIncluded = hbTaxes?.taxes?.filter(t => !t.included) ?? [];
                              const convertedLabel = convertedLocalTaxByRoomId[room.id];
                              if (notIncluded.length > 0 && convertedLabel) {
                                return (
                                  <span className="text-xs text-[#B07930] bg-[#FFF8F0] border border-[#F5D9B3] rounded px-2 py-0.5">
                                    {convertedLabel}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {isPackageMode ? (
                            <Button
                              className="w-full rounded-full py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePackageRoomContinue();
                              }}
                            >
                              Continue Booking
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          ) : requiredRoomCount === 1 ? (
                            <Button
                              className="w-full rounded-full py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                const roomId = String(room.id);
                                setSelectedRoomCounts({ [roomId]: 1 });
                                setSelectedHotelRoomIds([roomId]);
                                setSelectedHotelRoomSummary(
                                  buildSelectedRoomSummary(hotelId, [roomId], remoteRooms)
                                );
                                router.push("/hotels/checkout");
                              }}
                            >
                              Reserve
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          ) : (
                            <div className="w-full flex items-center justify-between rounded-full border border-[#DFE0E4] px-3 py-2">
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full"
                                disabled={roomSelectionCount === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomCounts((prev) => {
                                    const current = Math.max(0, Number(prev[room.id] || 0));
                                    if (current <= 0) return prev;
                                    const next = { ...prev };
                                    if (current === 1) delete next[room.id];
                                    else next[room.id] = current - 1;
                                    return next;
                                  });
                                }}
                              >
                                −
                              </Button>
                              <span className="text-sm font-semibold text-[#010D50]">{roomSelectionCount}</span>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full"
                                disabled={selectedRoomCount >= requiredRoomCount}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoomCounts((prev) => {
                                    if (countSelectedRooms(prev) >= requiredRoomCount) return prev;
                                    const current = Math.max(0, Number(prev[room.id] || 0));
                                    return { ...prev, [room.id]: current + 1 };
                                  });
                                }}
                              >
                                +
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div ref={reviewsRef} className="mx-4 lg:mx-6 mb-6 bg-[#F5F7FF] rounded-3xl p-6 lg:p-8 space-y-8">
            <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
              Reviews
            </h2>

            {hasReviewData ? (
              <div className="grid lg:grid-cols-[1fr_300px] gap-8">
                {/* Reviews & Cards */}
                <div className="space-y-6">
                  {/* Score & Label */}
                  {hotel.reviews.score > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="w-[178px] h-[165px] rounded-xl bg-[#008234] text-white flex flex-col items-center justify-center">
                        <span className="text-6xl font-medium">
                          {hotel.reviews.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#010D50]">
                            {hotel.reviews.label}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-[#3A478A]" />
                          <span className="text-xs text-[#010D50]">
                            {hotel.reviews.count} reviews
                          </span>
                        </div>
                        <span className="text-xs text-[#3A478A]">Powered by TrustYou</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Review Cards Grid */}
                  {reviews.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {reviews.slice(0, 4).map((review) => (
                        <div
                          key={review.id}
                          className="bg-white border border-[#DFE0E4] rounded-2xl p-6 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#010D50]">
                              {review.author}
                            </span>
                            <span className="text-sm font-medium text-[#010D50]">
                              {review.rating.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-sm text-[#010D50] leading-relaxed line-clamp-3">
                            {review.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : trustYouReview?.highlights?.length ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {trustYouReview.highlights.slice(0, 4).map((highlight, index) => (
                        <div
                          key={`${highlight}-${index}`}
                          className="bg-white border border-[#DFE0E4] rounded-2xl p-6"
                        >
                          <p className="text-sm text-[#010D50] leading-relaxed">{highlight}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Rating Breakdown */}
                <div className="space-y-6">
                  {Object.entries(hotel.reviews.breakdown as Record<string, number>).length > 0 ? (
                    Object.entries(hotel.reviews.breakdown as Record<string, number>).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-[#010D50]">
                            {key}
                          </span>
                          <span className="text-base font-medium text-[#010D50]">
                            {value.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 bg-white rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-[rgba(55,84,237,0.12)] rounded-lg"
                            style={{ width: `${(value / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#3A478A]">
                      Detailed category breakdown is currently unavailable.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#DFE0E4] bg-white p-6 text-sm text-[#3A478A]">
                Reviews are not available yet for this property.
              </div>
            )}
          </div>

          {/* Policies Section */}
          {hasPolicies && (
            <div ref={policiesRef} className="mx-4 lg:mx-6 mb-6 py-6 border-t border-[#DFE0E4]">
              <div className="space-y-6">
                <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                  Policies
                </h2>
                <div className="text-sm text-[#3A478A] leading-relaxed whitespace-pre-line">
                  {hotel.policies}
                </div>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          {faqs.length > 0 && (
            <div className="mx-4 lg:mx-6 mb-6 bg-[#F5F7FF] rounded-3xl p-6 lg:p-8 space-y-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                Got questions about {hotel.name.split(' ').slice(0, 3).join(' ')}?
              </h2>

              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white border border-[#DFE0E4] rounded-[32px] overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
                      }
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <span className="text-base lg:text-lg font-medium text-[#010D50] pr-4">
                        {faq.question}
                      </span>
                      {expandedFAQ === faq.id ? (
                        <ChevronUp className="w-6 h-6 text-[#010D50] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-[#010D50] flex-shrink-0" />
                      )}
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="px-6 pb-6">
                        <p className="text-sm text-[#3A478A] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Important Information Section */}
          {hasImportantInfo && (
            <div ref={accessibilitiesRef} className="mx-4 lg:mx-6 mb-6 py-6 border-t border-[#DFE0E4]">
              <div className="space-y-6">
                <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                  Important information
                </h2>
                <div className="text-sm text-[#3A478A] leading-relaxed whitespace-pre-line">
                  {hotel.importantInfo}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
