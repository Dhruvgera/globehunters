"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface SearchButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SearchButton({ onClick, disabled = false }: SearchButtonProps) {
  const t = useTranslations('search.button');
  
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-5 py-2.5 h-auto gap-2 text-sm font-medium w-full md:w-auto transition-all ${
        disabled 
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
          : 'bg-gradient-to-r from-[#0B229E] to-[#3754ED] hover:opacity-90 text-white shadow-[0px_10px_24px_rgba(55,84,237,0.35)]'
      }`}
    >
      <Search className="w-5 h-5" />
      {t('search')}
    </Button>
  );
}
