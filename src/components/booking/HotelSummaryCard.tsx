"use client";

import Image from "next/image";
import { useMemo } from "react";

import { useBookingStore } from "@/store/bookingStore";

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
    return { name, address, img, roomName, mealName, isRefundable, currency, total, nightly };
  }, [cached, roomSummary, selectedHotel, selectedRoomIds]);

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
            Total: {formatMoney(display.currency, display.total)}
          </div>
        </div>
      </div>
    </div>
  );
}



