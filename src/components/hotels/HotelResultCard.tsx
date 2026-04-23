"use client";

import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import { Check, ChevronRight, PawPrint, Bus, Coffee, X, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import type { Hotel } from "@/types/hotel";
import type { HotelViewMode } from "./HotelResultsToolbar";
import { useBookingStore } from "@/store/bookingStore";
import { serializeHotelChildAges } from "@/lib/hotels/childAges";

function getAmenityIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("pet")) return <PawPrint className="h-3.5 w-3.5 text-[#3A478A]" />;
  if (lower.includes("shuttle") || lower.includes("airport")) return <Bus className="h-3.5 w-3.5 text-[#3A478A]" />;
  if (lower.includes("breakfast")) return <Coffee className="h-3.5 w-3.5 text-[#3A478A]" />;
  if (lower.includes("cancel")) return <X className="h-3.5 w-3.5 text-[#3A478A]" />;
  return null;
}

function AmenityPill({ text }: { text: string }) {
  const icon = getAmenityIcon(text);
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#DFE0E4] bg-white px-3 py-1.5">
      {icon}
      <span className="text-xs text-[#3A478A]">{text}</span>
    </div>
  );
}

function RoomBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="h-4 w-4 text-[#008234] mt-[2px]" />
      <span className="text-xs text-[#008234] leading-snug">{text}</span>
    </div>
  );
}

function RawHotelResultDebug({ raw }: { raw: unknown }) {
  return (
    <details className="rounded-lg border border-yellow-200 bg-yellow-50 p-2" onClick={(e) => e.stopPropagation()}>
      <summary className="cursor-pointer text-xs font-semibold text-yellow-800">
        🔧 Raw Search Result
      </summary>
      <pre
        className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-yellow-100 p-2 text-[10px] text-yellow-900"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {JSON.stringify(raw, null, 2)}
      </pre>
    </details>
  );
}

