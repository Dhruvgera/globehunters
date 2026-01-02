import React from "react";
import { 
  Package, 
  Check, 
  Info, 
  X as XIcon, 
  Briefcase, 
  ShoppingBag, 
  RotateCcw, 
  RefreshCw, 
  Armchair, 
  UtensilsCrossed 
} from "lucide-react";
import { Flight, FlightSegment } from "@/types/flight";
import { PriceCheckResult, TransformedPriceOption } from "@/types/priceCheck";

interface FlightDetailedInfoProps {
  flight: Flight;
  segment?: FlightSegment;
  priceCheck?: PriceCheckResult | null;
  selectedUpgradeOption?: TransformedPriceOption | null;
}

export default function FlightDetailedInfo({
  flight,
  segment,
  priceCheck,
  selectedUpgradeOption,
}: FlightDetailedInfoProps) {
  
  // Helper functions from FlightInfoModal
  function normalizeBaggageLabel(label?: string): string {
    if (!label) return '';
    const code = String(label).trim();
    const match = code.match(/(\d+)p/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num === 0) return 'Cabin bag only';
      if (num === 1) return '1 piece';
      return `${num} pieces`;
    }
    if (code.endsWith('***')) return 'Cabin bag only';
    return label;
  }

  function hasSegmentBaggage(): boolean {
    const label = segment?.segmentBaggage;
    const qty = segment?.segmentBaggageQuantity;
    const lower = label ? String(label).toLowerCase() : '';
    if (lower === 'none' || lower === 'no' || lower === '0') return false;
    if (qty && qty !== '0') return true;
    return !!label;
  }

  function formatBaggageText(): string {
    // Prefer segment baggage; fallback to flight-level
    if (hasSegmentBaggage()) {
      const qty = segment?.segmentBaggageQuantity;
      const unit = segment?.segmentBaggageUnit;
      const label = segment?.segmentBaggage || '';
      const lower = label ? label.toLowerCase() : '';
      if (lower === 'none' || lower === 'no' || lower === '0') return '';
      if (qty && unit) {
        const u = String(unit).toLowerCase();
        const normUnit = u === 'k' ? 'kg' : (u === 'p' ? 'pc' : unit);
        return `${qty} ${normUnit}`;
      }
      return label;
    }
    // Flight-level baggage (e.g., "Included")
    if (flight.hasBaggage && flight.baggage) {
      const lower = String(flight.baggage).toLowerCase();
      if (lower === 'none' || lower === 'no' || lower === '0') return '';
      return String(flight.baggage);
    }
    return '';
  }

  function getBaggageDetails(): string {
    if (hasSegmentBaggage()) {
      const unit = segment?.segmentBaggageUnit;
      if (unit) {
        const u = String(unit).toLowerCase();
        if (u === 'p' || u === 'pc') {
          return 'Consult airline policy';
        }
        if (u === 'k' || u === 'kg') {
          return '';
        }
      }
    }
    return '';
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Segment Baggage (conditional, prefer leg-specific baggage) */}
      {formatBaggageText() && (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-[#010D50]">
            Included Baggage
          </span>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex flex-col gap-3">
              <span className="text-sm font-medium text-[#010D50]">Baggage Allowance</span>
              <div className="flex items-start gap-2">
                <Package className="w-5 h-5 text-[#010D50] shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-[#010D50]">{normalizeBaggageLabel(formatBaggageText())}</span>
                  {getBaggageDetails() && (
                    <span className="text-xs text-[#3A478A]">{getBaggageDetails()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refundable and Meals (Extras) */}
      {(flight.refundable !== null || flight.meals !== undefined) && (
        <div className="flex flex-col md:flex-row gap-3">
          {flight.refundable !== null && (
            <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex items-start gap-3">
              <Info className={`w-5 h-5 ${flight.refundable ? 'text-[#008234]' : 'text-[#FF0202]'} shrink-0`} />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[#010D50]">
                  {flight.refundable ? 'Refundable' : 'Non-Refundable'}
                </span>
                {flight.refundableText && (
                  <span className="text-xs text-[#3A478A] break-words">{flight.refundableText}</span>
                )}
              </div>
            </div>
          )}
          {flight.meals !== undefined && (
            <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 flex items-start gap-3">
              <UtensilsCrossed className="w-5 h-5 text-[#010D50] shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[#010D50]">
                  {flight.meals ? 'Meals included' : 'Meals not included'}
                </span>
                {flight.meals && (
                  <span className="text-xs text-[#3A478A]">Complimentary meals and beverages</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fare Details Section (Dynamic from Price Check or Flight data fallback) */}
      {/* Always show if we have data, even if loading finished */}
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        {/* Baggage Section - From OptionalService tags or fallback */}
        <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-4 sm:gap-6 min-w-0">
          <span className="text-sm font-semibold text-[#010D50]">
            Baggage Details
          </span>
          <div className="flex flex-col gap-3">
            {/* Checked Baggage */}
            {(() => {
              const checkedBaggageServices = selectedUpgradeOption?.checkedBaggageServices || [];
              if (checkedBaggageServices.length > 0) {
                return checkedBaggageServices.map((svc, idx) => (
                  <div key={`checked-${idx}`} className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                          {svc.text || 'Checked baggage'}
                        </span>
                        <span className="text-xs sm:text-sm text-[#3A478A]">
                          {svc.chargeable === 'included' ? 'Included in fare' : 'Available for a charge'}
                        </span>
                      </div>
                    </div>
                    {svc.chargeable === 'included' ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    ) : (
                      <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                    )}
                  </div>
                ));
              }

              // Fallback to old baggage data
              if (selectedUpgradeOption) {
                const perLeg = selectedUpgradeOption.baggage.perLeg;
                const hasDifferentBaggage = perLeg && perLeg.length > 1 &&
                  !perLeg.every(leg => leg.allowance === perLeg[0].allowance);

                if (hasDifferentBaggage && perLeg) {
                  return perLeg.map((leg, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                            {leg.allowance}
                          </span>
                          <span className="text-xs sm:text-sm text-[#3A478A]">
                            {leg.route}
                          </span>
                        </div>
                      </div>
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    </div>
                  ));
                }

                return (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                          {selectedUpgradeOption.baggage.description}
                        </span>
                      </div>
                    </div>
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                  </div>
                );
              }

              // Flight-level fallback
              const baggageDisplay = flight.baggage || 'Cabin bag included';
              return (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                        {baggageDisplay}
                      </span>
                    </div>
                  </div>
                  {flight.hasBaggage ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                  ) : (
                    <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                  )}
                </div>
              );
            })()}

            {/* Carry-On / Hand Baggage */}
            {(() => {
              const carryOnServices = selectedUpgradeOption?.carryOnBaggageServices || [];
              if (carryOnServices.length > 0) {
                return carryOnServices.map((svc, idx) => (
                  <div key={`carryon-${idx}`} className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                          {svc.text || 'Hand baggage'}
                        </span>
                        <span className="text-xs sm:text-sm text-[#3A478A]">
                          {svc.chargeable === 'included' ? 'Included in fare' : 'Available for a charge'}
                        </span>
                      </div>
                    </div>
                    {svc.chargeable === 'included' ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    ) : (
                      <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                    )}
                  </div>
                ));
              }

              return (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                        1 carry-on bag
                      </span>
                      <span className="text-xs sm:text-sm text-[#3A478A]">
                        Standard size restrictions apply
                      </span>
                    </div>
                  </div>
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                </div>
              );
            })()}

            {/* Personal Item */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                    1 personal item
                  </span>
                  <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                    Fits under the seat in front of you
                  </span>
                </div>
              </div>
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
            </div>
          </div>
        </div>

        {/* Flexibility Section */}
        <div className="flex-1 bg-[#F5F7FF] rounded-xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 min-w-0">
          <span className="text-sm font-semibold text-[#010D50]">
            Flexibility
          </span>
          <div className="flex flex-col gap-3">
            {/* Refunds */}
            {(() => {
              const refundService = selectedUpgradeOption?.refundService;
              if (refundService) {
                const isIncluded = refundService.chargeable === 'included';
                const isChargeable = refundService.chargeable === 'chargeable';
                let displayLabel = 'Refunds';
                let displayText = refundService.text || 'Refunds';
                if (isIncluded) {
                  displayLabel = 'Refunds included';
                  displayText = 'Ticket can be refunded';
                } else if (isChargeable) {
                  displayLabel = 'Refunds available';
                  displayText = 'Refundable for a charge';
                }
                return (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                          {displayLabel}
                        </span>
                        <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                          {displayText}
                        </span>
                      </div>
                    </div>
                    {isIncluded ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    ) : isChargeable ? (
                      <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                    ) : (
                      <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                    )}
                  </div>
                );
              }
              // Use selected option's refundable status first, then fallback to priceCheck.flightDetails or flight data
              const isRefundable = selectedUpgradeOption?.refundable ?? priceCheck?.flightDetails?.refundable ?? flight.refundable ?? false;
              const refundableStatus = selectedUpgradeOption?.refundableStatus ?? priceCheck?.flightDetails?.refundableStatus;
              const refundableText = selectedUpgradeOption?.refundableText ?? priceCheck?.flightDetails?.refundableText ?? flight.refundableText ?? (isRefundable ? 'Ticket can be refunded (fees may apply)' : 'Ticket can\'t be refunded');
              let displayLabel = 'Non-Refundable';
              if (refundableStatus === 'fully-refundable') displayLabel = 'Fully Refundable';
              else if (refundableStatus === 'refundable-with-penalty') displayLabel = 'Refundable with Penalty';
              else if (isRefundable) displayLabel = 'Refundable';

              return (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                        {displayLabel}
                      </span>
                      <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                        {refundableText}
                      </span>
                    </div>
                  </div>
                  {refundableStatus === 'fully-refundable' ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                  ) : refundableStatus === 'refundable-with-penalty' || refundableStatus === 'refundable' ? (
                    <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                  ) : (
                    <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                  )}
                </div>
              );
            })()}

            {/* Changes */}
            {(() => {
              const rebookingService = selectedUpgradeOption?.rebookingService;
              if (rebookingService) {
                const isIncluded = rebookingService.chargeable === 'included';
                const isChargeable = rebookingService.chargeable === 'chargeable';
                let displayLabel = 'Changes';
                let displayText = rebookingService.text || 'Changes';
                if (isIncluded) {
                  displayLabel = 'Changes included';
                  displayText = 'Flights can be changed for free';
                } else if (isChargeable) {
                  displayLabel = 'Changes available';
                  displayText = 'Flights can be changed for a charge';
                }
                return (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                          {displayLabel}
                        </span>
                        <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                          {displayText}
                        </span>
                      </div>
                    </div>
                    {isIncluded ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    ) : isChargeable ? (
                      <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                    ) : (
                      <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                    )}
                  </div>
                );
              }
              // Fallback
              return (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                        {priceCheck?.flightDetails?.changeable ? 'Changes allowed' : 'Changes not allowed'}
                      </span>
                      <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                        {priceCheck?.flightDetails?.changeable
                          ? 'Flights can be changed (fees may apply)'
                          : 'Flights can\'t be changed after booking'}
                      </span>
                    </div>
                  </div>
                  {priceCheck?.flightDetails?.changeable ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                  ) : (
                    <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                  )}
                </div>
              );
            })()}

            {/* Seat Selection */}
            {(() => {
              const seatServices = selectedUpgradeOption?.seatServices || [];
              const seatService = seatServices.find(s => s.chargeable !== 'not_offered');
              if (seatService) {
                const isIncluded = seatService.chargeable === 'included';
                const isChargeable = seatService.chargeable === 'chargeable';
                let displayLabel = seatService.text || 'Seat selection';
                let displayText = '';
                if (isIncluded) displayText = 'Included in fare';
                else if (isChargeable) displayText = 'Available for a charge';
                return (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Armchair className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                          {displayLabel}
                        </span>
                        {displayText && (
                          <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                            {displayText}
                          </span>
                        )}
                      </div>
                    </div>
                    {isIncluded ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    ) : isChargeable ? (
                      <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                    ) : (
                      <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                    )}
                  </div>
                );
              }
              // Fallback
              return (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Armchair className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                        {priceCheck?.flightDetails?.seatSelectionFree ? 'Seat choice for free' : 'Seat selection available'}
                      </span>
                      <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                        {priceCheck?.flightDetails?.seatSelectionFree
                          ? 'Choose your desired seat for free'
                          : 'Seat selection available for a charge'}
                      </span>
                    </div>
                  </div>
                  {priceCheck?.flightDetails?.seatSelectionFree ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                  ) : (
                    <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                  )}
                </div>
              );
            })()}

            {/* Meals */}
            {(() => {
              const mealsService = selectedUpgradeOption?.mealsService;
              if (mealsService) {
                const isIncluded = mealsService.chargeable === 'included';
                const isChargeable = mealsService.chargeable === 'chargeable';
                return (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-[#010D50] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-[#010D50]">
                          {mealsService.text || 'Meals and beverages'}
                        </span>
                        <span className="text-xs sm:text-sm text-[#3A478A] break-words">
                          {isIncluded ? 'Included in fare' : isChargeable ? 'Available for purchase' : ''}
                        </span>
                      </div>
                    </div>
                    {isIncluded ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#008234] shrink-0" />
                    ) : isChargeable ? (
                      <Info className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B] shrink-0" />
                    ) : (
                      <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626] shrink-0" />
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}


