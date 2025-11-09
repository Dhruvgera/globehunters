"use client";

import { useEffect, useState } from "react";
import { X, Check, Briefcase, Package, ShoppingBag, XCircle, ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useBookingStore, usePriceCheckData } from "@/store/bookingStore";
import type { TransformedPriceOption } from "@/types/priceCheck";
import { formatPrice } from "@/lib/currency";

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
  const t = useTranslations('upgradeOptions');
  const [selectedFare, setSelectedFare] = useState<string>("");
  const [highlightedFare, setHighlightedFare] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);
  const setSelectedUpgrade = useBookingStore((s) => s.setSelectedUpgrade);
  const priceCheckData = usePriceCheckData();

  const apiOptions: TransformedPriceOption[] = priceCheckData?.priceOptions || [];
  const hasApiOptions = apiOptions.length > 0;

  function normalizeFeatureIcon(title: string): 'personal_bag' | 'luggage' | 'checked_bags' | 'non_refundable' | 'no_changes' | 'seat_choice' | 'info' {
    const t = (title || '').toLowerCase();
    if (t.includes('bag') || t.includes('baggage') || t.includes('luggage')) return 'checked_bags';
    if (t.includes('seat')) return 'seat_choice';
    if (t.includes('change')) return 'no_changes';
    if (t.includes('refund')) return 'non_refundable';
    return 'info';
  }
  function mapIcon(name: string) {
    return name === "personal_bag" ? ShoppingBag :
      name === "luggage" ? Briefcase :
      name === "checked_bags" ? Package :
      name === "non_refundable" ? XCircle :
      name === "no_changes" ? XCircle :
      name === "seat_choice" ? Check :
      Info;
  }

  // Choose defaults when API options are available
  const fares = hasApiOptions
    ? apiOptions.map((o) => ({
        id: o.id,
        name: o.cabinClassDisplay,
        // show incremental difference if upgrade, else total price
        price: o.isUpgrade && o.priceDifference
          ? `+${formatPrice(o.priceDifference, o.currency)}`
          : formatPrice(o.totalPrice, o.currency),
        baggageDesc: o.baggage?.description,
        baggageDetails: o.baggage?.details,
        _raw: o,
      }))
    : fareOptions;

  // Initialize selected/highlighted when opening with API data
  useEffect(() => {
    if (!open) return;
    if (!hasApiOptions) return;
    if (highlightedFare) return;
    const first = apiOptions[0];
    if (first?.id) {
      setHighlightedFare(first.id);
      setSelectedFare(first.id);
    }
  }, [open, hasApiOptions, apiOptions, highlightedFare, setHighlightedFare, setSelectedFare]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100vw-24px,1100px)] max-h-[90vh] overflow-y-auto p-4 sm:p-6 gap-3 sm:gap-4 [&>button]:hidden bg-white rounded-3xl border-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">{t('close')}</span>
        </button>

        {/* Fare Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-4 px-1">
          {fares.map((fare) => (
            <div
              key={fare.id}
              onClick={() => setHighlightedFare(fare.id)}
              className={`w-full rounded-xl p-3 sm:p-4 cursor-pointer transition-all ${
                highlightedFare === fare.id
                  ? "border-[3px] border-[#3754ED] bg-white shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)]"
                  : "border border-[#DFE0E4] bg-[#F5F7FF] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)]"
              }`}
            >
              <div className="flex flex-col h-full gap-3 sm:gap-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1 sm:gap-3">
                    <span className="text-sm font-semibold text-[#010D50]">
                      {fare.name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                    </span>
                    <span className="text-lg sm:text-[20px] font-bold sm:font-medium text-[#3754ED] sm:text-[#010D50]">
                      {fare.price}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFare(fare.id);
                      setHighlightedFare(fare.id);
                    }}
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedFare === fare.id
                        ? "bg-[#3754ED] border-[#3754ED]"
                        : "bg-white border-[#DFE0E4]"
                    }`}
                  >
                    {selectedFare === fare.id && (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    )}
                  </button>
                </div>

                {/* Features */}
                <div className="flex flex-col gap-2 sm:gap-4">
                  <span className="text-xs sm:text-sm text-[#3A478A]">
                    {t('includedInFare')}
                  </span>
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {(() => {
                      if (hasApiOptions && (fare as any).baggageDesc) {
                        const raw = (fare as any)._raw as TransformedPriceOption;
                        const brandFeatures: string[] = [];
                        (raw?.brandInfo || []).forEach((b: any) => {
                          if (Array.isArray(b?.features)) {
                            b.features.forEach((f: any) => typeof f === 'string' && brandFeatures.push(f));
                          } else {
                            Object.values(b || {}).forEach((v: any) => {
                              if (typeof v === 'string' && /refund|change|seat/i.test(v)) {
                                brandFeatures.push(v);
                              }
                            });
                          }
                        });
                        const refundable = priceCheckData?.flightDetails?.refundable ?? false;
                        const features = [
                          {
                            icon: "checked_bags",
                            title: (fare as any).baggageDesc as string,
                            description: (fare as any).baggageDetails?.substring(0, 100) as string | undefined,
                          },
                          {
                            icon: refundable ? "seat_choice" : "non_refundable",
                            title: refundable ? "Refundable" : "Non-Refundable",
                            description: refundable ? "Ticket can be refunded per fare rules" : "Ticket can't be refunded",
                          },
                          // Personal item and carry-on are universally included; omit to avoid noise
                          // Additional brand features when available
                          ...brandFeatures.slice(0, 6).map((txt) => ({
                            icon: normalizeFeatureIcon(txt),
                            title: txt,
                            description: undefined as string | undefined,
                          })),
                        ];
                        return features.map((feature: any, index: number) => {
                          const IconComponent = mapIcon(feature.icon);
                          return (
                            <div key={index} className="flex items-start gap-2 sm:gap-3">
                              <IconComponent className={`w-4 h-4 sm:w-6 sm:h-6 ${feature.icon === 'non_refundable' ? 'text-[#FF3B30]' : 'text-[#010D50]'} shrink-0 mt-0.5`} />
                              <div className="flex flex-col gap-0.5 sm:gap-1">
                                <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                  {feature.title}
                                </span>
                                {feature.description && (
                                  <span className="text-xs sm:text-sm text-[#3A478A]">
                                    {feature.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      }
                      // Fallback to demo features when API not available
                      return ((fare as any).features || []).map((feature: any, index: number) => {
                        const IconComponent = mapIcon(feature.icon);
                        return (
                          <div key={index} className="flex items-start gap-2 sm:gap-3">
                            <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5 sm:gap-1">
                              <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                {feature.title}
                              </span>
                              {feature.description && (
                                <span className="text-xs sm:text-sm text-[#3A478A]">
                                  {feature.description}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
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

          <Button 
            onClick={() => {
              if (isApplying) return;
              setIsApplying(true);
              try {
                if (hasApiOptions) {
                  const chosen = apiOptions.find((o) => o.id === (selectedFare || highlightedFare)) || apiOptions[0];
                  if (chosen) {
                    setSelectedUpgrade(chosen);
                  }
                }
              } finally {
                // Close on next frame to allow store-driven UI (e.g., price summary) to update smoothly
                if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
                  requestAnimationFrame(() => onOpenChange(false));
                } else {
                  setTimeout(() => onOpenChange(false), 0);
                }
                // No need to reset isApplying; component will unmount on close
              }
            }}
            disabled={isApplying || (hasApiOptions && !((selectedFare || highlightedFare) || apiOptions[0]))}
            className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto gap-1 text-sm font-bold disabled:opacity-50"
          >
            Book
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

