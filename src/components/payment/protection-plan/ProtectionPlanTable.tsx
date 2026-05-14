"use client";

import { Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

type PlanKey = "basic" | "premium" | "all";

interface ProtectionPlanTableProps {
  features: string[];
  basicPrice: string;
  premiumPrice: string;
  allPrice: string;
  basicLabel: string;
  premiumLabel: string;
  allLabel: string;
  selectedPlan?: PlanKey;
  onSelectPlan: (plan: PlanKey) => void;
}

function FeatureIcon({ included }: { included: boolean }) {
  return included ? (
    <Check className="w-4 h-4 text-[#008234]" />
  ) : (
    <X className="w-4 h-4 text-[#9CA3AF]" />
  );
}

function PlanSelect({
  plan,
  label,
  isSelected,
  onSelect,
}: {
  plan: PlanKey;
  label: string;
  isSelected: boolean;
  onSelect: (plan: PlanKey) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(plan)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(plan);
        }
      }}
      className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
    >
      <Checkbox checked={isSelected} />
      <span className="text-xs font-medium text-[#010D50]">{label}</span>
    </div>
  );
}

export function ProtectionPlanTable({
  features,
  basicPrice,
  premiumPrice,
  allPrice,
  basicLabel,
  premiumLabel,
  allLabel,
  selectedPlan,
  onSelectPlan,
}: ProtectionPlanTableProps) {
  const t = useTranslations('payment.iAssure');

  const plans = [
    {
      key: "basic" as PlanKey,
      price: basicPrice,
      label: basicLabel,
      featureKeys: [
        'features.support247Full',
        'features.rebookRename',
        'features.refundDeathFull',
        'features.refundAirlineFull',
      ],
    },
    {
      key: "premium" as PlanKey,
      price: premiumPrice,
      label: premiumLabel,
      featureKeys: [
        'features.support247Full',
        'features.rebookRename',
        'features.refundDeathFull',
        'features.freeChangesAnytime',
        'features.refundAirlineFull',
        'features.refundLockdownFull',
        'features.baggageCompensationFull',
        'features.flightDelay',
      ],
    },
    {
      key: "all" as PlanKey,
      price: allPrice,
      label: allLabel,
      featureKeys: [
        'features.support247Full',
        'features.rebookRename',
        'features.refundDeathFull',
        'features.freeChangesAnytime',
        'features.refundAirlineFull',
        'features.refundLockdownFull',
        'features.baggageCompensationFull',
        'features.flightDelay',
        'features.priceMatch',
        'features.futureCredit',
      ],
    },
  ];

  const planFeatureSets = plans.map((plan) => new Set(plan.featureKeys.map((k) => t(k))));

  return (
    <div className="hidden lg:flex flex-col gap-1">
      <div className="flex items-center justify-between bg-[#F5F7FF] rounded-lg p-3">
        <span className="w-[524px] text-sm font-medium text-[#010D50] opacity-0">
          Price
        </span>
        <div className="flex items-center gap-0">
          {plans.map((plan) => (
            <div key={plan.key} className="w-[109px] text-center py-0.5">
              <span className="text-sm font-medium text-[#010D50]">
                {plan.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {features.map((feature, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 border-b border-[#F5F7FF]"
        >
          <span className="w-[524px] text-sm font-medium text-[#010D50]">
            {feature}
          </span>
          <div className="flex items-center gap-0">
            {planFeatureSets.map((featureSet, j) => (
              <div key={plans[j].key} className="w-[109px] flex items-center justify-center">
                <FeatureIcon included={featureSet.has(feature)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between p-3">
        <span className="w-[524px] opacity-0">Select</span>
        <div className="flex items-center gap-0">
          {plans.map((plan) => (
            <PlanSelect
              key={plan.key}
              plan={plan.key}
              label={plan.label}
              isSelected={selectedPlan === plan.key}
              onSelect={onSelectPlan}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