export function HotelResultCard({
  hotel,
  view,
  selected = false,
  onSelect,
  isPackageMode = false,
  onImageError,
}: {
  hotel: Hotel;
  view: Exclude<HotelViewMode, "map">;
  selected?: boolean;
  onSelect?: () => void;
  isPackageMode?: boolean;
  onImageError?: () => void;
}) {
  const isGrid = view === "grid";
  const showNightlyPrice = !isPackageMode;
  const hotelSearch = useBookingStore((state) => state.hotelSearch);
  const raw = (hotel.rawSearchResult ?? null) as Record<string, unknown> | null;
  const detailParams = new URLSearchParams();
  const criteriaId = raw?.searchCriteriaId;
  const srId = raw?.id;
  const provider = raw?.provider;
  const router = useRouter();
  if (criteriaId != null && String(criteriaId).trim()) detailParams.set("searchCriteriaId", String(criteriaId));
  // Avoid `.../hotels/<srId>?srId=<srId>` when our route param already equals srId.
  if (srId != null && String(srId).trim() && String(srId) !== String(hotel.id)) detailParams.set("srId", String(srId));
  if (typeof provider === "string" && provider.trim()) detailParams.set("provider", provider.trim().toLowerCase());
  if (hotel.tyId) detailParams.set("tyId", hotel.tyId);
  if (hotelSearch?.children && hotelSearch.child_age) {
    detailParams.set("child_age", serializeHotelChildAges(hotelSearch.child_age, hotelSearch.rooms, hotelSearch.children));
  }
  if (isPackageMode) detailParams.set("type", "package");
  const hotelDetailUrl = detailParams.toString()
    ? `/hotels/${hotel.id}?${detailParams.toString()}`
    : `/hotels/${hotel.id}`;
  const isHotelDatesDebugMode = process.env.NEXT_PUBLIC_DEBUG_HOTEL_DATES === "true";
  const hasReviewRating = hotel.reviews.score > 0;
  const packagePerPersonPrice = isPackageMode ? hotel.price.perPerson : undefined;
  const [imageError, setImageError] = useState(false);
  const handleImageError = useCallback(() => {
    setImageError(true);
    onImageError?.();
  }, [onImageError]);

  if (imageError) return null;

  const rootClass = [
    "bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden w-full max-w-full cursor-pointer",
    selected ? "border-[#3754ED] bg-[rgba(55,84,237,0.08)]" : "border-[#DFE0E4]",
    selected ? "relative z-10" : "relative",
  ].join(" ");

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        onSelect?.();
        router.push(hotelDetailUrl);
      }}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={rootClass}
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {isGrid ? (
        <div className="flex flex-col h-full">
          {/* Image edge-to-edge like Figma (no padding) */}
          <div className="relative w-full aspect-[4/3] overflow-hidden">
            <Image
              src={hotel.imageSrc}
              alt={hotel.name}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 360px"
              priority={false}
              onError={handleImageError}
            />
          </div>

          {/* Content padded; CTA pinned to bottom so all cards align */}
          <div className="flex flex-col gap-4 p-5 flex-1">
            {/* Scrollable content area */}
            <div className="flex flex-col gap-4 flex-1">
              {/* Hotel name + location */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-[#010D50] leading-tight line-clamp-2 min-h-[3rem]">
                    {hotel.name}
                  </h3>
                  <p className="text-sm text-[#3A478A] mt-0.5 line-clamp-1">
                    {hotel.distanceLabel}
                  </p>
                  {hotel.neighborhood && (
                    <p className="text-xs text-[#3A478A] mt-0.5">{hotel.neighborhood}</p>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={[
                          "h-3.5 w-3.5",
                          i < hotel.starRating ? "text-[#F5A524] fill-[#F5A524]" : "text-[#DFE0E4]",
                        ].join(" ")}
                      />
                    ))}
                    <span className="ml-1 text-xs text-[#3A478A]">{hotel.starRating}-star</span>
                  </div>
                </div>
              </div>

              
              {hasReviewRating ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-[#008234] text-white grid place-content-center font-bold text-sm">
                    {hotel.reviews.score.toFixed(1)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#010D50]">
                      {hotel.reviews.label}
                    </span>
                    <span className="text-xs text-[#3A478A]">
                      {hotel.reviews.count > 0 ? `${hotel.reviews.count} reviews` : "Guest reviews"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#3A478A]">No guest rating available yet</div>
              )}

              {/* Amenities with icons */}
              <div className="flex flex-wrap items-center gap-2">
                {hotel.amenities.slice(0, 2).map((a) => (
                  <AmenityPill key={a} text={a} />
                ))}
              </div>

              {/* Room details card */}
              <div className="rounded-xl border border-[#DFE0E4] bg-white p-4">
                <div className="text-sm font-semibold text-[#010D50]">{hotel.room.name}</div>
                <div className="mt-3 flex flex-col gap-2">
                  {hotel.room.highlights.slice(0, 2).map((h) => (
                    <RoomBullet key={h} text={h} />
                  ))}
                </div>
              </div>
              {isHotelDatesDebugMode && <RawHotelResultDebug raw={hotel.rawSearchResult ?? hotel} />}

              {/* Meal plans and Price section - right aligned and bottom aligned */}
              <div className="mt-auto flex flex-col items-end gap-1">
                <div className="text-xs text-[#3A478A]">
                  for {hotel.price.nights} nights, {hotel.price.rooms} room
                </div>
                {showNightlyPrice && (
                  <div className="text-sm text-[#3A478A]">
                    {hotel.price.currency}{hotel.price.nightly.toLocaleString()} nightly
                  </div>
                )}
                {packagePerPersonPrice != null ? (
                  <>
                    <div className="text-2xl font-bold text-[#010D50]">
                      {hotel.price.currency}{packagePerPersonPrice.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-[0.08em] text-[#3A478A]">
                      Per Person
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-[#010D50]">
                    {hotel.price.currency}{hotel.price.total.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <Link href={hotelDetailUrl} className="w-full">
              <Button className="rounded-full py-3 h-auto gap-2 text-sm font-semibold w-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white cursor-pointer">
                Check Rooms
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row">
          {/* Image - edge to edge, no padding, rounded only on left side */}
          <div className="relative w-full lg:w-[220px] h-[180px] lg:h-auto lg:min-h-[200px] flex-shrink-0 lg:rounded-l-xl lg:rounded-r-none rounded-t-xl lg:rounded-t-none overflow-hidden">
            <Image
              src={hotel.imageSrc}
              alt={hotel.name}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 220px"
              priority={false}
              onError={handleImageError}
            />
          </div>

          {/* Content area with padding */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-4">
            {/* Middle */}
            <div className="min-w-0 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold text-[#010D50] leading-tight truncate">
                  {hotel.name}
                </div>
                <div className="text-xs text-[#3A478A] truncate">{hotel.distanceLabel}</div>
                {hotel.neighborhood && (
                  <div className="text-xs text-[#3A478A]">{hotel.neighborhood}</div>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={[
                        "h-3.5 w-3.5",
                        i < hotel.starRating ? "text-[#F5A524] fill-[#F5A524]" : "text-[#DFE0E4]",
                      ].join(" ")}
                    />
                  ))}
                  <span className="ml-1 text-xs text-[#3A478A]">{hotel.starRating}-star</span>
                </div>
              </div>

              
              <div className="flex flex-wrap items-center gap-2">
                {hotel.amenities.slice(0, 2).map((a) => (
                  <AmenityPill key={a} text={a} />
                ))}
              </div>

              <div className="rounded-xl border border-[#DFE0E4] bg-white p-3">
                <div className="text-sm font-medium text-[#010D50]">{hotel.room.name}</div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {hotel.room.highlights.slice(0, 2).map((h) => (
                    <RoomBullet key={h} text={h} />
                  ))}
                </div>
              </div>
              {isHotelDatesDebugMode && <RawHotelResultDebug raw={hotel.rawSearchResult ?? hotel} />}
            </div>

            {/* Right (keeps CTA pinned and prevents dropping) */}
            <div className="flex flex-col items-end gap-3 h-full">
              {hasReviewRating ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-[#008234] text-white grid place-content-center font-semibold text-sm">
                    {hotel.reviews.score.toFixed(1)}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-[#010D50]">{hotel.reviews.label}</div>
                    <div className="text-xs text-[#010D50]">
                      {hotel.reviews.count > 0 ? `${hotel.reviews.count} reviews` : "Guest reviews"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#3A478A]">No guest rating available yet</div>
              )}

              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-[#3A478A]">
                  for {hotel.price.nights} nights, {hotel.price.rooms} room
                </div>
                {showNightlyPrice && (
                  <div className="text-xs text-[#3A478A]">
                    {hotel.price.currency}
                    {hotel.price.nightly.toLocaleString()} nightly
                  </div>
                )}
                {packagePerPersonPrice != null ? (
                  <>
                    <div className="text-lg font-semibold text-[#010D50]">
                      {hotel.price.currency}
                      {packagePerPersonPrice.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#3A478A]">
                      Per Person
                    </div>
                  </>
                ) : (
                  <div className="text-lg font-semibold text-[#010D50]">
                    {hotel.price.currency}
                    {hotel.price.total.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="mt-auto w-full flex justify-end">
                <Link href={hotelDetailUrl}>
                  <Button className="rounded-full px-4 py-2 h-auto gap-1.5 text-sm font-medium bg-[#3754ED] hover:bg-[#2A3FB8] text-white w-[170px]">
                    Check Rooms
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
