export interface HotelAmenityItem {
  icon: string;
  label: string;
}

export interface HotelReviewBreakdown {
  staff: number;
  comfort: number;
  freeWifi: number;
  facilities: number;
  valueForMoney: number;
  cleanliness: number;
  location: number;
}

export interface HotelReviewSummary {
  score: number;
  label: string;
  count: number;
  breakdown: HotelReviewBreakdown;
}

export interface HotelDetails {
  id: string;
  name: string;
  address: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  mainImage: string;
  galleryImages: string[];
  about: {
    title: string;
    description: string;
  };
  amenities: HotelAmenityItem[];
  reviews: HotelReviewSummary;
  mapUrl: string;
  policies: string;
  importantInfo: string;
}

export interface HotelRoomAmenity {
  icon: string;
  label: string;
}

export interface HotelRoomPrice {
  currency: string;
  nightly: number;
  total: number;
}

export interface HotelRoomReview {
  score: number;
  label: string;
  count: number;
}

export interface HotelRoom {
  id: string;
  name: string;
  bedType: string;
  sqft: number;
  maxOccupancy: number;
  amenities: HotelRoomAmenity[];
  isRefundable: boolean;
  paymentType: string;
  reviews: HotelRoomReview;
  price: HotelRoomPrice;
}

export interface HotelReview {
  id: string;
  author: string;
  rating: string;
  text: string;
}

export interface HotelFAQ {
  id: string;
  question: string;
  answer: string;
}

