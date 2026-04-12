"use client";

import { FilterContent, FilterContentProps } from "./FilterContent";
import { useTranslations } from "next-intl";

interface FilterSidebarProps extends FilterContentProps {
  resultCount: number;
}

export function FilterSidebar({
  resultCount,
  ...filterProps
}: FilterSidebarProps) {
  const t = useTranslations('search.filters');
  
  return (
    <div className="w-full lg:w-72 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-[#010D50]">
          {t('filtersBy')}
        </span>
        <span className="text-xs text-[#3A478A]">
          {t('showing')} {resultCount} {t('results')}
        </span>
      </div>

      <FilterContent {...filterProps} />
    </div>
  );
}
