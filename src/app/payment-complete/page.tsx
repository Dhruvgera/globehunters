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
} from "lucide-react";

// Confetti particle component
function ConfettiParticle({ delay, color, left }: { delay: number; color: string; left: number }) {
  return (
    <div
      className="confetti-particle"
      style={{
        '--delay': `${delay}s`,
        '--color': color,
        '--left': `${left}%`,
      } as React.CSSProperties}
    />
  );
}

// Confetti explosion component
function ConfettiExplosion() {
  const colors = [
    '#3754ED', // Primary blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#FFD700', // Gold
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

// Status badge component
function StatusBadge({ status }: { status: PaymentCompletionInfo['status'] }) {
  const config = {
    success: {
      icon: CheckCircle2,
      text: 'Payment Successful',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-500',
    },
    failed: {
      icon: XCircle,
      text: 'Payment Failed',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500',
    },
    pending: {
      icon: Clock,
      text: 'Payment Pending',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-500',
    },
    cancelled: {
      icon: XCircle,
      text: 'Payment Cancelled',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-500',
    },
    unknown: {
      icon: AlertCircle,
      text: 'Status Unknown',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-500',
    },
  };

  const { icon: Icon, text, bgColor, textColor, borderColor, iconColor } = config[status];

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${bgColor} ${borderColor}`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <span className={`font-semibold ${textColor}`}>{text}</span>
    </div>
  );
}

function PaymentCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inquirePayment, loading: inquiryLoading } = useBoxPay();
  const { phoneNumber: affiliatePhone } = useAffiliatePhone();
  
  const [paymentInfo, setPaymentInfo] = useState<PaymentCompletionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Get flight and booking info from store
  const flight = useSelectedFlight();
  const vyspaFolderNumber = useBookingStore((state) => state.vyspaFolderNumber);
  const priceCheckData = useBookingStore((state) => state.priceCheckData);
  const passengers = useBookingStore((state) => state.passengers);
  const contactEmail = useBookingStore((state) => state.contactEmail);
  const contactPhone = useBookingStore((state) => state.contactPhone);
  const resetBooking = useBookingStore((state) => state.resetBooking);

  // Get orderId and redirectionResult from URL
  const orderId = searchParams?.get('orderId') || '';
  const redirectionResult = searchParams?.get('redirectionResult') || '';

  // Inquire payment status on mount
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // If we have a redirectionResult token, use it to check status
      if (redirectionResult) {
        const result = await inquirePayment(redirectionResult);
        
        if (result.success && result.payment) {
          setPaymentInfo(result.payment);
          
          // Show confetti on success
          if (result.payment.status === 'success') {
            setShowConfetti(true);
            // Mark as completed to prevent double charging
            sessionStorage.setItem('paymentCompletedOrderId', result.payment.orderId);
            // Clear pending order info
            sessionStorage.removeItem('pendingOrderId');
            sessionStorage.removeItem('pendingOrderAmount');
            sessionStorage.removeItem('pendingOrderCurrency');
          }
        } else {
          setError(result.error || 'Failed to get payment status');
        }
      } else {
        // If no redirectionResult, check for stored order info
        const pendingOrderId = sessionStorage.getItem('pendingOrderId');
        const completedOrderId = sessionStorage.getItem('paymentCompletedOrderId');
        
        if (completedOrderId) {
          // Show success state for already completed orders
          setPaymentInfo({
            status: 'success',
            orderId: completedOrderId,
          });
          setShowConfetti(true);
        } else if (pendingOrderId) {
          // If we have a pending order but no redirect result, show pending status
          setPaymentInfo({
            status: 'pending',
            orderId: pendingOrderId,
            message: 'Waiting for payment confirmation...',
          });
        } else if (orderId) {
          // Use the orderId from URL params
          setPaymentInfo({
            status: 'pending',
            orderId: orderId,
            message: 'Checking payment status...',
          });
        } else {
          setError('No payment information found');
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
    // Optionally reset booking state
    // resetBooking();
    router.push('/');
  }, [router]);

  const handleNewSearch = useCallback(() => {
    resetBooking();
    router.push('/search');
  }, [router, resetBooking]);

  // Flight summary data
  const refNumber = paymentInfo?.orderId || vyspaFolderNumber || orderId || '—';
  const journeySegments = flight?.segments && flight.segments.length > 0
    ? flight.segments
    : flight?.outbound 
      ? [flight.outbound, ...(flight.inbound ? [flight.inbound] : [])]
      : [];

  const isSuccess = paymentInfo?.status === 'success';
  const isFailed = paymentInfo?.status === 'failed';
  const isPending = paymentInfo?.status === 'pending';
  const isCancelled = paymentInfo?.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {showConfetti && <ConfettiExplosion />}
      
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Loading State */}
        {inquiryLoading && !paymentInfo && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin mb-4" />
            <p className="text-lg text-[#3A478A]">Checking payment status...</p>
          </div>
        )}

        {/* Error State */}
        {error && !paymentInfo && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#010D50] mb-2">Something went wrong</h1>
            <p className="text-[#3A478A] mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleGoHome} variant="outline" className="gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
              <Button onClick={handleNewSearch} className="gap-2 bg-[#3754ED] hover:bg-[#2942D1]">
                Start New Search
              </Button>
            </div>
          </div>
        )}

        {/* Success State */}
        {paymentInfo && (
          <div className="space-y-6">
            {/* Main Success Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Success Header */}
              <div className={`p-8 text-center ${
                isSuccess 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                  : isFailed 
                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                    : isCancelled
                      ? 'bg-gradient-to-br from-gray-500 to-slate-600'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600'
              }`}>
                <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  isSuccess 
                    ? 'bg-white/20' 
                    : 'bg-white/20'
                }`}>
                  {isSuccess && <CheckCircle2 className="w-14 h-14 text-white" />}
                  {isFailed && <XCircle className="w-14 h-14 text-white" />}
                  {isPending && <Clock className="w-14 h-14 text-white" />}
                  {isCancelled && <XCircle className="w-14 h-14 text-white" />}
                  {!isSuccess && !isFailed && !isPending && !isCancelled && (
                    <AlertCircle className="w-14 h-14 text-white" />
                  )}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {isSuccess && 'Booking Confirmed!'}
                  {isFailed && 'Payment Failed'}
                  {isPending && 'Payment Processing'}
                  {isCancelled && 'Payment Cancelled'}
                  {!isSuccess && !isFailed && !isPending && !isCancelled && 'Payment Status Unknown'}
                </h1>
                <p className="text-white/90 text-lg">
                  {isSuccess && 'Thank you for booking with GlobeHunters'}
                  {isFailed && 'Your payment could not be processed'}
                  {isPending && 'Your payment is being processed'}
                  {isCancelled && 'Your payment was cancelled'}
                </p>
              </div>

              {/* Booking Reference */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-[#3A478A] mb-1">Booking Reference</p>
                    <p className="text-2xl font-bold text-[#010D50] tracking-wider">{refNumber}</p>
                  </div>
                  <StatusBadge status={paymentInfo.status} />
                </div>
              </div>

              {/* Payment Details */}
              {(paymentInfo.amount || paymentInfo.transactionId) && (
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#010D50] mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#3754ED]" />
                    Payment Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paymentInfo.amount && (
                      <div>
                        <p className="text-sm text-[#3A478A]">Amount Paid</p>
                        <p className="font-semibold text-[#010D50]">
                          {paymentInfo.currency === 'GBP' ? '£' : paymentInfo.currency} {paymentInfo.amount}
                        </p>
                      </div>
                    )}
                    {paymentInfo.transactionId && (
                      <div>
                        <p className="text-sm text-[#3A478A]">Transaction ID</p>
                        <p className="font-mono text-sm text-[#010D50]">{paymentInfo.transactionId}</p>
                      </div>
                    )}
                    {paymentInfo.paymentMethod && (
                      <div>
                        <p className="text-sm text-[#3A478A]">Payment Method</p>
                        <p className="font-semibold text-[#010D50]">
                          {paymentInfo.paymentMethod.brand || paymentInfo.paymentMethod.type}
                        </p>
                      </div>
                    )}
                    {paymentInfo.timestamp && (
                      <div>
                        <p className="text-sm text-[#3A478A]">Date & Time</p>
                        <p className="font-semibold text-[#010D50]">
                          {new Date(paymentInfo.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Flight Summary */}
              {flight && journeySegments.length > 0 && (
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#010D50] mb-4 flex items-center gap-2">
                    <Plane className="w-5 h-5 text-[#3754ED]" />
                    Flight Details
                  </h3>
                  <div className="space-y-4">
                    {journeySegments.map((segment, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-[#010D50]">
                              {segment.departureAirport?.city || 'Origin'} ({segment.departureAirport?.code})
                            </span>
                            <Plane className="w-4 h-4 text-[#3754ED]" />
                            <span className="font-bold text-[#010D50]">
                              {segment.arrivalAirport?.city || 'Destination'} ({segment.arrivalAirport?.code})
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#3A478A]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {segment.date}
                            </span>
                            <span>
                              {segment.departureTime} - {segment.arrivalTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passenger Info */}
              {passengers.length > 0 && (
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#010D50] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#3754ED]" />
                    Passengers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {passengers.map((passenger, index) => (
                      <div key={index} className="px-3 py-2 bg-slate-50 rounded-lg">
                        <span className="text-[#010D50]">
                          {passenger.title} {passenger.firstName} {passenger.lastName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {(contactEmail || contactPhone) && (
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-[#010D50] mb-4">Contact Information</h3>
                  <div className="flex flex-wrap gap-6">
                    {contactEmail && (
                      <div className="flex items-center gap-2 text-[#3A478A]">
                        <Mail className="w-4 h-4" />
                        <span>{contactEmail}</span>
                      </div>
                    )}
                    {contactPhone && (
                      <div className="flex items-center gap-2 text-[#3A478A]">
                        <Phone className="w-4 h-4" />
                        <span>{contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Important Notice */}
              {isSuccess && (
                <div className="p-6 bg-blue-50">
                  <h4 className="font-semibold text-[#010D50] mb-2">What's Next?</h4>
                  <ul className="text-sm text-[#3A478A] space-y-2">
                    <li>• A confirmation email has been sent to your email address</li>
                    <li>• Please save your booking reference: <strong>{refNumber}</strong></li>
                    <li>• E-tickets will be emailed within 24 hours</li>
                    <li>• For any queries, call us at <strong>{affiliatePhone}</strong></li>
                  </ul>
                </div>
              )}

              {/* Failed Notice */}
              {isFailed && (
                <div className="p-6 bg-red-50">
                  <h4 className="font-semibold text-red-800 mb-2">What happened?</h4>
                  <p className="text-sm text-red-700 mb-4">
                    {paymentInfo.message || 'Your payment could not be processed. This could be due to insufficient funds, card restrictions, or a technical issue.'}
                  </p>
                  <p className="text-sm text-red-700">
                    Please try again or contact us at <strong>{affiliatePhone}</strong> for assistance.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isSuccess && (
                <>
                  <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                    <Download className="w-4 h-4" />
                    Download Confirmation
                  </Button>
                  <Button onClick={handleGoHome} className="gap-2 bg-[#3754ED] hover:bg-[#2942D1]">
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </>
              )}
              {isFailed && (
                <>
                  <Button onClick={() => router.push('/payment')} className="gap-2 bg-[#3754ED] hover:bg-[#2942D1]">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={handleGoHome} className="gap-2">
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </>
              )}
              {(isPending || isCancelled) && (
                <>
                  <Button onClick={handleNewSearch} className="gap-2 bg-[#3754ED] hover:bg-[#2942D1]">
                    Start New Search
                  </Button>
                  <Button variant="outline" onClick={handleGoHome} className="gap-2">
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
                <a href={`tel:${affiliatePhone}`} className="text-lg font-bold text-[#3754ED] hover:underline">
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin" />
      </div>
    }>
      <PaymentCompleteContent />
    </Suspense>
  );
}

