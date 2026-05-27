"use client";

import { RefundShieldSection } from "./RefundShieldSection";

interface PackageRefundShieldSectionProps {
  selected: boolean;
  onToggle: () => void;
  price: number;
  currency: string;
}

export function PackageRefundShieldSection(props: PackageRefundShieldSectionProps) {
  return <RefundShieldSection {...props} variant="package" />;
}
