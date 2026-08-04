"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { Button } from "@/components/ui/button";
import { useBookingStore, useSelectedFlight } from "@/store/bookingStore";
import { useBoxPay } from "@/hooks/useBoxPay";
import { PaymentCompletionInfo } from "@/types/boxpay";
import { Flight, FlightSegment } from "@/types/flight";
import type { Hotel } from "@/types/hotel";
import { PriceCheckResult, TransformedPriceOption } from "@/types/priceCheck";
import FlightDetailedInfo from "@/components/flights/FlightDetailedInfo";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";
import { PaymentHeader } from "@/components/payment/PaymentHeader";
import { HotelSummaryCard } from "@/components/booking/HotelSummaryCard";
import { transformBookingToEmailData, transformHotelBookingToEmailData, sendBookingConfirmationEmail } from "@/lib/emailHelper";
import { shortenAirportName } from "@/lib/vyspa/utils";
import { airportCache } from "@/lib/cache/airportCache";
import { formatPrice } from "@/lib/currency";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plane,
  Calendar,
  CalendarDays,
  Moon,
  Users,
  CreditCard,
  Phone,
  Mail,
  Home,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { FOLDER_STATUS_CODES } from "@/types/portal";
import { calculateNights } from "@/lib/hotels/nights";
import { REFUNDABLE_TERMS_URL } from "@/config/constants";

type ConfirmedActivity = {
  productCode?: string;
  title?: string;
  price?: number;
  currency?: string;
  duration?: string;
  itineraryDate?: string;
  itineraryTime?: string;
  destination?: string;
};

type ConfirmedDestination = {
  name?: string;
  checkIn?: string;
  checkOut?: string;
  hotel?: Hotel | null;
  activities?: ConfirmedActivity[];
};

const REFUNDABLE_CLAIMS_URL = "https://form.refundablebooking.com";

// Confetti particle component
function ConfettiParticle({
  delay,
  color,
  left,
}: {
  delay: number;
  color: string;
  left: number;
}) {
  return (
    <div
      className="confetti-particle"
      style={
        {
          "--delay": `${delay}s`,
          "--color": color,
          "--left": `${left}%`,
        } as React.CSSProperties
      }
    />
  );
}

