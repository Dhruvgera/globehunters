"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { countryCodes, type CountryCode } from "@/lib/utils/countryCodes";

interface CountrySelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    error?: boolean;
}

// Deduplicate countries by ISO code (some countries have multiple phone codes)
const uniqueCountries = countryCodes.reduce((acc, country) => {
    if (!acc.find(c => c.isoCode === country.isoCode)) {
        acc.push(country);
    }
    return acc;
}, [] as CountryCode[]);

// Sort alphabetically by name
const sortedCountries = [...uniqueCountries].sort((a, b) => a.name.localeCompare(b.name));

// Common countries to show at the top
const commonCountryCodes = ["gb", "us", "ca", "au", "ie", "de", "fr", "es", "it", "nl"];
const commonCountries = commonCountryCodes
    .map(code => sortedCountries.find(c => c.isoCode === code))
    .filter((c): c is CountryCode => c !== undefined);

export function CountrySelector({
    value,
    onChange,
    disabled = false,
    placeholder = "Select country",
    error = false,
}: CountrySelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Find selected country by name or ISO code
    const selectedCountry = useMemo(() => {
        if (!value) return null;
        const lowerValue = value.toLowerCase();
        return sortedCountries.find(
            (c) =>
                c.name.toLowerCase() === lowerValue ||
                c.isoCode.toLowerCase() === lowerValue
        );
    }, [value]);

    const filteredCountries = useMemo(() => {
        if (!searchQuery) return sortedCountries;
        const lowerQuery = searchQuery.toLowerCase();
        return sortedCountries.filter(
            (c) =>
                c.name.toLowerCase().includes(lowerQuery) ||
                c.isoCode.toLowerCase().includes(lowerQuery)
        );
    }, [searchQuery]);

    // Focus search input when popover opens
    useEffect(() => {
        if (open && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }
    }, [open]);

    const handleSelect = (country: CountryCode) => {
        onChange(country.name);
        setOpen(false);
        setSearchQuery("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between px-3 h-12 border-[#DFE0E4] rounded-xl bg-white hover:bg-gray-50 text-[#010D50] font-normal",
                        error && "border-red-500",
                        !selectedCountry && "text-gray-400"
                    )}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {selectedCountry ? (
                            <>
                                <span className={cn("fi", `fi-${selectedCountry.isoCode}`, "flex-shrink-0 w-5 h-4")} />
                                <span className="font-medium truncate">{selectedCountry.name}</span>
                            </>
                        ) : (
                            <>
                                <Globe className="w-4 h-4 flex-shrink-0 text-gray-400" />
                                <span>{placeholder}</span>
                            </>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 bg-white border border-[#DFE0E4] shadow-xl rounded-xl z-[100]"
                align="start"
                side="bottom"
                sideOffset={4}
                data-lenis-prevent
            >
                <div className="flex items-center border-b border-[#DFE0E4] px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-[#3A478A]" />
                    <input
                        ref={searchInputRef}
                        placeholder="Search country..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 h-9 bg-transparent border-none outline-none focus:ring-0 px-0 text-sm placeholder:text-gray-400 text-[#010D50]"
                    />
                </div>
                <div 
                    className="max-h-[300px] overflow-y-auto overflow-x-hidden py-1 overscroll-contain"
                    data-lenis-prevent
                >
                    {filteredCountries.length === 0 ? (
                        <div className="py-6 text-center text-sm text-gray-500">
                            No country found.
                        </div>
                    ) : (
                        <>
                            {/* Common countries section - only show when not searching */}
                            {!searchQuery && (
                                <>
                                    <div className="px-3 py-1.5 text-xs font-medium text-[#3A478A] bg-gray-50">
                                        Common
                                    </div>
                                    {commonCountries.map((country) => (
                                        <button
                                            key={`common-${country.isoCode}`}
                                            onClick={() => handleSelect(country)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-[#F5F7FF] transition-colors",
                                                selectedCountry?.isoCode === country.isoCode && "bg-[#F5F7FF]"
                                            )}
                                        >
                                            <span className={cn("fi", `fi-${country.isoCode}`, "flex-shrink-0 w-5 h-4")} />
                                            <span className="text-[#010D50] flex-1 truncate">
                                                {country.name}
                                            </span>
                                            {selectedCountry?.isoCode === country.isoCode && (
                                                <Check className="h-4 w-4 text-[#3754ED] flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                    <div className="px-3 py-1.5 text-xs font-medium text-[#3A478A] bg-gray-50 border-t border-[#DFE0E4]">
                                        All Countries
                                    </div>
                                </>
                            )}
                            {filteredCountries.map((country) => (
                                <button
                                    key={country.isoCode}
                                    onClick={() => handleSelect(country)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-[#F5F7FF] transition-colors",
                                        selectedCountry?.isoCode === country.isoCode && "bg-[#F5F7FF]"
                                    )}
                                >
                                    <span className={cn("fi", `fi-${country.isoCode}`, "flex-shrink-0 w-5 h-4")} />
                                    <span className="text-[#010D50] flex-1 truncate">
                                        {country.name}
                                    </span>
                                    {selectedCountry?.isoCode === country.isoCode && (
                                        <Check className="h-4 w-4 text-[#3754ED] flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}


