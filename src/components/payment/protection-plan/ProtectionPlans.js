import { getRegion } from "@/lib/utils/domainMapping";
import { useTranslations } from "next-intl";

export function GetInclusions(type) {
  const region = getRegion();
  const t = useTranslations('payment.iAssure');

  if (region === 'UK') {

    return {
      basic: [
        t('features.premium247Support'),
        t('features.24hCancellationFree'),
        t('features.carryOnBagPersonalItem'),
      ],

      premium: [
        t('features.premium247Support'),
        t('features.24hCancellationFree'),
        t('features.carryOnBagPersonalItem'),
        t('features.refundAirlineFull'),
        t('features.upgrade24hrs'),
      ],

      allIncluded: [
        t('features.premium247Support'),
        t('features.24hCancellationFree'),
        t('features.carryOnBagPersonalItem'),
        t('features.refundAirlineFull'),
        t('features.upgrade24hrs'),
        t('features.fareFlexibility'),
        t('features.priceMatchGuarentee'),
      ]
    };
  }


  if (type === 'Mobile') {
    return {
      basic: [
        t('features.support247'),
        t('features.freeChanges24h'),
        t('features.refundDeath'),
        t('features.refundAirline'),
      ],

      premium: [
        t('features.allBasic'),
        t('features.freeChangesAnytime'),
        t('features.refundLockdown'),
        t('features.baggageCompensation'),
        t('features.flightDelay'),
      ],

      allIncluded: [
        t('features.allPremium'),
        t('features.priceMatch'),
        t('features.futureCredit'),
        t('features.priorityService'),
      ]
    };

  } else {
    return {
      basic: [
        t('features.support247Full'),
        t('features.rebookRename'),
        t('features.refundDeathFull'),
        t('features.refundAirlineFull'),
      ],

      premium: [
        t('features.support247Full'),
        t('features.rebookRename'),
        t('features.refundDeathFull'),
        t('features.freeChangesAnytime'),
        t('features.refundAirlineFull'),
        t('features.refundLockdownFull'),
        t('features.baggageCompensationFull'),
        t('features.flightDelay'),
      ],

      allIncluded: [
        t('features.support247Full'),
        t('features.rebookRename'),
        t('features.refundDeathFull'),
        t('features.freeChangesAnytime'),
        t('features.refundAirlineFull'),
        t('features.refundLockdownFull'),
        t('features.baggageCompensationFull'),
        t('features.flightDelay'),
        t('features.priceMatch'),
        t('features.futureCredit'),
      ]
    }
  }


}