"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface Review {
  name: string;
  rating: number;
  text: string;
}

interface CustomerReviewsCardProps {
  overallRating: number;
  totalReviews: number;
  reviews: Review[];
}

export function CustomerReviewsCard({
  overallRating,
  totalReviews,
  reviews,
}: CustomerReviewsCardProps) {
  const t = useTranslations('booking.reviews');
  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6 order-3 lg:order-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {t('title')}
        </span>
        <div className="flex items-center gap-1 bg-white rounded-full py-1">
          <Star className="w-5 h-5 fill-[#FBEF04] text-[#FBEF04]" />
          <span className="text-sm font-medium text-[#010D50]">
            {overallRating} ({totalReviews.toLocaleString()} {t('reviews')})
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2">
        {reviews.map((review, index) => (
          <div
            key={index}
            className="min-w-[240px] sm:min-w-0 flex-1 snap-start"
          >
            <div className="bg-[#F5F7FF] rounded-lg p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-[#C0C0C0]" />
                <span className="text-sm font-medium text-[#010D50]">
                  {review.name}
                </span>
              </div>
            </div>
            <div className="bg-[#F5F7FF] rounded-lg p-3 mt-1">
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < review.rating
                        ? "fill-[#FBEF04] text-[#FBEF04]"
                        : "fill-gray-300 text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-[#010D50]">
                {review.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
