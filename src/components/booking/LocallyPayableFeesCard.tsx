import { formatMoneyFromCode } from "@/lib/currency/localTaxDisplay";
import type { locallyPayableFeesType } from "@/types/hotel";

interface LocallyPayableFeesCardProps {
  fees: locallyPayableFeesType;
  className?: string;
}

export function LocallyPayableFeesCard({ fees, className }: LocallyPayableFeesCardProps) {
  return (
    <div className={className ?? "bg-[#F8F9FC] border border-[#DFE0E4] rounded-lg p-3 flex flex-col gap-1.5"}>
      <div className="flex items-center justify-between text-xs text-[#010D50]">
        <span className="font-semibold">Locally Payable Fees & Taxes</span>
        <span>{formatMoneyFromCode(fees.currency, Number(fees.amount || 0))}</span>
      </div>
      <span className="text-[10px] text-[#3A478A]">
        Payable locally at the hotel. Not included in the price.
      </span>
    </div>
  );
}
