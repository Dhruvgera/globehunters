"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { useHotelLocationSearch } from "@/hooks/useHotelLocationSearch";
import type { VyspaCityHotelLookupItem } from "@/types/vyspaHotels";

interface HotelLocationAutocompleteProps {
  value: VyspaCityHotelLookupItem | null;
  onChange: (item: VyspaCityHotelLookupItem | null) => void;
  placeholder?: string;
}

function formatSecondary(item: VyspaCityHotelLookupItem) {
  const parts = [item.city_name, item.country_name].filter(Boolean);
  return parts.join(", ");
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]!);
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
          {!loading && results.length === 0 && inputValue.trim() !== "" && (
            <div className="p-4 text-center text-sm text-gray-500">No results</div>
          )}

          {results.length > 0 && (
            <ul className="py-2">
              {results.map((item, index) => (
                <li key={`${item.id}-${item.label}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={[
                      "w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors",
                      index === selectedIndex ? "bg-blue-50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-gray-700">
                          {(item.loc || "LOC").toString().toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-gray-700">{item.id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {highlightText(item.label, inputValue)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {formatSecondary(item)}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}



