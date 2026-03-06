"use client";

import { ShieldCheck, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/currency";

interface RefundShieldSectionProps {
  selected: boolean;
  onToggle: () => void;
  price: number;
  currency: string;
}

const REFUND_SHIELD_FEATURES = [
  "100% refund of the booking value for covered reasons",
  "Covers hotel bookings within the next 18 months",
  "Includes fees and taxes in the protected value",
  "Refund requests handled under the Refundable Terms",
];

export function RefundShieldSection({
  selected,
  onToggle,
  price,
  currency,
}: RefundShieldSectionProps) {
  return (
    <div className="bg-white border-2 border-[#3754ED] rounded-xl p-4 flex flex-col gap-4">
      <div className="bg-[#F5F7FF] rounded-full px-4 py-3 w-fit">
        <span className="text-sm font-semibold text-[#010D50]">
          Refund Shield (Recommended)
        </span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`text-left border rounded-xl p-4 transition-colors ${
          selected
            ? "border-[#3754ED] bg-[#F5F7FF]"
            : "border-[#DFE0E4] bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3754ED]" />
              <span className="text-base font-semibold text-[#010D50]">
                Make this hotel booking refundable
              </span>
            </div>
            <p className="text-sm text-[#3A478A]">
              Single Refund Shield offer calculated from your hotel basket total.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-2xl font-bold text-[#3754ED]">
              {formatPrice(price, currency)}
            </span>
            <Checkbox checked={selected} />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {REFUND_SHIELD_FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#008234] shrink-0 mt-0.5" />
              <span className="text-xs text-[#010D50]">{feature}</span>
            </div>
          ))}
        </div>
      </button>
    </div>
  );
}
