"use client";

import { BarChart3, Grid3X3, Map, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HotelProvider } from "@/lib/hotels/provider";

export type HotelViewMode = "list" | "grid" | "map";

export type HotelSortMode = "recommended" | "price_low" | "review_score";

export function HotelResultsToolbar({
  resultCount,
  viewMode,
  onViewModeChange,
  sortMode,
  onSortModeChange,
  onOpenFilters,
  providerMode,
  onProviderModeChange,
  showProviderToggle = false,
}: {
  resultCount: number;
  viewMode: HotelViewMode;
  onViewModeChange: (mode: HotelViewMode) => void;
  sortMode: HotelSortMode;
  onSortModeChange: (mode: HotelSortMode) => void;
  onOpenFilters?: () => void;
  providerMode?: HotelProvider;
  onProviderModeChange?: (mode: HotelProvider) => void;
  showProviderToggle?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-full sm:w-[260px]">
          <Select value={sortMode} onValueChange={(v) => onSortModeChange(v as HotelSortMode)}>
            <SelectTrigger className="h-9 min-h-9 rounded-xl border border-[#DFE0E4] bg-white px-3 text-sm">
              <SelectValue placeholder="Price (low to high)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Sort by Recommended for you</SelectItem>
              <SelectItem value="price_low">Price (low to high)</SelectItem>
              <SelectItem value="review_score">Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showProviderToggle && providerMode && onProviderModeChange && (
          <div className="flex items-center rounded-xl border border-[#DFE0E4] bg-white p-1">
            {(["vyspa", "hotelbeds", "hybrid"] as HotelProvider[]).map((mode) => {
              const active = providerMode === mode;
              return (
                <Button
                  key={mode}
                  type="button"
                  variant="ghost"
                  onClick={() => onProviderModeChange(mode)}
                  className={[
                    "h-8 rounded-lg px-3 text-xs font-medium capitalize",
                    active
                      ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D7E0FF]"
                      : "text-[#3754ED] hover:bg-[#F5F7FF]",
                  ].join(" ")}
                >
                  {mode}
                </Button>
              );
            })}
          </div>
        )}

        <div className="hidden sm:flex items-center gap-2 text-sm text-[#3A478A]">
          <span>Showing</span>
          <span className="font-semibold text-[#010D50]">{resultCount}</span>
          <span>results</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile filters shortcut */}
        {onOpenFilters && (
          <Button
            type="button"
            variant="outline"
            className="lg:hidden h-9 rounded-xl border-[#DFE0E4] bg-white text-sm"
            onClick={onOpenFilters}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters ({resultCount})
          </Button>
        )}

        <div className="flex items-center gap-2 bg-white">
          {/* List button - hidden on mobile since it's same as Grid */}
          <Button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={[
              "hidden sm:flex h-9 rounded-xl px-3 text-sm",
              viewMode === "list"
                ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D7E0FF]"
                : "bg-white text-[#3754ED] border border-[#3754ED] hover:bg-[#F5F7FF]",
            ].join(" ")}
          >
            <BarChart3 className="h-4 w-4" />
            List
          </Button>
          <Button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={[
              "h-9 rounded-xl px-3 text-sm",
              viewMode === "grid" || (viewMode === "list" && typeof window !== "undefined" && window.innerWidth < 640)
                ? "bg-[#E0E7FF] text-[#010D50] hover:bg-[#D7E0FF]"
                : "bg-white text-[#3754ED] border border-[#3754ED] hover:bg-[#F5F7FF]",
            ].join(" ")}
          >
            <Grid3X3 className="h-4 w-4" />
            Grid
          </Button>
          <Button
            type="button"
            onClick={() => onViewModeChange("map")}
            disabled
            className="h-9 rounded-xl px-3 text-sm bg-white text-[#3754ED] border border-[#3754ED] hover:bg-[#F5F7FF] disabled:opacity-50 disabled:hover:bg-white"
          >
            <Map className="h-4 w-4" />
            Map View
          </Button>
        </div>
      </div>
    </div>
  );
}
