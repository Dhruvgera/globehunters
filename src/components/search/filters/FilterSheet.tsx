"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FilterContent, FilterContentProps } from "./FilterContent";
import { useTranslations } from "next-intl";

interface FilterSheetProps extends FilterContentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  resultCount: number;
}

export function FilterSheet({
  isOpen,
  onOpenChange,
  resultCount,
  ...filterProps
}: FilterSheetProps) {
  const t = useTranslations('search.filters');
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-[#010D50]">
            {t('title')}
          </SheetTitle>
          <span className="text-xs text-[#3A478A] text-left">
            {t('showing')} {resultCount} {t('results')}
          </span>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          <FilterContent {...filterProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
