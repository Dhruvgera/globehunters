"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAffiliate } from '@/lib/AffiliateContext';
import { useBookingStore } from '@/store/bookingStore';
import { normalizeCabinClass } from '@/lib/utils';
import { Plane, Loader2 } from 'lucide-react';
import Navbar from '@/components/navigation/Navbar';

function FlightSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAffiliateCode } = useAffiliate();
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const setSearchParams = useBookingStore((state) => state.setSearchParams);
  const setAffiliateData = useBookingStore((state) => state.setAffiliateData);
  const setIsFromDeeplink = useBookingStore((state) => state.setIsFromDeeplink);
  const setSearchRequestId = useBookingStore((state) => state.setSearchRequestId);
  
  const [loadingMessage, setLoadingMessage] = useState('Redirecting to flight search...');
  const [isDeeplinkFlow, setIsDeeplinkFlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      // Handle affiliate code storage before redirect
      const affCode = searchParams.get('aff');
      if (affCode) {
        setAffiliateCode(affCode);
        console.log('Affiliate code stored during redirect:', affCode);
      }

      // Check if this is a deeplink with flight parameter (Skyscanner meta channel)
      const flightKey = searchParams.get('flight');
      
      if (flightKey) {
        // This is a deeplink with a pre-selected flight - redirect to booking
        setIsDeeplinkFlow(true);
        setLoadingMessage('Loading your selected flight...');
        
        // Mark this as a deeplink flow
        setIsFromDeeplink(true);

        // Extract tracking data
        const utmSource = searchParams.get('utm_source');
        const utmMedium = searchParams.get('utm_medium');
        const utmCampaign = searchParams.get('utm_campaign');
        const cnc = searchParams.get('cnc');

        // Store affiliate/tracking data
        const affiliateCode = affCode || utmSource;
        if (affiliateCode) {
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
            setSelectedFlight(flightWithKey, normalizeCabinClass(data.flight.outbound?.cabinClass));
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
          return;
        } catch (err) {
          console.error('FlightSearch deeplink processing error:', err);
          setError('An error occurred while loading your flight');
          setTimeout(() => router.push('/search?error=flight_unavailable'), 2000);
          return;
        }
      }

      // Check if this is a deeplink with guid parameter (Jetcost or similar)
      const guid = searchParams.get('guid');

      if (guid) {
        // For now, redirect to search with preserved params (guid handling can be added later)
        console.log('Deeplink with guid detected:', guid);
        setLoadingMessage('Loading flight details...');
      }

      // Map external URL format to internal format
      // External: origins, destinations, adt, chd, inf, flx
      // Internal: from, to, adults, children, infants, departureDate, returnDate
      
      const params = new URLSearchParams();

      // Map origin/destination
      const origins = searchParams.get('origins');
      const destinations = searchParams.get('destinations');
      
      if (origins) params.append('from', origins);
      if (destinations) params.append('to', destinations);

      // Map dates - convert from DD/MM/YYYY to YYYY-MM-DD
      const fr = searchParams.get('fr');
      const to = searchParams.get('to');
      
      if (fr) {
        const departureDate = convertDateFormat(fr);
        if (departureDate) params.append('departureDate', departureDate);
      }
      
      // Only add return date for round trips
      const ow = searchParams.get('ow');
      if (to && ow !== '1') {
        const returnDate = convertDateFormat(to);
        if (returnDate) params.append('returnDate', returnDate);
      }

      // Map passengers
      const adults = searchParams.get('adt') || '1';
      const children = searchParams.get('chd') || '0';
      const infants = searchParams.get('inf') || '0';
      
      params.append('adults', adults);
      params.append('children', children);
      params.append('infants', infants);

      // Map cabin class (0=Economy, 1=Premium, 2=Business, 3=First in external)
      // Our internal: Economy, Premium Economy, Business, First
      const cl = searchParams.get('cl') || '0';
      const classMap: Record<string, string> = {
        '0': 'Economy',
        '1': 'Economy', // cl=1 in external is Economy
        '2': 'Premium Economy',
        '3': 'Business',
        '4': 'First',
      };
      params.append('class', classMap[cl] || 'Economy');

      // Map trip type
      const tripType = ow === '1' ? 'one-way' : 'round-trip';
      params.append('tripType', tripType);

      // Preserve affiliate code in URL
      if (affCode) {
        params.append('aff', affCode);
      }

      // Log the parameter mapping for debugging
      console.log('External URL parameters mapped:', {
        'origins → from': `${origins} → ${params.get('from')}`,
        'destinations → to': `${destinations} → ${params.get('to')}`,
        'fr → departureDate': `${fr} → ${params.get('departureDate')}`,
        'to → returnDate': `${to} → ${params.get('returnDate')}`,
        'adt → adults': `${adults} → ${params.get('adults')}`,
        'chd → children': `${children} → ${params.get('children')}`,
        'inf → infants': `${infants} → ${params.get('infants')}`,
        'cl → class': `${cl} → ${params.get('class')}`,
        'ow → tripType': `${ow} → ${tripType}`,
        'aff': affCode,
      });

      // Redirect to the search page with mapped parameters
      const redirectUrl = `/search?${params.toString()}`;
      console.log('Redirecting FlightSearch.htm to:', redirectUrl);
      
      // Use replace instead of push to avoid adding to browser history
      router.replace(redirectUrl);
    };

    handleRedirect();
  }, [searchParams, router, setAffiliateCode, setSelectedFlight, setSearchParams, setAffiliateData, setIsFromDeeplink, setSearchRequestId]);

  // Show enhanced loading UI for deeplink flow
  if (isDeeplinkFlow) {
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
                  {loadingMessage}
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-lg font-medium text-center px-4">
          {loadingMessage}
        </p>
      </div>
    </div>
  );
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD format
 */
function convertDateFormat(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // If already in YYYY-MM-DD format, return as-is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  return null;
}

export default function FlightSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <FlightSearchContent />
    </Suspense>
  );
}
