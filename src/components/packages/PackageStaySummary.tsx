"use client";

import { useMemo } from "react";
import { Building2, Calendar, Users, Moon, CheckCircle2, ReceiptText } from "lucide-react";
import { getChargeablePassengerCount } from "@/lib/package/passengers";
import { formatPrice } from "@/lib/currency";

interface PackageStaySummaryProps {
  hotelName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  adults?: number;
  childCount?: number;
  infants?: number;
  rooms: number;
  price?: number;
  currency?: string;
  hotelImage?: string;
  rating?: number;
  reviewCount?: number;
}

export function PackageStaySummary({
  hotelName,
  checkIn,
  checkOut,
  guests,
  adults,
  childCount,
  infants,
  rooms,
  price,
  currency,
  hotelImage,
  rating,
  reviewCount,
}: PackageStaySummaryProps) {
  // Calculate nights
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formattedPrice = useMemo(() => {
    if (price == null || Number.isNaN(price)) return "";
    return formatPrice(price, currency || "GBP");
  }, [currency, price]);

  const formattedPerPersonPrice = useMemo(() => {
    if (price == null || Number.isNaN(price)) return "";

    const chargeableGuests = getChargeablePassengerCount([
      {
        adults: Math.max(0, Number(adults ?? guests ?? 0)),
        children: Math.max(0, Number(childCount || 0)),
        infants: Math.max(0, Number(infants || 0)),
      },
    ]);
    const perPersonPrice = Math.round((price / chargeableGuests) * 100) / 100;
    return formatPrice(perPersonPrice, currency || "GBP");
  }, [adults, childCount, currency, guests, infants, price]);

  return (
    <div className="mt-5 bg-[#F5F7FF] rounded-2xl p-6 lg:p-7 border border-[#E5E8F5]">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Hotel Image - optional */}
        {hotelImage && (
          <div className="w-full sm:w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={hotelImage}
              alt={hotelName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Hotel Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-5">
            <div className="flex-1 min-w-0">
              {/* Hotel Name */}
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[#3754ED] flex-shrink-0" />
                <h3 className="font-semibold text-[#010D50] truncate">
                  {hotelName}
                </h3>
              </div>

              {/* Rating if available */}
              {rating && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#3754ED] text-white text-xs font-medium px-2 py-0.5 rounded">
                    {rating.toFixed(1)}
                  </span>
                  {reviewCount && (
                    <span className="text-xs text-[#3A478A]">
                      {reviewCount} reviews
                    </span>
                  )}
                </div>
              )}

              {/* Stay Details Grid */}
              <div className={`grid grid-cols-2 ${formattedPrice ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-4 mt-4`}>
                {/* Check-in */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-[#3A478A] mb-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Check-in</span>
                  </div>
                  <span className="text-sm font-medium text-[#010D50]">
                    {formatDate(checkIn)}
                  </span>
                </div>

                {/* Check-out */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-[#3A478A] mb-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Check-out</span>
                  </div>
                  <span className="text-sm font-medium text-[#010D50]">
                    {formatDate(checkOut)}
                  </span>
                </div>

                {/* Nights */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-[#3A478A] mb-0.5">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Duration</span>
                  </div>
                  <span className="text-sm font-medium text-[#010D50]">
                    {nights} {nights === 1 ? "Night" : "Nights"}
                  </span>
                </div>

                {/* Guests & Rooms */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-[#3A478A] mb-0.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Guests</span>
                  </div>
                  <span className="text-sm font-medium text-[#010D50]">
                    {guests} {guests === 1 ? "Guest" : "Guests"}, {rooms}{" "}
                    {rooms === 1 ? "Room" : "Rooms"}
                  </span>
                </div>

                {formattedPrice && (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs text-[#3A478A] mb-0.5">
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span>Price</span>
                    </div>
                    <span className="text-sm font-semibold text-[#010D50]">
                      {formattedPrice}
                    </span>
                    {formattedPerPersonPrice && (
                      <span className="text-xs text-[#3A478A]">
                        {formattedPerPersonPrice} per person
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step Complete Badge */}
            <div className="flex items-center gap-1.5 bg-[#E8F5E9] px-3 py-1.5 rounded-full flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#008234]" />
              <span className="text-sm font-medium text-[#008234] hidden sm:inline">
                Step 1 Complete
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
