"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { useBookingStore } from "@/store/bookingStore";
import type { HotelTaxBreakdown, HotelBedsTaxItem } from "@/types/hotel";
import { convertHotelLocalTaxRows, convertHotelLocalTaxTotal, formatMoneyFromCode } from "@/lib/currency/localTaxDisplay";

function formatMoney(currency: string | undefined, amount: number | undefined) {
  const c = currency || "";
  const a = typeof amount === "number" ? amount : undefined;
  if (a == null || Number.isNaN(a)) return "—";
  if (c === "£" || c === "$" || c === "€") return `${c}${a.toFixed(2)}`;
  return c ? `${c} ${a.toFixed(2)}` : a.toFixed(2);
}

interface HotelSummaryCardProps {
  hotelSearch?: any;
  selectedHotel?: any;
  selectedRoomIds?: string[];
  roomSummary?: any;
  detailsCache?: any;
}

export function HotelSummaryCard(props: HotelSummaryCardProps) {
  const isHotelDatesDebugMode = process.env.NEXT_PUBLIC_DEBUG_HOTEL_DATES === "true";
  const [convertedLocalTaxTotal, setConvertedLocalTaxTotal] = useState<string | null>(null);
  const [convertedLocalTaxRows, setConvertedLocalTaxRows] = useState<Array<{ label: string; amount: number; currencyCode: string }>>([]);
  const storeHotelSearch = useBookingStore((s) => s.hotelSearch);
  const storeSelectedHotel = useBookingStore((s) => s.selectedHotel);
  const storeSelectedRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);
  const storeRoomSummary = useBookingStore((s) => s.selectedHotelRoomSummary);
  const storeDetailsCache = useBookingStore((s) => s.hotelDetailsCache);

  const hotelSearch = props.hotelSearch || storeHotelSearch;
  const selectedHotel = props.selectedHotel || storeSelectedHotel;
  const selectedRoomIds = props.selectedRoomIds || storeSelectedRoomIds;
  const roomSummary = props.roomSummary || storeRoomSummary;
  const detailsCache = props.detailsCache || storeDetailsCache;

  const hotelId = selectedHotel?.hotelId;
  const cached = hotelId ? detailsCache?.[hotelId] : undefined;

  const display = useMemo(() => {
    const name = selectedHotel?.hotelName || cached?.hotelName || "Selected hotel";
    const address = cached?.address || "";
    const img = cached?.mainImage;
    const roomId = selectedRoomIds?.[0] || roomSummary?.roomId;
    const room =
      roomId && Array.isArray(cached?.rooms)
        ? cached!.rooms!.find((r: any) => String(r.id) === String(roomId))
        : null;
    const roomName = roomSummary?.roomName || room?.name || "Selected room";
    const mealName = roomSummary?.mealName || room?.bedType || "";
    const isRefundable =
      typeof roomSummary?.isRefundable === "boolean"
        ? roomSummary.isRefundable
        : typeof room?.isRefundable === "boolean"
          ? room.isRefundable
          : undefined;
    const currency = roomSummary?.currency || room?.price?.currency;
    const total = roomSummary?.total ?? room?.price?.total;
    const nightly = roomSummary?.nightly ?? room?.price?.nightly;
    const hbTaxBreakdown: HotelTaxBreakdown | null = roomSummary?.hotelBedsTaxes ?? null;
    const localTaxes: HotelBedsTaxItem[] = hbTaxBreakdown?.taxes?.filter((t: HotelBedsTaxItem) => !t.included) ?? [];
    const localTaxTotal = localTaxes.reduce((s: number, t: HotelBedsTaxItem) => s + Number(t.clientAmount || t.amount || 0), 0);
    const localTaxCurrency = localTaxes[0]?.clientCurrency || localTaxes[0]?.currency || currency;
    return { name, address, img, roomName, mealName, isRefundable, currency, total, nightly, localTaxes, localTaxTotal, localTaxCurrency };
  }, [cached, roomSummary, selectedHotel, selectedRoomIds]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      convertHotelLocalTaxRows(display.localTaxes, display.currency),
      convertHotelLocalTaxTotal(display.localTaxes, display.currency),
    ]).then(([rows, converted]) => {
      if (cancelled) return;
      setConvertedLocalTaxRows(rows);
      setConvertedLocalTaxTotal(converted ? formatMoneyFromCode(converted.currencyCode, converted.amount) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [display.currency, display.localTaxes]);

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
      <div className="text-sm font-semibold text-[#010D50]">Your hotel</div>

      <div className="flex gap-3">
        <div className="relative w-[96px] h-[72px] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {display.img ? (
            <Image src={display.img} alt={display.name} fill className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#010D50] truncate">{display.name}</div>
          <div className="text-xs text-[#3A478A] truncate">
            {display.address || "Content missing from API: address"}
          </div>
          <div className="text-xs text-[#3A478A] mt-1">
            {hotelSearch?.checkIn || "—"} → {hotelSearch?.checkOut || "—"}
          </div>
          {isHotelDatesDebugMode && (
            <div className="mt-1 text-[10px] font-mono text-orange-600 bg-orange-50 px-1 py-0.5 rounded w-fit">
              API: checkIn={hotelSearch?.checkIn || "—"} → checkOut={hotelSearch?.checkOut || "—"}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[#DFE0E4] p-3">
        <div className="text-sm font-medium text-[#010D50]">{display.roomName}</div>
        {display.mealName ? (
          <div className="text-xs text-[#3A478A] mt-0.5">{display.mealName}</div>
        ) : (
          <div className="text-xs text-[#3A478A] mt-0.5">Content missing from API: meal plan</div>
        )}
        <div className="text-xs mt-2">
          {display.isRefundable == null
            ? "Content missing from API: refundability"
            : display.isRefundable
              ? "Refundable"
              : "Non-refundable"}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="text-xs text-[#3A478A]">Price</div>
        <div className="text-right">
          <div className="text-xs text-[#3A478A]">
            Nightly: {formatMoney(display.currency, display.nightly)}
          </div>
          <div className="text-base font-semibold text-[#010D50]">
            Total: {formatMoney(
              display.currency,
              (display.total || 0) +
                (convertedLocalTaxRows.length > 0
                  ? convertedLocalTaxRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
                  : 0)
            )}
          </div>
        </div>
      </div>

      {display.localTaxes.length > 0 && (
        <div className="bg-[#FFF8F0] border border-[#F5D9B3] rounded-lg p-3 flex flex-col gap-1.5">
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
            <div className="flex items-center justify-between text-xs font-semibold text-[#8B5E20] border-t border-[#F5D9B3] pt-1">
              <span>Total</span>
              <span>{convertedLocalTaxTotal || formatMoney(display.localTaxCurrency, display.localTaxTotal)}</span>
            </div>
          )}
          {convertedLocalTaxTotal && (
            <span className="text-[10px] text-[#B07930]">Converted into your billing currency and included in the total above.</span>
          )}
        </div>
      )}
    </div>
  );
}
