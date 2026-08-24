"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";

export type PackageStep = "stay" | "flight" | "review" | "details" | "payment" | "confirmation";

const STEPS: { key: PackageStep; label: string }[] = [
  { key: "stay", label: "Choose your stay" },
  { key: "flight", label: "Choose your flight" },
  { key: "review", label: "Review your package" },
  { key: "details", label: "Passenger Details" },
  { key: "payment", label: "Payment Details" },
  { key: "confirmation", label: "Confirmation" },
];

interface PackageStepProgressProps {
  currentStep: PackageStep;
  labelOverrides?: Partial<Record<PackageStep, string>>;
  stepLinks?: Partial<Record<PackageStep, string>>;
}

const DEFAULT_STEP_PATHS: Record<PackageStep, string> = {
  stay: "/hotels",
  flight: "/search",
  review: "/packages/review",
  details: "/packages/checkout",
  payment: "/payment",
  confirmation: "/payment-complete",
};

export function PackageStepProgress({ currentStep, labelOverrides, stepLinks }: PackageStepProgressProps) {
  const searchParams = useSearchParams();
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const defaultStepLinks = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("type")) {
      params.set("type", "package");
    }
    const query = params.toString();
    return Object.fromEntries(
      Object.entries(DEFAULT_STEP_PATHS).map(([step, path]) => [step, `${path}?${query}`])
    ) as Record<PackageStep, string>;
  }, [searchParams]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-sm sm:gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const href = stepLinks?.[step.key] || defaultStepLinks[step.key];
          const isNavigable = Boolean(href) && (isCompleted || isActive);
          const content = (
            <div className="flex items-center gap-1.5">
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
                  "whitespace-nowrap text-xs",
                  isActive ? "inline text-[#010D50] font-medium" : "hidden sm:inline text-[#3A478A]",
                  isNavigable ? "underline-offset-2" : "",
                ].join(" ")}
              >
                {labelOverrides?.[step.key] || step.label}
              </span>
            </div>
          );

          return (
            <div key={step.key} className="flex flex-shrink-0 items-center gap-1.5">
              {isNavigable && href ? (
                <Link
                  href={href}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3754ED]"
                >
                  {content}
                </Link>
              ) : (
                content
              )}

              {index < STEPS.length - 1 && (
                <ChevronRight className="hidden h-4 w-4 text-[#DFE0E4] sm:block" />
              )}
            </div>
          );
        })}
      </div>

      <div className="sm:hidden text-xs font-medium text-[#3A478A]">
        Step {currentIndex + 1} of {STEPS.length}
      </div>
    </div>
  );
}
