"use client";

import { ChevronDown } from "lucide-react";

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function FilterSection({
  title,
  isExpanded,
  onToggle,
  children,
}: FilterSectionProps) {
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full cursor-pointer"
      >
        <span className="text-sm font-semibold text-[#010D50]">{title}</span>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && children}
    </div>
  );
}
