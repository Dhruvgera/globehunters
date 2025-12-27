import { useState, useEffect } from 'react';

export interface Review {
  name: string;
  rating: number;
  text: string;
  title?: string;
}

interface UseReviewsResult {
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  isLoading: boolean;
  error: string | null;
}

export function useReviews() {
  const [data, setData] = useState<UseReviewsResult>({
    reviews: [],
    totalReviews: 0,
    averageRating: 0,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch('/api/reviews');
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        const result = await response.json();
        
        setData({
          reviews: result.reviews || [],
          totalReviews: result.totalReviews || 0,
          averageRating: result.averageRating || 0,
          isLoading: false,
          error: null
        });
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load reviews'
        }));
      }
    }

    fetchReviews();
  }, []);

  return data;
}

