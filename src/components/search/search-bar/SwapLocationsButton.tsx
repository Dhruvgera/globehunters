"use client";

import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwapLocationsButtonProps {
  onSwap: () => void;
}

export function SwapLocationsButton({ onSwap }: SwapLocationsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full shrink-0 h-8 w-8 self-center md:self-auto -my-1 md:my-0 border border-[#D3D3D3] bg-white shadow-sm"
      onClick={onSwap}
    >
      <ArrowLeftRight className="w-5 h-5 text-[#010D50]" />
    </Button>
  );
}
