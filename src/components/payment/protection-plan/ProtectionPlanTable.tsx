"use client";

import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import styles from './ProtectionPlanTable.module.css';
import { Cross1Icon } from "@radix-ui/react-icons";
import { GetInclusions } from "./ProtectionPlans";
import { getRegion } from "@/lib/utils/domainMapping";
interface ProtectionPlanTableProps {
  basicPrice: string;
  premiumPrice: string;
  allPrice: string;
  basicLabel: string;
  premiumLabel: string;
  allLabel: string;
  selectedPlan?: "basic" | "premium" | "all";
  onSelectPlan: (plan: "basic" | "premium" | "all") => void;

}

export function ProtectionPlanTable({
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
  const features = GetInclusions();
  const region = getRegion();
  return (
    <div className="hidden lg:flex flex-col border-1 border-[#ddc] rounded-lg">
      {/* Price Row */}
      <div className="flex items-center flex-row bg-[#F5F7FF] rounded-lg justify-between">
        <div className="flex flex-col p-3">
          <div className="w-[524px] text-sm font-medium text-[#010D50]">
            Choose your own bundle
          </div>
        </div>
        <div className={`flex items-center gap-0 flex-col  p-3 cursor-pointer ${selectedPlan === 'basic' ? styles.selectedBackground : ''}
        border-l border-[#ddc]`} role="button"
          onClick={() => onSelectPlan("basic")}>
          <div className="w-[109px] text-center relative">
            {selectedPlan === 'basic' &&

              <div className={styles.selectedLabel}> Selected</div>}

            <div className="text-sm font-bold text-[#010D50]">
              {basicLabel}
            </div>
            <span className="text-sm font-medium text-[#010D50]">
              {basicPrice}
            </span>
          </div>
        </div>
        <div className={`flex flex-col border-l border-r border-t border-[#008234] p-3 box-shadow shadow-sm
        bg-[#e1f1e1] cursor-pointer `}
          role="button"
          onClick={() => onSelectPlan("premium")}

        >
          <div className="w-[109px] text-center relative ">
            {selectedPlan === 'premium' &&
              <div className={styles.selectedLabel}> Selected</div>}
            <div className={styles.recommendedLabel}> Recommended</div>

            <div className="text-sm font-bold text-[#010D50]">
              {region === 'UK' ? 'Standard' : premiumLabel}
            </div>
            <span className="text-sm font-medium text-[#010D50]">
              {premiumPrice}
            </span>
          </div>
        </div>
        <div className={`flex flex-col  p-3 cursor-pointer  ${selectedPlan === 'all' ? styles.selectedBackground : ''} `} role="button"
          onClick={() => onSelectPlan("all")}>
          <div className="w-[109px] text-center relative">
            {selectedPlan === 'all' &&
              <div className={styles.selectedLabel}> Selected</div>}

            <div className="text-sm font-bold  text-[#010D50]">
              {region == 'UK' ? 'Premium' : allLabel}
            </div >
            <span className="text-sm font-medium text-[#010D50]">{allPrice}</span>
          </div>
        </div>
      </div>
      {/* plans feature listing */}

      <div className="flex flex-row">
        <div className="flex flex-col">
          {/* Features */}
          {features.allIncluded.map((feature, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 border-b border-[#ddc]  h-10"
            >
              <span className="w-[524px] text-sm font-medium text-[#010D50]">
                {feature}
              </span>
            </div>
          ))}
        </div>
        <div className={'flex flex-col cursor-pointer'}
          role="button"
          onClick={() => onSelectPlan("basic")}

        >

          {features.allIncluded.map((feature, i) => (

            <div className="flex items-center justify-between p-3 border-b border-l border-[#F5F7FF] border-[#ddc] h-10">

              <div className="w-[109px] flex items-center justify-center">
                {features.basic.includes(feature) ? (
                  <Check className="w-4 h-4 text-[#008234]" />
                ) : <Cross1Icon className="w-4 h-4 text-[#888]" />}
              </div>
            </div>))}
        </div>
        <div className={'flex flex-col border-[#008234] shadow-sm  bg-[#e1f1e1] cursor-pointer'} role="button"
          onClick={() => onSelectPlan("premium")}>
          {features.allIncluded.map((feature, i) => (
            <div className="flex items-center justify-between p-3 border-l border-r border-[#008234]  h-10">

              <div className="w-[109px] flex items-center justify-center ">

                {features.premium.includes(feature) ? (
                  <Check className="w-4 h-4 text-[#008234]" />) : <Cross1Icon className="w-4 h-4 text-[#888]" />}
              </div>
            </div>
          ))}</div>
        <div className={'flex flex-col cursor-pointer'} role="button"
          onClick={() => onSelectPlan("all")} >

          {features.allIncluded.map((feature, i) => (
            <div className="flex items-center justify-between p-3 border-b  border-[#ddc] h-10">

              <div className="w-[109px] flex items-center justify-center">
                {features.allIncluded.includes(feature) && (
                  <Check className="w-4 h-4 text-[#008234]" />
                )}
              </div>
            </div>))}</div>
      </div>
      {/* Plan Selection Row */}
      <div className="flex flex-row justify-between"

      >
        <div className="flex flex-col p-3">
          <span className="w-[524px] opacity-0">Select</span>
        </div>
        <div className="flex items-center gap-0 flex-col p-3 border-l  border-[#ddc]">
          <div
            role="button"
            onClick={() => onSelectPlan("basic")}

            className="w-[109px] flex flex-col items-center  justify-center gap-1 py-0.5 cursor-pointer"
          >
            <Checkbox checked={selectedPlan === "basic"} />
            <span className="text-xs font-medium text-[#010D50]">
              add
            </span>
          </div>
        </div>
        <div className="flex flex-col border-l border-r border-[#008234] p-3 bg-[#e1f1e1] border-b">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectPlan("premium")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPlan("premium");
              }
            }}
            className="w-[109px] flex flex-col  items-center justify-center gap-1 py-0.5 cursor-pointer"
          >
            <Checkbox checked={selectedPlan === "premium"} />
            <span className="text-xs font-medium text-[#010D50]">
              add
            </span>
          </div>
        </div>
        <div className="flex flex-col p-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectPlan("all")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPlan("all");
              }
            }}
            className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
          >
            <Checkbox checked={selectedPlan === "all"} />
            <span className="text-xs font-medium text-[#010D50]">
              add
            </span>
          </div>
        </div>
      </div>
    </div >
  );
}
