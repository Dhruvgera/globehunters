"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBookingStore } from "@/store/bookingStore";

interface TermsAndConditionsProps {
  onUpgradeClick: () => void;
  hasUpgradeOptions?: boolean;
}

export function TermsAndConditions({
  onUpgradeClick,
  hasUpgradeOptions = false,
}: TermsAndConditionsProps) {
  const t = useTranslations('booking.terms');
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passengers = useBookingStore((s) => s.passengers);
  const searchParams = useBookingStore((s) => s.searchParams);
  const selectedFlight = useBookingStore((s) => s.selectedFlight);
  const selectedUpgradeOption = useBookingStore((s) => s.selectedUpgradeOption);
  const priceCheckData = useBookingStore((s) => s.priceCheckData);
  const setVyspaFolderInfo = useBookingStore((s) => s.setVyspaFolderInfo);
  const passengersSaved = useBookingStore((s) => s.passengersSaved);

  const canProceedToPayment = (): boolean => {
    const counts = searchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    const required = (counts.adults || 0) + (counts.children || 0) + (counts.infants || 0);
    if (passengers.length < required) return false;
    // Validate minimal required fields for each passenger
    for (let i = 0; i < required; i++) {
      const p = passengers[i];
      if (!p) return false;
      if (!p.firstName || !p.lastName || !p.dateOfBirth || !p.email || !p.phone) {
        return false;
      }
    }
    return true;
  };

  const handleProceed = async () => {
    if (!termsAccepted) return;
    if (!passengersSaved || !canProceedToPayment()) {
      alert('Please complete all passenger details before proceeding to payment.');
      return;
    }

    if (!selectedFlight) {
      router.push("/payment");
      return;
    }

    try {
      setIsSubmitting(true);

      const currency = selectedUpgradeOption?.currency || selectedFlight.currency;
      const pswResultId =
        priceCheckData?.sessionInfo.pswResultId ||
        selectedFlight.segmentResultId ||
        '';
      const destinationAirportCode =
        priceCheckData?.flightDetails.destination ||
        selectedFlight.outbound.arrivalAirport.code;
      const departureDate = selectedFlight.outbound.date;
      const fareSelectedPrice = selectedUpgradeOption ? selectedUpgradeOption.totalPrice : selectedFlight.price;

      // Build flight segments array for Portal API
      const flightSegments = [];
      const allSegments = selectedFlight.segments || [selectedFlight.outbound, selectedFlight.inbound].filter(Boolean);

      for (const segment of allSegments) {
        if (!segment) continue;

        // If we have individual flights (legs), add each one
        if (segment.individualFlights && segment.individualFlights.length > 0) {
          for (const leg of segment.individualFlights) {
            flightSegments.push({
              type: 'AIR',
              airlineCode: leg.carrierCode || segment.carrierCode || selectedFlight.airline.code || '',
              flightNumber: leg.flightNumber || segment.flightNumber || '',
              departureAirport: leg.departureAirport || segment.departureAirport?.code || '',
              arrivalAirport: leg.arrivalAirport || segment.arrivalAirport?.code || '',
              departureDate: leg.departureDate || segment.date || '',
              arrivalDate: leg.arrivalDate || segment.arrivalDate || segment.date || '',
              departureTime: leg.departureTime || segment.departureTime || '',
              arrivalTime: leg.arrivalTime || segment.arrivalTime || '',
              duration: leg.duration || '',
              cabinClass: segment.cabinClass || '',
            });
          }
        } else {
          // Single segment without individual legs
          flightSegments.push({
            type: 'AIR',
            airlineCode: segment.carrierCode || selectedFlight.airline.code || '',
            flightNumber: segment.flightNumber || '',
            departureAirport: segment.departureAirport?.code || '',
            arrivalAirport: segment.arrivalAirport?.code || '',
            departureDate: segment.date || '',
            arrivalDate: segment.arrivalDate || segment.date || '',
            departureTime: segment.departureTime || '',
            arrivalTime: segment.arrivalTime || '',
            duration: segment.duration || '',
            cabinClass: segment.cabinClass || '',
          });
        }
      }

      // Extract markup_id and other booking info from price check data
      // Get the raw price check response to extract markup_id
      const rawPriceCheck = priceCheckData?.rawResponse?.priceCheck;
      let markupIds = '';
      let moduleId = '';
      let baggageInfo = '';
      let refundableInfo = '';
      let cabinClassCode = 'Y';  // Default to Economy
      let selectedBrandName = '';

      // If we have a selected upgrade option, try to find its data in price_data
      if (rawPriceCheck?.price_data) {
        const priceDataArray = Array.isArray(rawPriceCheck.price_data)
          ? rawPriceCheck.price_data
          : Object.values(rawPriceCheck.price_data);

        // Find the matching price option by comparing brand name or price
        const matchingOption: any = selectedUpgradeOption
          ? priceDataArray.find((pd: any) => {
            const brandName = pd.Total_Fare?.Name || pd.BrandInfo?.[0]?.BrandName || '';
            const total = parseFloat(pd.Total_Fare?.total || '0');
            return (
              brandName === selectedUpgradeOption.cabinClassDisplay ||
              Math.abs(total - selectedUpgradeOption.totalPrice) < 0.01
            );
          })
          : priceDataArray[0]; // Use first option if no upgrade selected

        if (matchingOption) {
          // Extract markup_id from pricingArr - format: "markup_id1|markup_id2" for multiple segments
          const pricingArr = matchingOption.pricingArr || [];
          const markupIdList = pricingArr
            .map((p: any) => p.markup_id || '')
            .filter((id: any) => id !== '' && id !== 0 && id !== '0');
          if (markupIdList.length > 0) {
            markupIds = markupIdList.join('|');
          }

          // Extract cabin class code (e.g., 'T', 'O', 'V', 'H', 'Z')
          cabinClassCode = pricingArr[0]?.BookingCode || matchingOption.BrandInfo?.[0]?.BookingCode || 'Y';

          // Extract brand name
          selectedBrandName = matchingOption.Total_Fare?.Name || matchingOption.BrandInfo?.[0]?.BrandName || '';

          // Extract baggage info
          const baggageTxt = matchingOption.baggageTxt;
          if (baggageTxt && typeof baggageTxt === 'object') {
            const baggageEntries = Object.entries(baggageTxt).map(([route, data]: [string, any]) => {
              return `${route}: ${data?.ADT || 'N/A'}`;
            });
            baggageInfo = baggageEntries.join(', ');
          }

          // Extract refundable info
          const refundableCode = matchingOption.Total_Fare?.refundable;
          const refundableText = matchingOption.Total_Fare?.refundable_text;
          if (refundableText) {
            refundableInfo = refundableText;
          } else if (refundableCode) {
            refundableInfo = `Refundable Code: ${refundableCode}`;
          }
        }
      }

      // Get module_id from the flight result
      if (rawPriceCheck?.flight_data?.result?.FlightPswResult) {
        moduleId = String(rawPriceCheck.flight_data.result.FlightPswResult.module_id || '');
      }

      const response = await fetch('/api/vyspa/init-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passengers: passengers.map((p) => ({
            title: p.title,
            firstName: p.firstName,
            middleName: p.middleName || '',
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth,
            email: p.email,
            phone: p.phone,
            countryCode: p.countryCode || '+44',
            type: p.type,
          })),
          currency,
          pswResultId,
          destinationAirportCode,
          departureDate,
          fareSelectedPrice,
          flightSegments,
          originAirportCode: selectedFlight.outbound.departureAirport?.code || '',
          airlineCode: selectedFlight.airline.code || '',
          airlineName: selectedFlight.airline.name || '',
          // New fields for Portal API
          markupIds,                   // For rate_note field in TKT segment
          moduleId,                    // For comments
          cabinClassCode,             // For cc_class_code in segments
          affiliateCode: useBookingStore.getState().affiliateData?.code || '',
          selectedBrandName,          // Brand name (e.g., "ECONOMY LIGHT")
          baggageInfo,                // For comments
          refundableInfo,             // For comments (cancellation policy)
          baseFare: selectedUpgradeOption?.baseFare || priceCheckData?.priceOptions?.[0]?.baseFare || 0,
          taxes: selectedUpgradeOption?.taxes || priceCheckData?.priceOptions?.[0]?.taxes || 0,
        }),
      });

      const data: any = await response.json().catch(() => null);

      if (data && data.folderNumber) {
        setVyspaFolderInfo({
          folderNumber: String(data.folderNumber),
          customerId: data.customerId ?? null,
          emailAddress: data.emailAddress ?? null,
        });
      }

      if (!response.ok) {
        alert('We were unable to fully set up your booking folder. You can still proceed to payment; please keep your reference number handy.');
      }
    } catch (error) {
      alert('We were unable to set up your booking folder. You can still proceed to payment; please keep your reference number handy.');
    } finally {
      setIsSubmitting(false);
      router.push("/payment");
    }
  };

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
          className="mt-1"
        />
        <p className="text-xs leading-relaxed text-[#010D50]">
          {t('acceptTerms')}
        </p>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={marketingConsent}
          onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
          className="mt-1"
        />
        <p className="text-xs leading-relaxed text-[#010D50]">
          {t('acceptMarketing')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {hasUpgradeOptions && (
          <Button
            onClick={onUpgradeClick}
            variant="outline"
            className="border-[#3754ED] text-[#3754ED] rounded-full px-5 py-2 h-auto text-sm font-bold hover:bg-[#F5F7FF]"
          >
            {t('upgradeOptions')}
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </Button>
        )}
        <Button
          onClick={handleProceed}
          disabled={!termsAccepted || !passengersSaved || !canProceedToPayment() || isSubmitting}
          className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('book')}
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </Button>
      </div>
    </div>
  );
}
