"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Star,
  Grid3X3,
  Building2,
  Calendar,
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
  ChevronLeft,
} from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hotelService } from "@/services/api/hotelService";
import { useBookingStore } from "@/store/bookingStore";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";

function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200/70 rounded-xl ${className}`} />;
}

function formatIsoDateLabel(d?: string): string {
  const s = String(d || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "Add Date";
  return s;
}

type UnknownRecord = Record<string, unknown>;

interface RoomAmenity {
  label: string;
  icon: string;
}

interface RoomCardData {
  id: string;
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

// Map raw amenity text from API to { label, icon } format
function mapAmenityTextToIcon(text: string): string {
  const lowered = text.toLowerCase();
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

function transformAmenities(rawAmenities: string[]): { label: string; icon: string }[] {
  return rawAmenities.map((text) => ({
    label: text,
    icon: mapAmenityTextToIcon(text),
  }));
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
    .join("\n");
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
    const nonRefFlag = String(option.nonRef ?? "").trim();
    if (nonRefFlag === "1") {
      policyBlocks.push("This rate is non-refundable.");
    }

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

      const from = sanitizeHotelText(cancellationRow.from);
      const amount = Number(cancellationRow.amount);
      const currency = sanitizeHotelText(cancellationRow.currency || row.SellCur);
      if (from && Number.isFinite(amount)) {
        const amountText = amount.toFixed(2).replace(/\.00$/, "");
        policyBlocks.push(
          `Cancellation fee from ${from}: ${currency ? `${currency} ` : ""}${amountText}`
        );
      }
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
  addLabeledLine("Total number of rooms", row.numOfRooms ?? row.no_of_rooms ?? row.total_rooms);

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
  return /(year of|total number of|number of floors|check-in|check out|check-out|minimum check-in age|minimum age|credit card|identity card|identification|small pets allowed|pets allowed|deposit|city tax|tourism tax)/i.test(
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
    normalizeImportantInfoLine(hotelContent?.numOfRooms ? `Total number of rooms: ${hotelContent.numOfRooms}` : ""),
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
  const hotelId = params?.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchCriteriaId = searchParams.get("searchCriteriaId");
  const urlSrId = searchParams.get("srId");
  const urlProvider = searchParams.get("provider");

  // Detect if we're in package (flight+hotel) mode
  const isPackageMode = searchParams.get("type") === "package";

  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const hotelResultsMeta = useBookingStore((s) => s.hotelResultsMeta);
  const setSelectedHotel = useBookingStore((s) => s.setSelectedHotel);
  const setSelectedHotelRoomIds = useBookingStore((s) => s.setSelectedHotelRoomIds);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const setHotelDetailsCache = useBookingStore((s) => s.setHotelDetailsCache);
  const setSelectedHotelRoomSummary = useBookingStore((s) => s.setSelectedHotelRoomSummary);
  const setHotelSearch = useBookingStore((s) => s.setHotelSearch);
  const setHotelResultsMeta = useBookingStore((s) => s.setHotelResultsMeta);
  const setSearchRequestId = useBookingStore((s) => s.setSearchRequestId);

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [roomImages, setRoomImages] = useState<Record<string, string[]>>({});
  const [detailsText, setDetailsText] = useState<string>("");
  const [cancellationText, setCancellationText] = useState<string>("");
  const [importantInfoText, setImportantInfoText] = useState<string>("");
  const [remoteAmenities, setRemoteAmenities] = useState<string[]>([]);
  const [remoteRooms, setRemoteRooms] = useState<RoomCardData[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [selectedRoomCounts, setSelectedRoomCounts] = useState<Record<string, number>>({});
  const [stayEditorOpen, setStayEditorOpen] = useState(false);
  const [roomsFilterOpen, setRoomsFilterOpen] = useState(false);
  const [expandedRoomInfoById, setExpandedRoomInfoById] = useState<Record<string, boolean>>({});
  const [stayCheckIn, setStayCheckIn] = useState<string>(() => hotelSearch?.checkIn || "");
  const [stayCheckOut, setStayCheckOut] = useState<string>(() => hotelSearch?.checkOut || "");
  const [stayAdults, setStayAdults] = useState<number>(() => hotelSearch?.adults || 2);
  const [stayChildren, setStayChildren] = useState<number>(() => hotelSearch?.children || 0);
  const [stayRooms, setStayRooms] = useState<number>(() => hotelSearch?.rooms || 1);
  const [filterRefundableOnly, setFilterRefundableOnly] = useState(false);
  const [filterBoardQuery, setFilterBoardQuery] = useState<string>("");
  const [rawGetRoomsV3Response, setRawGetRoomsV3Response] = useState<unknown>(null);
  const [rawAccommodationDetailsResponse, setRawAccommodationDetailsResponse] = useState<unknown>(null);
  const isHotelDatesDebugMode = process.env.NEXT_PUBLIC_DEBUG_HOTEL_DATES === "true";

  useEffect(() => {
    // Keep local editor state in sync with global search state when navigating between hotels.
    setStayCheckIn(hotelSearch?.checkIn || "");
    setStayCheckOut(hotelSearch?.checkOut || "");
    setStayAdults(hotelSearch?.adults || 2);
    setStayChildren(hotelSearch?.children || 0);
    setStayRooms(hotelSearch?.rooms || 1);
  }, [hotelSearch?.checkIn, hotelSearch?.checkOut, hotelSearch?.adults, hotelSearch?.children, hotelSearch?.rooms]);

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

  async function runStaySearch(next: { checkIn: string; checkOut: string; adults: number; children: number; rooms: number }) {
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
      branches: hotelSearch.branches,
    });

    const availabilityRow = asRecord(availability);
    const criteriaIdAny = asRecord(availabilityRow.Criteria).searchCriteriaId;
    const criteriaId =
      typeof criteriaIdAny === "number" || typeof criteriaIdAny === "string" ? criteriaIdAny : null;
    if (!criteriaId) throw new Error("No searchCriteriaId returned from availability search.");
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
        imageName: typeof hitRow.image_name === "string" ? hitRow.image_name : nextMeta[String(hotelId)]?.imageName,
        address1: typeof hitRow.address1 === "string" ? hitRow.address1 : nextMeta[String(hotelId)]?.address1,
        address2: typeof hitRow.address2 === "string" ? hitRow.address2 : nextMeta[String(hotelId)]?.address2,
        hotelRating:
          Number.isFinite(Number(hitRow.hotel_rating)) ? Number(hitRow.hotel_rating) : nextMeta[String(hotelId)]?.hotelRating,
        rawSearchResult: hitRow ?? nextMeta[String(hotelId)]?.rawSearchResult,
      };
      setHotelResultsMeta(nextMeta);
    }
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
      if (photos.length === 0) {
        const imageNodes = Array.from(doc.querySelectorAll("images > image"));
        imageNodes.forEach((img) => {
          const path = normalizeUrl(img.getAttribute("path") || "");
          if (!path) return;

          const roomCode = img.getAttribute("roomCode");
          if (roomCode) {
            // This is a room-specific image
            if (!roomImages[roomCode]) roomImages[roomCode] = [];
            roomImages[roomCode].push(path);
          } else {
            // General hotel image
            photos.push(path);
          }
        });
      }

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
        photos: Array.from(new Set(photos)),
        roomImages, // Room-specific images keyed by roomCode
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

  // Hydrate from cache to avoid mock-first / flicker.
  useEffect(() => {
    const cached = hotelId ? hotelDetailsCache[hotelId] : undefined;
    if (!cached) return;

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
    if (Array.isArray(cached.rooms)) setRemoteRooms(cached.rooms);
    if (typeof cached.detailsText === "string") setDetailsText(cached.detailsText);
    if (typeof cached.cancellationText === "string") setCancellationText(cached.cancellationText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const hotel = useMemo(() => {
    return {
      name: remoteHotelHeader?.name || "",
      starRating: remoteHotelHeader?.rating || 0,
      mainImage: remoteHotelHeader?.image || galleryImages[0] || "",
      galleryImages: galleryImages.length > 0 ? galleryImages : (remoteHotelHeader?.image ? [remoteHotelHeader.image] : []),
      address: remoteHotelHeader?.address || "",
      about: {
        description: detailsText || "",
      },
      amenities: transformAmenities(remoteAmenities || []),
      reviews: { score: 0, label: "", count: 0, breakdown: {} as Record<string, number> },
      policies: cancellationText || "",
      mapUrl: coordinates
        ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}&hl=en`
        : "#",
      importantInfo: importantInfoText || "",
      coordinates,
    };
  }, [cancellationText, coordinates, detailsText, galleryImages, importantInfoText, remoteAmenities, remoteHotelHeader]);
  const hasPolicies = hotel.policies.trim().length > 0;
  const hasImportantInfo = hotel.importantInfo.trim().length > 0;
  const navSections = useMemo(
    () => ["Overview", "About", "Rooms", "Accessibilities", ...(hasPolicies ? ["Policies"] : [])],
    [hasPolicies]
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
  const requiredRoomCount = Math.max(1, Number(stayRooms || 1));
  const selectedRoomIds = useMemo(() => selectedRoomIdsFromCounts(selectedRoomCounts), [selectedRoomCounts]);
  const selectedRoomCount = useMemo(() => countSelectedRooms(selectedRoomCounts), [selectedRoomCounts]);
  const canProceedWithRooms = selectedRoomCount === requiredRoomCount && selectedRoomCount > 0;
  const reviews: Array<{
    id: string;
    author: string;
    date: string;
    title: string;
    body: string;
    rating: number;
  }> = [];
  const faqs: Array<{ id: string; question: string; answer: string }> = [];

  const displayedAmenities = showAllAmenities ? hotel.amenities : hotel.amenities.slice(0, 6);

  useEffect(() => {
    setSelectedHotelRoomIds(selectedRoomIds);
    const summary = buildSelectedRoomSummary(hotelId, selectedRoomIds, remoteRooms);
    setSelectedHotelRoomSummary(summary);
  }, [hotelId, remoteRooms, selectedRoomIds, setSelectedHotelRoomIds, setSelectedHotelRoomSummary]);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      const meta = hotelResultsMeta?.[hotelId];
      const metaProvider =
        meta?.provider === "hotelbeds" || meta?.provider === "vyspa" ? meta.provider : undefined;
      const urlProviderNormalized =
        urlProvider === "hotelbeds" || urlProvider === "vyspa" ? (urlProvider as "hotelbeds" | "vyspa") : undefined;
      const effectiveProvider: "vyspa" | "hotelbeds" =
        urlProviderNormalized || metaProvider || (hotelSearch?.provider === "hotelbeds" ? "hotelbeds" : "vyspa");
      const effectiveSearchCriteriaId = urlSearchCriteriaId ?? meta?.searchCriteriaId ?? hotelSearch?.searchCriteriaId;
      if (!effectiveSearchCriteriaId) return;
      const searchResultSeed = extractSearchResultHotelData(meta?.rawSearchResult);
      setRoomsLoading(true);
      setRoomsError(null);

      try {
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

        const srId = urlSrId || meta?.srId || meta?.searchResultId;
        let resp: any = await hotelService.getRoomsV3(effectiveSearchCriteriaId, hotelId, srId);
        const initialResp = resp;
        const respRoot: any = Array.isArray(resp) ? resp[0] : resp;
        const noHotelsFound =
          respRoot && typeof respRoot === "object" && !!respRoot.error && /no hotels found/i.test(String(respRoot.desc || ""));

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
        const headerImage = String(respAny?.image_name || meta?.imageName || "").trim();
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
              const mergedGallery = Array.from(new Set([...(hotelImages.length ? hotelImages : []), ...(imgs || [])])).slice(0, 12);
              if (mergedGallery.length > 0) setGalleryImages(mergedGallery);

              const amenities: string[] = Array.isArray(data?.amenities) ? data.amenities.filter(Boolean) : [];
              if (amenities.length > 0) {
                setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...amenities])));
              }

              const roomImagesNext: Record<string, string[]> =
                data?.roomImages && typeof data.roomImages === "object" ? data.roomImages : {};
              if (roomImagesNext && Object.keys(roomImagesNext).length > 0) setRoomImages(roomImagesNext);

              const desc = typeof data?.description === "string" ? data.description.trim() : "";
              if (desc) setDetailsText(desc);
            })
            .catch(() => {});
        }

        // Real schema (seen in stage): rooms.room1options[] with {id, room_name, meal_name, net_price, nonRef, ...}
        const roomsObj: any = respAny?.rooms;
        const room1options: any[] = Array.isArray(roomsObj?.room1options)
          ? roomsObj.room1options
          : Array.isArray((respAny as any)?.room1options)
            ? (respAny as any).room1options
            : [];
        const roomsApiDesc = typeof respAny?.desc === "string" ? respAny.desc.trim() : "";

        const flattened: any[] = room1options.map((opt: any) => ({
          id: String(opt?.id),
          name: opt?.room_name || "Room",
          bedType: opt?.meal_name || opt?.MealPlan || "Meal plan",
          reviews: { score: 0, label: "No reviews", count: 0 },
          isRefundable: opt?.nonRef === 0,
          paymentType: "Pay now",
          amenities: [],
          price: {
            currency: opt?.sell_currency_code === "GBP" ? "£" : opt?.sell_currency_code || "£",
            nightly: Number(opt?.days_spent) > 0 ? Number(opt?.net_price || 0) / Number(opt?.days_spent) : Number(opt?.net_price || 0),
            total: Number(opt?.net_price || 0),
          },
          _raw: opt,
        }));

        let accommodationDetailsResp: any = null;
        let accommodationFallbackRooms: any[] = [];
        if (effectiveProvider === "vyspa") {
          const roomCodes = room1options
            .map((opt: any) => {
              const s = String(opt?.id ?? "").trim();
              return /^\d+$/.test(s) ? Number(s) : null;
            })
            .filter((v: number | null): v is number => v !== null);

          if (roomCodes.length > 0) {
            try {
              accommodationDetailsResp = await hotelService.accommodationDetails([{ roomCode: roomCodes }]);
              if (!cancelled) setRawAccommodationDetailsResponse(accommodationDetailsResp ?? null);
              const detailsRooms = Array.isArray(accommodationDetailsResp?.rooms) ? accommodationDetailsResp.rooms : [];
              accommodationFallbackRooms = detailsRooms
                .map((row: any) => {
                  const d = row?.SearchResultRoomDetail || row;
                  const id = String(d?.id ?? d?.search_result_detail_id ?? "").trim();
                  if (!id) return null;
                  const total = Number(d?.net_price ?? d?.room_price ?? 0);
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

        const effectiveRooms = flattened.length > 0 ? flattened : accommodationFallbackRooms;
        // Sort rooms low -> high (user request)
        effectiveRooms.sort((a, b) => (a.price.total || 0) - (b.price.total || 0));
        const requiredRoomsForSelection = Math.max(1, Number(hotelSearch?.rooms || 1));
        const defaultSelectedCounts = (() => {
          const next: Record<string, number> = {};
          if (effectiveRooms.length === 0) return next;
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
                const nextGallery = Array.from(
                  new Set([
                    ...(detailsData.galleryImages || []),
                    ...(vyspaMedia.hotelImages || []),
                    ...(parsed?.photos || []),
                    ...(imgs || []),
                  ].filter(Boolean))
                );
                if (detailsData.amenities.length > 0) {
                  setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...detailsData.amenities])));
                }
                if (parsed?.amenities?.length) {
                  setRemoteAmenities((previous) => Array.from(new Set([...(previous || []), ...parsed.amenities])));
                }
                const mergedRoomImages = {
                  ...(vyspaMedia.roomImages || {}),
                  ...(parsed?.roomImages || {}),
                };
                if (Object.keys(mergedRoomImages).length > 0) {
                  setRoomImages(mergedRoomImages);
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
  }, [hotelId, hotelResultsMeta, hotelSearch, hotelSearch?.provider, hotelSearch?.searchCriteriaId, isPackageMode, searchParams, setHotelSearch, setSelectedHotel, urlProvider, urlSearchCriteriaId, urlSrId]);

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      Overview: overviewRef,
      About: aboutRef,
      Rooms: roomsRef,
    };
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hard loader: avoid showing mock-first UI */}
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
              onClick={() => window.history.back()}
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <PackageStepProgress currentStep="stay" />
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl overflow-hidden">
          {/* Overview Section */}
          <div ref={overviewRef}>
            {/* Hotel Header + Gallery */}
            <div className="p-4 lg:p-6 space-y-6">
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

              {/* Image Gallery - Main image left, 3 thumbnails stacked right */}
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Main Image - Takes up ~70% width */}
                <div
                  className="relative flex-[2] min-h-[300px] lg:min-h-[450px] rounded-2xl overflow-hidden cursor-pointer group"
                  onClick={() => {
                    if (hotel.galleryImages.length > 0) {
                      setCurrentPhotoIndex(0);
                      setGalleryOpen(true);
                    }
                  }}
                >
                  {hotel.mainImage ? (
                    <Image
                      src={hotel.mainImage}
                      alt={hotel.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#F6F6F6]" />
                  )}
                  {/* Show All Photos Button - Bottom left of main image */}
                  {hotel.galleryImages.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGalleryOpen(true);
                      }}
                      className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-all shadow-sm hover:shadow-md"
                    >
                      <Grid3X3 className="w-4 h-4 text-[#010D50]" />
                      <span className="text-sm font-medium text-[#010D50]">Show All Photos</span>
                    </button>
                  )}
                </div>

                {/* Thumbnail Stack - 3 images vertically on right */}
                <div className="flex flex-row lg:flex-col gap-3 lg:w-[220px]">
                  {(() => {
                    // Logic to skip the main image if it's the first one in galleryImages
                    const firstIsMain = hotel.galleryImages?.[0] === hotel.mainImage;
                    const thumbImages = firstIsMain ? (hotel.galleryImages || []).slice(1, 4) : (hotel.galleryImages || []).slice(0, 3);
                    return thumbImages.map((img: string, idx: number) => {
                      const imgIndex = firstIsMain ? idx + 1 : idx;
                      return (
                      <div
                        key={`${img}-${idx}`}
                        className="relative flex-1 lg:flex-none lg:h-[140px] min-h-[100px] rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                        onClick={() => {
                          setCurrentPhotoIndex(imgIndex);
                          setGalleryOpen(true);
                        }}
                      >
                        <Image
                          src={img}
                          alt={`${hotel.name} - ${idx + 1}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    )});
                  })()}
                </div>
              </div>
            </div>
          </div>

          <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
            <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-none rounded-none overflow-hidden z-[9999]">
              <div className="relative w-full h-full flex flex-col pt-12 pb-24">
                {/* Close Button */}
                <button
                  onClick={() => setGalleryOpen(false)}
                  className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group"
                >
                  <X className="w-6 h-6 transition-transform group-hover:scale-110" />
                </button>

                {/* Main Viewer Area */}
                <div className="flex-1 relative flex items-center justify-center px-4 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPhotoIndex}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="relative w-full h-full max-w-6xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl"
                    >
                      <Image
                        src={hotel.galleryImages[currentPhotoIndex]}
                        alt={`Photo ${currentPhotoIndex + 1}`}
                        fill
                        className="object-contain"
                        sizes="100vw"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Arrows */}
                  {hotel.galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : hotel.galleryImages.length - 1));
                        }}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group hidden md:block"
                      >
                        <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex((prev) => (prev < hotel.galleryImages.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group hidden md:block"
                      >
                        <ChevronRight className="w-8 h-8 transition-transform group-hover:translate-x-1" />
                      </button>
                    </>
                  )}

                  {/* Photo Counter */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-sm font-medium">
                    {currentPhotoIndex + 1} / {hotel.galleryImages.length}
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
                  <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 h-full scrollbar-hide">
                    {hotel.galleryImages.map((img: string, idx: number) => (
                      <button
                        key={`${img}-${idx}`}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`relative h-20 aspect-[4/3] rounded-lg overflow-hidden flex-shrink-0 transition-all duration-300 ${currentPhotoIndex === idx
                          ? "ring-2 ring-[#3754ED] scale-110 translate-y-[-4px] opacity-100"
                          : "opacity-40 hover:opacity-100"
                          }`}
                      >
                        <Image
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Content Grid */}
          <div className="p-4 lg:p-6 space-y-8">
            <div className="grid lg:grid-cols-[1fr_380px] gap-8">
              {/* Left Column - About & Amenities */}
              <div ref={aboutRef} className="space-y-8">
                {/* About Section */}
                <div className="space-y-4 pb-6 border-b border-[#DFE0E4]">
                  <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                    About this property
                  </h2>
                  <div className="text-sm text-[#3A478A] leading-relaxed whitespace-pre-line">
                    {hotel.about.description}
                  </div>
                </div>

                {/* Amenities Section */}
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
              </div>

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
                        Great location and view. Check-out was easy and they even had water and tea available. Would stay again
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-300" />
                        <span className="text-sm font-medium text-[#010D50]">Sarah M.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Map Card */}
                <div className="border border-[#DFE0E4] rounded-2xl overflow-hidden">
                  <div className="relative aspect-[4/3] bg-gray-200">
                    {hotel.coordinates ? (
                      <iframe
                        src={`https://www.google.com/maps?q=${hotel.coordinates.lat},${hotel.coordinates.lng}&z=14&output=embed&hl=en`}
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
              <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                Availability
              </h2>

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
                  onClick={async () => {
                    try {
                      setRoomsError(null);
                      setRoomsLoading(true);
                      await runStaySearch({
                        checkIn: stayCheckIn,
                        checkOut: stayCheckOut,
                        adults: stayAdults,
                        children: stayChildren,
                        rooms: stayRooms,
                      });
                    } catch (e: any) {
                      setRoomsError(e?.message || "Failed to update availability");
                    } finally {
                      setRoomsLoading(false);
                    }
                  }}
                >
                  Search
                </Button>
              </div>
            </div>

            <Dialog open={stayEditorOpen} onOpenChange={setStayEditorOpen}>
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
                        onChange={(e) => setStayCheckIn(e.target.value)}
                        className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-[#010D50]">
                      Check-out
                      <input
                        type="date"
                        value={stayCheckOut}
                        onChange={(e) => setStayCheckOut(e.target.value)}
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
                        className="border border-[#DFE0E4] rounded-lg px-3 py-2 bg-white text-[#010D50]"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStayEditorOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          setRoomsError(null);
                          setRoomsLoading(true);
                          await runStaySearch({
                            checkIn: stayCheckIn,
                            checkOut: stayCheckOut,
                            adults: stayAdults,
                            children: stayChildren,
                            rooms: stayRooms,
                          });
                          setStayEditorOpen(false);
                        } catch (e: any) {
                          setRoomsError(e?.message || "Failed to update availability");
                        } finally {
                          setRoomsLoading(false);
                        }
                      }}
                      className="bg-[#3754ED] hover:bg-[#2A3FB8]"
                    >
                      Update
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
                {!isPackageMode && (
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
                  const roomRaw = room._raw as Record<string, unknown>;
                  const hbRaw = roomRaw._hotelbeds && typeof roomRaw._hotelbeds === "object"
                    ? (roomRaw._hotelbeds as Record<string, unknown>)
                    : null;
                  const hbCancellationPolicies = Array.isArray(hbRaw?.cancellationPolicies)
                    ? hbRaw.cancellationPolicies
                    : [];
                  // Get room-specific image if available
                  const roomCode = String(roomRaw.room_code ?? roomRaw.roomCode ?? "").trim();
                  // Strict: only show images that match the returned room code (no heuristics/prefix matching).
                  const roomImgList = roomCode ? (roomImages[roomCode] || []) : [];
                  // Only show image if room-specific image is available
                  const roomImage = roomImgList[0] || "";
                  const hbCancelFrom = (() => {
                    const from = (hbCancellationPolicies[0] as Record<string, unknown> | undefined)?.from;
                    if (typeof from !== "string" || !from) return "";
                    return from.slice(0, 10);
                  })();
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
                    const fromRaw = sanitizeHotelText(cancellationRow.from);
                    const from = fromRaw ? fromRaw.slice(0, 10) : "";
                    const amount = Number(cancellationRow.amount);
                    const currency = sanitizeHotelText(cancellationRow.currency || room?._raw?.sell_currency_code || room?._raw?.currency_code);

                    if (from && Number.isFinite(amount) && amount > 0) {
                      const amountText = amount.toFixed(2).replace(/\.00$/, "");
                      return `Cancellation fee from ${from}: ${currency ? `${currency} ` : ""}${amountText}`;
                    }
                    return "";
                  })();
                  const roomCancellationSummary =
                    roomCancellationPolicy ||
                    hbCancellationSummary ||
                    (!room.isRefundable ? "This rate is non-refundable." : "");
                  const roomCancellationSummaryShort =
                    roomCancellationSummary.length > 240
                      ? `${roomCancellationSummary.slice(0, 237)}...`
                      : roomCancellationSummary;
                  const hasMoreInfo =
                    roomImgList.length > 1 ||
                    hbOffers.length > 0 ||
                    hbPromotions.length > 0 ||
                    (Array.isArray(room?.amenities) && room.amenities.length > 0);
                  const expanded = !!expandedRoomInfoById[room.id];

                  return (
                    <div
                      key={room.id}
                      className={[
                        "border rounded-[32px] bg-white overflow-hidden flex flex-col h-full",
                        roomIsSelected ? "border-[#3754ED]" : "border-[#DFE0E4]",
                      ].join(" ")}
                    >
                      {/* Room Image */}
                      {roomImage ? (
                        <div className="relative w-full h-40 bg-gray-100">
                          <img
                            src={roomImage}
                            alt={room.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}

                      {/* Room Info */}
                      <div className="flex-1 p-6 flex flex-col">
                        {/* Room Name & Bed Type */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-[#010D50]">
                            {room.name}
                          </h3>
                          <p className="text-sm text-[#3A478A]">{room.bedType}</p>
                          {(roomCode || hbRateClass) && (
                            <p className="text-xs text-[#3A478A]">
                              {roomCode ? `Code: ${roomCode}` : ""}
                              {roomCode && hbRateClass ? " · " : ""}
                              {hbRateClass ? `Rate: ${hbRateClass}` : ""}
                            </p>
                          )}
                        </div>

                        {/* Rating */}
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

                        {/* Refund & Payment Tags */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${room.isRefundable
                            ? "bg-green-100 text-green-700"
                            : "bg-[rgba(0,0,0,0.08)] text-[#FF1414]"
                            }`}>
                            <X className="w-3.5 h-3.5" />
                            {room.isRefundable ? "Refundable" : "Non-refundable"}
                          </div>
                          {room.isRefundable && hbCancelFrom && (
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-xs text-green-700">
                              Free cancellation until {hbCancelFrom}
                            </div>
                          )}
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
                            {roomImgList.length > 1 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-[#010D50]">More photos</div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {roomImgList.slice(1, 7).map((img: string, idx: number) => (
                                    <img
                                      key={`${img}-${idx}`}
                                      src={img}
                                      alt=""
                                      className="h-14 w-20 rounded-lg object-cover border border-[#DFE0E4]"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
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
                            <span className="text-base text-[#010D50]">
                              {room.price.currency}{room.price.nightly.toLocaleString()} nightly
                            </span>
                            <span className="text-xl font-semibold text-[#010D50]">
                              {room.price.currency}{room.price.total.toLocaleString()} total
                            </span>
                            <span className="text-xs text-[#3A478A]">
                              * Locally payable taxes
                            </span>
                          </div>

                          {isPackageMode ? (
                            <Button
                              className="w-full rounded-full py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                const chosenRoom = room;
                                const rid = chosenRoom.id;
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
                                });
                                const params = new URLSearchParams();
                                params.set("type", "package");
                                params.set("hotelId", hotelId);
                                params.set("hotelName", hotel.name);
                                params.set("roomId", String(rid));
                                const checkIn = searchParams.get("checkIn");
                                const checkOut = searchParams.get("checkOut");
                                const guests = searchParams.get("guests") || searchParams.get("adults") || "2";
                                const rooms = searchParams.get("rooms") || "1";
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
                                params.set("from", "LHR");
                                params.set("to", "HKG");
                                params.set("adults", guests);
                                params.set("tripType", "round-trip");
                                router.push(`/search?${params.toString()}`);
                              }}
                            >
                              Continue Booking
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

          {/* Guest Reviews Section */}
          {hotel.reviews?.count > 0 && (
            <div className="mx-4 lg:mx-6 mb-6 bg-[#F5F7FF] rounded-3xl p-6 lg:p-8 space-y-8">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                Guest review
              </h2>

              <div className="grid lg:grid-cols-[1fr_300px] gap-8">
                {/* Reviews & Cards */}
                <div className="space-y-6">
                  {/* Score & Label */}
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
                      <button className="text-xs text-[#3754ED] font-medium text-left">
                        Read all reviews
                      </button>
                    </div>
                  </div>

                  {/* Review Cards Grid */}
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
                            {review.rating}
                          </span>
                        </div>
                        <p className="text-sm text-[#010D50] leading-relaxed line-clamp-3">
                          {review.body}
                        </p>
                        <button className="text-sm text-[#3754ED] font-medium">
                          Read more
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating Breakdown */}
                <div className="space-y-6">
                  {Object.entries(hotel.reviews.breakdown as Record<string, number>).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-[#010D50] capitalize">
                          {key === "freeWifi" ? "Free WiFi" : key === "valueForMoney" ? "Value for money" : key}
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
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Policies Section */}
          {hasPolicies && (
            <div className="mx-4 lg:mx-6 mb-6 py-6 border-t border-[#DFE0E4]">
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
            <div className="mx-4 lg:mx-6 mb-6 py-6 border-t border-[#DFE0E4]">
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
