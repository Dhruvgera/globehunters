"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBookingStore } from "@/store/bookingStore";
import { SearchParams } from "@/types/flight";

interface BookingHeaderProps {
  currentStep?: number;
}

interface AffiliateData {
  code: string;
  id?: number;
  name?: string;
  phone?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  cnc?: string;
}

/**
 * Build search URL with preserved search params and UTM tracking
 */
function buildSearchUrl(
  searchParams: SearchParams | null,
  affiliateData: AffiliateData | null
): string {
  const params = new URLSearchParams();

  if (searchParams) {
    // Add flight search params
    params.set("from", searchParams.from);
    params.set("to", searchParams.to);
    
    // Format date as YYYY-MM-DD
    const formatDate = (date: Date | string) => {
      const d = date instanceof Date ? date : new Date(date);
      return d.toISOString().split("T")[0];
    };
    
    params.set("departureDate", formatDate(searchParams.departureDate));
    
    if (searchParams.returnDate) {
      params.set("returnDate", formatDate(searchParams.returnDate));
    }
    
    params.set("adults", String(searchParams.passengers.adults));
    params.set("children", String(searchParams.passengers.children));
    params.set("infants", String(searchParams.passengers.infants));
    params.set("class", searchParams.class);
    params.set("tripType", searchParams.tripType);

    // Handle multi-city segments
    if (searchParams.tripType === "multi-city" && searchParams.segments) {
      searchParams.segments.forEach((segment, index) => {
        const segNum = index + 1;
        params.set(`from${segNum}`, segment.from);
        params.set(`to${segNum}`, segment.to);
        params.set(`departureDate${segNum}`, formatDate(segment.departureDate));
      });
    }
  }

  // Add UTM tracking params for affiliate persistence
  if (affiliateData) {
    if (affiliateData.utmSource) {
      params.set("utm_source", affiliateData.utmSource);
    }
    if (affiliateData.utmMedium) {
      params.set("utm_medium", affiliateData.utmMedium);
    }
    if (affiliateData.utmCampaign) {
      params.set("utm_campaign", affiliateData.utmCampaign);
    }
    // Also include aff code for the search page to pick up
    if (affiliateData.code) {
      params.set("aff", affiliateData.code);
    }
  }

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

export function BookingHeader({ currentStep = 1 }: BookingHeaderProps) {
  const t = useTranslations('booking.header');
  const searchParams = useBookingStore((state) => state.searchParams);
  const affiliateData = useBookingStore((state) => state.affiliateData);
  const isFromDeeplink = useBookingStore((state) => state.isFromDeeplink);
  
  // Build the back URL - always include search params so user can continue searching
  const backUrl = useMemo(() => {
    // If we have search params (from deeplink or regular flow), use them
    if (searchParams) {
      return buildSearchUrl(searchParams, affiliateData);
    }
    // Fallback to plain search
    return "/search";
  }, [searchParams, affiliateData]);

  const steps = [
    { number: 1, label: t('step1') },
    { number: 2, label: t('step2') },
    { number: 3, label: t('step3') },
    { number: 4, label: t('step4') },
  ];

  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Back Button */}
      <Link
        href={backUrl}
        className="flex items-center gap-2 text-sm font-medium text-[#010D50] hover:text-[#3754ED] transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('backToSearch')}
      </Link>

      {/* Progress Steps */}
      <div className="lg:bg-white lg:border lg:border-[#DFE0E4] lg:rounded-xl lg:p-4 flex items-center justify-between lg:shadow-sm gap-2 lg:gap-0">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center gap-1.5 lg:gap-2">
            <div
              className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center ${
                step.number === currentStep
                  ? "border-2 border-[#010D50]"
                  : "border border-[#010D50]"
              }`}
            >
              <span className="text-[10px] lg:text-xs font-medium text-[#010D50]">
                {step.number}
              </span>
            </div>
            <span className="hidden lg:inline text-xs lg:text-sm font-medium text-[#010D50]">
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
