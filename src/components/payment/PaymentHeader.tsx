"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaymentHeaderProps {
  currentStep?: number;
}

export function PaymentHeader({ currentStep = 3 }: PaymentHeaderProps) {
  const t = useTranslations('payment.header');
  
  const steps = [
    { number: 1, label: t('step1') },
    { number: 2, label: t('step2') },
    { number: 3, label: t('step3') },
    { number: 4, label: t('step4') },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Back Link */}
      <Link
        href="/booking"
        className="flex items-center gap-2 text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('backToFare')}
      </Link>

      {/* Progress Steps */}
      <div className="lg:bg-white lg:border lg:border-[#DFE0E4] lg:rounded-xl lg:p-4 flex items-center justify-between lg:shadow-sm gap-2 lg:gap-0">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center gap-1.5 lg:gap-2">
            <div
              className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center ${
                step.number < currentStep
                  ? "bg-[#010D50] border border-[#010D50]"
                  : step.number === currentStep
                  ? "border-2 border-[#010D50]"
                  : "border border-[#010D50]"
              }`}
            >
              <span
                className={`text-[10px] lg:text-xs font-medium ${
                  step.number <= currentStep ? "text-[#010D50]" : "text-[#010D50]"
                } ${step.number < currentStep ? "text-white" : ""}`}
              >
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
