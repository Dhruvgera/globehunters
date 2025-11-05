"use client";

import { CheckCircle2, XCircle, LucideIcon } from "lucide-react";

interface BaggageItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  included: boolean;
  includedText: string;
  notIncludedText: string;
}

export function BaggageItem({
  icon: Icon,
  title,
  description,
  included,
  includedText,
  notIncludedText,
}: BaggageItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-[#010D50]" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#010D50]">{title}</span>
          <span className="text-sm text-[#3A478A]">{description}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {included ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-[#008234]" />
            <span className="text-sm font-medium text-[#008234]">{includedText}</span>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-[#FF0202]" />
            <span className="text-sm font-medium text-[#FF0202]">{notIncludedText}</span>
          </>
        )}
      </div>
    </div>
  );
}
