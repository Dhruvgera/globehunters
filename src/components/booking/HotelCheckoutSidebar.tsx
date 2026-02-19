"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Phone, PawPrint, Bus } from "lucide-react";
import { useBookingStore } from "@/store/bookingStore";

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

interface HotelCheckoutSidebarProps {
  webRef: string;
  phoneNumber: string;
}

export function HotelCheckoutSidebar({
  webRef,
  phoneNumber,
}: HotelCheckoutSidebarProps) {
  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const selectedHotel = useBookingStore((s) => s.selectedHotel);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const selectedHotelRoomSummary = useBookingStore((s) => s.selectedHotelRoomSummary);
  const selectedHotelRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);

  const hotelId = selectedHotel?.hotelId;
  const cached = hotelId ? hotelDetailsCache?.[hotelId] : undefined;

  const display = useMemo(() => {
    const name = selectedHotel?.hotelName || cached?.hotelName || "Selected Hotel";
    const address = cached?.address || "";
    const img = cached?.mainImage;
    const rating = cached?.hotelRating;
    const amenities = cached?.amenities || [];
    const cancellationText = cached?.cancellationText || "";

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

    return {
      name, address, img, rating, amenities, cancellationText,
      currency, total, nightly, roomName, isRefundable,
      nights, rooms, adults, children, roomNames, baseTotal, taxes,
    };
  }, [cached, selectedHotel, selectedHotelRoomSummary, selectedHotelRoomIds, hotelSearch]);

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

          {display.taxes != null && display.taxes > 0 && (
            <div className="flex items-center justify-between text-sm font-medium text-[#010D50]">
              <span>Taxes</span>
              <span>{formatMoney(display.currency, display.taxes)}</span>
            </div>
          )}

          <div className="border-t border-[#DFE0E4]" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#010D50]">Total</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {formatMoney(display.currency, display.total)}
            </span>
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

          {display.rating != null && (
            <div className="flex items-center gap-2">
              <div className="bg-[#008234] rounded-lg px-2 py-1 flex items-center justify-center">
                <span className="text-xs font-medium text-white">{display.rating}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#010D50]">
                  {display.rating >= 9 ? "Exceptional" : display.rating >= 8 ? "Excellent" : display.rating >= 7 ? "Very Good" : "Good"}
                </span>
              </div>
            </div>
          )}

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
        <span className="text-sm font-semibold text-[#010D50]">Stay Details</span>

        <div className="flex gap-3">
          <div className="flex-1 bg-[#F5F7FF] border border-[#DFE0E4] rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-xs text-[#010D50]">Check-In:</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {hotelSearch?.checkIn ? formatDateDisplay(hotelSearch.checkIn) : "—"}
            </span>
            <span className="text-xs text-[#3A478A]">3:00 PM – 6:00 PM</span>
          </div>
          <div className="flex-1 bg-[#F5F7FF] border border-[#DFE0E4] rounded-lg p-3 flex flex-col gap-1.5">
            <span className="text-xs text-[#010D50]">Check-Out:</span>
            <span className="text-sm font-semibold text-[#010D50]">
              {hotelSearch?.checkOut ? formatDateDisplay(hotelSearch.checkOut) : "—"}
            </span>
            <span className="text-xs text-[#3A478A]">8:00 AM – 11:00 AM</span>
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
            {display.rooms} room for {display.adults + display.children} {display.adults + display.children === 1 ? "guest" : "adults"}
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

      {/* Cancellation Policy Card */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
        <span className="text-sm font-semibold text-[#010D50]">Cancellation Policy</span>

        {display.isRefundable === true && hotelSearch?.checkIn && (
          <p className="text-sm font-semibold text-[#008234]">
            Free cancellation before {formatDateDisplay(hotelSearch.checkIn).replace(/,\s*\d{4}$/, "")}
          </p>
        )}

        {display.isRefundable === false && (
          <p className="text-sm font-medium text-[#010D50]">Non-refundable</p>
        )}

        {display.cancellationText && (
          <p className="text-xs text-[#3A478A]">{display.cancellationText}</p>
        )}

        {display.total != null && display.isRefundable === true && hotelSearch?.checkIn && (
          <div className="flex items-center justify-between text-sm font-medium text-[#3A478A]">
            <span>After 12:00 AM on {formatDateDisplay(hotelSearch.checkIn).replace(/,\s*\d{4}$/, "").replace(/^\w+,\s*/, "")}</span>
            <span>{formatMoney(display.currency, display.total)}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
