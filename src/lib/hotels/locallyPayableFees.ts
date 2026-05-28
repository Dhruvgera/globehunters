import type { locallyPayableFeesType } from "@/types/hotel";

interface RawLocallyPayableFees {
  billable?: { value: number; currency: string };
  request?: { value: number; currency: string };
  breakdown?: Array<{ amount: number; currency: string; description: string }>;
}

interface RoomWithFees {
  id?: string | number;
  locallyPayableFees?: RawLocallyPayableFees;
  _raw?: {
    locally_payable_fees?: RawLocallyPayableFees;
  };
}

export function computeLocallyPayableFees(
  rooms: RoomWithFees[] | undefined,
  roomIds: (string | number)[],
  fallbackCurrency: string
): locallyPayableFeesType | undefined {
  if (!rooms || roomIds.length === 0) return undefined;

  const allFees: RawLocallyPayableFees[] = [];

  for (const rid of roomIds) {
    const room = rooms.find(
      (r) => String(r.id || "").trim() === String(rid).trim()
    );
    if (!room) continue;

    const fees = room.locallyPayableFees || room._raw?.locally_payable_fees;
    if (fees?.request && fees?.billable) {
      allFees.push(fees);
    }
  }

  if (allFees.length === 0) return undefined;

  let totalAmount = 0;
  const feesCurrency = allFees[0]?.request?.currency || fallbackCurrency;
  const subTaxMap = new Map<string, { amount: number; currency: string }>();

  for (const lpf of allFees) {
    totalAmount += Number(lpf.request?.value || 0);
    if (Array.isArray(lpf.breakdown)) {
      for (const el of lpf.breakdown) {
        const key = el.description || "Tax";
        const scaled = lpf.billable!.value > 0
          ? el.amount * lpf.request!.value / lpf.billable!.value
          : 0;
        const existing = subTaxMap.get(key);
        if (existing) {
          existing.amount += scaled;
        } else {
          subTaxMap.set(key, { amount: scaled, currency: lpf.request?.currency || feesCurrency });
        }
      }
    }
  }

  return {
    amount: String(totalAmount),
    currency: feesCurrency,
    type: "Billable",
    subTaxes: Array.from(subTaxMap.entries()).map(([t, { amount, currency: cur }]) => ({
      amount: String(amount),
      currency: cur,
      type: t,
    })),
  };
}
