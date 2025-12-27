"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

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
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (!reviews || reviews.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [reviews]);

  // If no reviews, don't render or render placeholder
  if (!reviews || reviews.length === 0) {
    return null; 
  }

  const currentReview = reviews[currentIndex];

  return (
    <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4 order-3 lg:order-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#010D50]">
          {t('title')}
        </span>
        <div className="flex items-center gap-1 bg-white rounded-full py-1">
          <div className="flex gap-0.5 mr-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(overallRating)
                    ? "fill-[#FBEF04] text-[#FBEF04]"
                    : "fill-gray-200 text-gray-200"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-[#010D50]">
            {overallRating}
          </span>
        </div>
      </div>

      <div className="relative min-h-[140px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#3754ED]/10 flex items-center justify-center text-sm font-bold text-[#3754ED]">
                {currentReview.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#010D50]">
                  {currentReview.name}
                </span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < currentReview.rating
                          ? "fill-[#FBEF04] text-[#FBEF04]"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-[#F5F7FF] rounded-lg p-3">
              <p className="text-sm text-[#010D50] leading-relaxed italic">
                "{currentReview.text}"
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {reviews.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-1">
          {reviews.map((_, idx) => (
             <button
               key={idx}
               onClick={() => setCurrentIndex(idx)}
               className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                 idx === currentIndex ? "bg-[#3754ED] w-4" : "bg-[#E5E7EB]"
               }`}
               aria-label={`Go to review ${idx + 1}`}
             />
          ))}
        </div>
      )}
    </div>
  );
}
