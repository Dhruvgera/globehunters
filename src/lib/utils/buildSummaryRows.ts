import { formatPrice } from "@/lib/currency";
import { formatPassengerLabel } from "@/lib/utils/passengerLabel";

export interface SummaryRow {
  label: string;
  value: string;
  valueClassName?: string;
}

type TranslateFn = (key: string) => string;

interface PassengerBreakdownEntry {
  type: string;
  count: number;
  basePrice: number;
  totalPrice: number;
  taxesPerPerson: number;
}

interface BaseBuildParams {
  currency: string;
  t: TranslateFn;
}

interface FlightRowsParams extends BaseBuildParams {
  mode: "flight";
  baseFare: number;
  passengerBreakdown?: PassengerBreakdownEntry[];
  searchPassengers?: { adults: number; children: number; infants: number };
  protectionPlanCost?: number;
  protectionPlanName?: string;
  baggageCost?: number;
  baggageCount?: number;
  discountAmount?: number;
  discountPercent?: number;
}

interface HotelRowsParams extends BaseBuildParams {
  mode: "hotel";
  baseFare: number;
  guestCount: number;
  protectionPlanCost?: number;
  protectionPlanName?: string;
}

interface PackageRowsParams extends BaseBuildParams {
  mode: "package";
  baggageCost?: number;
  baggageCount?: number;
  protectionPlanCost?: number;
  hotelNights?: number;
  packageNights?: number;
}

export type BuildSummaryRowsParams =
  | FlightRowsParams
  | HotelRowsParams
  | PackageRowsParams;

export function buildSummaryRows(params: BuildSummaryRowsParams): SummaryRow[] {
  switch (params.mode) {
    case "flight":
      return buildFlightRows(params);
    case "hotel":
      return buildHotelRows(params);
    case "package":
      return buildPackageRows(params);
  }
}

function buildFlightRows(params: FlightRowsParams): SummaryRow[] {
  const {
    baseFare,
    passengerBreakdown,
    searchPassengers,
    protectionPlanCost,
    protectionPlanName,
    baggageCost,
    baggageCount,
    discountAmount,
    discountPercent,
    currency,
    t,
  } = params;

  const rows: SummaryRow[] = [];

  if (
    passengerBreakdown &&
    passengerBreakdown.length > 0 &&
    passengerBreakdown.every((p) => typeof p.totalPrice === "number")
  ) {
    for (const pax of passengerBreakdown) {
      const label = formatPaxTypeLabel(pax.type, pax.count, t);
      rows.push({
        label,
        value: formatPrice(pax.totalPrice, currency),
        valueClassName: "text-sm font-medium text-[#010D50]",
      });
    }
  } else {
    const travelerLabel = formatPassengerLabel({
      breakdown: passengerBreakdown,
      counts: searchPassengers || { adults: 1, children: 0, infants: 0 },
      t,
    });
    rows.push({
      label: `${t("traveler")}: ${travelerLabel}`,
      value: formatPrice(baseFare, currency),
      valueClassName: "text-sm font-medium text-[#010D50]",
    });
  }

  if (protectionPlanCost && protectionPlanCost > 0) {
    rows.push({
      label: `${t("iassureProtectionPlan")} (${protectionPlanName})`,
      value: formatPrice(protectionPlanCost, currency),
    });
  }

  if (baggageCost && baggageCost > 0) {
    rows.push({
      label: `${t("additionalBaggage")} (${baggageCount} ${t("bags")})`,
      value: formatPrice(baggageCost, currency),
    });
  }

  if (discountAmount && discountAmount > 0 && discountPercent) {
    rows.push({
      label: `${t("discountCode")} (-${discountPercent * 100}%)`,
      value: `-${formatPrice(discountAmount, currency)}`,
    });
  }

  return rows;
}

function buildHotelRows(params: HotelRowsParams): SummaryRow[] {
  const { baseFare, guestCount, protectionPlanCost, protectionPlanName, currency, t } =
    params;

  const guestLabel = guestCount === 1 ? t("guest") : t("guests");
  const rows: SummaryRow[] = [
    {
      label: `${t("traveler")}: ${guestCount} ${guestLabel}`,
      value: formatPrice(baseFare, currency),
      valueClassName: "text-sm font-medium text-[#010D50]",
    },
  ];

  if (protectionPlanCost && protectionPlanCost > 0) {
    rows.push({
      label: `${t("iassureProtectionPlan")} (${protectionPlanName})`,
      value: formatPrice(protectionPlanCost, currency),
    });
  }

  return rows;
}

function buildPackageRows(params: PackageRowsParams): SummaryRow[] {
  const { baggageCost, baggageCount, protectionPlanCost, hotelNights, packageNights, currency, t } =
    params;

  const nights = hotelNights || packageNights || 0;
  const rows: SummaryRow[] = [
    {
      label: `${t("hotel")} (${nights} ${t("nights")})`,
      value: t("included"),
    },
    {
      label: t("flightsPerBooking"),
      value: t("included"),
    },
  ];

  if (baggageCost && baggageCost > 0 && baggageCount) {
    rows.push({
      label: `${t("checkedBaggage")} (${baggageCount} ${baggageCount !== 1 ? t("bagsPlural") : t("bag")})`,
      value: formatPrice(baggageCost, currency),
    });
  }

  if (protectionPlanCost && protectionPlanCost > 0) {
    rows.push({
      label: t("protectionPlan"),
      value: formatPrice(protectionPlanCost, currency),
    });
  }

  return rows;
}

function formatPaxTypeLabel(
  type: string,
  count: number,
  t: TranslateFn
): string {
  if (type === "ADT")
    return `${count}x ${count > 1 ? t("adults") : t("adult")}`;
  if (type === "CHD")
    return `${count}x ${count > 1 ? t("children") : t("child")}`;
  if (type === "INF")
    return `${count}x ${count > 1 ? t("infants") : t("infant")}`;
  return `${count}x ${type}`;
}
