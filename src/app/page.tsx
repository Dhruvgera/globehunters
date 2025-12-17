"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import SearchBar from "@/components/search/SearchBar";
import { Plane, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBookingStore } from "@/store/bookingStore";
import { useAffiliate } from "@/lib/AffiliateContext";

function HomeContent() {
  const t = useTranslations('home');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAffiliateCode } = useAffiliate();
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const setSearchParams = useBookingStore((state) => state.setSearchParams);
  const setAffiliateData = useBookingStore((state) => state.setAffiliateData);
  const setIsFromDeeplink = useBookingStore((state) => state.setIsFromDeeplink);
  const setSearchRequestId = useBookingStore((state) => state.setSearchRequestId);

  const [isLoadingDeeplink, setIsLoadingDeeplink] = useState(false);

  // Check for deeplink params and handle meta channel URLs (Skyscanner)
  useEffect(() => {
    const key = searchParams.get("key");
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const cnc = searchParams.get("cnc");

    // If no key, this is not a deeplink - show normal home page
    if (!key) return;

    // Handle deeplink flow
    async function processDeeplink() {
      setIsLoadingDeeplink(true);

      // Mark this as a deeplink flow
      setIsFromDeeplink(true);

      // Store affiliate/tracking data with full UTM params
      if (utmSource) {
        setAffiliateCode(utmSource);
        setAffiliateData({
          code: utmSource,
          utmSource: utmSource,
          utmMedium: utmMedium || undefined,
          utmCampaign: utmCampaign || undefined,
          cnc: cnc || undefined,
        });

        // Store in sessionStorage for persistence across page loads
        if (typeof window !== "undefined") {
          sessionStorage.setItem("utm_source", utmSource);
          if (utmMedium) sessionStorage.setItem("utm_medium", utmMedium);
          if (utmCampaign) sessionStorage.setItem("utm_campaign", utmCampaign);
          if (cnc) sessionStorage.setItem("cnc", cnc);
        }
      }

      try {
        // Call FlightView API to get flight details
        const response = await fetch("/api/flight-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error("FlightView API error:", data);
          // On error, redirect to search with error message
          router.push("/search?error=flight_unavailable");
          return;
        }

        // Store flight and search params in booking store
        if (data.flight) {
          // Store the flight key for later use
          const flightWithKey = {
            ...data.flight,
            flightKey: key,
          };
          setSelectedFlight(flightWithKey, data.flight.outbound?.cabinClass || "Economy");
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
        router.push("/booking");
      } catch (error) {
        console.error("Deeplink processing error:", error);
        router.push("/search?error=flight_unavailable");
      }
    }

    processDeeplink();
  }, [searchParams, router, setAffiliateCode, setSelectedFlight, setSearchParams, setAffiliateData, setIsFromDeeplink, setSearchRequestId]);

  // Show loading state when processing deeplink
  if (isLoadingDeeplink) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
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
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <Plane className="w-10 h-10 sm:w-12 sm:h-12 text-[#3754ED]" />
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#010D50]">
              {t('hero.title')}
            </h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-[#3A478A] max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-10 sm:mb-16">
          <SearchBar />
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-12 lg:mt-20">
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('features.bestPrice.title')}</h3>
            <p className="text-[#3A478A]">
              {t('features.bestPrice.description')}
            </p>
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('features.secureBooking.title')}</h3>
            <p className="text-[#3A478A]">
              {t('features.secureBooking.description')}
            </p>
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('features.support.title')}</h3>
            <p className="text-[#3A478A]">
              {t('features.support.description')}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
