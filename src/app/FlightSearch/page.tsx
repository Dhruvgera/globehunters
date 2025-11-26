"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAffiliate } from '@/lib/AffiliateContext';

function FlightSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAffiliateCode } = useAffiliate();
  const [loadingMessage, setLoadingMessage] = useState('Redirecting to flight search...');

  useEffect(() => {
    const handleRedirect = async () => {
      // Handle affiliate code storage before redirect
      const affCode = searchParams.get('aff');
      if (affCode) {
        setAffiliateCode(affCode);
        console.log('Affiliate code stored during redirect:', affCode);
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
  }, [searchParams, router, setAffiliateCode]);

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
