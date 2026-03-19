"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Heart,
  PawPrint,
  Bus,
  Coffee,
  X,
  Plane,
  Briefcase,
  Luggage,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { Package } from "@/types/package";

function getAmenityIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("pet")) return <PawPrint className="h-4 w-4 text-[#3A478A]" />;
  if (lower.includes("shuttle") || lower.includes("airport"))
    return <Bus className="h-4 w-4 text-[#3A478A]" />;
  if (lower.includes("breakfast")) return <Coffee className="h-4 w-4 text-[#3A478A]" />;
  if (lower.includes("cancel")) return <X className="h-4 w-4 text-[#3A478A]" />;
  return null;
}

function AmenityBadge({ text }: { text: string }) {
  const icon = getAmenityIcon(text);
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-sm text-[#3A478A]">{text}</span>
    </div>
  );
}

function RoomBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="h-4 w-4 text-[#008234] mt-[1px] flex-shrink-0" />
      <span className="text-sm text-[#008234] leading-snug">{text}</span>
    </div>
  );
}

function FlightIncludedBadge({
  icon,
  text,
}: {
  icon: "plane" | "cabin" | "checked";
  text: string;
}) {
  const IconComponent =
    icon === "plane" ? Plane : icon === "cabin" ? Briefcase : Luggage;

  return (
    <div className="flex items-center gap-2">
      <IconComponent className="h-[18px] w-[18px] text-[#3754ED]" />
      <span className="text-sm text-[#010D50]">{text}</span>
    </div>
  );
}

interface PackageResultCardProps {
  pkg: Package;
  view: "list" | "grid";
  selected?: boolean;
  onSelect?: () => void;
  onContinue?: () => void;
}

