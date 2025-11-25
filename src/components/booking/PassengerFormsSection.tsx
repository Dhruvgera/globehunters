"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PassengerForm } from "./PassengerForm";
import { useBookingStore } from "@/store/bookingStore";
import type { Passenger, PassengerType } from "@/types/booking";

interface PassengerFormsSectionProps {
  showPassportFields?: boolean;
}

export default function PassengerFormsSection({
  showPassportFields = false,
}: PassengerFormsSectionProps) {
  const t = useTranslations("booking.passengerDetails");
  const searchParams = useBookingStore((s) => s.searchParams);
  const passengers = useBookingStore((s) => s.passengers);
  const addPassenger = useBookingStore((s) => s.addPassenger);
  const updatePassenger = useBookingStore((s) => s.updatePassenger);
  const setPassengersSaved = useBookingStore((s) => s.setPassengersSaved);
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  // Build the required passenger slots from search parameters
  const requiredPassengers: { type: PassengerType; index: number }[] = useMemo(() => {
    const result: { type: PassengerType; index: number }[] = [];
    const counts = searchParams?.passengers || { adults: 1, children: 0, infants: 0 };
    let idx = 0;
    for (let i = 0; i < counts.adults; i += 1) result.push({ type: "adult", index: idx++ });
    for (let i = 0; i < counts.children; i += 1) result.push({ type: "child", index: idx++ });
    for (let i = 0; i < counts.infants; i += 1) result.push({ type: "infant", index: idx++ });
    return result;
  }, [searchParams]);

  const handleSave = (slotIndex: number, type: PassengerType, data: Passenger) => {
    const passenger: Passenger = { ...data, type };
    if (passengers[slotIndex]) {
      updatePassenger(slotIndex, passenger);
    } else {
      // If saving out of order, pad previous entries with minimal placeholders
      const missing = slotIndex - passengers.length;
      if (missing > 0) {
        for (let i = 0; i < missing; i += 1) {
          addPassenger({
            title: "Mr",
            firstName: "",
            lastName: "",
            dateOfBirth: "",
            email: "",
            phone: "",
            type: "adult",
          } as Passenger);
        }
      }
      addPassenger(passenger);
    }
    setSaved((prev) => {
      const next = { ...prev, [slotIndex]: true };
      const allSaved = requiredPassengers.every((_, idx) => next[idx]);
      setPassengersSaved(allSaved);
      return next;
    });
  };

  useEffect(() => {
    setSaved({});
    setPassengersSaved(false);
  }, [searchParams, setPassengersSaved]);

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#010D50]">
          {t("heading")}
        </span>
      </div>

      <div className="flex flex-col gap-8">
        {requiredPassengers.map((slot, idx) => {
          const initial = passengers[idx];
          const typeLabel =
            slot.type === "adult"
              ? t("adult")
              : slot.type === "child"
              ? t("child")
              : t("infant");
          return (
            <div key={`${slot.type}-${idx}`} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#F5F7FF] rounded-full px-6 py-3">
                  <span className="text-sm font-semibold text-[#010D50]">
                    {t("passenger")} {idx + 1}
                  </span>
                </div>
                <span className="text-sm text-[#3A478A]">({typeLabel})</span>
              </div>
              <PassengerForm
                passengerIndex={idx}
                initialData={initial}
                onSave={(p) => handleSave(idx, slot.type, p)}
                showPassportFields={showPassportFields}
                disabled={!!saved[idx]}
                leadAddress={idx > 0 ? { address: passengers[0]?.address, postalCode: passengers[0]?.postalCode } : undefined}
                onCancel={() => {
                  setSaved((prev) => {
                    const next = { ...prev, [idx]: false };
                    setPassengersSaved(false);
                    return next;
                  });
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
