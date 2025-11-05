"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PassengerDetailsInlineProps {
  passengerCount?: number;
}

export function PassengerDetailsInline({
  passengerCount = 2,
}: PassengerDetailsInlineProps) {
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#010D50]">
          Passenger Details
        </span>
      </div>

      {/* Instructions */}
      <div className="bg-[#FFF5EA] rounded-xl p-3 flex items-start gap-2">
        <Info className="w-5 h-5 text-[#E98E03] shrink-0" />
        <p className="text-sm text-[#E98E03]">
          Please enter passenger name(s) and dates(s) of birth EXACTLY as shown
          on the passport or their government-issued ID that will be used for
          this trip
        </p>
      </div>

      {/* Lead Passenger */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#F5F7FF] rounded-full px-6 py-3">
            <span className="text-sm font-semibold text-[#010D50]">
              Lead Passenger
            </span>
          </div>
          <span className="text-sm text-[#010D50]">
            (Must be 18 or older)
          </span>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">Name</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select className="border border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#010D50] bg-white w-full sm:w-24 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%23010D50%22%20d%3D%22M1.41%200L6%204.58%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat">
                <option>Mr.</option>
                <option>Mrs.</option>
                <option>Ms.</option>
              </select>
              <Input
                placeholder="First Name"
                className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
              />
              <Input
                placeholder="Middle Name"
                className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
              />
              <Input
                placeholder="Last Name"
                className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">
              Date of Birth
            </label>
            <Input
              type="date"
              placeholder="DD/MM/YYYY"
              className="border-[#DFE0E4] rounded-xl px-4 h-12 text-base font-medium text-[#3A478A]"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">
              Email ID
            </label>
            <Input
              type="email"
              placeholder="xyz123@gmail.com"
              className="border-[#DFE0E4] rounded-xl px-4 h-12 text-base font-medium text-[#3A478A]"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium text-[#010D50]">
              Phone no.
            </label>
            <Input
              type="tel"
              placeholder="1234567890"
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
                  Passenger {index + 2}
                </span>
              </div>
              <span className="text-sm text-[#3A478A]">(Adult)</span>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium text-[#010D50]">
                  Name
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select className="border border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#010D50] bg-white w-full sm:w-24 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%23010D50%22%20d%3D%22M1.41%200L6%204.58%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat">
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Ms.</option>
                  </select>
                  <Input
                    placeholder="First Name"
                    className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
                  />
                  <Input
                    placeholder="Middle Name"
                    className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
                  />
                  <Input
                    placeholder="Last Name"
                    className="sm:flex-1 border-[#DFE0E4] rounded-xl px-4 h-12 min-h-12 text-base font-medium text-[#3A478A]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#010D50]">
                Date of Birth
              </label>
              <Input
                type="date"
                placeholder="DD/MM/YYYY"
                className="border-[#DFE0E4] rounded-xl px-4 h-12 text-base font-medium text-[#3A478A]"
              />
            </div>
          </div>
        ))}
    </div>
  );
}
