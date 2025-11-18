"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/currency";
import { ProtectionPlanCard } from "./protection-plan/ProtectionPlanCard";
import { ProtectionPlanTable } from "./protection-plan/ProtectionPlanTable";

interface ProtectionPlanSectionProps {
  selectedPlan?: "basic" | "premium" | "all";
  onSelectPlan: (plan: "basic" | "premium" | "all" | undefined) => void;
  planPrices: {
    basic: number;
    premium: number;
    all: number;
  };
  currency: string;
}

export function ProtectionPlanSection({
  selectedPlan,
  onSelectPlan,
  planPrices,
  currency,
}: ProtectionPlanSectionProps) {
  const t = useTranslations('payment.iAssure');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTogglePlan = (plan: "basic" | "premium" | "all") => {
    if (selectedPlan === plan) {
      onSelectPlan(undefined);
    } else {
      onSelectPlan(plan);
    }
  };

  const basicFeatures = [
    t('features.support247'),
    t('features.freeChanges24h'),
    t('features.refundDeath'),
    t('features.refundAirline'),
  ];

  const premiumFeatures = [
    t('features.allBasic'),
    t('features.freeChangesAnytime'),
    t('features.refundLockdown'),
    t('features.baggageCompensation'),
    t('features.flightDelay'),
  ];

  const allFeatures = [
    t('features.allPremium'),
    t('features.priceMatch'),
    t('features.futureCredit'),
    t('features.priorityService'),
  ];

  const desktopFeatures = [
    t('features.support247Full'),
    t('features.rebookRename'),
    t('features.refundDeathFull'),
    t('features.freeChangesAnytime'),
    t('features.refundAirlineFull'),
    t('features.refundLockdownFull'),
    t('features.baggageCompensationFull'),
    t('features.flightDelay'),
    t('features.priceMatch'),
    t('features.futureCredit'),
  ];

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
        className={`lg:hidden flex flex-col gap-3 ${
          isExpanded ? "flex" : "hidden"
        }`}
      >
        <ProtectionPlanCard
          planType="basic"
          title={t('basic')}
          price={formatPrice(planPrices.basic, currency)}
          features={basicFeatures}
          isSelected={selectedPlan === "basic"}
          onSelect={() => handleTogglePlan("basic")}
        />
        <ProtectionPlanCard
          planType="premium"
          title={t('premium')}
          price={formatPrice(planPrices.premium, currency)}
          features={premiumFeatures}
          isSelected={selectedPlan === "premium"}
          onSelect={() => handleTogglePlan("premium")}
        />
        <ProtectionPlanCard
          planType="all"
          title={t('allIncluded')}
          price={formatPrice(planPrices.all, currency)}
          features={allFeatures}
          isSelected={selectedPlan === "all"}
          onSelect={() => handleTogglePlan("all")}
        />
      </div>

      {/* Desktop: Table layout */}
      <ProtectionPlanTable
        features={desktopFeatures}
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
