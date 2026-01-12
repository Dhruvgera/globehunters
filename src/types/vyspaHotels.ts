export interface VyspaCityHotelLookupItem {
  id: number;
  label: string;
  loc: string; // e.g. City, Hotel, Area
  city_name?: string;
  country_name?: string;
  destination_id?: number;
  arrival_point_code?: string;
}

export interface VyspaAvailabilityV3Criteria {
  searchCriteriaId?: number;
  [key: string]: any;
}

export interface VyspaAvailabilityV3ResultItem {
  id?: string | number; // may be used as search_result_id
  hotel_id?: string | number;
  hotel_name?: string;
  hotel_rating?: number;
  image_name?: string;
  address1?: string;
  address2?: string;
  post_code?: string | number;
  geo_loc_latitude?: number;
  geo_loc_longitude?: number;
  SellCur?: string;
  [key: string]: any;
}

export interface VyspaAvailabilityV3Response {
  Results?: VyspaAvailabilityV3ResultItem[];
  Criteria?: VyspaAvailabilityV3Criteria;
  [key: string]: any;
}

export interface VyspaGetRoomsV3Response {
  hotel_id?: number;
  hotel_name?: string;
  hotel_rating?: number;
  image_name?: string;
  address1?: string;
  address2?: string;
  post_code?: string | number;
  geo_loc_latitude?: number;
  geo_loc_longitude?: number;
  SellCur?: string;
  rooms?: any;
  [key: string]: any;
}

export interface VyspaHotelSearchDetailsResponse {
  Rates?: any;
  Cancellation?: any;
  hotels?: any;
  rooms?: any;
  liveDetails?: any;
  [key: string]: any;
}

export interface VyspaCreateCustomerFolderResponseItem {
  folder_no?: number;
  [key: string]: any;
}

// Some environments return a bare integer folder number instead of an object.
export type VyspaCreateCustomerFolderResponse =
  | number
  | VyspaCreateCustomerFolderResponseItem
  | VyspaCreateCustomerFolderResponseItem[];


