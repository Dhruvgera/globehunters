"use client";

import Image from "next/image";
import { useState, ReactNode } from "react";

interface Airline {
  name: string;
  code: string;
}

interface AirlineHeaderProps {
  airline: Airline;
  rightContent?: ReactNode;
}

export function AirlineHeader({ airline, rightContent }: AirlineHeaderProps) {
  const [imgError, setImgError] = useState(false);
  
  // Use airhex.com for airline logos
  const logoUrl = `https://images.kiwi.com/airlines/64/${airline.code}.png`;
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {!imgError ? (
          <div className="w-10 h-10 relative flex items-center justify-center">
            <Image
              src={logoUrl}
              alt={`${airline.name} logo`}
              width={40}
              height={40}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          // Fallback to colored box with code if image fails
          <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">{airline.code}</span>
          </div>
        )}
        <span className="text-sm font-semibold text-[#010D50]">
          {airline.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
      </div>
    </div>
  );
}
