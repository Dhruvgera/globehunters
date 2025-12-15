"use client";

import { useEffect, useState } from "react";
import { X, Check, Briefcase, Package, ChevronLeft, ChevronRight, Info, RotateCcw, RefreshCw, Armchair, UtensilsCrossed } from "lucide-react";
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

/** Feature item for display */
interface FeatureItem {
  icon: 'check' | 'info' | 'x';
  iconComponent: typeof Check;
  title: string;
  description?: string;
}

/** Build features from OptionalService data */
function buildFeaturesFromOption(option: TransformedPriceOption): FeatureItem[] {
  const features: FeatureItem[] = [];
  
  // Checked Baggage from OptionalService
  if (option.checkedBaggageServices && option.checkedBaggageServices.length > 0) {
    option.checkedBaggageServices.forEach((svc) => {
      features.push({
        icon: svc.chargeable === 'included' ? 'check' : 'info',
        iconComponent: Package,
        title: svc.text || 'Checked baggage',
        description: svc.chargeable === 'included' ? 'Included in fare' : 'Available for a charge',
      });
    });
  } else if (option.baggage?.description) {
    // Fallback to old baggage data
    features.push({
      icon: 'check',
      iconComponent: Package,
      title: option.baggage.description,
      description: option.baggage.details?.substring(0, 80),
    });
  }
  
  // Carry-on Baggage from OptionalService
  if (option.carryOnBaggageServices && option.carryOnBaggageServices.length > 0) {
    option.carryOnBaggageServices.forEach((svc) => {
      features.push({
        icon: svc.chargeable === 'included' ? 'check' : 'info',
        iconComponent: Briefcase,
        title: svc.text || 'Hand baggage',
        description: svc.chargeable === 'included' ? 'Included in fare' : 'Available for a charge',
      });
    });
  }
  
  // Refund from OptionalService
  if (option.refundService) {
    const isIncluded = option.refundService.chargeable === 'included';
    const isChargeable = option.refundService.chargeable === 'chargeable';
    features.push({
      icon: isIncluded ? 'check' : isChargeable ? 'info' : 'x',
      iconComponent: RotateCcw,
      title: isIncluded ? 'Refunds included' : isChargeable ? 'Refunds available' : 'Refunds',
      description: isIncluded ? 'Ticket can be refunded' : isChargeable ? 'Refundable for a charge' : option.refundService.text,
    });
  }
  
  // Rebooking/Changes from OptionalService
  if (option.rebookingService) {
    const isIncluded = option.rebookingService.chargeable === 'included';
    const isChargeable = option.rebookingService.chargeable === 'chargeable';
    features.push({
      icon: isIncluded ? 'check' : isChargeable ? 'info' : 'x',
      iconComponent: RefreshCw,
      title: isIncluded ? 'Changes included' : isChargeable ? 'Changes available' : 'Changes',
      description: isIncluded ? 'Free flight changes' : isChargeable ? 'Changes for a charge' : option.rebookingService.text,
    });
  }
  
  // Seat Selection from OptionalService
  if (option.seatServices && option.seatServices.length > 0) {
    const seatService = option.seatServices.find(s => s.chargeable !== 'not_offered');
    if (seatService) {
      const isIncluded = seatService.chargeable === 'included';
      features.push({
        icon: isIncluded ? 'check' : 'info',
        iconComponent: Armchair,
        title: seatService.text || 'Seat selection',
        description: isIncluded ? 'Included in fare' : 'Available for a charge',
      });
    }
  }
  
  // Meals from OptionalService
  if (option.mealsService) {
    const isIncluded = option.mealsService.chargeable === 'included';
    features.push({
      icon: isIncluded ? 'check' : 'info',
      iconComponent: UtensilsCrossed,
      title: option.mealsService.text || 'Meals and beverages',
      description: isIncluded ? 'Included in fare' : 'Available for purchase',
    });
  }
  
  return features;
}

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

  // Map API options to fare display format
  const fares = apiOptions.map((o) => ({
    id: o.id,
    name: o.cabinClassDisplay,
    cabinName: o.cabinName,
    // Always show actual total fare, not price difference
    price: formatPrice(o.totalPrice, o.currency),
    features: buildFeaturesFromOption(o),
    _raw: o,
  }));

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

        {/* No upgrade options available */}
        {!hasApiOptions && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Info className="w-12 h-12 text-[#3754ED] mb-4" />
            <h3 className="text-lg font-semibold text-[#010D50] mb-2">
              No Upgrade Options Available
            </h3>
            <p className="text-sm text-[#3A478A] max-w-md">
              There are no cabin upgrade options available for this flight at the moment. You can proceed with your current selection.
            </p>
          </div>
        )}

        {/* Fare Options */}
        {hasApiOptions && (
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

                {/* Features - Using OptionalService data */}
                <div className="flex flex-col gap-2 sm:gap-4">
                  <span className="text-xs sm:text-sm text-[#3A478A]">
                    {t('includedInFare')}
                  </span>
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {fare.features.length > 0 ? (
                      fare.features.map((feature, index) => {
                        const IconComponent = feature.iconComponent;
                        // Determine icon color based on status
                        const iconColorClass = 
                          feature.icon === 'check' ? 'text-[#008234]' :
                          feature.icon === 'info' ? 'text-[#F59E0B]' :
                          'text-[#DC2626]';
                        
                        return (
                          <div key={index} className="flex items-start gap-2 sm:gap-3">
                            <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColorClass} shrink-0 mt-0.5`} />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                                {feature.title}
                              </span>
                              {feature.description && (
                                <span className="text-xs text-[#3A478A]">
                                  {feature.description}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // Fallback when no features available
                      <span className="text-xs text-[#3A478A]">
                        See flight details for more information
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Navigation */}
        {hasApiOptions && (
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
        )}
      </DialogContent>
    </Dialog>
  );
}

