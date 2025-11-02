"use client";

import { useState } from "react";
import { X, Info, ChevronLeft, ChevronRight, ShoppingBag, Briefcase, Package, XCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fareOptions = [
  {
    id: "value",
    name: "Eco Value",
    price: "$48.00",
    features: [
      {
        icon: "personal_bag",
        title: "1 personal item",
        description: "Fits under the seat in front of you",
      },
      {
        icon: "luggage",
        title: "1 carry-on bag",
        description: "Max weight 10 kg",
      },
      {
        icon: "checked_bags",
        title: "2 checked bags",
        description: "Max weight 23 kg",
      },
      {
        icon: "non_refundable",
        title: "Non-Refundable",
        description: "Ticket can't be refunded",
      },
      {
        icon: "no_changes",
        title: "Changes not allowed",
        description: "Flights can't be changed after booking",
      },
      {
        icon: "seat_choice",
        title: "Seat choice for free",
        description: "Choose your desired seat for free",
      },
    ],
  },
  {
    id: "classic",
    name: "Eco Classic",
    price: "$68.00",
    features: [
      {
        icon: "personal_bag",
        title: "1 personal item",
        description: "Fits under the seat in front of you",
      },
      {
        icon: "luggage",
        title: "1 carry-on bag",
        description: "Max weight 10 kg",
      },
      {
        icon: "checked_bags",
        title: "2 checked bags",
        description: "Max weight 23 kg",
      },
      {
        icon: "non_refundable",
        title: "Non-Refundable",
        description: "Ticket can't be refunded",
      },
      {
        icon: "no_changes",
        title: "Changes not allowed",
        description: "Flights can't be changed after booking",
      },
      {
        icon: "seat_choice",
        title: "Seat choice for free",
        description: "Choose your desired seat for free",
      },
    ],
  },
  {
    id: "flex",
    name: "Eco Flex",
    price: "$88.00",
    features: [
      {
        icon: "personal_bag",
        title: "1 personal item",
        description: "Fits under the seat in front of you",
      },
      {
        icon: "luggage",
        title: "1 carry-on bag",
        description: "Max weight 10 kg",
      },
      {
        icon: "checked_bags",
        title: "2 checked bags",
        description: "Max weight 23 kg",
      },
      {
        icon: "non_refundable",
        title: "Non-Refundable",
        description: "Ticket can't be refunded",
      },
      {
        icon: "no_changes",
        title: "Changes not allowed",
        description: "Flights can't be changed after booking",
      },
      {
        icon: "seat_choice",
        title: "Seat choice for free",
        description: "Choose your desired seat for free",
      },
    ],
  },
];

export default function UpgradeOptionsModal({
  open,
  onOpenChange,
}: UpgradeOptionsModalProps) {
  const [selectedFare, setSelectedFare] = useState<string>("classic");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100vw-24px,960px)] max-h-[90vh] overflow-y-auto p-4 sm:p-6 gap-3 sm:gap-4 [&>button]:hidden bg-white rounded-3xl border-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Upgrade options</DialogTitle>
        </DialogHeader>
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {/* Fare Options */}
        <div className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
          {fareOptions.map((fare) => (
            <div
              key={fare.id}
              onClick={() => setSelectedFare(fare.id)}
              className={`min-w-[260px] sm:min-w-0 flex-1 rounded-[20px] p-4 cursor-pointer transition-all snap-start ${
                selectedFare === fare.id
                  ? "border-[3px] border-[#3754ED] bg-white shadow-[0px_4px_12px_0px_rgba(0,0,0,0.32)]"
                  : "border border-[#DFE0E4] bg-[#F5F7FF] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.32)]"
              }`}
            >
              <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold text-[#010D50]">
                      {fare.name}
                    </span>
                    <span className="text-[20px] font-medium text-[#010D50]">
                      {fare.price}
                    </span>
                  </div>
                  {selectedFare === fare.id && (
                    <div className="w-8 h-8 rounded-full bg-[#3754ED] flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="flex flex-col gap-4">
                  <span className="text-sm text-[#3A478A]">
                    Included in this fair:
                  </span>
                  <div className="flex flex-col gap-3">
                    {fare.features.map((feature, index) => {
                      const IconComponent = 
                        feature.icon === "personal_bag" ? ShoppingBag :
                        feature.icon === "luggage" ? Briefcase :
                        feature.icon === "checked_bags" ? Package :
                        feature.icon === "non_refundable" ? XCircle :
                        feature.icon === "no_changes" ? XCircle :
                        feature.icon === "seat_choice" ? Check :
                        ShoppingBag;
                      
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <IconComponent className="w-6 h-6 text-[#010D50] shrink-0" />
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-[#010D50]">
                              {feature.title}
                            </span>
                            <span className="text-sm text-[#3A478A]">
                              {feature.description}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button className="w-8 h-8 rounded-full border border-[#DFE0E4] bg-white flex items-center justify-center hover:bg-gray-50">
            <ChevronLeft className="w-5 h-5 text-[#010D50]" />
          </button>

          <Button className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto gap-1 text-sm font-bold">
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

