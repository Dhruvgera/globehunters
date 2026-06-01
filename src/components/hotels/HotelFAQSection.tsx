"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface HotelFAQSectionProps {
  faqs: FAQItem[];
  hotelName: string;
}

export default function HotelFAQSection({ faqs, hotelName }: HotelFAQSectionProps) {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  return (
    <div className="mx-4 lg:mx-6 mb-6 bg-[#F5F7FF] rounded-3xl p-6 lg:p-8 space-y-6">
      <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
        Got questions about {hotelName.split(' ').slice(0, 3).join(' ')}?
      </h2>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="bg-white border border-[#DFE0E4] rounded-[32px] overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
              }
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <span className="text-base lg:text-lg font-medium text-[#010D50] pr-4">
                {faq.question}
              </span>
              {expandedFAQ === faq.id ? (
                <ChevronUp className="w-6 h-6 text-[#010D50] flex-shrink-0" />
              ) : (
                <ChevronDown className="w-6 h-6 text-[#010D50] flex-shrink-0" />
              )}
            </button>
            {expandedFAQ === faq.id && (
              <div className="px-6 pb-6">
                <p className="text-sm text-[#3A478A] leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
