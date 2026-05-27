import { REFUND_SHIELD_PRICING, IASSURE_PRICING } from "@/config/constants";

export type BookingMode = "package" | "hotel" | "flight";
export type ProtectionPlanTier = "basic" | "premium" | "all";

export interface ProtectionPlanPrices {
  basic: number;
  premium: number;
  all: number;
}

export function calculateProtectionPlanPrices(
  baseAmount: number,
  mode: BookingMode
): ProtectionPlanPrices {
  const rate = mode === "flight" ? IASSURE_PRICING.global : {
    basic: REFUND_SHIELD_PRICING.rate,
    premium: REFUND_SHIELD_PRICING.rate,
    all: REFUND_SHIELD_PRICING.rate,
  };

  return {
    basic: baseAmount * rate.basic,
    premium: baseAmount * rate.premium,
    all: baseAmount * rate.all,
  };
}
