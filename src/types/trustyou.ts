export type TrustYouSentiment = "pos" | "neu" | "neg" | "";

export interface TrustYouCategoryBreakdownItem {
  key: string;
  label: string;
  score: number;
  sentiment: TrustYouSentiment;
  text?: string;
}

export interface TrustYouHotelReviewSummary {
  tyId: string;
  name: string;
  score: number; // 0-10 scale for UI
  scoreRaw: number; // 0-100 scale from TrustYou
  scoreDescription: string;
  reviewsCount: number;
  sourcesCount: number;
  summaryText?: string;
  highlights: string[];
  snippets: string[];
  badges: string[];
  categoryBreakdown: TrustYouCategoryBreakdownItem[];
}

export interface TrustYouBulkResultItem {
  hotelId: string;
  tyId: string;
  name: string;
  score: number;
  scoreRaw: number;
  scoreDescription: string;
  reviewsCount: number;
  sourcesCount: number;
}
