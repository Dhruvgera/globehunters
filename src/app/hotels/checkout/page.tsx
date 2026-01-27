"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { BookingHeader } from "@/components/booking/BookingHeader";
import PassengerFormsSection from "@/components/booking/PassengerFormsSection";
import { HotelSummaryCard } from "@/components/booking/HotelSummaryCard";
import { Button } from "@/components/ui/button";
import { useBookingStore } from "@/store/bookingStore";
import { hotelService } from "@/services/api/hotelService";
import { folderService } from "@/services/api/folderService";
import type { AddToFolderRequest } from "@/types/folder";

export default function HotelCheckoutPage() {
  const router = useRouter();

  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const hotelResultsMeta = useBookingStore((s) => s.hotelResultsMeta);
  const selectedHotel = useBookingStore((s) => s.selectedHotel);
  const selectedHotelRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);
  const passengers = useBookingStore((s) => s.passengers);
  const passengersSaved = useBookingStore((s) => s.passengersSaved);
  const setVyspaFolderInfo = useBookingStore((s) => s.setVyspaFolderInfo);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const hotelId = selectedHotel?.hotelId;
    const meta = hotelId ? hotelResultsMeta[hotelId] : undefined;
    return {
      hotelId,
      hotelName: selectedHotel?.hotelName || meta?.hotelName || "Selected hotel",
      searchResultId: meta?.searchResultId || meta?.srId,
      roomIds: selectedHotelRoomIds,
    };
  }, [hotelResultsMeta, selectedHotel, selectedHotelRoomIds]);

  const canSubmit =
    !!hotelSearch &&
    !!summary.hotelId &&
    summary.roomIds.length > 0 &&
    passengersSaved &&
    passengers.length > 0 &&
    !submitting;

  async function handleConfirm() {
    if (!hotelSearch || !summary.hotelId) return;
    setSubmitting(true);
    setError(null);

    try {
      const lead = passengers[0];
      if (!lead?.email || !lead?.phone) {
        throw new Error("Lead passenger email and phone are required.");
      }

      const folderResp = await hotelService.createCustomerFolder({
        title: lead.title || "Mr",
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        branchCode: hotelSearch.branches || "UK",
        desAirportCode: hotelSearch.arrivalPointCode,
        departureDate: hotelSearch.checkIn,
        address: "NA",
        zipCode: "NA",
      });

      const folderNo = (() => {
        if (typeof folderResp === "number") return folderResp;
        if (typeof folderResp === "string" && /^\d+$/.test(folderResp)) return Number(folderResp);
        if (Array.isArray(folderResp)) return (folderResp as any)[0]?.folder_no;
        return (folderResp as any)?.folder_no;
      })();

      if (!folderNo) {
        throw new Error("Vyspa did not return a folder number (folder_no).");
      }

      setVyspaFolderInfo({ folderNumber: String(folderNo) });

      // Build passengers in Vyspa folder format using existing helper in folderService
      const folderPassengers = passengers.map((p, idx) => ({
        pax_no: idx + 1,
        title: p.title as any,
        first_name: p.firstName,
        middle_name: "",
        last_name: p.lastName,
        birth_date: p.dateOfBirth || undefined,
        pax_type: (p.type === "child" ? "CHD" : p.type === "infant" ? "INF" : "ADT") as any,
        // booking.ts titles don't include Mstr/Mrs mapping; infer male only for Mr, default to F otherwise
        api_gender: (p.title === "Mr" ? "M" : "F") as any,
        email: p.email,
        phone: p.phone,
      }));

      // Best-effort room passenger mapping: assign everyone to the first selected room
      const primaryRoomId = summary.roomIds[0]!;
      const passengerIndices = passengers.map((_, i) => i + 1).join(",");

      const addToFolderRequest: AddToFolderRequest = {
        folderNumber: Number(folderNo),
        itineraryNumber: "1",
        foldcur: "GBP",
        travelPurpose: "Holiday",
        comments: [],
        set_as_preferred_itinerary: true,
        passengers: folderPassengers as any,
        requestData: [
          {
            type: "hotel",
            search_result_id: summary.searchResultId,
            roomIds: summary.roomIds.join(","),
            passengers: {
              [primaryRoomId]: passengerIndices,
            },
          } as any,
        ],
      };

      const addResp = await folderService.addToFolder(addToFolderRequest);
      if (!addResp.success) {
        throw new Error(addResp.message || "Failed to add hotel to folder");
      }

      router.push("/payment?type=hotel");
    } catch (e: any) {
      setError(e?.message || "Failed to confirm hotel booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <BookingHeader currentStep={1} />

        <div className="flex flex-col lg:flex-row gap-4 mt-4">
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4">
              <div className="text-sm font-semibold text-[#010D50]">Hotel booking</div>
              <div className="text-xs text-[#3A478A] mt-1">
                Rooms selected: {summary.roomIds.length}
              </div>
            </div>

            <PassengerFormsSection showPassportFields={false} />

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-end">
              <Button
                onClick={handleConfirm}
                disabled={!canSubmit}
                className="rounded-full px-6 py-3 h-auto bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-semibold"
              >
                {submitting ? "Confirming…" : "Continue to payment"}
              </Button>
            </div>
          </div>

          <aside className="w-full lg:w-[360px] flex flex-col gap-4">
            <HotelSummaryCard />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}


