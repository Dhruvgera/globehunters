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
import { WebRefCard } from "@/components/booking/WebRefCard";
import { useAffiliatePhone } from "@/lib/AffiliateContext";

export default function HotelCheckoutPage() {
  const router = useRouter();

  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const hotelResultsMeta = useBookingStore((s) => s.hotelResultsMeta);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const selectedHotel = useBookingStore((s) => s.selectedHotel);
  const selectedHotelRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);
  const selectedHotelRoomSummary = useBookingStore((s) => s.selectedHotelRoomSummary);
  const passengers = useBookingStore((s) => s.passengers);
  const passengersSaved = useBookingStore((s) => s.passengersSaved);
  const setVyspaFolderInfo = useBookingStore((s) => s.setVyspaFolderInfo);
  const setContactInfo = useBookingStore((s) => s.setContactInfo);
  const vyspaFolderNumber = useBookingStore((s) => s.vyspaFolderNumber);
  const searchRequestId = useBookingStore((s) => s.searchRequestId);
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  const webRefNumber = vyspaFolderNumber || searchRequestId || (hotelSearch?.searchCriteriaId ? String(hotelSearch.searchCriteriaId) : "—");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHotelbedsMode = hotelSearch?.provider === 'hotelbeds';

  const summary = useMemo(() => {
    const hotelId = selectedHotel?.hotelId;
    const meta = hotelId ? hotelResultsMeta[hotelId] : undefined;
    return {
      hotelId,
      hotelName: selectedHotel?.hotelName || meta?.hotelName || "Selected hotel",
      searchResultId: meta?.searchResultId || meta?.srId,
      roomIds: selectedHotelRoomIds.map((roomId) => String(roomId).trim()).filter(Boolean),
    };
  }, [hotelResultsMeta, selectedHotel, selectedHotelRoomIds]);

  const expectedNetPrice = useMemo(() => {
    const hotelId = summary.hotelId;
    if (!hotelId) return undefined;
    const cachedRooms = hotelDetailsCache?.[hotelId]?.rooms;
    if (!Array.isArray(cachedRooms)) return undefined;
    const priceByRoomId = new Map(
      cachedRooms.map((room: any) => [String(room?.id || ""), Number(room?.price?.total || 0)])
    );
    const values = summary.roomIds
      .map((roomId) => priceByRoomId.get(String(roomId)))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
      .map((value) => value.toFixed(2));
    return values.length > 0 ? values : undefined;
  }, [hotelDetailsCache, summary.hotelId, summary.roomIds]);

  const canSubmit =
    !!hotelSearch &&
    !!summary.hotelId &&
    summary.roomIds.length === Math.max(1, Number(hotelSearch?.rooms || 1)) &&
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

      // Sync lead guest details to contact info for payment page
      setContactInfo(lead.email, lead.phone);

      let folderNo = vyspaFolderNumber ? Number(vyspaFolderNumber) : null;
      if (!folderNo) {
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

        folderNo = (() => {
          if (typeof folderResp === "number") return folderResp;
          if (typeof folderResp === "string" && /^\d+$/.test(folderResp)) return Number(folderResp);
          if (Array.isArray(folderResp)) return (folderResp as any)[0]?.folder_no;
          return (folderResp as any)?.folder_no;
        })();

        if (!folderNo) {
          throw new Error("Vyspa did not return a folder number (folder_no).");
        }

        setVyspaFolderInfo({ folderNumber: String(folderNo), emailAddress: lead.email });
      }

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

      // Build room passenger mapping for ApiAddToFolder.hotel.passengers (roomId -> "1,2,3")
      const roomPassengers = (() => {
        const roomIds = summary.roomIds;
        const mapping: Record<string, string> = {};
        if (roomIds.length === 0) return mapping;

        const allocations = roomIds.map(() => [] as number[]);
        const byType = {
          adult: [] as number[],
          child: [] as number[],
          infant: [] as number[],
        };

        passengers.forEach((passenger, index) => {
          const paxNo = index + 1;
          if (passenger.type === "child") byType.child.push(paxNo);
          else if (passenger.type === "infant") byType.infant.push(paxNo);
          else byType.adult.push(paxNo);
        });

        const distribute = (indices: number[]) => {
          if (indices.length === 0) return;
          const roomCount = roomIds.length;
          const base = Math.floor(indices.length / roomCount);
          const remainder = indices.length % roomCount;
          const counts = Array.from({ length: roomCount }, () => base);
          for (let i = 0; i < remainder; i += 1) {
            counts[roomCount - 1 - i] += 1;
          }

          let cursor = 0;
          counts.forEach((count, roomIndex) => {
            for (let i = 0; i < count; i += 1) {
              const paxNo = indices[cursor];
              if (paxNo != null) allocations[roomIndex]?.push(paxNo);
              cursor += 1;
            }
          });
        };

        distribute(byType.adult);
        distribute(byType.child);
        distribute(byType.infant);

        roomIds.forEach((roomId, index) => {
          const pax = allocations[index] || [];
          if (pax.length > 0) {
            mapping[roomId] = mapping[roomId]
              ? `${mapping[roomId]},${pax.join(",")}`
              : pax.join(",");
          }
        });

        return mapping;
      })();

      if (isHotelbedsMode) {
        const submitResp = await hotelService.submitHotelbedsToFolder({
          folderNumber: Number(folderNo),
          currency: "GBP",
          hotel: { hotelId: summary.hotelId, hotelName: summary.hotelName },
          stay: {
            checkIn: hotelSearch.checkIn,
            checkOut: hotelSearch.checkOut,
            rooms: hotelSearch.rooms,
            adults: hotelSearch.adults,
            children: hotelSearch.children,
          },
          passengers: folderPassengers as any,
          selection: {
            total: selectedHotelRoomSummary?.total || 0,
            nightly: selectedHotelRoomSummary?.nightly,
            rateKey: selectedHotelRoomSummary?.hotelbedsRateKey,
            boardName: selectedHotelRoomSummary?.mealName,
            refundable: selectedHotelRoomSummary?.isRefundable,
          },
        });
        if (!submitResp?.success) {
          throw new Error((submitResp as any)?.message || "Failed to submit HotelBeds hotel to folder");
        }

        // Ensure passenger rows appear in CMS Passenger tab for HotelBeds folders.
        // Vyspa persists these via ApiAddToFolder even when requestData is empty.
        const paxSyncResp = await folderService.addToFolder({
          folderNumber: Number(folderNo),
          itineraryNumber: "1",
          foldcur: "GBP",
          travelPurpose: "Holiday",
          comments: [],
          set_as_preferred_itinerary: true,
          passengers: folderPassengers as any,
          requestData: [],
        });
        if (!paxSyncResp.success) {
          throw new Error(paxSyncResp.message || "Failed to sync hotel passengers to folder");
        }
      } else {
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
              roomCodes: summary.roomIds.join(","),
              roomIds: summary.roomIds.join(","),
              passengers: roomPassengers,
              expectedNetPrice,
            } as any,
          ],
        };

        const addResp = await folderService.addToFolder(addToFolderRequest);
        if (!addResp.success) {
          throw new Error(addResp.message || "Failed to add hotel to folder");
        }
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
        <BookingHeader currentStep={1} isHotel={true} />

        <div className="flex flex-col lg:flex-row gap-4 mt-4">
          <WebRefCard
            refNumber={webRefNumber}
            phoneNumber={affiliatePhone}
            isMobile={true}
          />
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
            <WebRefCard
              refNumber={webRefNumber}
              phoneNumber={affiliatePhone}
              isMobile={false}
            />
            <HotelSummaryCard />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
