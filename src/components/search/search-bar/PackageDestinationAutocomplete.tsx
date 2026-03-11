"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { packageService } from "@/services/api/packageService";
import type { HolidayDestination } from "@/types/holidayPackage";

interface PackageDestinationAutocompleteProps {
  value: HolidayDestination | null;
  onChange: (destination: HolidayDestination | null) => void;
  placeholder?: string;
}

export function PackageDestinationAutocomplete({
  value,
  onChange,
  placeholder = "Find Location",
}: PackageDestinationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [results, setResults] = useState<HolidayDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isEditingRef = useRef(false);

  const normalizedQuery = inputValue.trim().toLowerCase();
  const selectedDestinationId = value?.id ? String(value.id) : "";
  const selectedDestinationName = value?.name || "";
  const selectedDestinationHiddenValue = value?.hiddenvalue || "";
  const hasSelectedDestination = Boolean(value);

  useEffect(() => {
    if (!hasSelectedDestination) {
      if (!isEditingRef.current) {
        setInputValue("");
      }
      return;
    }

    isEditingRef.current = false;
    setInputValue((current) => (current === selectedDestinationName ? current : selectedDestinationName));
  }, [hasSelectedDestination, selectedDestinationHiddenValue, selectedDestinationId, selectedDestinationName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = inputValue.trim();
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const destinations = await packageService.lookupDestinations(query);
        setResults(destinations);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const displayResults = useMemo(() => {
    const deduped = new Map<string, HolidayDestination>();
    results.forEach((destination) => {
      const key = `${String(destination.id)}:${destination.name.trim().toLowerCase()}`;
      if (!deduped.has(key)) deduped.set(key, destination);
    });

    return Array.from(deduped.values()).sort((a, b) => {
      const aName = a.name.trim().toLowerCase();
      const bName = b.name.trim().toLowerCase();
      const aExact = aName === normalizedQuery ? 0 : 1;
      const bExact = bName === normalizedQuery ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStartsWith = aName.startsWith(normalizedQuery) ? 0 : 1;
      const bStartsWith = bName.startsWith(normalizedQuery) ? 0 : 1;
      if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith;
      return aName.localeCompare(bName);
    });
  }, [normalizedQuery, results]);

  const handleSelect = (destination: HolidayDestination) => {
    isEditingRef.current = false;
    setInputValue(destination.name);
    onChange(destination);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-1 border border-[#D3D3D3] rounded-xl px-3 py-2.5 bg-white hover:border-[#3754ED] focus-within:border-[#3754ED] transition-colors">
        <MapPin className="w-5 h-5 text-[#010D50] flex-shrink-0 opacity-80" />
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            const next = e.target.value;
            isEditingRef.current = true;
            setInputValue(next);
            setIsOpen(true);
            setSelectedIndex(-1);
            if (value && next.trim() !== value.name.trim()) {
              onChange(null);
            } else if (!next.trim()) {
              onChange(null);
            }
          }}
          onFocus={(e) => {
            setIsOpen(true);
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D3D3D3] rounded-xl shadow-lg max-h-80 overflow-y-auto overscroll-contain z-50">
          {!loading && displayResults.length === 0 && inputValue.trim() !== "" && (
            <div className="p-4 text-center text-sm text-gray-500">No results</div>
          )}

          {displayResults.length > 0 && (
            <ul className="py-2">
              {displayResults.map((destination, index) => {
                const secondary = [destination.country_name, destination.airportcode].filter(Boolean).join(" • ");
                return (
                  <li key={`${destination.id}-${destination.airportcode}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(destination)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={[
                        "w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                        index === selectedIndex ? "bg-blue-50" : "",
                      ].join(" ")}
                    >
                      <div className="text-sm font-semibold text-gray-900 truncate">{destination.name}</div>
                      {secondary ? <div className="text-xs text-gray-500 truncate">{secondary}</div> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
