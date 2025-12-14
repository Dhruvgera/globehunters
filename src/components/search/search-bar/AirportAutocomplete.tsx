"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAirportSearch } from "@/hooks/useAirportSearch";
import type { Airport } from "@/types/airport";

interface AirportAutocompleteProps {
  value: Airport | null;
  onChange: (airport: Airport | null) => void;
  placeholder?: string;
}

export function AirportAutocomplete({
  value,
  onChange,
  placeholder,
}: AirportAutocompleteProps) {
  const t = useTranslations('search.airport');
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.code || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading, search } = useAirportSearch({ limit: 10 });

  // Update input when value changes externally
  useEffect(() => {
    if (value) {
      setInputValue(value.code);
    }
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    search(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
    
    // Clear selection if input is cleared
    if (newValue.trim() === '') {
      onChange(null);
    }
  };

  // Handle airport selection
  const handleSelect = (airport: Airport) => {
    setInputValue(airport.code);
    onChange(airport);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-blue-100 text-blue-900">{part}</mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex items-center gap-2 border border-[#D3D3D3] rounded-xl px-3 py-2.5 bg-white">
        <MapPin className="w-5 h-5 text-[#010D50] flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || t('placeholder')}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (inputValue) search(inputValue);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none text-sm font-medium text-[#010D50] placeholder:text-gray-400"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D3D3D3] rounded-xl shadow-lg max-h-80 overflow-y-auto z-50">
          {loading && results.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              {t('loading')}
            </div>
          )}

          {!loading && results.length === 0 && inputValue.trim() !== '' && (
            <div className="p-4 text-center text-sm text-gray-500">
              {t('noResults')}
            </div>
          )}

          {results.length > 0 && (
            <ul className="py-2">
              {results.map((airport, index) => (
                <li key={airport.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(airport)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-gray-700">
                          {airport.code}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {highlightText(airport.code, inputValue)} - {highlightText(airport.name || airport.city, inputValue)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {airport.city}, {airport.country}
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
