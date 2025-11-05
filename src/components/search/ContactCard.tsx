"use client";

import { Phone } from "lucide-react";

export function ContactCard() {
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3 sticky top-20">
      <span className="text-base font-semibold text-[#3754ED]">
        WEB REF: IN-649707636
      </span>
      <p className="text-xs text-[#3A478A]">
        If you would like to speak to one of our travel consultants please call
        us on the given number below.
      </p>
      <div className="flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2 w-fit">
        <div className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center">
          <Phone className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[#010D50] text-[8px] font-medium leading-tight">
            24/7 Toll-Free
          </span>
          <span className="text-[#010D50] text-sm font-bold">
            020 4502 2984
          </span>
        </div>
      </div>
    </div>
  );
}
