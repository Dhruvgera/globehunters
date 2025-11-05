"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ProtectionPlanCard } from "./protection-plan/ProtectionPlanCard";
import { ProtectionPlanTable } from "./protection-plan/ProtectionPlanTable";

interface ProtectionPlanSectionProps {
  selectedPlan: "basic" | "premium" | "all";
  onSelectPlan: (plan: "basic" | "premium" | "all") => void;
}

export function ProtectionPlanSection({
  selectedPlan,
  onSelectPlan,
}: ProtectionPlanSectionProps) {
  const t = useTranslations('payment.iAssure');
  const [isExpanded, setIsExpanded] = useState(false);

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
          price="₹8,623.68"
          features={basicFeatures}
          isSelected={selectedPlan === "basic"}
          onSelect={() => onSelectPlan("basic")}
        />
        <ProtectionPlanCard
          planType="premium"
          title={t('premium')}
          price="₹10,779.60"
          features={premiumFeatures}
          isSelected={selectedPlan === "premium"}
          onSelect={() => onSelectPlan("premium")}
        />
        <ProtectionPlanCard
          planType="all"
          title={t('allIncluded')}
          price="₹12,935.52"
          features={allFeatures}
          isSelected={selectedPlan === "all"}
          onSelect={() => onSelectPlan("all")}
        />
      </div>

      {/* Desktop: Table layout */}
      <ProtectionPlanTable
        features={desktopFeatures}
        basicPrice="₹8,623.68"
        premiumPrice="₹10,779.60"
        allPrice="₹12,935.52"
        basicLabel={t('basic')}
        premiumLabel={t('premium')}
        allLabel={t('allIncluded')}
        selectedPlan={selectedPlan}
        onSelectPlan={onSelectPlan}
      />
    </div>
  );
}
