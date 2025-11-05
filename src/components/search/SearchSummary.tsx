"use client";

export function SearchSummary() {
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[#010D50]"
        >
          <path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 17L12 22L22 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 12L12 17L22 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-semibold text-[#010D50]">
          Search Summary
        </span>
      </div>
      <p className="text-xs text-[#3A478A]">
        If you would like to speak to one of our travel consultants please call
        us on the given number below.
      </p>
    </div>
  );
}
