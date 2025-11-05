"use client";

import SearchBar from "@/components/search/SearchBar";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

interface SearchHeaderProps {
  onFilterClick: () => void;
  resultCount: number;
}

export function SearchHeader({ onFilterClick, resultCount }: SearchHeaderProps) {
  return (
    <>
      {/* Search Bar Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <SearchBar compact />
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden mx-auto max-w-7xl px-4 sm:px-6 mb-4">
        <Button
          onClick={onFilterClick}
          className="w-full bg-[#3754ED] hover:bg-[#2942D1] text-white flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filters ({resultCount} results)
        </Button>
      </div>
    </>
  );
}
