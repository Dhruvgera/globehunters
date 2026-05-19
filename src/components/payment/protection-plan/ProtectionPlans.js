import { IASSURE_PRICING, PROTECTION_PLANS } from "@/config/constants";
import { getRegion } from "@/lib/utils/domainMapping";
import { useTranslations } from "next-intl";

export function GetInclusions(type) {
  const region = getRegion();
  const t = useTranslations('payment.iAssure');

  if (region === 'UK') {

    return {
      basic: [
        { label: t('features.premium247Support') },
        { label: t('features.24hCancellationFree') },
        { label: t('features.carryOnBagPersonalItem') },
      ],

      premium: [
        { label: t('features.premium247Support') },
        { label: t('features.24hCancellationFree') },
        { label: t('features.carryOnBagPersonalItem') },
        { label: t('features.fullRefundAirlines') },
        { label: t('features.upgrade24hrs') },
      ],

      allIncluded: [
        { label: t('features.premium247Support') },
        { label: t('features.24hCancellationFree'), tooltip: t('features.24hfreeCancelTooltip') },
        { label: t('features.carryOnBagPersonalItem') },
        { label: t('features.fullRefundAirlines') },
        { label: t('features.upgrade24hrs'), tooltip: t('features.upgrade24hrsTooltip') },
        { label: t('features.fareFlexibility') },
        { label: t('features.priceMatchGuarentee') },
      ]
    };
  }


  if (type === 'Mobile') {
    return {
      basic: [
        { label: t('features.support247') },
        { label: t('features.freeChanges24h') },
        { label: t('features.refundDeath') },
        { label: t('features.refundAirline') },
      ],

      premium: [
        { label: t('features.allBasic') },
        { label: t('features.freeChangesAnytime') },
        { label: t('features.refundLockdown') },
        { label: t('features.baggageCompensation') },
        { label: t('features.flightDelay') },
      ],

      allIncluded: [
        { label: t('features.allPremium') },
        { label: t('features.priceMatch') },
        { label: t('features.futureCredit') },
        { label: t('features.priorityService') },
      ]
    };

  } else {
    return {
      basic: [
        { label: t('features.support247Full') },
        { label: t('features.rebookRename') },
        { label: t('features.refundDeathFull') },
        { label: t('features.refundAirlineFull') },
      ],

      premium: [
        { label: t('features.support247Full') },
        { label: t('features.rebookRename') },
        { label: t('features.refundDeathFull') },
        { label: t('features.freeChangesAnytime') },
        { label: t('features.refundAirlineFull') },
        { label: t('features.refundLockdownFull') },
        { label: t('features.baggageCompensationFull') },
        { label: t('features.flightDelay') },
      ],

      allIncluded: [
        { label: t('features.support247Full') },
        { label: t('features.rebookRename') },
        { label: t('features.refundDeathFull') },
        { label: t('features.freeChangesAnytime') },
        { label: t('features.refundAirlineFull') },
        { label: t('features.refundLockdownFull') },
        { label: t('features.baggageCompensationFull') },
        { label: t('features.flightDelay') },
        { label: t('features.priceMatch') },
        { label: t('features.futureCredit') },
      ]
    }
  }


}

export function getPlanPrices(baseFare) {
  const region = getRegion();
  if (region === 'UK') {
    let slabIndex = IASSURE_PRICING.uk.slabs.findIndex(s => baseFare <= s.max);
    return {
      basic: baseFare * IASSURE_PRICING.uk.slabs[slabIndex].basic,
      premium: baseFare * IASSURE_PRICING.uk.slabs[slabIndex].premium,
      all: baseFare * IASSURE_PRICING.uk.slabs[slabIndex].all,
    };
  }
  return {
    basic: baseFare * IASSURE_PRICING.global.basic,
    premium: baseFare * IASSURE_PRICING.global.premium,
    all: baseFare * IASSURE_PRICING.global.all,
  };
}