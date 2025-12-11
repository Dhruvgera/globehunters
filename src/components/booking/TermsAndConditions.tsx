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
            type: p.type,
            address: p.address || '',
            postalCode: p.postalCode || '',
          })),
          currency,
          pswResultId,
          destinationAirportCode,
          departureDate,
          fareSelectedPrice,
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
