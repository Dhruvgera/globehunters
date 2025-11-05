"use client";

import { MapPin } from "lucide-react";

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Country, city or airport",
}: LocationInputProps) {
  return (
    <div className="flex items-center gap-2 flex-1 border border-[#D3D3D3] rounded-xl px-3 py-2.5 bg-white">
      <MapPin className="w-5 h-5 text-[#010D50]" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 outline-none text-sm font-medium text-[#010D50] placeholder:text-gray-400"
      />
    </div>
  );
}
