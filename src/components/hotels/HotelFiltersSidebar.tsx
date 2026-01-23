"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Snowflake,
  UtensilsCrossed,
  Wine,
  WashingMachine,
  TreePine,
  Dices,
  Zap,
  BedDouble,
  Car,
  Waves,
  CircleDot,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FilterSection } from "@/components/search/filters/FilterSection";

export interface HotelFiltersState {
  propertyQuery: string;
  neighborhoods: string[];
  amenities: string[];
  popular: {
    breakfastIncluded: boolean;
    reserveWithoutCard: boolean;
    reserveNowPayLater: boolean;
    airportShuttle: boolean;
  };
  priceMode: "nightly" | "total";
  priceRange: [number, number];
  starRatings: number[]; // 1..5
  fullyRefundableOnly: boolean;
  mealPlans: string[];
  bedrooms: string | null; // "Studio" | "1" | "2" | "3" | null
  accessibility: string[];
}

const AMENITIES_WITH_ICONS = [
  { key: "Air Conditioned", icon: Snowflake },
  { key: "Kitchen", icon: UtensilsCrossed },
  { key: "Bar", icon: Wine },
  { key: "Washer and dryer", icon: WashingMachine },
  { key: "Outdoor space", icon: TreePine },
  { key: "Casino", icon: Dices },
  { key: "Electric car charging station", icon: Zap },
  { key: "Cots", icon: BedDouble },
  { key: "Parking", icon: Car },
  { key: "Water park", icon: Waves },
  { key: "Golf course", icon: CircleDot },
] as const;