export function PackageResultCard({
  pkg,
  view,
  selected = false,
  onSelect,
  onContinue,
}: PackageResultCardProps) {
  const { hotel, outboundFlight, totalPrice, currency } = pkg;

  const rootClass = [
    "bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden w-full cursor-pointer",
    selected ? "border-[#3754ED] bg-[rgba(55,84,237,0.03)]" : "border-[#DFE0E4]",
  ].join(" ");

  // List view (horizontal layout as per Figma)
  if (view === "list") {
    return (
      <motion.div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (!onSelect) return;
          if (e.key === "Enter" || e.key === " ") onSelect();
        }}
        className={rootClass}
        animate={{ scale: selected ? 1.005 : 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="flex flex-col lg:flex-row">
          {/* Hotel Image */}
          <div className="relative w-full lg:w-[272px] h-[200px] lg:h-auto lg:min-h-[363px] flex-shrink-0 overflow-hidden">
            <Image
              src={hotel.imageSrc}
              alt={hotel.name}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 272px"
              priority={false}
            />
            {/* Image carousel dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-full bg-white" />
              <div className="w-1 h-1 rounded-full bg-white/60" />
              <div className="w-1 h-1 rounded-full bg-white/60" />
              <div className="w-1 h-1 rounded-full bg-white/60" />
              <div className="w-1 h-1 rounded-full bg-white/60" />
            </div>
            {/* Favorite button */}
            <button
              type="button"
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white grid place-content-center shadow-sm"
              aria-label="Save"
              onClick={(e) => e.stopPropagation()}
            >
              <Heart className="h-5 w-5 text-[#010D50]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-[18px] flex flex-col lg:flex-row gap-4">
            {/* Middle section - Hotel info */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Hotel name & distance */}
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold text-[#010D50] leading-tight">
                  {hotel.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-[#3A478A]">
                  <MapPin className="h-[18px] w-[18px] text-[#3754ED]" />
                  <span>{hotel.distanceLabel}</span>
                </div>
              </div>

              {/* Amenities */}
              <div className="flex items-center gap-4 flex-wrap">
                {hotel.amenities.slice(0, 2).map((a, i) => (
                  <div key={a} className="flex items-center gap-4">
                    {i > 0 && (
                      <div className="w-1 h-1 rounded-full bg-[#3A478A]" />
                    )}
                    <AmenityBadge text={a} />
                  </div>
                ))}
              </div>

              {/* Room details card */}
              <div className="rounded-xl border border-[#DFE0E4] bg-[#F9FAFB] p-3">
                <div className="text-sm font-medium text-[#010D50]">
                  {hotel.room.name}
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {hotel.room.highlights.slice(0, 2).map((h) => (
                    <RoomBullet key={h} text={h} />
                  ))}
                </div>
              </div>

              {/* Flight included section */}
              <div className="rounded-xl border border-[#E8E8EE] bg-[#F5F7FF] p-4 flex flex-col gap-3">
                <FlightIncludedBadge
                  icon="plane"
                  text="Return flight from London included"
                />
                {outboundFlight.cabinBagIncluded && (
                  <FlightIncludedBadge icon="cabin" text="Cabin bag included" />
                )}
                {outboundFlight.checkedBagIncluded && (
                  <FlightIncludedBadge icon="checked" text="Checked bag included" />
                )}
              </div>
            </div>

            {/* Right section - Reviews & Price */}
            <div className="lg:w-[184px] flex flex-col gap-4 lg:items-end">
              {/* Review score */}
              <div className="flex items-center gap-2">
                <div className="w-11 h-11 rounded-lg bg-[#3754ED] text-white grid place-content-center font-semibold text-sm">
                  {hotel.reviews.score > 0 ? hotel.reviews.score.toFixed(1) : "—"}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#010D50]">
                    {hotel.reviews.label || "Rating"}
                  </span>
                  <span className="text-xs text-[#3A478A]">
                    {hotel.reviews.count > 0
                      ? `${hotel.reviews.count} reviews`
                      : "No reviews"}
                  </span>
                </div>
              </div>

              {/* Spacer to push price to bottom on desktop */}
              <div className="hidden lg:flex flex-1" />

              {/* Price section */}
              <div className="flex flex-col items-end gap-1 text-right">
                <div className="text-2xl font-bold text-[#010D50]">
                  {currency}
                  {totalPrice.toLocaleString()}
                </div>
              </div>

              {/* CTA Button */}
              <Link href={`/hotels/${hotel.id}?type=package`}>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onContinue?.();
                  }}
                  className="rounded-full py-3 h-auto gap-2 text-sm font-semibold w-full lg:w-[184px] bg-[#3754ED] hover:bg-[#2A3FB8] text-white"
                >
                  Continue Booking
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view (vertical card layout)
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={rootClass}
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div className="flex flex-col h-full">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <Image
            src={hotel.imageSrc}
            alt={hotel.name}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 360px"
            priority={false}
          />
          <button
            type="button"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white grid place-content-center shadow-sm"
            aria-label="Save"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="h-5 w-5 text-[#010D50]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-5 flex-1">
          {/* Hotel name + location */}
          <div>
            <h3 className="text-lg font-semibold text-[#010D50] leading-tight">
              {hotel.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-[#3A478A] mt-1">
              <MapPin className="h-4 w-4 text-[#3754ED]" />
              <span>{hotel.distanceLabel}</span>
            </div>
          </div>

          {/* Review score */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#3754ED] text-white grid place-content-center font-bold text-sm">
              {hotel.reviews.score > 0 ? hotel.reviews.score.toFixed(1) : "—"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#010D50]">
                {hotel.reviews.label || "Rating"}
              </span>
              <span className="text-xs text-[#3A478A]">
                {hotel.reviews.count > 0
                  ? `${hotel.reviews.count} reviews`
                  : "No reviews"}
              </span>
            </div>
          </div>

          {/* Flight included badge */}
          <div className="rounded-lg border border-[#E8E8EE] bg-[#F5F7FF] p-3">
            <FlightIncludedBadge
              icon="plane"
              text="Return flight from London included"
            />
          </div>

          {/* Price section */}
          <div className="flex flex-col items-end gap-1 mt-auto">
            <div className="text-2xl font-bold text-[#010D50]">
              {currency}
              {totalPrice.toLocaleString()}
            </div>
          </div>

          {/* CTA Button */}
          <Link href={`/hotels/${hotel.id}?type=package`} className="w-full">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onContinue?.();
              }}
              className="rounded-full py-3 h-auto gap-2 text-sm font-semibold w-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white"
            >
              Continue Booking
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
