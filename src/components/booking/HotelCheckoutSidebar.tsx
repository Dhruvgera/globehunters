"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Phone, PawPrint, Bus } from "lucide-react";
import { useBookingStore } from "@/store/bookingStore";
import type { HotelTaxBreakdown, HotelBedsTaxItem } from "@/types/hotel";
import { resolveTrustYouHotelId } from "@/lib/trustyou/hotelMapping";
import type { TrustYouHotelReviewSummary } from "@/types/trustyou";
import { convertHotelLocalTaxRows, convertHotelLocalTaxTotal, formatMoneyFromCode } from "@/lib/currency/localTaxDisplay";

function formatMoney(currency: string | undefined, amount: number | undefined) {
  const c = currency || "$";
  const a = typeof amount === "number" ? amount : undefined;
  if (a == null || Number.isNaN(a)) return "—";
  if (c === "£" || c === "$" || c === "€")
    return `${c}${a.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return c ? `${c} ${a.toFixed(2)}` : a.toFixed(2);
}

function calculateNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function sanitizePolicyText(value: unknown): string {
  const raw = String(value || "");
  if (!raw.trim()) return "";

  const text = raw
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r/g, "")
    .trim();

  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.,;:!?]+$/g, "")
      .trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(line);
  }

  return deduped.join("\n");
}

interface HotelCheckoutSidebarProps {
  webRef: string;
  phoneNumber: string;
  changeSelectionHref?: string;
}

export function HotelCheckoutSidebar({
  webRef,
  phoneNumber,
  changeSelectionHref,
}: HotelCheckoutSidebarProps) {
  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const selectedHotel = useBookingStore((s) => s.selectedHotel);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const hotelResultsMeta = useBookingStore((s) => s.hotelResultsMeta);
  const selectedHotelRoomSummary = useBookingStore((s) => s.selectedHotelRoomSummary);
  const selectedHotelRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);

  const hotelId = selectedHotel?.hotelId;
  const cached = hotelId ? hotelDetailsCache?.[hotelId] : undefined;
  const [trustYouReview, setTrustYouReview] = useState<TrustYouHotelReviewSummary | null>(cached?.trustYou || null);
  const [convertedLocalTaxTotal, setConvertedLocalTaxTotal] = useState<string | null>(null);
  const [convertedLocalTaxRows, setConvertedLocalTaxRows] = useState<Array<{ label: string; amount: number; currencyCode: string }>>([]);

  useEffect(() => {
    setTrustYouReview(cached?.trustYou || null);
  }, [cached?.trustYou, hotelId]);

  useEffect(() => {
    if (!hotelId || cached?.trustYou) return;

    const meta = hotelResultsMeta?.[hotelId];
    const raw = (meta?.rawSearchResult ?? null) as Record<string, unknown> | null;
    const rawHb = raw?._hotelbeds && typeof raw._hotelbeds === "object"
      ? (raw._hotelbeds as Record<string, unknown>)
      : null;
    const dedupe = raw?._dedupe && typeof raw._dedupe === "object"
      ? (raw._dedupe as Record<string, unknown>)
      : null;
    const partnerHotelIds = Array.from(
      new Set(
        [
          hotelId,
          String(meta?.vyspaHotelId || ""),
          String(raw?.hotel_id || ""),
          String(raw?.hotelId || ""),
          String(raw?.id || ""),
          String(raw?.code || ""),
          String(raw?.providerHotelCode || ""),
          String(raw?.hotelbedsCode || ""),
          String(dedupe?.hbCode || ""),
          String(rawHb?.providerHotelCode || ""),
          String(rawHb?.hotelCode || ""),
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
    const resolvedTyId = resolveTrustYouHotelId({
      hotelName: selectedHotel?.hotelName || meta?.hotelName || cached?.hotelName,
      location: [cached?.address, meta?.address1, meta?.address2].filter(Boolean).join(", "),
      candidateIds: [meta?.trustyouId],
    });
    const hotelName = selectedHotel?.hotelName || meta?.hotelName || cached?.hotelName || "";
    if (!resolvedTyId && !hotelName) return;

    const params = new URLSearchParams();
    if (resolvedTyId) params.set("tyId", resolvedTyId);
    if (hotelName) params.set("hotelName", hotelName);
    if (cached?.address) params.set("location", cached.address);
    params.set("hotelId", hotelId);
    if (partnerHotelIds.length > 0) params.set("partnerHotelIds", partnerHotelIds.join(","));

    let cancelled = false;
    fetch(`/api/hotels/trustyou?${params.toString()}`)
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok || !data?.review) return;
        setTrustYouReview(data.review as TrustYouHotelReviewSummary);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    cached?.address,
    cached?.hotelName,
    cached?.trustYou,
    hotelId,
    hotelResultsMeta,
    selectedHotel?.hotelName,
  ]);

  useEffect(() => {
    let cancelled = false;
    const hbTaxBreakdown: HotelTaxBreakdown | null = selectedHotelRoomSummary?.hotelBedsTaxes ?? null;
    const rows = hbTaxBreakdown?.taxes ?? [];

    Promise.all([
      convertHotelLocalTaxRows(rows, selectedHotelRoomSummary?.currency),
      convertHotelLocalTaxTotal(rows, selectedHotelRoomSummary?.currency),
    ]).then(([convertedRows, converted]) => {
      if (cancelled) return;
      setConvertedLocalTaxRows(convertedRows);
      setConvertedLocalTaxTotal(converted ? formatMoneyFromCode(converted.currencyCode, converted.amount) : null);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedHotelRoomSummary?.currency, selectedHotelRoomSummary?.hotelBedsTaxes]);

  const display = useMemo(() => {
    const name = selectedHotel?.hotelName || cached?.hotelName || "Selected Hotel";
    const address = cached?.address || "";
    const img = cached?.mainImage;
    const starRating = cached?.hotelRating;
    const reviewScore = trustYouReview?.score || 0;
    const reviewLabel = trustYouReview?.scoreDescription || "";
    const reviewCount = trustYouReview?.reviewsCount || 0;
    const amenities = cached?.amenities || [];
    const roomPolicyTexts: string[] = [];
    const selectedRoomId = String(
      selectedHotelRoomSummary?.roomId || selectedHotelRoomIds[0] || ""
    ).trim();
    if (Array.isArray(cached?.rooms) && selectedRoomId) {
      const selectedRoom = (cached.rooms as any[]).find(
        (room) => String(room?.id || "").trim() === selectedRoomId
      );
      const raw = selectedRoom?._raw;
      const directPolicy =
        typeof raw?.cancellation_policy === "string"
          ? raw.cancellation_policy.trim()
          : typeof raw?.cancellationPolicy === "string"
            ? raw.cancellationPolicy.trim()
            : "";
      const directPolicyText = sanitizePolicyText(directPolicy);
      if (directPolicyText) roomPolicyTexts.push(directPolicyText);

      const hbPolicies = Array.isArray(raw?._hotelbeds?.cancellationPolicies)
        ? raw._hotelbeds.cancellationPolicies
        : [];
      for (const p of hbPolicies) {
        if (!p || typeof p !== "object") continue;
        const policy =
          typeof p.policy === "string"
            ? p.policy.trim()
            : typeof p.description === "string"
              ? p.description.trim()
              : typeof p.text === "string"
                ? p.text.trim()
                : "";
        const policyText = sanitizePolicyText(policy);
        if (policyText) roomPolicyTexts.push(policyText);
      }
    }

    const dedupedPolicyTexts = Array.from(
      new Set(
        roomPolicyTexts
          .map((t) => sanitizePolicyText(t))
          .filter(Boolean)
      )
    );
    const cancellationText = dedupedPolicyTexts.join("\n\n");

    const roomSummary = selectedHotelRoomSummary;
    const currency = roomSummary?.currency || "$";
    const total = roomSummary?.total;
    const nightly = roomSummary?.nightly;
    const roomName = roomSummary?.roomName || "Selected Room";
    const isRefundable = roomSummary?.isRefundable;

    const nights = hotelSearch ? calculateNights(hotelSearch.checkIn, hotelSearch.checkOut) : 0;
    const rooms = hotelSearch?.rooms || 1;
    const adults = hotelSearch?.adults || 1;
    const children = hotelSearch?.children || 0;

    const roomNames: string[] = [];
    if (Array.isArray(cached?.rooms) && selectedHotelRoomIds.length > 0) {
      const roomMap = new Map(cached!.rooms!.map((r: any) => [String(r.id), r.name || "Room"]));
      const counts: Record<string, number> = {};
      for (const rid of selectedHotelRoomIds) {
        const n = roomMap.get(String(rid)) || roomName;
        counts[n] = (counts[n] || 0) + 1;
      }
      for (const [n, c] of Object.entries(counts)) {
        roomNames.push(c > 1 ? `${n} x${c}` : n);
      }
    } else if (selectedHotelRoomIds.length > 0) {
      roomNames.push(
        selectedHotelRoomIds.length > 1 ? `${roomName} x${selectedHotelRoomIds.length}` : roomName
      );
    }

    const baseTotal = nightly && nights ? nightly * nights * rooms : undefined;
    const taxes = total && baseTotal ? Math.max(0, total - baseTotal) : undefined;

    const hbTaxBreakdown: HotelTaxBreakdown | null = roomSummary?.hotelBedsTaxes ?? null;
    const includedTaxes: HotelBedsTaxItem[] = [];
    const localTaxes: HotelBedsTaxItem[] = [];
    if (hbTaxBreakdown?.taxes) {
      for (const t of hbTaxBreakdown.taxes) {
        if (t.included) includedTaxes.push(t);
        else localTaxes.push(t);
      }
    }
    const localTaxTotal = localTaxes.reduce((s, t) => s + Number(t.amount || 0), 0);
    const localTaxCurrency = localTaxes[0]?.currency || currency;
    const includedTaxTotal = includedTaxes.reduce((s, t) => s + Number(t.amount || 0), 0);

    return {
      name, address, img, starRating, reviewScore, reviewLabel, reviewCount, amenities, cancellationText,
      currency, total, nightly, roomName, isRefundable,
      nights, rooms, adults, children, roomNames, baseTotal, taxes,
      hbTaxBreakdown, includedTaxes, localTaxes, localTaxTotal, localTaxCurrency, includedTaxTotal,
    };
  }, [cached, hotelSearch, selectedHotel, selectedHotelRoomIds, selectedHotelRoomSummary, trustYouReview]);

  return (
    <aside className="w-full lg:w-[482px] flex flex-col gap-4">
      {/* WEB REF Card */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
        <span className="text-base font-semibold text-[#3754ED]">
          WEB REF: {webRef}
        </span>
        <p className="text-sm text-[#3A478A]">
          If you would like to speak to one of our travel consultants please call us on the given number below.
        </p>
        <div className="flex items-center gap-3 bg-[rgba(55,84,237,0.12)] rounded-full px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-[#0B229E] flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[#010D50] text-[8px] font-medium leading-tight">24/7 Toll-Free</span>
            <span className="text-[#010D50] text-sm font-bold">{phoneNumber}</span>
          </div>
        </div>
      </div>

      {/* Hotel Image + Info Card */}
      <div className="border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
        {display.img && (
          <div className="w-full h-[180px] rounded-lg overflow-hidden relative bg-gray-100">
            <Image src={display.img} alt={display.name} fill className="object-cover" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 rounded-full p-1 flex gap-0.5">
              <div className="w-2.5 h-1 rounded-full bg-white" />
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <div className="w-1 h-1 rounded-full bg-white/30" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[#010D50]">{display.name}</span>
            {display.address && (
              <span className="text-xs text-[#3A478A]">{display.address}</span>
            )}
          </div>

          {display.reviewScore > 0 ? (
            <div className="flex items-center gap-2">
              <div className="bg-[#008234] rounded-lg px-2 py-1 flex items-center justify-center">
                <span className="text-xs font-medium text-white">{display.reviewScore.toFixed(1)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#010D50]">
                  {display.reviewLabel || "Guest rating"}
                </span>
                <span className="text-[11px] text-[#3A478A]">
                  {display.reviewCount} reviews
                </span>
              </div>
            </div>
          ) : display.starRating != null ? (
            <div className="text-xs font-medium text-[#010D50]">
              Hotel rating: {display.starRating}★
            </div>
          ) : null}

          {display.amenities.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {display.amenities.slice(0, 4).map((amenity, i) => (
                <div key={i} className="flex items-center">
                  {i > 0 && <div className="w-1 h-1 rounded-full bg-[#DFE0E4] mr-2" />}
                  <div className="border border-[#DFE0E4] rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                    {amenity.toLowerCase().includes("pet") && <PawPrint className="w-3.5 h-3.5 text-[#010D50]" />}
                    {amenity.toLowerCase().includes("shuttle") && <Bus className="w-3.5 h-3.5 text-[#010D50]" />}
                    <span className="text-xs text-[#010D50]">{amenity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stay Details Card */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#010D50]">Stay Details</span>
          {changeSelectionHref ? (
            <Link
              href={changeSelectionHref}
              className="text-sm font-semibold text-[#3754ED] hover:underline"
            >
              Change selection
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="text-sm font-semibold text-[#3754ED] hover:underline"
            >
              Change selection
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-[#F5F7FF] border border-[#DFE0E4] rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-xs text-[#010D50]">Check-In:</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {hotelSearch?.checkIn ? formatDateDisplay(hotelSearch.checkIn) : "—"}
            </span>
          </div>
          <div className="flex-1 bg-[#F5F7FF] border border-[#DFE0E4] rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-xs text-[#010D50]">Check-Out:</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {hotelSearch?.checkOut ? formatDateDisplay(hotelSearch.checkOut) : "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-[#3A478A]">Total length of the stay:</span>
          <span className="text-sm font-semibold text-[#010D50]">{display.nights} Nights</span>
        </div>

        <div className="border-t border-[#DFE0E4]" />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-[#3A478A]">You selected</span>
          <span className="text-sm font-semibold text-[#010D50]">
            {display.rooms} room{display.rooms === 1 ? "" : "s"} for {display.adults} adult{display.adults === 1 ? "" : "s"}
            {display.children > 0 ? `, ${display.children} child${display.children === 1 ? "" : "ren"}` : ""}
          </span>
        </div>

        {display.roomNames.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {display.roomNames.map((name, i) => (
              <span key={i} className="text-xs text-[#3A478A]">{name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
        <span className="text-sm font-semibold text-[#010D50]">Summary</span>

        <div className="flex flex-col gap-3">
          {display.nightly != null && (
            <div className="flex items-center justify-between text-sm font-medium text-[#010D50]">
              <span>{display.nights} nights x {display.rooms} room x {formatMoney(display.currency, display.nightly)}</span>
              <span>{formatMoney(display.currency, display.baseTotal)}</span>
            </div>
          )}

          {display.includedTaxes.length > 0 ? (
            <>
              {display.includedTaxTotal > 0 && (
                <div className="flex items-center justify-between text-sm font-medium text-[#010D50]">
                  <span>Taxes &amp; fees (included)</span>
                  <span>{formatMoney(display.currency, display.includedTaxTotal)}</span>
                </div>
              )}
            </>
          ) : display.taxes != null && display.taxes > 0 ? (
            <div className="flex items-center justify-between text-sm font-medium text-[#010D50]">
              <span>Taxes</span>
              <span>{formatMoney(display.currency, display.taxes)}</span>
            </div>
          ) : null}

          <div className="border-t border-[#DFE0E4]" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#010D50]">Total</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {formatMoney(
                display.currency,
                (display.total || 0) +
                  (convertedLocalTaxRows.length > 0
                    ? convertedLocalTaxRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
                    : 0)
              )}
            </span>
          </div>

          {display.localTaxes.length > 0 && (
            <div className="bg-[#FFF8F0] border border-[#F5D9B3] rounded-lg p-3 flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#8B5E20]">
                Local taxes included
              </span>
              {(convertedLocalTaxRows.length > 0 ? convertedLocalTaxRows : display.localTaxes.map((tax) => ({
                label: tax.subType || tax.type || "Taxes & fees",
                amount: Number(tax.clientAmount || tax.amount || 0),
                currencyCode: tax.clientCurrency || tax.currency || display.localTaxCurrency,
              })) ).map((tax, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-[#8B5E20]">
                  <span>{tax.label}</span>
                  <span>
                    {formatMoneyFromCode(tax.currencyCode, Number(tax.amount || 0))}
                  </span>
                </div>
              ))}
              {(convertedLocalTaxRows.length > 1 || display.localTaxes.length > 1) && (
                <div className="flex items-center justify-between text-xs font-semibold text-[#8B5E20] border-t border-[#F5D9B3] pt-1.5">
                  <span>Total local taxes</span>
                  <span>
                    {convertedLocalTaxTotal || formatMoney(display.localTaxCurrency, display.localTaxTotal)}
                  </span>
                </div>
              )}
              {convertedLocalTaxTotal && (
                <span className="text-[10px] text-[#B07930]">
                  Converted into your billing currency and included in the total above.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Policy Card */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
        <span className="text-sm font-semibold text-[#010D50]">Cancellation Policy</span>

        {display.isRefundable === true && (
          <p className="text-sm font-semibold text-[#008234]">Refundable</p>
        )}

        {display.isRefundable === false && (
          <p className="text-sm font-medium text-[#010D50]">Non-refundable</p>
        )}

        {display.cancellationText && (
          <p className="text-xs text-[#3A478A] whitespace-pre-line">{display.cancellationText}</p>
        )}
      </div>
    </aside>
  );
}