// Confetti explosion component
function ConfettiExplosion() {
  const colors = [
    "#3754ED", // Primary blue
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#FFD700", // Gold
  ];

  const particles = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    left: Math.random() * 100,
  }));

  return (
    <div className="confetti-container">
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          delay={particle.delay}
          color={particle.color}
          left={particle.left}
        />
      ))}
      <style jsx>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
          overflow: hidden;
        }
        .confetti-particle {
          position: absolute;
          top: -20px;
          left: var(--left);
          width: 12px;
          height: 12px;
          background: var(--color);
          opacity: 0;
          animation: confetti-fall 4s ease-out var(--delay) forwards;
        }
        .confetti-particle:nth-child(odd) {
          width: 8px;
          height: 16px;
          border-radius: 0;
        }
        .confetti-particle:nth-child(even) {
          border-radius: 50%;
        }
        .confetti-particle:nth-child(3n) {
          width: 6px;
          height: 6px;
        }
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          25% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg) scale(0.3);
          }
        }
      `}</style>
    </div>
  );
}

// Flight leg component for the confirmation card - matches Figma exactly
interface FlightLegProps {
  departureCode: string;
  departureCity: string;
  departureTime: string;
  departureTerminal?: string;
  departureDate?: string;
  arrivalCode: string;
  arrivalCity: string;
  arrivalTime: string;
  arrivalTerminal?: string;
  arrivalDate?: string;
  travelTime: string;
  flightNumber: number;
  totalFlights: number;
}

function FlightLegDisplay({
  departureCode,
  departureCity,
  departureTime,
  departureTerminal,
  departureDate,
  arrivalCode,
  arrivalCity,
  arrivalTime,
  arrivalTerminal,
  arrivalDate,
  travelTime,
  flightNumber,
  totalFlights,
}: FlightLegProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Flight number indicator */}
      <div className="text-xs text-[#3A478A]">
        Flight {flightNumber} of {totalFlights}
      </div>

      {/* Route visualization - matching FlightInfoModal style */}
      <div className="flex gap-4">
        {/* Visual Timeline with dots and dashed line */}
        <div className="flex flex-col items-center py-1">
          {/* Departure dot (empty circle) */}
          <div className="w-3 h-3 rounded-full border-2 border-[#010D50]" />
          {/* Dashed line */}
          <div className="flex-1 w-px border-l-2 border-dashed border-[#010D50] my-1" />
          {/* Arrival dot (filled circle) */}
          <div className="w-3 h-3 bg-[#010D50] rounded-full" />
        </div>

        {/* Flight Details */}
        <div className="flex flex-col justify-between flex-1 gap-4">
          {/* Departure */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[#010D50]">
                {shortenAirportName(departureCity)} ({departureCode})
              </span>
              <span className="text-xs text-[#3A478A]">
                {getCityName(departureCode)}
              </span>
              {departureTerminal && (
                <span className="text-xs text-[#3A478A]">{departureTerminal}</span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xl font-bold text-[#010D50]">
                {departureTime}
              </span>
              {departureDate && (
                <span className="text-xs text-[#3A478A]">{departureDate}</span>
              )}
            </div>
          </div>

          {/* Travel time */}
          <div className="flex items-center gap-1 pl-1">
            <Clock className="w-3 h-3 text-[#3A478A]" />
            <span className="text-xs text-[#3A478A]">
              Travel time: {travelTime}
            </span>
          </div>

          {/* Arrival */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[#010D50]">
                {shortenAirportName(arrivalCity)} ({arrivalCode})
              </span>
              <span className="text-xs text-[#3A478A]">
                {getCityName(arrivalCode)}
              </span>
              {arrivalTerminal && (
                <span className="text-xs text-[#3A478A]">{arrivalTerminal}</span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xl font-bold text-[#010D50]">
                {arrivalTime}
              </span>
              {arrivalDate && (
                <span className="text-xs text-[#3A478A]">{arrivalDate}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Baggage Alert Banner
function BaggageAlertBanner() {
  return (
    <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-3 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-[#DC2626]">
          Baggage Alert: Re-Check Required
        </p>
        <p className="text-[10px] text-[#DC2626] leading-tight">
          Due to airline or flight changes during your stop, you MUST collect
          your checked luggage and re-check it with the connecting airline.
          Always confirm your luggage tag instructions upon arrival at your
          layover city.
        </p>
      </div>
    </div>
  );
}

// Stopover info component
function StopoverBadge({
  airportCode,
  duration,
}: {
  airportCode: string;
  duration: string;
}) {
  const cached = airportCache.getAirportByCode(airportCode);
  const city = cached?.city || airportCode;
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm text-[#6B7280]">
        Stopover at {shortenAirportName(city)} ({airportCode}) for
      </span>
      <div className="flex items-center gap-1 text-sm font-medium text-[#010D50]">
        <Clock className="w-4 h-4" />
        {duration}
      </div>
    </div>
  );
}

// Flight confirmation card component
interface FlightCardConfirmationProps {
  title: string;
  date: string;
  passengerCount: number;
  cabinClass: string;
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  distance: string;
  aircraftType: string;
  segment: FlightSegment;
  fullFlight: Flight;
  priceCheck?: PriceCheckResult | null;
  selectedUpgradeOption?: TransformedPriceOption | null;
  onViewDetails: () => void;
}

// Helper to get city name from airport code using cache or fallback
function getCityName(airportCode: string): string {
  // Try airport cache first
  const cached = airportCache.getAirportByCode(airportCode);
  if (cached?.city) {
    return cached.city;
  }
  // Fallback to the airport code itself
  return airportCode;
}

function FlightConfirmationCard({
  title,
  date,
  passengerCount,
  cabinClass,
  airlineName,
  airlineCode,
  flightNumber,
  distance,
  aircraftType,
  segment,
  fullFlight,
  priceCheck,
  selectedUpgradeOption,
  onViewDetails,
}: FlightCardConfirmationProps) {
  const [showDetails, setShowDetails] = useState(true); // Show details by default per Figma
  const [imgError, setImgError] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Load airport cache on mount
  useEffect(() => {
    const loadCache = async () => {
      await airportCache.getAirports();
      setCacheLoaded(true);
    };
    loadCache();
  }, []);

  const logoUrl = `https://images.kiwi.com/airlines/64/${airlineCode}.png`;

  // Get individual flights for the multi-leg display
  const individualFlights = segment.individualFlights || [];
  const layovers = segment.layovers || [];

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-col gap-4 flex-1 min-w-[320px]">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[#010D50]">{title}</h3>
        <p className="text-sm text-[#6B7280]">{date}</p>
      </div>

      {/* Passenger info row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#010D50]">
            {passengerCount} passenger{passengerCount > 1 ? "s" : ""}
          </span>
          <span className="text-[#6B7280]">•</span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-[#3754ED] font-medium hover:underline flex items-center gap-1"
          >
            View Details
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
        <span className="text-sm text-[#010D50]">{cabinClass}</span>
      </div>

      {/* Airline info - always visible */}
      <div className="flex items-center gap-3 pt-2 border-t border-[#E5E7EB]">
        {!imgError ? (
          <div className="w-8 h-8 relative flex items-center justify-center">
            <Image
              src={logoUrl}
              alt={`${airlineName} logo`}
              width={32}
              height={32}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center">
            <Plane className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#010D50]">
            {airlineName}
          </span>
          <span className="text-xs text-[#6B7280]">
            {flightNumber} - {cabinClass} • {distance} km • {aircraftType}
          </span>
        </div>
      </div>

      {/* Flight legs - collapsible */}
      {showDetails && (
        <div className="flex flex-col gap-3 mt-2">
          {individualFlights.length > 0 ? (
            <>
              {/* First leg */}
              <div className="bg-[#F5F7FF] rounded-xl p-4">
                <FlightLegDisplay
                  departureCode={individualFlights[0].departureAirport}
                  departureCity={getCityName(individualFlights[0].departureAirport)}
                  departureTime={individualFlights[0].departureTime}
                  departureTerminal={segment.departureTerminal}
                  departureDate={segment.date}
                  arrivalCode={individualFlights[0].arrivalAirport}
                  arrivalCity={getCityName(individualFlights[0].arrivalAirport)}
                  arrivalTime={individualFlights[0].arrivalTime}
                  arrivalTerminal={segment.arrivalTerminal}
                  arrivalDate={segment.date}
                  travelTime={individualFlights[0].duration}
                  flightNumber={1}
                  totalFlights={individualFlights.length}
                />
              </div>

              {/* Stopover info */}
              {layovers.length > 0 && (
                <>
                  <StopoverBadge
                    airportCode={layovers[0].viaAirport}
                    duration={layovers[0].duration}
                  />
                  <BaggageAlertBanner />
                </>
              )}

              {/* Second leg (if exists) */}
              {individualFlights.length > 1 && (
                <div className="bg-[#F5F7FF] rounded-xl p-4">
                  <FlightLegDisplay
                    departureCode={individualFlights[1].departureAirport}
                    departureCity={getCityName(individualFlights[1].departureAirport)}
                    departureTime={individualFlights[1].departureTime}
                    departureTerminal={segment.departureTerminal}
                    departureDate={segment.date}
                    arrivalCode={individualFlights[1].arrivalAirport}
                    arrivalCity={getCityName(individualFlights[1].arrivalAirport)}
                    arrivalTime={individualFlights[1].arrivalTime}
                    arrivalTerminal={segment.arrivalTerminal}
                    arrivalDate={segment.arrivalDate || segment.date}
                    travelTime={individualFlights[1].duration}
                    flightNumber={2}
                    totalFlights={individualFlights.length}
                  />
                </div>
              )}
            </>
          ) : (
            // Fallback for simple segment without individual flights
            <div className="bg-[#F5F7FF] rounded-xl p-4">
              <FlightLegDisplay
                departureCode={segment.departureAirport.code}
                departureCity={segment.departureAirport.name && segment.departureAirport.name !== segment.departureAirport.code
                  ? shortenAirportName(segment.departureAirport.name)
                  : shortenAirportName(segment.departureAirport.city)}
                departureTime={segment.departureTime}
                departureTerminal={segment.departureTerminal}
                departureDate={segment.date}
                arrivalCode={segment.arrivalAirport.code}
                arrivalCity={segment.arrivalAirport.name && segment.arrivalAirport.name !== segment.arrivalAirport.code
                  ? shortenAirportName(segment.arrivalAirport.name)
                  : shortenAirportName(segment.arrivalAirport.city)}
                arrivalTime={segment.arrivalTime}
                arrivalTerminal={segment.arrivalTerminal}
                arrivalDate={segment.arrivalDate || segment.date}
                travelTime={segment.duration}
                flightNumber={1}
                totalFlights={1}
              />
            </div>
          )}

          {/* Detailed Info (Baggage, Fare Rules etc.) */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <FlightDetailedInfo
              flight={fullFlight}
              segment={segment}
              priceCheck={priceCheck}
              selectedUpgradeOption={selectedUpgradeOption}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Move imports to top of file
// (removed duplicate import)

// Add this helper function outside component
const updateFolderStatus = async (
  folderNumber: string,
  statusCode: string,
  comments?: string[]
) => {
  try {
    await fetch("/api/vyspa/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderNumber,
        statusCode,
        comments,
      }),
    });
  } catch (err) {
    console.error("Failed to update folder status", err);
  }
};

const confirmVyspaItinerary = async (folderNumber: string) => {
  const payloadBase = {
    folderNumber: Number(folderNumber),
    itineraryNumber: "1",
  };

  const validateResp = await fetch("/api/vyspa/confirm-itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ ...payloadBase, validateOnly: true }]),
  });

  const validateResult = await validateResp.json().catch(() => ({}));
  if (!validateResp.ok) {
    const message = String((validateResult as any)?.message || "");
    if (!message.toLowerCase().includes("already")) {
      throw new Error(message || "Failed to validate itinerary");
    }
    return;
  }

  const confirmResp = await fetch("/api/vyspa/confirm-itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ ...payloadBase, validateOnly: false }]),
  });
  const confirmResult = await confirmResp.json().catch(() => ({}));
  if (!confirmResp.ok) {
    const message = String((confirmResult as any)?.message || "");
    if (!message.toLowerCase().includes("already")) {
      throw new Error(message || "Failed to confirm itinerary");
    }
  }
};

function PaymentCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inquirePayment, loading: inquiryLoading } = useBoxPay();
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();
  const queryType = searchParams?.get("type") || "";
  const queryIsPackageMode = queryType === "package";
  const queryIsHotelMode = queryType === "hotel";

  const [paymentInfo, setPaymentInfo] = useState<PaymentCompletionInfo | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Get flight and booking info from store
  const storeSelectedFlight = useSelectedFlight();
  const storeVyspaFolderNumber = useBookingStore(
    (state) => state.vyspaFolderNumber
  );
  const storePriceCheckData = useBookingStore((state) => state.priceCheckData);
  const storePassengers = useBookingStore((state) => state.passengers);
  const storeContactEmail = useBookingStore((state) => state.contactEmail);
  const storeContactPhone = useBookingStore((state) => state.contactPhone);
  const storeVyspaEmailAddress = useBookingStore((state) => state.vyspaEmailAddress);
  const storeAddOns = useBookingStore((state) => state.addOns);
  const storeSelectedUpgrade = useBookingStore((state) => state.selectedUpgradeOption);
  const storeSelectedHotel = useBookingStore((state) => state.selectedHotel);
  const storeRoomSummary = useBookingStore((state) => state.selectedHotelRoomSummary);
  const storeHotelDetailsCache = useBookingStore((state) => state.hotelDetailsCache);
  const storeHotelSearch = useBookingStore((state) => state.hotelSearch);
  const storeSelectedHotelRoomIds = useBookingStore((state) => state.selectedHotelRoomIds);
  const resetBooking = useBookingStore((state) => state.resetBooking);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [bookingContext, setBookingContext] = useState<any>(null);

  const isHotelMode =
    queryIsHotelMode ||
    Boolean(bookingContext?.hotelRoomSummary) ||
    (!storeSelectedFlight && Boolean(storeRoomSummary));
  const isPackageMode = queryIsPackageMode;

  const loadBookingContext = useCallback((id: string) => {
    try {
      const raw = sessionStorage.getItem(`bookingContext_${id}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse bookingContext snapshot", e);
      return null;
    }
  }, []);

  const hotelConfirmDisplay = useMemo(() => {
    if (!isHotelMode) return null;
    const hotelSummary = bookingContext?.hotelSummary || storeSelectedHotel;
    const roomSummary = bookingContext?.hotelRoomSummary || storeRoomSummary;
    const selectedRoomIds = bookingContext?.selectedHotelRoomIds || storeSelectedHotelRoomIds;
    const hs = bookingContext?.hotelSearch || storeHotelSearch;
    const hotelId = hotelSummary?.hotelId;
    const cached = bookingContext?.hotelDetailsSnapshot || (hotelId ? storeHotelDetailsCache?.[hotelId] : undefined);
    const cancellationText = cached?.cancellationText || "";
    const isRefundable = roomSummary?.isRefundable;
    const roomName = roomSummary?.roomName || "Selected Room";
    const nightsCount = hs
      ? calculateNights(hs.checkIn, hs.checkOut)
      : 0;
    const rooms = hs?.rooms || 1;
    const adults = hs?.adults || 1;
    const children = hs?.children || 0;

    const roomNames: string[] = [];
    if (Array.isArray(cached?.rooms) && selectedRoomIds.length > 0) {
      const roomMap = new Map(cached!.rooms!.map((r: any) => [String(r.id), r.name || "Room"]));
      const counts: Record<string, number> = {};
      for (const rid of selectedRoomIds) {
        const n = roomMap.get(String(rid)) || roomName;
        counts[n] = (counts[n] || 0) + 1;
      }
      for (const [n, c] of Object.entries(counts)) {
        roomNames.push(c > 1 ? `${n} x${c}` : n);
      }
    } else if (selectedRoomIds.length > 0) {
      roomNames.push(
        selectedRoomIds.length > 1 ? `${roomName} x${selectedRoomIds.length}` : roomName
      );
    }

    return { cancellationText, isRefundable, nightsCount, rooms, adults, children, roomNames, roomName, currency: roomSummary?.currency, total: roomSummary?.total };
  }, [isHotelMode, bookingContext, storeSelectedHotel, storeHotelDetailsCache, storeRoomSummary, storeHotelSearch, storeSelectedHotelRoomIds]);

  const hotelDetailsCacheForDisplay = useMemo(() => {
    const hotelSummary = bookingContext?.hotelSummary || storeSelectedHotel;
    const hotelSnapshot = bookingContext?.hotelDetailsSnapshot;
    const hotelId = hotelSummary?.hotelId;
    if (!hotelId || !hotelSnapshot) return storeHotelDetailsCache;
    return {
      ...storeHotelDetailsCache,
      [hotelId]: hotelSnapshot,
    };
  }, [bookingContext, storeSelectedHotel, storeHotelDetailsCache]);

  // Record payment to Vyspa Portal (non-blocking)
  const recordPaymentToVyspa = useCallback(async (
    transactionId: string,
    amount: number,
    currency: string
  ) => {
    if (!storeVyspaFolderNumber) {
      console.warn('⚠️ No Vyspa folder number available for payment recording');
      return;
    }

    try {
      console.log('📤 Recording payment to Vyspa Portal', {
        folderNumber: storeVyspaFolderNumber,
        transactionId,
        amount,
        currency,
      });

      const response = await fetch('/api/vyspa/save-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderNumber: storeVyspaFolderNumber,
          transactionId,
          amount,
          currency,
        }),
      });

      const result = await response.json();

      // Enhanced logging for debugging
      console.log('📦 Vyspa save-payment response', {
        status: response.status,
        ok: response.ok,
        success: result?.success,
        folderNumber: result?.folderNumber,
        paymentRecorded: result?.paymentRecorded,
        statusUpdated: result?.statusUpdated,
        paymentResult: result?.paymentResult,
        statusResult: result?.statusResult,
      });

      // Print folder data prominently for debugging
      if (result?.folderDetails) {
        console.log('📁 FOLDER DATA AFTER PAYMENT RECORDING:');
        console.log(JSON.stringify(result.folderDetails, null, 2));
      }

      if (response.ok && result.success) {
        console.log('✅ Payment recorded to Vyspa successfully');
      } else {
        console.error('❌ Failed to record payment to Vyspa', {
          error: result?.error,
          message: result?.message,
        });
      }
    } catch (error) {
      // Non-blocking - payment already succeeded, just log the error
      console.error('❌ Error recording payment to Vyspa:', error);
    }
  }, [storeVyspaFolderNumber]);

  // Get email from store or vyspa - use vyspaEmailAddress as fallback
  const effectiveContactEmail = storeContactEmail || storeVyspaEmailAddress;

  const flight = bookingContext?.flight || storeSelectedFlight;
  const passengers = storePassengers;
  const vyspaFolderNumber = storeVyspaFolderNumber;

  // Get orderId and redirectionResult from URL
  const orderId = searchParams?.get("orderId") || "";
  const redirectionResult = searchParams?.get("redirectionResult") || "";

  // Inquire payment status on mount
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // If we have a redirectionResult token, use it to check status
      if (redirectionResult) {
        const result = await inquirePayment(redirectionResult);

        if (result.success && result.payment) {
          // If payment failed, redirect back to payment page with error
          if (result.payment.status === "failed") {
            // Update folder status to Payment Failed (56)
            if (vyspaFolderNumber) {
              await updateFolderStatus(
                vyspaFolderNumber,
                FOLDER_STATUS_CODES.PAYMENT_FAILURE,
                [`Payment failed: ${result.payment.error || 'Unknown error'}`]
              );
            }
            router.replace(
              `/payment?error=payment_failed${
                isPackageMode ? "&type=package" : isHotelMode ? "&type=hotel" : ""
              }`
            );
            return;
          }

          setPaymentInfo(result.payment);

          // Show confetti on success
	          if (result.payment.status === "success") {
	            setShowConfetti(true);
	            // Mark as completed to prevent double charging
	            sessionStorage.setItem(
	              "paymentCompletedOrderId",
	              result.payment.orderId
	            );
            // Clear pending order info
	            sessionStorage.removeItem("pendingOrderId");
	            sessionStorage.removeItem("pendingOrderAmount");
	            sessionStorage.removeItem("pendingOrderCurrency");

	            // Hotels and packages: confirm itinerary only after successful payment so extras can be added before payment.
	            if (isHotelMode || isPackageMode) {
	              const folderNumberForConfirm =
	                String(result.payment.orderId || vyspaFolderNumber || orderId || "").trim();
	              if (folderNumberForConfirm) {
	                const confirmGuardKey = `${isPackageMode ? "package" : "hotel"}ItineraryConfirmed_${folderNumberForConfirm}`;
	                if (sessionStorage.getItem(confirmGuardKey) !== "1") {
	                  try {
	                    await confirmVyspaItinerary(folderNumberForConfirm);
	                    sessionStorage.setItem(confirmGuardKey, "1");
	                    console.log("✅ Itinerary confirmed after payment", {
	                      folderNumber: folderNumberForConfirm,
                        flow: isPackageMode ? "package" : "hotel",
	                    });
	                  } catch (confirmError) {
	                    console.error("❌ Failed to confirm itinerary after payment", confirmError);
	                  }
	                }
	              }
	            }

	            // Record payment to Vyspa Portal (non-blocking)
	            recordPaymentToVyspa(
	              result.payment.transactionId || result.payment.orderId,
              parseFloat(result.payment.amount || sessionStorage.getItem("pendingOrderAmount") || '0'),
              result.payment.currency || sessionStorage.getItem("pendingOrderCurrency") || 'GBP'
            );

            // Email sending is handled by separate useEffect to ensure data is available
          } else {
            // Check if status is explicitly failed/declined
            if (result.status === "failed" || result.status === "declined") {
              if (vyspaFolderNumber) {
                await updateFolderStatus(
                  vyspaFolderNumber,
                  FOLDER_STATUS_CODES.PAYMENT_FAILURE,
                  [`Payment inquiry failed/declined: ${result.error || result.status}`]
                );
              }
            }
            setError(result.error || "Failed to get payment status");
          }
        } else {
          // Fallback if inquirePayment returned success:false or missing payment object
          setError(result.error || "Failed to get payment status");
        }
      } else {
        // If no redirectionResult, check for stored order info
        const pendingOrderId = sessionStorage.getItem("pendingOrderId");
        const completedOrderId = sessionStorage.getItem(
          "paymentCompletedOrderId"
        );

        if (completedOrderId) {
          // Show success state for already completed orders
          setPaymentInfo({
            status: "success",
            orderId: completedOrderId,
          });
          setShowConfetti(true);
        } else if (pendingOrderId) {
          // If we have a pending order but no redirect result, show pending status
          setPaymentInfo({
            status: "pending",
            orderId: pendingOrderId,
            message: "Waiting for payment confirmation...",
          });
        } else if (orderId) {
          // Use the orderId from URL params
          setPaymentInfo({
            status: "pending",
            orderId: orderId,
            message: "Checking payment status...",
          });
        } else {
          setError("No payment information found");
        }
      }
    };

    checkPaymentStatus();
  }, [redirectionResult, orderId, inquirePayment, recordPaymentToVyspa, router, isHotelMode, vyspaFolderNumber]);

  // When we know the payment order id, load the correct snapshot for this order to avoid stale data
  useEffect(() => {
    const id =
      paymentInfo?.orderId ||
      sessionStorage.getItem("pendingOrderId") ||
      storeVyspaFolderNumber ||
      orderId ||
      "";
    if (!id) return;
    const ctx = loadBookingContext(id);
    if (ctx) setBookingContext(ctx);
  }, [paymentInfo?.orderId, storeVyspaFolderNumber, orderId, loadBookingContext]);

  // Hide confetti after animation
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const handleGoHome = useCallback(() => {
    // Clear all payment-related sessionStorage items to allow new bookings
    sessionStorage.removeItem("paymentCompletedOrderId");
    sessionStorage.removeItem("pendingOrderId");
    sessionStorage.removeItem("pendingOrderAmount");
    sessionStorage.removeItem("pendingOrderCurrency");
    sessionStorage.removeItem("paymentSessionStart");
    sessionStorage.removeItem("paymentVisited");

    resetBooking();
    router.push("/");
  }, [router, resetBooking]);

  const handleNewSearch = useCallback(() => {
    // Clear session-related items (but keep paymentCompletedOrderId for duplicate protection)
    sessionStorage.removeItem("pendingOrderId");
    sessionStorage.removeItem("pendingOrderAmount");
    sessionStorage.removeItem("pendingOrderCurrency");
    sessionStorage.removeItem("paymentSessionStart");
    sessionStorage.removeItem("paymentVisited");

    resetBooking();
    router.push("/search");
  }, [router, resetBooking]);

  const handleViewTrip = useCallback(() => {
    // Placeholder for viewing trip details
    // Could navigate to a trip details page
  }, []);

  const handleDownloadReceipt = useCallback(() => {
    window.print();
  }, []);

  // Send confirmation email async
  const sendConfirmationEmailAsync = useCallback(async (orderId: string, amount?: string, currency?: string) => {
    const emailSentKey = `emailSent_${orderId}`;
    if (emailSent || sessionStorage.getItem(emailSentKey)) return;
    // Claim order before awaiting network work. Prevents duplicate sends from effect reruns/Strict Mode remounts.
    sessionStorage.setItem(emailSentKey, "sending");

    try {
      setEmailError(null);

      const ctx = bookingContext || loadBookingContext(orderId);
      const totalPaid = parseFloat(
        amount ||
        sessionStorage.getItem("pendingOrderAmount") ||
        String(ctx?.pricing?.tripTotal || "0")
      );
      const currencyCode =
        currency ||
        sessionStorage.getItem("pendingOrderCurrency") ||
        ctx?.pricing?.currency ||
        "GBP";

      const passengersForEmail = ctx?.passengers || storePassengers;
      const contactEmailForEmail = ctx?.contactEmail || effectiveContactEmail;
      const contactPhoneForEmail =
        ctx?.contactPhone ||
        storeContactPhone ||
        passengersForEmail?.[0]?.phone ||
        "";

      if (!contactEmailForEmail) {
        console.error("Cannot send email - missing email address");
        return;
      }

      // Prefer the stored checkout pricing snapshot (exact at time of checkout)
      const baseFareAtCheckout =
        typeof ctx?.pricing?.baseFare === "number" ? ctx.pricing.baseFare : undefined;
      const protectionPlanAmount =
        typeof ctx?.pricing?.protectionPlanCost === "number" ? ctx.pricing.protectionPlanCost : 0;
      const baggageAmount =
        typeof ctx?.pricing?.baggageCost === "number" ? ctx.pricing.baggageCost : 0;

      // If the gateway charged a slightly different amount, show the delta as "Other fees"
      const rawDelta =
        totalPaid - (Number(baseFareAtCheckout || 0) + protectionPlanAmount + baggageAmount);
      const otherFees = rawDelta > 0.01 ? rawDelta : 0;
      const baseFareAdjusted =
        typeof baseFareAtCheckout === "number"
          ? Math.max(0, baseFareAtCheckout)
          : Math.max(0, totalPaid - protectionPlanAmount - baggageAmount - otherFees);

      console.log("Building email data for:", contactEmailForEmail);

      let emailData;
      if (isPackageMode) {
        const flightForEmail = ctx?.flight || storeSelectedFlight;
        if (!flightForEmail) {
          console.error("Cannot send package email - missing flight data");
          return;
        }
        emailData = transformBookingToEmailData({
          orderNumber: orderId,
          flight: flightForEmail,
          passengers: passengersForEmail,
          contactEmail: contactEmailForEmail,
          contactPhone: contactPhoneForEmail,
          totalAmount: totalPaid,
          protectionPlanAmount,
          baggageAmount,
          creditCardFeesAmount: otherFees,
          baseFareAmount: baseFareAdjusted,
          currency: currencyCode,
          cabinClass: (ctx?.selectedUpgradeOption?.cabinClassDisplay || storeSelectedUpgrade?.cabinClassDisplay || "Economy"),
        });
        emailData.bookingType = "package";

        const firstDestination = Array.isArray(ctx?.aiPackageDraft?.destinations)
          ? (ctx.aiPackageDraft.destinations as ConfirmedDestination[])[0]
          : undefined;
        const packageHotel = firstDestination?.hotel;
        if (packageHotel) {
          emailData.hotel = {
            hotelName: packageHotel.name || "Hotel",
            address: packageHotel.distanceLabel || "",
            checkIn: firstDestination?.checkIn || "",
            checkOut: firstDestination?.checkOut || "",
            nights: calculateNights(firstDestination?.checkIn || "", firstDestination?.checkOut || "") || 1,
            rooms: Number(packageHotel.price?.rooms || 1),
            roomType: packageHotel.room?.name || "Selected room",
            amenities: packageHotel.amenities || [],
          };
        }
      } else if (isHotelMode) {
        const hotelSummary = ctx?.hotelSummary || storeSelectedHotel;
        const roomSummaryForEmail = ctx?.hotelRoomSummary || storeRoomSummary;
        const hotelDetails =
          ctx?.hotelDetailsSnapshot ||
          (hotelSummary?.hotelId ? storeHotelDetailsCache[hotelSummary.hotelId] : null);

        emailData = transformHotelBookingToEmailData({
          orderNumber: orderId,
          hotel: {
            hotelName: hotelSummary?.hotelName || hotelDetails?.hotelName || 'Hotel',
            address: hotelDetails?.address || '',
            checkIn: ctx?.checkIn || storeHotelSearch?.checkIn || '',
            checkOut: ctx?.checkOut || storeHotelSearch?.checkOut || '',
            nights: ctx?.nights || (storeHotelSearch?.checkIn && storeHotelSearch?.checkOut ? calculateNights(storeHotelSearch.checkIn, storeHotelSearch.checkOut) : 1),
            rooms: ctx?.rooms || storeHotelSearch?.rooms || 1,
            amenities: hotelDetails?.amenities || [],
          },
          roomSummary: roomSummaryForEmail,
          passengers: passengersForEmail,
          contactEmail: contactEmailForEmail,
          contactPhone: contactPhoneForEmail,
          totalAmount: totalPaid,
          protectionPlanAmount,
          currency: currencyCode,
        });
      } else {
        const flightForEmail = ctx?.flight || storeSelectedFlight;

        if (!flightForEmail) {
          console.error("Cannot send flight email - missing flight data");
          return;
        }

        emailData = transformBookingToEmailData({
          orderNumber: orderId,
          flight: flightForEmail,
          passengers: passengersForEmail,
          contactEmail: contactEmailForEmail,
          contactPhone: contactPhoneForEmail,
          totalAmount: totalPaid,
          protectionPlanAmount,
          baggageAmount,
          creditCardFeesAmount: otherFees,
          baseFareAmount: baseFareAdjusted,
          currency: currencyCode,
          cabinClass: (ctx?.selectedUpgradeOption?.cabinClassDisplay || storeSelectedUpgrade?.cabinClassDisplay || "Economy"),
        });
      }

      if (isPackageMode && Array.isArray(ctx?.aiPackageDraft?.destinations)) {
        const emailDestinations = ctx.aiPackageDraft.destinations as ConfirmedDestination[];
        emailData.activities = emailDestinations.flatMap((destination) =>
          (Array.isArray(destination.activities) ? destination.activities : []).map((activity) => ({
            productCode: String(activity?.productCode || ''),
            title: String(activity?.title || 'Activity'),
            destination: String(destination?.name || ''),
            date: String(activity?.itineraryDate || ''),
            time: String(activity?.itineraryTime || ''),
            duration: String(activity?.duration || ''),
            price: typeof activity?.price === 'number' ? activity.price : undefined,
            currency: String(activity?.currency || currencyCode),
          }))
        );
      }

      const result = await sendBookingConfirmationEmail(contactEmailForEmail, emailData);

      if (result.success) {
        setEmailSent(true);
        sessionStorage.setItem(emailSentKey, "true");
        console.log("Confirmation email sent successfully to:", contactEmailForEmail);
      } else {
        sessionStorage.removeItem(emailSentKey);
        setEmailError(result.error || "Failed to send confirmation email");
        console.error("Failed to send confirmation email:", result.error);
      }
    } catch (error) {
      sessionStorage.removeItem(emailSentKey);
      setEmailError(error instanceof Error ? error.message : "Failed to send confirmation email");
      console.error('Error sending confirmation email:', error);
    }
  }, [emailSent, isHotelMode, isPackageMode, bookingContext, loadBookingContext, storeSelectedFlight, storePassengers, effectiveContactEmail, storeContactPhone, storeSelectedUpgrade, storeSelectedHotel, storeRoomSummary, storeHotelDetailsCache, storeHotelSearch]);

  // Send confirmation email when payment is successful and data is available
  useEffect(() => {
    const hasData = (bookingContext?.flight || storeSelectedFlight) || (bookingContext?.hotelRoomSummary || storeRoomSummary);
    if (paymentInfo?.status === "success" && hasData && (bookingContext?.contactEmail || effectiveContactEmail) && !emailSent) {
      const emailAlreadySent = sessionStorage.getItem(`emailSent_${paymentInfo.orderId}`);
      if (!emailAlreadySent) {
        console.log('Triggering confirmation email:', {
          orderId: paymentInfo.orderId,
          email: bookingContext?.contactEmail || effectiveContactEmail,
          hasData: true
        });
        sendConfirmationEmailAsync(paymentInfo.orderId, paymentInfo.amount, paymentInfo.currency);
      }
    }
  }, [paymentInfo, bookingContext, storeSelectedFlight, storeRoomSummary, effectiveContactEmail, emailSent, sendConfirmationEmailAsync]);

  // Prevent browser back once payment is confirmed (avoids duplicate/looping payment state)
  useEffect(() => {
    if (paymentInfo?.status !== "success") return;
    const preventBack = () => {
      try {
        window.history.pushState(null, "", window.location.href);
      } catch {
        // ignore
      }
    };
    preventBack();
    const onPopState = () => preventBack();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [paymentInfo?.status]);

  const ctx = bookingContext;
  const refNumber =
    paymentInfo?.orderId || ctx?.vyspaFolderNumber || vyspaFolderNumber || orderId || "—";

  const isSuccess = paymentInfo?.status === "success";
  const isFailed = paymentInfo?.status === "failed";
  const isPending = paymentInfo?.status === "pending";
  const isCancelled = paymentInfo?.status === "cancelled";

  const displayEmail = (ctx?.contactEmail || effectiveContactEmail) || "—";
  const displayPhone =
    (ctx?.contactPhone || storeContactPhone || passengers?.[0]?.phone) || "—";
  const displayPassengers = (ctx?.passengers || passengers) || [];
  const confirmationDestinations = isPackageMode && Array.isArray(ctx?.aiPackageDraft?.destinations)
    ? ctx.aiPackageDraft.destinations as ConfirmedDestination[]
    : [];
  const confirmationActivities = confirmationDestinations.length > 0
    ? confirmationDestinations.flatMap((destination) =>
        (Array.isArray(destination.activities) ? destination.activities : []).map((activity) => ({
          ...activity,
          destination: destination?.name || '',
        }))
      )
    : [];
  const confirmationFlightSegments = flight
    ? flight.tripType === "multi-city" && flight.segments?.length
      ? flight.segments
      : [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])]
    : [];
  const packageTotals = isPackageMode ? ctx?.aiPackageDraft?.totals : null;
  const chargedCurrency = paymentInfo?.currency || ctx?.pricing?.currency || (typeof window !== 'undefined' ? sessionStorage.getItem("pendingOrderCurrency") : null) || "GBP";
  const chargedAmount = (() => {
    const a = paymentInfo?.amount || (typeof window !== 'undefined' ? sessionStorage.getItem("pendingOrderAmount") : null) || (ctx?.pricing?.tripTotal != null ? String(ctx.pricing.tripTotal) : "0");
    const n = parseFloat(a || "0");
    return Number.isFinite(n) ? n : 0;
  })();
  const fareAtCheckout = typeof ctx?.pricing?.baseFare === "number" ? ctx.pricing.baseFare : null;
  const selectedProtectionPlan = ctx?.addOns?.protectionPlan || storeAddOns?.protectionPlan;
  const protectionPlanPaid = typeof ctx?.pricing?.protectionPlanCost === "number"
    ? ctx.pricing.protectionPlanCost
    : selectedProtectionPlan
      ? Math.max(0, chargedAmount - (fareAtCheckout || 0))
      : 0;
  const showHotelRefundableGuidance = (isHotelMode || isPackageMode) && protectionPlanPaid > 0.005;
  const hotelSearchForDisplay = ctx?.hotelSearch || storeHotelSearch;
  const termsText = isHotelMode
    ? "I acknowledge that guest information matches the passport or official ID for travel, and that name changes are not allowed. I confirm that I have reviewed the hotel details and agree to the Refund & Cancellation Policy. I understand bookings are non-transferable and non-changeable unless stated otherwise. I accept full responsibility for valid travel documentation and understand Globehunters cannot be held responsible for denied boarding due to passport or visa validity."
    : "I acknowledge that passenger information matches the passport or official ID for travel, and that name changes are not allowed. I confirm that I have reviewed the flight itinerary and agree to the Refund & Cancellation Policy. I understand tickets are non-transferable and non-changeable unless stated otherwise. I accept full responsibility for valid travel documentation and understand Globehunters cannot be held responsible for denied boarding due to passport or visa validity.";

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {showConfetti && <ConfettiExplosion />}

      <Navbar />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {isPackageMode && (
          <div className="mb-6">
            <PackageStepProgress currentStep="confirmation" />
          </div>
        )}
        {/* Loading State */}
        {inquiryLoading && !paymentInfo && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin mb-4" />
            <p className="text-lg text-[#3A478A]">
              Checking payment status...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !paymentInfo && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#010D50] mb-2">
              Something went wrong
            </h1>
            <p className="text-[#3A478A] mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
              <Button
                onClick={handleNewSearch}
                className="gap-2 bg-[#3754ED] hover:bg-[#2942D1]"
              >
                Start New Search
              </Button>
            </div>
          </div>
        )}

        {/* Success State - New Figma Design */}
        {paymentInfo && isSuccess && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8 text-center">
              {/* Success icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-[#10B981] rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>

              <h1 className="text-2xl font-bold text-[#010D50] mb-2">
                Booking Confirmed
              </h1>
              <div className="text-lg font-semibold text-[#3754ED] mb-6">
                Booking Reference: {refNumber}
              </div>
              <p className="text-[#6B7280] mb-6">
                {emailSent ? (
                  <>Confirmation email sent to <span className="font-semibold text-[#010D50]">{displayEmail}</span>.</>
                ) : (
                  <>We&apos;ll email your confirmation to <span className="font-semibold text-[#010D50]">{displayEmail}</span> shortly.</>
                )}{" "}
                Thank you for choosing Globehunters.
              </p>

              {emailError && (
                <div className="mt-2 text-sm text-red-600">
                  Email error: {emailError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleDownloadReceipt}
                  className="bg-[#3754ED] hover:bg-[#2942D1] text-white px-6"
                >
                  Download receipt
                </Button>
              </div>
            </div>

            {/* Booking / Traveller / Payment info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#3754ED]" />
                  </div>
                  <h3 className="font-semibold text-[#3754ED]">Traveller Information</h3>
                </div>
                <div className="space-y-2 text-sm text-[#4B5563]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#6B7280]">Booking reference</span>
                    <span className="font-semibold text-[#010D50]">{refNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#6B7280]">Email</span>
                    <span className="font-semibold text-[#010D50]">{displayEmail}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#6B7280]">Telephone</span>
                    <span className="font-semibold text-[#010D50]">{displayPhone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-[#3754ED]" />
                  </div>
                  <h3 className="font-semibold text-[#3754ED]">Payment Details</h3>
                </div>
                <div className="space-y-2 text-sm text-[#4B5563]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#6B7280]">Amount charged</span>
                    <span className="font-semibold text-[#010D50]">
                      {formatPrice(chargedAmount, chargedCurrency)}
                    </span>
                  </div>
                  {fareAtCheckout != null && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#6B7280]">Fare at checkout</span>
                      <span className="font-semibold text-[#010D50]">
                        {formatPrice(fareAtCheckout, chargedCurrency)}
                      </span>
                    </div>
                  )}
                  {!!paymentInfo?.transactionId && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#6B7280]">Transaction ID</span>
                      <span className="font-semibold text-[#010D50]">{paymentInfo.transactionId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {packageTotals && (
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                <h3 className="font-semibold text-[#3754ED] mb-4">Package price breakdown</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#6B7280]">Total flight price</span>
                    <span className="font-semibold text-[#010D50]">{formatPrice(Number(packageTotals.flight || 0), chargedCurrency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#6B7280]">Total stay price</span>
                    <span className="font-semibold text-[#010D50]">{formatPrice(Number(packageTotals.hotel || 0), chargedCurrency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#6B7280]">Total itinerary price</span>
                    <span className="font-semibold text-[#010D50]">{formatPrice(Number(packageTotals.activities || 0), chargedCurrency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] pt-3">
                    <span className="font-semibold text-[#010D50]">Trip total</span>
                    <span className="font-bold text-[#010D50]">{formatPrice(Number(packageTotals.package || chargedAmount), chargedCurrency)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Passenger details */}
            {displayPassengers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#3754ED]" />
                  </div>
                  <h3 className="font-semibold text-[#3754ED]">Passenger Details</h3>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                  {displayPassengers.map((p: any, idx: number) => (
                    <div key={`${p?.firstName || "p"}-${idx}`} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="font-semibold text-[#010D50]">
                        {[p?.title, p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ") || `Passenger ${idx + 1}`}
                      </div>
                      <div className="text-sm text-[#6B7280]">
                        {p?.dateOfBirth ? `DOB: ${p.dateOfBirth}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Package: hotel summary (best-effort from store/cache) */}
            {(isPackageMode || isHotelMode) && (
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 flex flex-col gap-4">
                <h3 className="font-semibold text-[#3754ED]">Hotel Details</h3>
                <HotelSummaryCard
                  hotelSearch={ctx?.hotelSearch}
                  selectedHotel={ctx?.hotelSummary}
                  selectedRoomIds={ctx?.selectedHotelRoomIds}
                  roomSummary={ctx?.hotelRoomSummary}
                  detailsCache={hotelDetailsCacheForDisplay}
                  isPackageMode={isPackageMode}
                />

                {/* Stay Details - hotel mode only */}
                {isHotelMode && hotelConfirmDisplay && (
                  <div className="border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-4">
                    <span className="text-sm font-semibold text-[#010D50]">Stay Details</span>

                    <div className="flex gap-3">
                      <div className="flex-1 bg-[#F5F7FF] border border-[#E5E7EB] rounded-lg p-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-[#3A478A]" />
                          <span className="text-xs text-[#3A478A]">Check-In</span>
                        </div>
                        <span className="text-sm font-semibold text-[#010D50]">
                          {hotelSearchForDisplay?.checkIn
                            ? new Date(hotelSearchForDisplay.checkIn + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </div>
                      <div className="flex-1 bg-[#F5F7FF] border border-[#E5E7EB] rounded-lg p-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-[#3A478A]" />
                          <span className="text-xs text-[#3A478A]">Check-Out</span>
                        </div>
                        <span className="text-sm font-semibold text-[#010D50]">
                          {hotelSearchForDisplay?.checkOut
                            ? new Date(hotelSearchForDisplay.checkOut + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Moon className="w-3.5 h-3.5 text-[#3A478A]" />
                      <span className="text-xs text-[#3A478A]">Total length of stay:</span>
                      <span className="text-sm font-semibold text-[#010D50]">{hotelConfirmDisplay.nightsCount} Night{hotelConfirmDisplay.nightsCount !== 1 ? "s" : ""}</span>
                    </div>

                    <div className="border-t border-[#E5E7EB]" />

                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#3A478A]">You selected</span>
                      <span className="text-sm font-semibold text-[#010D50]">
                        {hotelConfirmDisplay.rooms} room{hotelConfirmDisplay.rooms !== 1 ? "s" : ""} for {hotelConfirmDisplay.adults + hotelConfirmDisplay.children} {hotelConfirmDisplay.adults + hotelConfirmDisplay.children === 1 ? "guest" : "guests"}
                      </span>
                    </div>

                    {hotelConfirmDisplay.roomNames.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {hotelConfirmDisplay.roomNames.map((name, i) => (
                          <span key={i} className="text-xs text-[#3A478A]">{name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cancellation Policy - hotel mode only */}
                {isHotelMode && hotelConfirmDisplay?.cancellationText && (
                  <div className="border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-sm font-semibold text-[#010D50]">Cancellation Policy</span>
                    <p className="text-xs text-[#3A478A] whitespace-pre-line">
                      {hotelConfirmDisplay.cancellationText}
                    </p>
                  </div>
                )}
              </div>
            )}

            {confirmationActivities.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                <h3 className="font-semibold text-[#3754ED] mb-4">Activities</h3>
                <div className="divide-y divide-[#E5E7EB]">
                  {confirmationActivities.map((activity, index) => (
                    <div key={`${activity.productCode || 'activity'}-${index}`} className="py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#010D50]">{activity.title || 'Activity'}</div>
                        <div className="text-sm text-[#6B7280] mt-1">
                          {[activity.destination, activity.itineraryDate, activity.itineraryTime, activity.duration].filter(Boolean).join(' | ')}
                        </div>
                        <div className="text-xs text-[#6B7280] mt-1">Viator product: {activity.productCode}</div>
                      </div>
                      {typeof activity.price === 'number' && (
                        <div className="font-semibold text-[#010D50] whitespace-nowrap">
                          {formatPrice(activity.price, activity.currency || chargedCurrency)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flight Cards */}
            {flight && confirmationFlightSegments.length > 0 && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {confirmationFlightSegments.map((segment: FlightSegment, index: number) => (
                  <FlightConfirmationCard
                    key={`${segment.departureAirport?.code}-${segment.arrivalAirport?.code}-${segment.date}-${index}`}
                    title={confirmationFlightSegments.length > 2 ? `Flight ${index + 1}` : index === 0 ? "Departing Flight" : "Returning Flight"}
                    date={segment.date}
                    passengerCount={passengers.length || 2}
                    cabinClass={segment.cabinClass || "Economy"}
                    airlineName={flight.airline.name}
                    airlineCode={flight.airline.code}
                    flightNumber={segment.flightNumber || ""}
                    distance={String(segment.distance || "")}
                    aircraftType={segment.aircraftType || ""}
                    segment={segment}
                    fullFlight={flight}
                    priceCheck={storePriceCheckData}
                    selectedUpgradeOption={storeSelectedUpgrade}
                    onViewDetails={() => { }}
                  />
                ))}
              </div>
            )}


            {/* Important Information Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Documents Section */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#3754ED]" />
                  </div>
                  <h3 className="font-semibold text-[#3754ED]">Documents</h3>
                </div>
                <div className="space-y-3 text-sm text-[#4B5563]">
                  <p>
                    Once your payment is approved, you will receive a separate email with your attached receipt and e-tickets.
                  </p>
                  <p>
                    Please don&apos;t forget to check your junk/spam folder or email us back on{' '}
                    <a href="mailto:documents@globehunters.com" className="text-[#3754ED] hover:underline font-medium">
                      documents@globehunters.com
                    </a>
                  </p>
                  <p>
                    Alternatively, you may contact us at{' '}
                    <a href={`tel:${affiliatePhone}`} className="text-[#3754ED] hover:underline font-semibold">
                      {affiliatePhone}
                    </a>
                  </p>
                </div>
              </div>

              {/* Terms and Conditions Section */}
              <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-[#3754ED]" />
                  </div>
                  <h3 className="font-semibold text-[#3754ED]">Terms and Conditions</h3>
                </div>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  {termsText} At the time of booking you confirmed that you have read and agreed to our General Terms and Conditions of Carriage. Please{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#3754ED] hover:underline font-medium">
                    Click Here
                  </a>{" "}
                  to review these again if necessary.
                </p>
              </div>

              {showHotelRefundableGuidance && (
                <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-[#3754ED]" />
                    </div>
                    <h3 className="font-semibold text-[#3754ED]">Refund Shield</h3>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    You selected Refund Shield and may be eligible to apply for a refund if you cannot attend your booking due to any reason listed in the{" "}
                    <a
                      href={REFUNDABLE_TERMS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3754ED] hover:underline font-medium"
                    >
                      Refundable Terms
                    </a>
                    .{" "}
                    <a
                      href={REFUNDABLE_CLAIMS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3754ED] hover:underline font-medium"
                    >
                      Click here to make a refund request
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>

            {/* Footer disclaimer */}
            <div className="text-center">
              <p className="text-xs text-[#6B7280]">
                *Flight schedule and aircraft type are subject to change per the
                Contract of Carriage.{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#3754ED] hover:underline">More</a>
              </p>
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 text-center">
              <h3 className="font-semibold text-[#010D50] mb-2">Need Help?</h3>
              <p className="text-[#6B7280] mb-4">
                Our customer support team is here to assist you 24/7
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#3754ED]" />
                  <a
                    href={`tel:${affiliatePhone}`}
                    className="text-lg font-bold text-[#3754ED] hover:underline"
                  >
                    {affiliatePhone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#3754ED]" />
                  <a
                    href="mailto:documents@globehunters.com"
                    className="text-[#3754ED] hover:underline font-medium"
                  >
                    documents@globehunters.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Failed/Pending/Cancelled States */}
        {paymentInfo && !isSuccess && (
          <div className="space-y-6">
            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div
                className={`p-8 text-center ${isFailed
                  ? "bg-gradient-to-br from-red-500 to-rose-600"
                  : isCancelled
                    ? "bg-gradient-to-br from-gray-500 to-slate-600"
                    : "bg-gradient-to-br from-amber-500 to-orange-600"
                  }`}
              >
                <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center bg-white/20">
                  {isFailed && <XCircle className="w-14 h-14 text-white" />}
                  {isPending && <Clock className="w-14 h-14 text-white" />}
                  {isCancelled && <XCircle className="w-14 h-14 text-white" />}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {isFailed && "Payment Failed"}
                  {isPending && "Payment Processing"}
                  {isCancelled && "Payment Cancelled"}
                </h1>
                <p className="text-white/90 text-lg">
                  {isFailed && "Your payment could not be processed"}
                  {isPending && "Your payment is being processed"}
                  {isCancelled && "Your payment was cancelled"}
                </p>
              </div>

              {/* Booking Reference */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-[#3A478A] mb-1">
                      Booking Reference
                    </p>
                    <p className="text-2xl font-bold text-[#010D50] tracking-wider">
                      {refNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Failed Notice */}
              {isFailed && (
                <div className="p-6 bg-red-50">
                  <h4 className="font-semibold text-red-800 mb-2">
                    What happened?
                  </h4>
                  <p className="text-sm text-red-700 mb-4">
                    {paymentInfo.message ||
                      "Your payment could not be processed. This could be due to insufficient funds, card restrictions, or a technical issue."}
                  </p>
                  <p className="text-sm text-red-700">
                    Please try again or contact us at{" "}
                    <strong>{affiliatePhone}</strong> for assistance.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isFailed && (
                <>
                  <Button
                    onClick={() =>
                      router.push(
                        `/payment${
                          isPackageMode ? "?type=package" : isHotelMode ? "?type=hotel" : ""
                        }`
                      )
                    }
                    className="gap-2 bg-[#3754ED] hover:bg-[#2942D1]"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGoHome}
                    className="gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </>
              )}
              {(isPending || isCancelled) && (
                <>
                  <Button
                    onClick={handleNewSearch}
                    className="gap-2 bg-[#3754ED] hover:bg-[#2942D1]"
                  >
                    Start New Search
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGoHome}
                    className="gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </>
              )}
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <h3 className="font-semibold text-[#010D50] mb-2">Need Help?</h3>
              <p className="text-[#3A478A] mb-4">
                Our customer support team is here to assist you 24/7
              </p>
              <div className="flex items-center justify-center gap-2">
                <Phone className="w-5 h-5 text-[#3754ED]" />
                <a
                  href={`tel:${affiliatePhone}`}
                  className="text-lg font-bold text-[#3754ED] hover:underline"
                >
                  {affiliatePhone}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
          <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin" />
        </div>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  );
}
