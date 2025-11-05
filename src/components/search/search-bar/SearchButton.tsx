"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchButtonProps {
  onClick: () => void;
}

export function SearchButton({ onClick }: SearchButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-xl px-5 py-2.5 h-auto gap-2 text-sm font-medium w-full md:w-auto"
    >
      <Search className="w-5 h-5" />
      Search
    </Button>
  );
}
