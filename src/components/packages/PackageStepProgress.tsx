"use client";

import { ChevronRight } from "lucide-react";

export type PackageStep = "stay" | "flight" | "review" | "payment" | "confirmation";

const STEPS: { key: PackageStep; label: string }[] = [
  { key: "stay", label: "Choose your stay" },
  { key: "flight", label: "Choose your flight" },
  { key: "review", label: "Review your package" },
  { key: "payment", label: "Payment Details" },
  { key: "confirmation", label: "Confirmation" },
];

interface PackageStepProgressProps {
  currentStep: PackageStep;
}

export function PackageStepProgress({ currentStep }: PackageStepProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {/* Step indicator circle */}
            <div className="flex items-center gap-2">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2",
                  isActive
                    ? "border-[#3754ED] bg-[#3754ED] text-white"
                    : isCompleted
                    ? "border-[#008234] bg-[#008234] text-white"
                    : "border-[#DFE0E4] bg-white text-[#3A478A]",
                ].join(" ")}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={[
                  "hidden sm:inline",
                  isActive ? "text-[#010D50] font-medium" : "text-[#3A478A]",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>

            {/* Chevron separator (except for last item) */}
            {index < STEPS.length - 1 && (
              <ChevronRight className="h-5 w-5 text-[#DFE0E4]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
