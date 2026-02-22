"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { useHotelLocationSearch } from "@/hooks/useHotelLocationSearch";
import type { VyspaCityHotelLookupItem } from "@/types/vyspaHotels";

interface HotelLocationAutocompleteProps {
  value: VyspaCityHotelLookupItem | null;
  onChange: (item: VyspaCityHotelLookupItem | null) => void;
  placeholder?: string;
}

export function HotelLocationAutocomplete({
  value,
  onChange,
  placeholder = "Find Location",
}: HotelLocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.label || "");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading, search } = useHotelLocationSearch({ limit: 10 });
  const normalizedQuery = inputValue.trim().toLowerCase();

  const handleDropdownWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isScrollable = scrollHeight > clientHeight;
    if (!isScrollable) return;

    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  useEffect(() => {
    setInputValue(value?.label || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInputValue(next);
    search(next);
    setIsOpen(true);
    setSelectedIndex(-1);
    if (next.trim() === "") onChange(null);
  };

  const handleSelect = (item: VyspaCityHotelLookupItem) => {
    setInputValue(item.label);
    onChange(item);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const displayResults = useMemo(() => {
    const locationPriority = (loc: string) => {
      const value = String(loc || "").toUpperCase();
      if (value === "CITY") return 0;
      if (value === "TOWN") return 1;
      if (value === "LOC") return 2;
      if (value === "HOTEL") return 3;
      return 9;
    };

    const rankItem = (item: VyspaCityHotelLookupItem) => {
      const label = String(item.label || "").trim().toLowerCase();
      const exact = normalizedQuery && label === normalizedQuery ? 0 : 1;
      const startsWith = normalizedQuery && label.startsWith(normalizedQuery) ? 0 : 1;
      const contains = normalizedQuery && label.includes(normalizedQuery) ? 0 : 1;
      return [exact, startsWith, contains, locationPriority(item.loc), label];
    };

    const compareRank = (a: VyspaCityHotelLookupItem, b: VyspaCityHotelLookupItem) => {
      const ar = rankItem(a);
      const br = rankItem(b);
      for (let i = 0; i < ar.length - 1; i += 1) {
        if (ar[i] !== br[i]) return Number(ar[i]) - Number(br[i]);
      }
      return String(ar[ar.length - 1]).localeCompare(String(br[br.length - 1]));
    };

    const byName = new Map<string, VyspaCityHotelLookupItem>();
    for (const item of results) {
      const labelKey = String(item.label || "").trim().toLowerCase();
      if (!labelKey) continue;
      const existing = byName.get(labelKey);
      if (!existing || compareRank(item, existing) < 0) {
        byName.set(labelKey, item);
      }
    }
    return Array.from(byName.values()).sort(compareRank);
  }, [results, normalizedQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || displayResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < displayResults.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < displayResults.length) {
          handleSelect(displayResults[selectedIndex]!);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, idx) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={idx} className="bg-blue-100 text-blue-900">
          {part}
        </mark>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-1 border border-[#D3D3D3] rounded-xl px-3 py-2.5 bg-white hover:border-[#3754ED] focus-within:border-[#3754ED] transition-colors">
        <MapPin className="w-5 h-5 text-[#010D50] flex-shrink-0 opacity-80" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={(e) => {
            setIsOpen(true);
            if (inputValue) search(inputValue);
            e.target.select();
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none text-sm font-medium text-[#010D50] placeholder:text-gray-400 truncate"
          autoComplete="off"
          title={inputValue}
        />
        {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D3D3D3] rounded-xl shadow-lg max-h-80 overflow-y-auto overscroll-contain z-50"
          data-lenis-prevent
          onWheel={handleDropdownWheel}
        >
          {!loading && displayResults.length === 0 && inputValue.trim() !== "" && (
            <div className="p-4 text-center text-sm text-gray-500">No results</div>
          )}

          {displayResults.length > 0 && (
            <ul className="py-2">
              {displayResults.map((item, index) => {
                const city = String(item.city_name || "").trim();
                const country = String(item.country_name || "").trim();
                const label = String(item.label || "").trim();
                const secondary =
                  city && city.toLowerCase() === label.toLowerCase()
                    ? country
                    : [city, country].filter(Boolean).join(", ");

                return (
                <li key={`${item.loc}-${item.label}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={[
                      "w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                      index === selectedIndex ? "bg-blue-50" : "",
                    ].join(" ")}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {highlightText(item.label, inputValue)}
                      </div>
                      {secondary && (
                        <div className="text-xs text-gray-500 truncate">
                          {secondary}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              )})}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

