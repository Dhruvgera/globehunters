"use client";

import { REFUNDABLE_TERMS_URL } from "@/config/constants";

export function RefundShieldTerms() {
  return (
    <div className="bg-[#F5F7FF] border border-[#DFE0E4] rounded-xl p-3">
      <p className="text-xs text-[#3A478A] leading-relaxed">
        By selecting Refund Shield, you agree to the{" "}
        <a
          href={REFUNDABLE_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3754ED] font-semibold hover:underline"
        >
          Refundable Terms
        </a>
        .
      </p>
    </div>
  );
}