export function HotelFiltersSidebar({
  resultCount,
  value,
  onChange,
  onPriceModeChange,
  onPriceRangeChange,
  minPrice = 0,
  maxPrice = 250,
  currencySymbol = "$",
  expanded,
  onToggleExpanded,
  availableMealPlans = [],
  minPriceByStarRating = {},
}: {
  resultCount: number;
  value: HotelFiltersState;
  onChange: (next: HotelFiltersState) => void;
  onPriceModeChange?: (mode: HotelFiltersState["priceMode"]) => void;
  onPriceRangeChange?: (range: [number, number]) => void;
  minPrice?: number;
  maxPrice?: number;
  currencySymbol?: string;
  expanded: Record<string, boolean>;
  onToggleExpanded: (key: string) => void;
  /** Available meal plans from current hotel data */
  availableMealPlans?: string[];
  /** Minimum price per star rating from current hotel data */
  minPriceByStarRating?: Record<number, number>;
}) {
  const unsupportedNote =
    "Note: Only Property name, Price, and Star rating are currently powered by the hotel API. Other filters are shown for UI parity but may not affect results yet.";

  const priceText = useMemo(() => {
    const [min, max] = value.priceRange;
    const maxSuffix = max >= maxPrice ? " +" : "";
    return {
      min: `${currencySymbol}${min}`,
      max: `${currencySymbol}${max}${maxSuffix}`,
    };
  }, [currencySymbol, maxPrice, value.priceRange]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-[#3A478A] bg-[#F5F7FF] border border-[#DFE0E4] rounded-xl p-3">
        {unsupportedNote}
      </div>
      {/* Property name search */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
        <div className="text-sm font-semibold text-[#010D50]">Search by property name</div>
        <div className="flex items-center gap-2 rounded-xl border border-[#DFE0E4] px-3 py-2.5">
          <Search className="h-4 w-4 text-[#3A478A]" />
          <Input
            value={value.propertyQuery}
            onChange={(e) => onChange({ ...value, propertyQuery: e.target.value })}
            placeholder="e.g. Marriott"
            className="h-auto min-h-0 border-0 px-0 py-0 shadow-none focus-visible:ring-0 text-sm text-[#010D50] placeholder:text-[#3A478A]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-[#010D50]">Filters By</span>
        <span className="text-xs text-[#3A478A]">Showing {resultCount} results</span>
      </div>

      {/* Popular filters */}
      <FilterSection
        title="Popular filters"
        isExpanded={!!expanded.popular}
        onToggle={() => onToggleExpanded("popular")}
      >
        <div className="text-xs text-[#3A478A] mb-2">
          Breakfast is powered by meal plan data. Other popular filters are not yet available from the hotel list API.
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3">
            <Checkbox
              checked={value.popular.breakfastIncluded}
              onCheckedChange={(c) =>
                onChange({
                  ...value,
                  popular: { ...value.popular, breakfastIncluded: Boolean(c) },
                })
              }
            />
            <span className="text-sm text-[#010D50]">Breakfast included</span>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              disabled
              checked={value.popular.reserveWithoutCard}
              onCheckedChange={(c) =>
                onChange({
                  ...value,
                  popular: { ...value.popular, reserveWithoutCard: Boolean(c) },
                })
              }
            />
            <span className="text-sm text-[#010D50]">Reserve without a credit card</span>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              disabled
              checked={value.popular.reserveNowPayLater}
              onCheckedChange={(c) =>
                onChange({
                  ...value,
                  popular: { ...value.popular, reserveNowPayLater: Boolean(c) },
                })
              }
            />
            <span className="text-sm text-[#010D50]">Reserve now, pay later</span>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              disabled
              checked={value.popular.airportShuttle}
              onCheckedChange={(c) =>
                onChange({
                  ...value,
                  popular: { ...value.popular, airportShuttle: Boolean(c) },
                })
              }
            />
            <span className="text-sm text-[#010D50]">Airport shuttle included</span>
          </label>
        </div>
      </FilterSection>

      {/* Price */}
      <FilterSection title="Price" isExpanded={!!expanded.price} onToggle={() => onToggleExpanded("price")}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-full flex flex-col gap-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="priceMode"
                checked={value.priceMode === "total"}
                onChange={() =>
                  onPriceModeChange ? onPriceModeChange("total") : onChange({ ...value, priceMode: "total" })
                }
                className="h-4 w-4 accent-[#3754ED]"
              />
              <span className="text-sm text-[#010D50]">Total price</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="priceMode"
                checked={value.priceMode === "nightly"}
                onChange={() =>
                  onPriceModeChange ? onPriceModeChange("nightly") : onChange({ ...value, priceMode: "nightly" })
                }
                className="h-4 w-4 accent-[#3754ED]"
              />
              <span className="text-sm text-[#010D50]">Nightly price</span>
            </label>
          </div>

          <Slider
            value={value.priceRange}
            min={minPrice}
            max={maxPrice}
            step={1}
            onValueChange={(v) => {
              const next: [number, number] = [v[0]!, v[1]!];
              onPriceRangeChange ? onPriceRangeChange(next) : onChange({ ...value, priceRange: next });
            }}
            className="w-full"
          />
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {priceText.min}
            </span>
            <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
              {priceText.max}
            </span>
          </div>
        </div>
      </FilterSection>

      {/* Neighborhood */}
      <FilterSection
        title="Neighborhood"
        isExpanded={!!expanded.neighborhood}
        onToggle={() => onToggleExpanded("neighborhood")}
      >
        <div className="text-xs text-[#3A478A] mb-2">Content missing from API: neighborhood data</div>
        <div className="flex flex-col gap-2">
          {["Central", "Kowloon", "Mong Kok", "Tsim Sha Tsui", "Jordan"].map((n) => (
            <label key={n} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  disabled
                  checked={value.neighborhoods.includes(n)}
                  onCheckedChange={(c) => {
                    const next = Boolean(c)
                      ? Array.from(new Set([...value.neighborhoods, n]))
                      : value.neighborhoods.filter((x) => x !== n);
                    onChange({ ...value, neighborhoods: next });
                  }}
                />
                <span className="text-sm text-[#010D50]">{n}</span>
              </div>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Star rating */}
      <FilterSection
        title="Star rating"
        isExpanded={!!expanded.stars}
        onToggle={() => onToggleExpanded("stars")}
      >
        <div className="flex flex-col gap-2">
          {[5, 4, 3, 2, 1].map((s) => {
            const checked = value.starRatings.includes(s);
            const minPriceForRating = minPriceByStarRating[s];
            return (
              <label key={s} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const nextChecked = Boolean(c);
                      onChange({
                        ...value,
                        starRatings: nextChecked
                          ? Array.from(new Set([...value.starRatings, s]))
                          : value.starRatings.filter((x) => x !== s),
                      });
                    }}
                  />
                  <span className="text-sm text-[#010D50]">
                    {s} star{s === 1 ? "" : "s"}
                  </span>
                </div>
                {minPriceForRating !== undefined && (
                  <span className="text-sm font-medium text-[#010D50]">
                    from {currencySymbol}{Math.round(minPriceForRating).toLocaleString()}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Refundable */}
      <FilterSection
        title="Property cancellation options"
        isExpanded={!!expanded.refund}
        onToggle={() => onToggleExpanded("refund")}
      >
        <div className="text-xs text-[#3A478A] mb-2">Content missing from API: refundable flag in list results</div>
        <label className="flex items-center gap-3">
          <Checkbox
            disabled
            checked={value.fullyRefundableOnly}
            onCheckedChange={(c) => onChange({ ...value, fullyRefundableOnly: Boolean(c) })}
          />
          <span className="text-sm text-[#010D50]">Fully refundable property</span>
        </label>
      </FilterSection>

      {/* Amenities with icons in a grid */}
      <FilterSection
        title="Amenities"
        isExpanded={!!expanded.amenities}
        onToggle={() => onToggleExpanded("amenities")}
      >
        <div className="text-xs text-[#3A478A] mb-2">Content missing from API: amenities list</div>
        <div className="grid grid-cols-2 gap-2">
          {AMENITIES_WITH_ICONS.map(({ key, icon: Icon }) => {
            const isSelected = value.amenities.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  // UI-only for now
                  const next = isSelected
                    ? value.amenities.filter((x) => x !== key)
                    : [...value.amenities, key];
                  onChange({ ...value, amenities: next });
                }}
                className={[
                  "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-colors",
                  isSelected
                    ? "border-[#3754ED] bg-[rgba(55,84,237,0.08)]"
                    : "border-[#DFE0E4] bg-white hover:border-[#3754ED]/50",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 text-[#010D50]" />
                <span className="text-xs text-[#010D50] leading-tight">{key}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Meal plans available */}
      <FilterSection
        title="Meal plans available"
        isExpanded={!!expanded.mealPlans}
        onToggle={() => onToggleExpanded("mealPlans")}
      >
        {availableMealPlans.length === 0 ? (
          <div className="text-xs text-[#3A478A]">No meal plans available in current results</div>
        ) : (
          <div className="flex flex-col gap-2">
            {availableMealPlans.map((plan) => (
              <label key={plan} className="flex items-center gap-3">
                <Checkbox
                  checked={value.mealPlans?.includes(plan) ?? false}
                  onCheckedChange={(c) => {
                    const current = value.mealPlans ?? [];
                    const next = Boolean(c)
                      ? Array.from(new Set([...current, plan]))
                      : current.filter((x) => x !== plan);
                    onChange({ ...value, mealPlans: next });
                  }}
                />
                <span className="text-sm text-[#010D50]">{plan}</span>
              </label>
            ))}
          </div>
        )}
      </FilterSection>

      {/* Number of bedrooms */}
      <FilterSection
        title="Number of bedrooms"
        isExpanded={!!expanded.bedrooms}
        onToggle={() => onToggleExpanded("bedrooms")}
      >
        <div className="text-xs text-[#3A478A] mb-2">Content missing from API: bedroom count</div>
        <div className="flex flex-wrap gap-2">
          {["Studio", "1", "2", "3"].map((opt) => {
            const isSelected = value.bedrooms === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...value, bedrooms: isSelected ? null : opt })}
                disabled
                className={[
                  "px-4 py-2 rounded-full border text-sm font-medium transition-colors",
                  isSelected
                    ? "border-[#3754ED] bg-[#3754ED] text-white"
                    : "border-[#DFE0E4] bg-white text-[#010D50] hover:border-[#3754ED]/50",
                ].join(" ")}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Accessibility */}
      <FilterSection
        title="Accessibility"
        isExpanded={!!expanded.accessibility}
        onToggle={() => onToggleExpanded("accessibility")}
      >
        <div className="text-xs text-[#3A478A] mb-2">Content missing from API: accessibility attributes</div>
        <div className="flex flex-col gap-2">
          {["Lift", "In-room accessibility", "Stair-free path to entrance"].map((acc) => (
            <label key={acc} className="flex items-center gap-3">
              <Checkbox
                disabled
                checked={value.accessibility?.includes(acc) ?? false}
                onCheckedChange={(c) => {
                  const current = value.accessibility ?? [];
                  const next = Boolean(c)
                    ? Array.from(new Set([...current, acc]))
                    : current.filter((x) => x !== acc);
                  onChange({ ...value, accessibility: next });
                }}
              />
              <span className="text-sm text-[#010D50]">{acc}</span>
            </label>
          ))}
          <button
            type="button"
            className="text-sm text-[#3754ED] hover:underline text-left mt-1"
          >
            See more
          </button>
        </div>
      </FilterSection>
    </div>
  );
}


