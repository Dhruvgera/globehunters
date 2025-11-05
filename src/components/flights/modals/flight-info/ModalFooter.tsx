"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface ModalFooterProps {
  price: number;
  onBook: () => void;
}

export function ModalFooter({ price, onBook }: ModalFooterProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-[#DFE0E4]">
      <div className="flex flex-col">
        <span className="text-xs text-[#3A478A]">Total Price</span>
        <span className="text-xl font-bold text-[#010D50]">£{price}</span>
      </div>
      <Button
        onClick={onBook}
        className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-6 h-10 font-semibold"
      >
        Book Now
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
