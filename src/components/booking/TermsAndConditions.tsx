"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface TermsAndConditionsProps {
  onUpgradeClick: () => void;
}

export function TermsAndConditions({
  onUpgradeClick,
}: TermsAndConditionsProps) {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
          className="mt-1"
        />
        <p className="text-xs leading-relaxed text-[#010D50]">
          By clicking this checkbox, I acknowledge that I have read and accepted
          Globehunters Terms & Conditions and Privacy Policy
        </p>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={marketingConsent}
          onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
          className="mt-1"
        />
        <p className="text-xs leading-relaxed text-[#010D50]">
          By clicking this checkbox, I consent to receive marketing messages via
          calls, texts, and emails from Globehunters at the provided contact. I
          understand that my consent is not a condition of purchase.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={onUpgradeClick}
          variant="outline"
          className="border-[#3754ED] text-[#3754ED] rounded-full px-5 py-2 h-auto text-sm font-bold hover:bg-[#F5F7FF]"
        >
          Upgrade options
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </Button>
        <Button
          onClick={() => router.push("/payment")}
          disabled={!termsAccepted}
          className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Book
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </Button>
      </div>
    </div>
  );
}
