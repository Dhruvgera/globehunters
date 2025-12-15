"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { Button } from "@/components/ui/button";
import { useBookingStore, useSelectedFlight } from "@/store/bookingStore";
import { useBoxPay } from "@/hooks/useBoxPay";
import { PaymentCompletionInfo } from "@/types/boxpay";
import { useAffiliatePhone } from "@/lib/AffiliateContext";
import {
  mockBookingConfirmation,
  airportNames,
} from "@/data/mockBookingConfirmation";
import { transformBookingToEmailData, sendBookingConfirmationEmail } from "@/lib/emailHelper";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plane,
  Calendar,
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

// Check if mock mode is enabled
const isMockMode = process.env.NEXT_PUBLIC_MOCK_BOOKING_CONFIRMATION === "true";

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
                {departureCity} ({departureCode})
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
                {arrivalCity} ({arrivalCode})
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
  const airportInfo = airportNames[airportCode] || {
    city: airportCode,
    name: airportCode,
  };
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm text-[#6B7280]">
        Stopover at {airportInfo.city} ({airportCode}) for
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
  segment: any;
  onViewDetails: () => void;
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
  onViewDetails,
}: FlightCardConfirmationProps) {
  const [showDetails, setShowDetails] = useState(true); // Show details by default per Figma
  const [imgError, setImgError] = useState(false);

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
                  departureCity={
                    airportNames[individualFlights[0].departureAirport]?.city ||
                    individualFlights[0].departureAirport
                  }
                  departureTime={individualFlights[0].departureTime}
                  departureTerminal={segment.departureTerminal}
                  departureDate={segment.date}
                  arrivalCode={individualFlights[0].arrivalAirport}
                  arrivalCity={
                    airportNames[individualFlights[0].arrivalAirport]?.city ||
                    individualFlights[0].arrivalAirport
                  }
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
                    departureCity={
                      airportNames[individualFlights[1].departureAirport]?.city ||
                      individualFlights[1].departureAirport
                    }
                    departureTime={individualFlights[1].departureTime}
                    departureTerminal={segment.departureTerminal}
                    departureDate={segment.date}
                    arrivalCode={individualFlights[1].arrivalAirport}
                    arrivalCity={
                      airportNames[individualFlights[1].arrivalAirport]?.city ||
                      individualFlights[1].arrivalAirport
                    }
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
                  ? segment.departureAirport.name 
                  : segment.departureAirport.city}
                departureTime={segment.departureTime}
                departureTerminal={segment.departureTerminal}
                departureDate={segment.date}
                arrivalCode={segment.arrivalAirport.code}
                arrivalCity={segment.arrivalAirport.name && segment.arrivalAirport.name !== segment.arrivalAirport.code 
                  ? segment.arrivalAirport.name 
                  : segment.arrivalAirport.city}
                arrivalTime={segment.arrivalTime}
                arrivalTerminal={segment.arrivalTerminal}
                arrivalDate={segment.arrivalDate || segment.date}
                travelTime={segment.duration}
                flightNumber={1}
                totalFlights={1}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inquirePayment, loading: inquiryLoading } = useBoxPay();
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();

  const [paymentInfo, setPaymentInfo] = useState<PaymentCompletionInfo | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Get flight and booking info from store (or mock data)
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
  const resetBooking = useBookingStore((state) => state.resetBooking);
  const [emailSent, setEmailSent] = useState(false);
  
  // Get email from store or vyspa - use vyspaEmailAddress as fallback
  const effectiveContactEmail = storeContactEmail || storeVyspaEmailAddress;

  // Use mock data if enabled, otherwise use store data
  const flight = isMockMode ? mockBookingConfirmation.flight : storeSelectedFlight;
  const passengers = isMockMode
    ? mockBookingConfirmation.passengers
    : storePassengers;
  const vyspaFolderNumber = isMockMode
    ? mockBookingConfirmation.vyspaFolderNumber
    : storeVyspaFolderNumber;
  const contactEmail = isMockMode
    ? mockBookingConfirmation.contactEmail
    : storeContactEmail;
  const contactPhone = isMockMode
    ? mockBookingConfirmation.contactPhone
    : storeContactPhone;

  // Get orderId and redirectionResult from URL
  const orderId = searchParams?.get("orderId") || "";
  const redirectionResult = searchParams?.get("redirectionResult") || "";

  // Inquire payment status on mount
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // If mock mode, use mock payment info
      if (isMockMode) {
        setPaymentInfo({
          status: mockBookingConfirmation.paymentInfo.status,
          orderId: mockBookingConfirmation.paymentInfo.orderId,
          amount: mockBookingConfirmation.paymentInfo.amount.toString(),
          currency: mockBookingConfirmation.paymentInfo.currency,
          transactionId: mockBookingConfirmation.paymentInfo.transactionId,
          timestamp: mockBookingConfirmation.paymentInfo.timestamp,
        });
        setShowConfetti(true);
        return;
      }

      // If we have a redirectionResult token, use it to check status
      if (redirectionResult) {
        const result = await inquirePayment(redirectionResult);

        if (result.success && result.payment) {
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
            
            // Email sending is handled by separate useEffect to ensure data is available
          }
        } else {
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
  }, [redirectionResult, orderId, inquirePayment]);

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
    if (emailSent) return;
    
    try {
      const totalAmount = parseFloat(amount || sessionStorage.getItem("pendingOrderAmount") || "0");
      const currencyCode = currency || sessionStorage.getItem("pendingOrderCurrency") || "GBP";
      
      // Get add-on amounts from store
      const protectionPlanAmount = storeAddOns?.protectionPlan ? totalAmount * 0.05 : 0; // Approximate
      const baggageAmount = (storeAddOns?.additionalBaggage || 0) * 45; // Approximate per bag
      
      if (storeSelectedFlight && effectiveContactEmail) {
        console.log('Building email data for:', effectiveContactEmail);
        
        const emailData = transformBookingToEmailData({
          orderNumber: orderId,
          flight: storeSelectedFlight,
          passengers: storePassengers,
          contactEmail: effectiveContactEmail,
          contactPhone: storeContactPhone || '',
          totalAmount,
          protectionPlanAmount,
          baggageAmount,
          currency: currencyCode,
          cabinClass: storeSelectedUpgrade?.cabinClassDisplay || 'Economy',
        });

        const result = await sendBookingConfirmationEmail(effectiveContactEmail, emailData);
        
        if (result.success) {
          setEmailSent(true);
          sessionStorage.setItem(`emailSent_${orderId}`, 'true');
          console.log('Confirmation email sent successfully to:', effectiveContactEmail);
        } else {
          console.error('Failed to send confirmation email:', result.error);
        }
      } else {
        console.error('Cannot send email - missing data:', { 
          hasFlightData: !!storeSelectedFlight, 
          email: effectiveContactEmail 
        });
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  }, [emailSent, storeSelectedFlight, storePassengers, effectiveContactEmail, storeContactPhone, storeSelectedUpgrade, storeAddOns]);

  // Send confirmation email when payment is successful and data is available
  useEffect(() => {
    if (paymentInfo?.status === "success" && storeSelectedFlight && effectiveContactEmail && !emailSent) {
      const emailAlreadySent = sessionStorage.getItem(`emailSent_${paymentInfo.orderId}`);
      if (!emailAlreadySent) {
        console.log('Triggering confirmation email:', { 
          orderId: paymentInfo.orderId, 
          email: effectiveContactEmail,
          hasFlightData: !!storeSelectedFlight 
        });
        sendConfirmationEmailAsync(paymentInfo.orderId, paymentInfo.amount, paymentInfo.currency);
      }
    }
  }, [paymentInfo, storeSelectedFlight, effectiveContactEmail, emailSent, sendConfirmationEmailAsync]);

  // Flight summary data
  const refNumber =
    paymentInfo?.orderId || vyspaFolderNumber || orderId || "—";

  const isSuccess = paymentInfo?.status === "success";
  const isFailed = paymentInfo?.status === "failed";
  const isPending = paymentInfo?.status === "pending";
  const isCancelled = paymentInfo?.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {showConfetti && <ConfettiExplosion />}

      <Navbar />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {inquiryLoading && !paymentInfo && !isMockMode && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin mb-4" />
            <p className="text-lg text-[#3A478A]">
              Checking payment status...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !paymentInfo && !isMockMode && (
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
        {(paymentInfo || isMockMode) && isSuccess && (
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
              <p className="text-[#6B7280] mb-6">
                We&apos;ll email your confirmation shortly. Thank you for
                choosing Globehunters
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleViewTrip}
                  className="bg-[#3754ED] hover:bg-[#2942D1] text-white px-6"
                >
                  View your trip
                </Button>
                <Button
                  onClick={handleDownloadReceipt}
                  variant="outline"
                  className="border-[#E5E7EB] text-[#010D50] px-6"
                >
                  Download receipt
                </Button>
              </div>
            </div>

            {/* Flight Cards */}
            {flight && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Departing Flight */}
                <FlightConfirmationCard
                  title="Departing Flight"
                  date={flight.outbound.date}
                  passengerCount={passengers.length || 2}
                  cabinClass={flight.outbound.cabinClass || "Economy"}
                  airlineName={flight.airline.name}
                  airlineCode={flight.airline.code}
                  flightNumber={flight.outbound.flightNumber || "AT555"}
                  distance={String(flight.outbound.distance || "3123")}
                  aircraftType={flight.outbound.aircraftType || "Airbus A330-200"}
                  segment={flight.outbound}
                  onViewDetails={() => {}}
                />

                {/* Returning Flight (if round trip) */}
                {flight.inbound && (
                  <FlightConfirmationCard
                    title="Returning Flight"
                    date={flight.inbound.date}
                    passengerCount={passengers.length || 2}
                    cabinClass={flight.inbound.cabinClass || "Economy"}
                    airlineName={flight.airline.name}
                    airlineCode={flight.airline.code}
                    flightNumber={flight.inbound.flightNumber || "AT555"}
                    distance={String(flight.inbound.distance || "3123")}
                    aircraftType={flight.inbound.aircraftType || "Airbus A330-200"}
                    segment={flight.inbound}
                    onViewDetails={() => {}}
                  />
                )}
              </div>
            )}

            {/* Footer disclaimer */}
            <div className="text-center">
              <p className="text-xs text-[#6B7280]">
                *Flight schedule and aircraft type are subject to change per the
                Contract of Carriage.{" "}
                <button className="text-[#3754ED] hover:underline">More</button>
              </p>
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 text-center">
              <h3 className="font-semibold text-[#010D50] mb-2">Need Help?</h3>
              <p className="text-[#6B7280] mb-4">
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

        {/* Failed/Pending/Cancelled States */}
        {paymentInfo && !isSuccess && (
          <div className="space-y-6">
            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div
                className={`p-8 text-center ${
                  isFailed
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
                    onClick={() => router.push("/payment")}
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
