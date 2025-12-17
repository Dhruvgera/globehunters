"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBookingStore } from '@/store/bookingStore';
import { useAffiliate } from '@/lib/AffiliateContext';
import { Plane, Loader2 } from 'lucide-react';
import Navbar from '@/components/navigation/Navbar';

/**
 * Checkout page handler for legacy Globehunters deeplinks
 * 
 * Handles URLs like:
 * /checkout.htm?utm_source=&aff=skyscannerapi&utm_medium=&utm_campaign=&utm_id=&cnc=1&flight=SEY4ZmowQVVSUHJtbjdNZlFMRC9jQT09
 * 
 * Extracts the flight key and uses FlightView API to get flight details,
 * then redirects to the booking page.
 */
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAffiliateCode } = useAffiliate();
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const setSearchParams = useBookingStore((state) => state.setSearchParams);
  const setAffiliateData = useBookingStore((state) => state.setAffiliateData);
  const setIsFromDeeplink = useBookingStore((state) => state.setIsFromDeeplink);
  const setSearchRequestId = useBookingStore((state) => state.setSearchRequestId);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processDeeplink = async () => {
      // Extract flight key from URL
      const flightKey = searchParams.get('flight');
      
      if (!flightKey) {
        console.error('No flight key in checkout URL');
        setError('No flight key provided');
        // Redirect to home after a short delay
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      // Extract affiliate and tracking data
      const affCode = searchParams.get('aff');
      const utmSource = searchParams.get('utm_source');
      const utmMedium = searchParams.get('utm_medium');
      const utmCampaign = searchParams.get('utm_campaign');
      const cnc = searchParams.get('cnc');

      // Mark this as a deeplink flow
      setIsFromDeeplink(true);

      // Store affiliate/tracking data
      const affiliateCode = affCode || utmSource;
      if (affiliateCode) {
        setAffiliateCode(affiliateCode);
        setAffiliateData({
          code: affiliateCode,
          utmSource: utmSource || undefined,
          utmMedium: utmMedium || undefined,
          utmCampaign: utmCampaign || undefined,
          cnc: cnc || undefined,
        });

        // Store in sessionStorage for persistence
        if (typeof window !== 'undefined') {
          if (utmSource) sessionStorage.setItem('utm_source', utmSource);
          if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium);
          if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign);
          if (cnc) sessionStorage.setItem('cnc', cnc);
        }
      }

      try {
        // Call FlightView API to get flight details
        const response = await fetch('/api/flight-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: flightKey }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error('FlightView API error:', data);
          setError(data.userMessage || 'Unable to retrieve flight details');
          // Redirect to search with error after delay
          setTimeout(() => router.push('/search?error=flight_unavailable'), 2000);
          return;
        }

        // Store flight and search params in booking store
        if (data.flight) {
          // Store the flight key for later use
          const flightWithKey = {
            ...data.flight,
            flightKey: flightKey,
          };
          setSelectedFlight(flightWithKey, data.flight.outbound?.cabinClass || 'Economy');
        }

        if (data.searchParams) {
          // Convert date strings back to Date objects
          const params = {
            ...data.searchParams,
            departureDate: new Date(data.searchParams.departureDate),
            returnDate: data.searchParams.returnDate
              ? new Date(data.searchParams.returnDate)
              : undefined,
          };
          setSearchParams(params);
        }

        // Store the request ID as web ref (from FlightView response)
        if (data.requestId) {
          setSearchRequestId(data.requestId);
        }

        // Redirect directly to booking page
        router.push('/booking');
      } catch (err) {
        console.error('Checkout deeplink processing error:', err);
        setError('An error occurred while loading your flight');
        setTimeout(() => router.push('/search?error=flight_unavailable'), 2000);
      }
    };

    processDeeplink();
  }, [searchParams, router, setAffiliateCode, setSelectedFlight, setSearchParams, setAffiliateData, setIsFromDeeplink, setSearchRequestId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          {error ? (
            <>
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#010D50] mb-3">
                Unable to Load Flight
              </h1>
              <p className="text-[#3A478A]">
                {error}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Redirecting you to search...
              </p>
            </>
          ) : (
            <>
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto bg-[rgba(55,84,237,0.1)] rounded-full flex items-center justify-center">
                  <Plane className="w-10 h-10 text-[#3754ED] animate-pulse" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-24 h-24 text-[#3754ED]/20 animate-spin" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[#010D50] mb-3">
                Loading Your Flight
              </h1>
              <p className="text-[#3A478A]">
                Please wait while we retrieve your selected flight details...
              </p>
              <div className="mt-6 flex justify-center gap-1">
                <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

