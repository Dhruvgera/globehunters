import type { HolidayPackageViewResponse } from "@/types/holidayPackage";
import { packageService } from "@/services/api/packageService";

export function buildDetailsFromDeeplinkView(
  viewData: HolidayPackageViewResponse,
): Awaited<ReturnType<typeof packageService.getPackageDetails>>["details"] {
  const hotel = viewData.results.HotelDetails;
  const roomOptions = Object.values(hotel.rooms || {})
    .filter(
      (
        entry,
      ): entry is HolidayPackageViewResponse["results"]["HotelDetails"]["rooms"][string] =>
        Array.isArray(entry),
    )
    .flat();

  const cancellationPolicies = roomOptions
    .map((room, index) => ({
      id: Number(room.id || index + 1),
      roomName: room.room_name || "Room",
      effectiveDate: room.CheckInDate,
      endEffectiveDate: room.CheckOutDate,
      policy: String(room.cancellation_policy || "").trim() || undefined,
    }))
    .filter((row) => row.policy);

  const firstDirection = viewData.results.FlightDetails?.[0];
  const firstLeg = firstDirection?.Flights?.[0];
  const lastLeg = firstDirection?.Flights?.slice(-1)?.[0];

  return {
    quoteId: undefined,
    packagePrice: undefined,
    hotel: {
      id: Number(viewData.results.HotelResultId || 0),
      hotelId: Number(hotel.hotel_id || 0),
      name: hotel.hotel_name,
      description: hotel.quickDescription || undefined,
      imageUrl: hotel.image_name || undefined,
      starRating: Number(hotel.hotel_rating || 0) || undefined,
      amenities: [],
      checkOutDate: roomOptions[0]?.CheckOutDate,
      rooms: roomOptions.map((room) => ({
        id: Number(room.id || 0),
        name: room.room_name || undefined,
        nights: Number(room.days_spent || 0) || undefined,
        checkIn: room.CheckInDate || undefined,
        checkOut: room.CheckOutDate || undefined,
        price: Number(room.cust_tot_sell_amt || room.net_price || 0) || undefined,
        netPrice: Number(room.net_price || 0) || undefined,
        mealCode: room.MealPlan || undefined,
        mealName: room.meal_name || undefined,
        currency: room.sell_currency_code || room.currency_code || undefined,
        nonRefundable: Number(room.nonRef || 0) === 1,
        remarks: room.cancellation_policy || undefined,
      })),
    },
    cancellationPolicies,
    flight: firstLeg
      ? {
          origin: String(firstLeg.departure_airport || ""),
          destination: String(lastLeg?.arrival_airport || ""),
          currency: String(hotel.SellCur || "GBP"),
          validatingCarrier: String(
            firstDirection?.Majority_carrier || firstLeg.airline_name || "",
          ),
          refundable: Number(firstLeg.refundable || 0) === 1,
        }
      : undefined,
    success: true,
  };
}
