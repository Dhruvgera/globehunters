"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

interface PassengerDetailsInlineProps {
  passengerCount?: number;
}

export function PassengerDetailsInline({
  passengerCount = 2,
}: PassengerDetailsInlineProps) {
  const t = useTranslations('booking.passengerDetails');
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#010D50]">
          {t('heading')}
        </span>
      </div>

      {/* Instructions */}
      <div className="bg-[#FFF5EA] rounded-xl p-3 flex items-start gap-2">
        <Info className="w-5 h-5 text-[#E98E03] shrink-0" />
        <p className="text-sm text-[#E98E03]">
          {t('instructions')}
        </p>
      </div>

      {/* Lead Passenger */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#F5F7FF] rounded-full px-6 py-3">
            <span className="text-sm font-semibold text-[#010D50]">
              {t('leadPassenger')}
            </span>
          </div>
          <span className="text-sm text-[#010D50]">
            {t('mustBe18')}
          </span>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">{t('name')}</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select className="border border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#010D50] bg-white w-full sm:w-24 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%23010D50%22%20d%3D%22M1.41%200L6%204.58%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat">
                <option>{t('mr')}.</option>
                <option>{t('mrs')}.</option>
                <option>{t('ms')}.</option>
              </select>
              <Input
                placeholder={t('firstName')}
                className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
              />
              <Input
                placeholder={t('middleName')}
                className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
              />
              <Input
                placeholder={t('lastName')}
                className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">
              {t('dateOfBirth')}
            </label>
            <Input
              type="date"
              placeholder={t('dateOfBirthPlaceholder')}
              className="border-[#DFE0E4] rounded-xl px-4 h-12 text-base font-medium text-[#3A478A]"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">
              {t('emailID')}
            </label>
            <Input
              type="email"
              placeholder={t('emailPlaceholder')}
              className="border-[#DFE0E4] rounded-xl px-4 h-12 text-base font-medium text-[#3A478A]"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">
              {t('phoneNo')}
            </label>
            <Input
              type="tel"
              placeholder={t('phonePlaceholder')}
              className="border-[#DFE0E4] rounded-xl px-4 h-12 text-base font-medium text-[#3A478A]"
            />
          </div>
        </div>
      </div>

      {/* Additional Passengers */}
      {passengerCount > 1 &&
        Array.from({ length: passengerCount - 1 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-6">
            {/* Divider */}
            <div className="border-t border-[#3A478A]" />

            <div className="flex items-center gap-3">
              <div className="bg-[#F5F7FF] rounded-full px-6 py-3">
                <span className="text-sm font-semibold text-[#010D50]">
                  {t('passenger')} {index + 2}
                </span>
              </div>
              <span className="text-sm text-[#3A478A]">({t('adult')})</span>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium text-[#010D50]">
                  {t('name')}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select className="border border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#010D50] bg-white w-full sm:w-24 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%23010D50%22%20d%3D%22M1.41%200L6%204.58%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat">
                    <option>{t('mr')}.</option>
                    <option>{t('mrs')}.</option>
                    <option>{t('ms')}.</option>
                  </select>
                  <Input
                    placeholder={t('firstName')}
                    className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
                  />
                  <Input
                    placeholder={t('middleName')}
                    className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
                  />
                  <Input
                    placeholder={t('lastName')}
                    className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#010D50]">
                {t('dateOfBirth')}
              </label>
              <Input
                type="date"
                placeholder={t('dateOfBirthPlaceholder')}
                className="border-[#DFE0E4] rounded-xl px-4 h-12 text-base font-medium text-[#3A478A]"
              />
            </div>
          </div>
        ))}
    </div>
  );
}
