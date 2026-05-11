export interface PassengerBreakdownEntry {
  type: string;
  count: number;
}

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

type TranslateFn = (key: string) => string;

export function formatPassengerLabel(params: {
  breakdown?: PassengerBreakdownEntry[];
  counts?: PassengerCounts;
  t: TranslateFn;
}): string {
  const { breakdown, counts, t } = params;

  const adtCount = breakdown
    ? (breakdown.find((p) => p.type === "ADT")?.count || 0)
    : (counts?.adults || 0);
  const chdCount = breakdown
    ? (breakdown.find((p) => p.type === "CHD")?.count || 0)
    : (counts?.children || 0);
  const infCount = breakdown
    ? (breakdown.find((p) => p.type === "INF")?.count || 0)
    : (counts?.infants || 0);

  const parts: string[] = [];
  if (adtCount)
    parts.push(`${adtCount} ${adtCount > 1 ? t("adults") : t("adult")}`);
  if (chdCount)
    parts.push(`${chdCount} ${chdCount > 1 ? t("children") : t("child")}`);
  if (infCount)
    parts.push(`${infCount} ${infCount > 1 ? t("infants") : t("infant")}`);

  return parts.join(", ");
}
