export interface ActivitySearchRequest {
  destinationName: string;
  destinationId?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  adults?: number;
  children?: number;
  count?: number;
  query?: string;
}

export interface ActivityProduct {
  productCode: string;
  title: string;
  description?: string;
  imageUrl?: string;
  duration?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  currency?: string;
  flags: string[];
  webUrl?: string;
}

export interface ActivitySearchResponse {
  destinationId?: string;
  destinationName: string;
  products: ActivityProduct[];
  rawCount?: number;
}

export interface SelectedActivity extends ActivityProduct {
  travelDate?: string;
  travelers?: {
    adults: number;
    children: number;
  };
}
