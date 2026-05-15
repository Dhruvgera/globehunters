import useSWR from 'swr';

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

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  });

export function useReviews(): UseReviewsResult {
  const { data, error, isLoading } = useSWR(
    '/api/reviews',
    fetcher,
    {
      dedupingInterval: 60 * 60 * 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    reviews: data?.reviews || [],
    totalReviews: data?.totalReviews || 0,
    averageRating: data?.averageRating || 0,
    isLoading,
    error: error?.message || null,
  };
}
