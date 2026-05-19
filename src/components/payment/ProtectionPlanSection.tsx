"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import { ProtectionPlanCard } from "./protection-plan/ProtectionPlanCard";
import { ProtectionPlanTable } from "./protection-plan/ProtectionPlanTable";
import { GetInclusions, getPlanPrices } from "./protection-plan/ProtectionPlans";

interface ProtectionPlanSectionProps {
  selectedPlan?: "basic" | "premium" | "all";
  onSelectPlan: (plan: "basic" | "premium" | "all" | undefined) => void;
  baseFare: number;
  currency: string;
}

export function ProtectionPlanSection({
  selectedPlan,
  onSelectPlan,
  baseFare,
  currency,
}: ProtectionPlanSectionProps) {
  const t = useTranslations('payment.iAssure');
  const [isExpanded, setIsExpanded] = useState(false);
  const features = GetInclusions();
  const featureMobile = GetInclusions('mobile')
  const handleTogglePlan = (plan: "basic" | "premium" | "all") => {
    if (selectedPlan === plan) {
      onSelectPlan(undefined);
    } else {
      onSelectPlan(plan);
    }
  };
  const planPrices = getPlanPrices(baseFare);
  return (
    <div className="bg-white border-2 border-[#3754ED] rounded-xl p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="bg-[#F5F7FF] rounded-full px-4 py-3 w-fit">
          <span className="text-sm font-semibold text-[#010D50]">
            {t('title')}
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden text-[#3754ED] h-auto p-2 text-sm"
        >
          {isExpanded ? t('hidePlans') : t('comparePlans')}
        </Button>
      </div>

      {/* Mobile: Card-based layout */}
      <div
        className={`lg:hidden flex flex-col gap-3 ${isExpanded ? "flex" : "hidden"
          }`}
      >
        <ProtectionPlanCard
          planType="basic"
          title={t('basic')}
          price={formatPrice(planPrices.basic, currency)}
          features={featureMobile.basic}
          isSelected={selectedPlan === "basic"}
          onSelect={() => handleTogglePlan("basic")}
        />
        <ProtectionPlanCard
          planType="premium"
          title={t('premium')}
          price={formatPrice(planPrices.premium, currency)}
          features={featureMobile.premium}
          isSelected={selectedPlan === "premium"}
          onSelect={() => handleTogglePlan("premium")}
        />
        <ProtectionPlanCard
          planType="all"
          title={t('allIncluded')}
          price={formatPrice(planPrices.all, currency)}
          features={featureMobile.allIncluded}
          isSelected={selectedPlan === "all"}
          onSelect={() => handleTogglePlan("all")}
        />
      </div>

      {/* Desktop: Table layout */}
      <ProtectionPlanTable
        basicPrice={formatPrice(planPrices.basic, currency)}
        premiumPrice={formatPrice(planPrices.premium, currency)}
        allPrice={formatPrice(planPrices.all, currency)}
        basicLabel={t('basic')}
        premiumLabel={t('premium')}
        allLabel={t('allIncluded')}
        selectedPlan={selectedPlan}
        onSelectPlan={handleTogglePlan}
      />
    </div>
  );
}
