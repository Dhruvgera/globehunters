"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { countryCodes } from "@/lib/utils/countryCodes";

interface CountryCodeSelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function CountryCodeSelector({
    value,
    onChange,
    disabled = false,
}: CountryCodeSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const selectedCountry = useMemo(() => {
        return countryCodes.find((c) => c.code === value) || countryCodes.find(c => c.code === "+44");
    }, [value]);

    const filteredCountries = useMemo(() => {
        if (!searchQuery) return countryCodes;
        const lowerQuery = searchQuery.toLowerCase();
        return countryCodes.filter(
            (c) =>
                c.name.toLowerCase().includes(lowerQuery) ||
                c.code.toLowerCase().includes(lowerQuery)
        );
    }, [searchQuery]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-[120px] sm:w-[140px] justify-between px-3 h-12 border-[#DFE0E4] rounded-xl bg-white hover:bg-gray-50 text-[#010D50]"
                >
                    <div className="flex items-center gap-2">
                        {selectedCountry && (
                            <span className={cn("fi", `fi-${selectedCountry.isoCode}`, "flex-shrink-0 w-4 h-3")} />
                        )}
                        <span className="font-medium whitespace-nowrap">{value || "+44"}</span>
                    </div>
                    <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[300px] p-0 bg-white border border-[#DFE0E4] shadow-xl rounded-xl z-[100]"
                align="start"
                side="bottom"
                sideOffset={4}
                data-lenis-prevent
            >
                <div className="flex items-center border-b border-[#DFE0E4] px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-[#3A478A]" />
                    <input
                        placeholder="Search country or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 h-9 bg-transparent border-none outline-none focus:ring-0 px-0 text-sm placeholder:text-gray-400 text-[#010D50]"
                        autoFocus
                    />
                </div>
                <div 
                    className="h-[300px] overflow-y-auto overflow-x-hidden py-1 overscroll-contain"
                    data-lenis-prevent
                >
                    {filteredCountries.length === 0 ? (
                        <div className="py-6 text-center text-sm text-gray-500">
                            No country found.
                        </div>
                    ) : (
                        filteredCountries.map((country) => (
                            <button
                                key={`${country.isoCode}-${country.code}`}
                                onClick={() => {
                                    onChange(country.code);
                                    setOpen(false);
                                    setSearchQuery("");
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-[#F5F7FF] transition-colors",
                                    value === country.code && "bg-[#F5F7FF]"
                                )}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className={cn("fi", `fi-${country.isoCode}`, "flex-shrink-0 w-4 h-3")} />
                                    <span className="font-semibold text-[#010D50] w-12 flex-shrink-0">
                                        {country.code}
                                    </span>
                                    <span className="text-[#3A478A] truncate">
                                        {country.name}
                                    </span>
                                </div>
                                {value === country.code && (
                                    <Check className="h-4 w-4 text-[#3754ED] flex-shrink-0" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
