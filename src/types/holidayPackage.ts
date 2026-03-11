/**
 * Holiday Package Types
 * Types for Vyspa Holiday Package API integration
 */

// ============================================================================
// Destination Lookup Types
// ============================================================================

export interface HolidayDestination {
  /** Numeric internal identifier for the city */
  id: string;
  /** Display name of the city */
  name: string;
  /** Country where the city is located */
  country_name: string;
  /** Primary IATA airport code for the city (3 letters) */
  airportcode: string;
  /** Filename or URL of the featured image for the destination */
  featured_image: string;
  /** Semicolon-delimited composite (IATA;cityId;cityName). Used in holiday_package_search as Destination parameter */
  hiddenvalue: string;
}

// ============================================================================
// Package Search Request Types
// ============================================================================

/** Hotel filters for package search */
export interface HolidayHotelFilters {
  /** Sort results: 'preffered' | 'rating' | 'price' */
  sort_by?: 'preffered' | 'rating' | 'price';
  /** Filter by room board/meal code */
  meal_code?: ('RO' | 'SC' | 'AI' | 'BB' | 'HB' | 'FB')[];
  /** Filter by hotel star rating (minimum 3) */
  hotel_rating?: string[];
  /** Filter by hotel from price */
  price_from?: number;
  /** Filter by hotel to price */
  price_to?: number;
}

/** Custom sort options for flight results */
export interface HolidayCustomSort {
  /** Comma separated values of IATA airline codes */
  airlines?: string;
  /** Sort by number of flight stops: true/'asc' ascending, 'desc' descending, or number */
  stops?: boolean | 'asc' | 'desc' | number;
  /** Sort by duration: true/'asc' ascending (shortest), 'desc' descending (longest) */
  duration?: boolean | 'asc' | 'desc';
}

/** Child ages per room - keys are 1-based child indices */
export interface RoomChildAges {
  [childIndex: string]: string;
}

/** Request parameters for holiday_package_search */
export interface HolidayPackageSearchRequest {
  /** IATA code for the departure city/airport (e.g., 'LON') */
  DestinationFrom: string;
  /** Destination in format CODE;ID;Name (e.g., 'DXB;11945;Dubai') from holiday_destinations_autocomplete */
  Destination: string;
  /** Departure date in DD/MM/YYYY format */
  departure_date: string;
  /** Length of stay in nights */
  nights: string;
  /** Number of rooms requested */
  rooms: string;
  /** Request full supplier details in stage-1 package results */
  minimalResponse?: boolean;
  /** Number of adults per room as string array */
  adults: string[];
  /** Number of children per room as string array */
  children: string[];
  /** Child ages per room - array of objects mapping child index to age */
  child_ages: RoomChildAges[];
  /** Number of infants per room as string array */
  infants: string[];
  /** Optional upstream timeout in seconds */
  timeout?: number;
  /** Site unique identifier (specific clients only) */
  siteId?: number;
  /** Fare category: IT (Inclusive Tour), PU (Published), SS (Seat Sale), AC (Low Cost) */
  cheapestFareCat?: 'IT' | 'PU' | 'SS' | 'AC';
  /** 1 = restrict to non-stop flights only; 0 = allow connections */
  direct_flight_only?: 0 | 1;
  /** 1 = restrict to IT fares only; 0 = include other fare types */
  only_it_fares?: 0 | 1;
  /** Internal hotel identifier for prefilter */
  hotel_id?: number;
  /** Human-readable hotel name for prefilter */
  hotel_name?: string;
  /** Search channel (specific clients only) */
  SearchChannel?: 'agent_tool' | 'website' | 'mobile_app' | 'mobile_web' | 'meta' | 'cache';
  /** Search type (specific clients only) */
  SearchType?: 'hotel_only' | 'hotel_package' | 'loyalty';
  /** Supplier unique identifier */
  supplierId?: number;
  /** List of supplier unique identifiers */
  supplierIds?: number[];
  /** List of hotel/vendor unique identifiers */
  vendorIds?: number[];
  /** Flag to also search for overnight hotels */
  NoHotel1overnight?: boolean;
  /** Flag to indicate which facilities to return: 1 = Types only, -1 = Facilities only */
  facilityType?: 1 | -1;
  /** Flag to include special offer data */
  specialOffer?: boolean;
  /** Flag to do fixed nights search */
  fixedNights?: boolean;
  /** Number of results to return */
  limit?: number;
  /** Page number for pagination */
  page?: number;
  /** Flag to return only the cheapest or room only rate option */
  cheapest_room_only?: boolean;
  /** Hotel filters */
  hotel_filters?: HolidayHotelFilters;
  /** Custom sort options */
  customsort?: HolidayCustomSort;
  /** Retrieve an existing package search response by request ID */
  RequestId?: number;
  /** Retrieve results for a specific selected/default flight */
  FlightResultId?: string;
  /** Retrieve results for a specific selected hotel */
  HotelResultId?: number;
}

// ============================================================================
// Package Search Response Types
// ============================================================================

/** Search key / normalized search summary */
export interface HolidaySearchKey {
  /** Display location (e.g., 'Dubai / AE') */
  location: string;
  /** 3-letter IATA airport/city code for arrival */
  arrival: string;
  /** 3-letter IATA airport/city code for departure */
  departure: string;
  /** Total adults across all rooms */
  adults: number;
  /** Total children across all rooms */
  children: number;
  /** Number of rooms searched */
  rooms: number;
  /** Internal destination or location identifier */
  hidden_key: number;
  /** Flag for package vs. hotel-only search (1 = holiday/package) */
  is_holiday: number;
  /** Optional deep link to repeat/continue the search */
  deep_link?: string;
  /** Primary hotel search criteria identifier */
  hotelSearchCriteriaIds: number;
  /** Primary flight search criteria identifier */
  flightSearchCriteriaId: number;
  /** Hotel search processing completion flag (1 = complete) */
  completed: number;
}

/** Flight segment in package search response */
export interface HolidayFlightSegment {
  /** Segment ID */
  id: number;
  /** Parent result identifier */
  psw_result_id: number;
  /** Booking class code: Y/M/W/C/F */
  cabin_class: 'Y' | 'M' | 'W' | 'C' | 'F';
  /** Fare rule locator/key */
  FareRuleKey?: string;
  /** Segment link indicator */
  link_indicator?: string;
  /** Marketing carrier code (e.g., 'RJ') */
  airline_code: string;
  /** Flight number (numeric portion) */
  flight_number: number;
  /** Baggage allowance (e.g., '1p', '30KG') */
  Baggage?: string;
  /** Day/Month code (e.g., '02Dec') */
  flight_date: string;
  /** Day of week (e.g., 'Tue') */
  flight_day: string;
  /** Departure terminal */
  departure_terminal?: string;
  /** Arrival terminal */
  arrival_terminal?: string;
  /** 3-letter IATA departure airport/city code */
  departure_airport: string;
  /** 3-letter IATA arrival airport/city code */
  arrival_airport: string;
  /** Date in YYYY-MM-DD (ISO 8601) */
  departure_date: string;
  /** Date in YYYY-MM-DD (ISO 8601) */
  arrival_date: string;
  /** Local departure time HHmm as integer */
  departure_time: number;
  /** Local arrival time HHmm as integer */
  arrival_time: number;
  /** Day change indicator */
  day_change_indicator?: string;
  /** Arrival date offset vs departure */
  dep_arr_date_diff: number;
  /** Equipment code (e.g., '32N') */
  aircraft_type?: string;
  /** Stops for this segment */
  number_stops: number;
  /** Segment index within direction */
  segment: number;
  /** Distance in miles/km */
  distance?: number;
  /** Block time in minutes */
  travel_time: number;
  /** Supplier/GDS source */
  supplier_name?: string;
  /** Marketing airline name */
  airline_name: string;
  /** Operating airline name (if different) */
  operating_airline_name?: string;
  /** Cabin class name (e.g., 'Economy') */
  class_name: string;
  /** Cabin type code */
  cabin_type?: number;
  /** Marketing carrier (repeat of airline_code) */
  airline: string;
  /** Leg count for the direction */
  leg_counter: number;
  /** Available seats in fare bucket */
  available_seats?: number;
  /** Refundability flag/code */
  refundable?: number;
  /** Refundability text (e.g., 'Non-Refundable') */
  refundable_text?: string;
}

/** Flight price summary */
export interface HolidayFlightPswResult {
  /** Last ticketing date (YYYY-MM-DD) */
  last_ticket_date?: string;
  /** Total fare amount */
  total_fare: number;
  /** Total net fare amount */
  total_net_fare?: number;
  /** Departure airport name */
  depart_airport_name?: string;
  /** Departure airport city name */
  depart_airport_city?: string;
  /** Departure airport country name */
  depart_airport_country?: string;
  /** Arrival airport name */
  arrive_airport_name?: string;
  /** Arrival airport city name */
  arrive_airport_city?: string;
  /** Arrival airport country name */
  arrive_airport_country?: string;
}

/** Flight direction (outbound or inbound) */
export interface HolidayFlightDirection {
  /** Total flying time in minutes */
  flying_time: number;
  /** Flight segments */
  flights: HolidayFlightSegment[];
  /** Price summary */
  FlightPswResult?: HolidayFlightPswResult;
}

/** Flight details for a package */
export interface HolidayFlightDetails {
  /** Outbound flight */
  outbound: HolidayFlightDirection;
  /** Inbound/return flight */
  inbound?: HolidayFlightDirection;
}

/** Hotel address */
export interface HolidayHotelAddress {
  street1?: string;
  street2?: string;
  postalcode?: string;
  city?: string;
  /** Latitude in decimal degrees */
  latitude?: number;
  /** Longitude in decimal degrees */
  longitude?: number;
}

/** Hotel preference flags */
export interface HolidayHotelPreferred {
  preferred: 0 | 1;
  show?: 0 | 1;
}

/** Hotel resort info */
export interface HolidayHotelResort {
  name?: string;
  /** Hotel construction flag */
  construction?: 0 | 1;
}

/** Hotel facility */
export interface HolidayHotelFacility {
  id?: number;
  name?: string;
  type?: string;
}

/** Hotel info */
export interface HolidayHotelInfo {
  onlineBookable?: string;
  preferredOnSites?: string;
  showOnSites?: string;
  hotel_rating?: number;
  hotel_classification?: number;
  platinumHotel?: 0 | 1;
  transfer_point_id?: number;
  preferredHotel?: 0 | 1;
  tripadvisor_id?: number;
  ContractFiles?: string;
}

/** Room option in hotel result */
export interface HolidayRoomOption {
  /** Room option ID */
  id: number;
  /** Room name */
  room_name?: string;
  /** Room price */
  room_price?: number;
  /** Meal code */
  meal_code?: string;
  /** Meal name */
  meal_name?: string;
  /** Currency code */
  currency_code?: string;
  /** Net price */
  net_price?: number;
  /** Room code */
  room_code?: string;
  /** Non-refundable flag */
  nonRef?: 0 | 1;
  /** Module ID */
  moduleId?: number;
}

/** Room options per room number */
export interface HolidayRooms {
  [roomNo: string]: HolidayRoomOption[];
}

/** Hotel search result in package */
export interface HolidayHotelSearchResult {
  /** Search result ID */
  id: number;
  /** Hotel ID */
  hotel_id: number;
  /** Hotel name */
  hotel_name: string;
  /** Quick description */
  quickDescription?: string;
  /** Image name/URL */
  image_name?: string;
  /** Search criteria ID */
  searchCriteriaId?: number;
  /** Module ID */
  moduleId?: number;
  /** Image alt text */
  image_alt_text?: string;
  /** Occupancy deleted flag */
  occupancy_deleted?: string;
  /** Room options by room number */
  Rooms?: HolidayRooms;
  /** Hotel address */
  address?: HolidayHotelAddress;
  /** Hotel preferred flags */
  HotelPreferred?: HolidayHotelPreferred;
  HotelPreferred2?: HolidayHotelPreferred;
  /** Resort info */
  Resort?: HolidayHotelResort;
  /** Facilities */
  facilities?: HolidayHotelFacility[];
  /** Hotel info */
  HotelInfo?: HolidayHotelInfo;
}

/** Pagination info */
export interface HolidayPagination {
  /** Current page index */
  page: number;
  /** Total pages */
  total: number;
  /** Start offset */
  start: number;
  /** Page size */
  limit: number;
  /** Total results */
  count: number;
  /** End offset */
  end: number;
}

/** Package results container */
export interface HolidayPackages {
  /** Hotel search results */
  results: HolidayHotelSearchResult[];
  /** Pagination info */
  pagination?: HolidayPagination;
}

/** Room occupancy info */
export interface HolidayRoomOccupancy {
  /** Room index (1-based) */
  room_no: number;
  /** Adults in the room */
  adults: number;
  /** Children in the room */
  children: number;
  /** Map of child index (1-based) to age (years) */
  child_ages?: { [key: string]: number };
  /** Infants in the room */
  infants: number;
  /** Total persons in the room */
  total_person: number;
}

/** Search criteria IDs for subsequent calls */
export interface HolidaySearchCriteriaIds {
  /** Flight search criteria ID */
  flightSearchCriteriaId: number;
  /** Hotel search criteria IDs */
  hotelSearchCriteriaIds: number;
  /** Selected flight psw_result_id */
  selectedFlight?: number;
}

/** Search criteria from response */
export interface HolidaySearchCriteria {
  /** Search request ID for package retrieval and rooms */
  RequestId?: number;
  /** Hotel request/search ID */
  HotelRequestId?: number;
  /** Hotel request/search ID for next-day hotel fallback */
  HotelRequestIdNextDay?: number;
  /** Flight request/search ID */
  FlightRequestId?: number;
  /** Default selected flight result ID */
  FlightResultId?: string;
  /** Hotel day option flag */
  HotelDayOption?: number;
  /** Whether upstream search has completed */
  searchComplete?: boolean;
  /** Legacy IDs shape kept for compatibility with older callers */
  ids?: HolidaySearchCriteriaIds;
  /** Room occupancy breakdown */
  RoomOccupancy?: HolidayRoomOccupancy[];
}

/** Full package search response */
export interface HolidayPackageSearchResponse {
  /** Success flag */
  success?: boolean;
  /** Upstream status text */
  status?: string;
  /** Hotel options flag: 1-4 based on flight arrival time */
  hotel_options?: number;
  HotelDayOption?: number;
  /** Notes explaining hotel check-in options */
  hotel_options_remarks?: string;
  HotelDayOptionRemarks?: string;
  /** Normalized search summary */
  search_key?: HolidaySearchKey;
  /** Flight details (outbound/inbound or live v2 array payload) */
  FlightDetails?: HolidayFlightDetails | HolidayFlightDirection[];
  /** Hotel/package results */
  Packages?: HolidayPackages;
  /** Search criteria and IDs */
  SearchCriteria?: HolidaySearchCriteria[] | HolidaySearchCriteria;
}

// ============================================================================
// Change Flights Request/Response Types (v2)
// ============================================================================

/** Flight filter options */
export interface HolidayFlightFilter {
  /** Filter by flight total from price */
  price_from?: string;
  /** Filter by flight total to price */
  price_to?: string;
  /** List of airline codes */
  airlines?: string[];
  /** List of cabin class codes: M (Economy), W (Premium), C (Business), F (First) */
  cabins?: ('M' | 'W' | 'C' | 'F')[];
}

/** Request parameters for holiday_change_flights v2 */
export interface HolidayChangeFlightsRequest {
  /** Selected/default flight result ID from package search */
  FlightResultId: string;
  /** Selected hotel result ID from package search */
  HotelResultId: number;
  /** Maximum number of results to return */
  limit?: number;
  /** Page number for pagination */
  page?: number;
  /** Flight filters */
  filter?: HolidayFlightFilter;
}

/** Alternate flight option from change flights */
export interface HolidayAlternateFlight {
  /** Unique result ID used for change/details */
  Result_id: string;
  /** Flight total */
  Total: number;
  /** ISO currency code */
  Currency_code?: string;
  /** GDS source */
  Gds?: string;
  /** Last ticketing date */
  Last_ticket_date?: string;
  /** Journey type */
  Journey_type?: number;
  /** Fare type/category */
  Fare_type?: string;
  /** Validating carrier */
  Validating_carrier?: string;
  /** Upstream module identifier */
  Module_id?: number;
  /** Journey segments (usually outbound + inbound) */
  Segments?: HolidayFlightDirection[];
  /** Package total */
  holiday_price?: number;
  /** Package total per room */
  holiday_price_per_room?: number;
  /** Package price delta vs baseline */
  holiday_diff: number;
  /** Package price delta per passenger */
  holiday_diff_per_person?: number;
}

/** Change flights response */
export interface HolidayChangeFlightsResponse {
  /** Alternate flight results */
  Results: HolidayAlternateFlight[];
}

// ============================================================================
// Package Details Request/Response Types
// ============================================================================

/** Request parameters for holiday_detail */
export interface HolidayDetailRequest {
  /** Selected/default flight result ID */
  FlightResultId: string;
  /** Selected room IDs */
  HotelResultRoomIds: string[];
}

/** Cancellation policy for a room */
export interface HolidayCancellationPolicy {
  /** Cancellation policy row ID */
  id: number;
  /** Room detail ID */
  search_result_detail_id?: number;
  /** Sequential policy window number */
  cancellationNum?: number;
  /** Supplier cancellation code */
  cancellationCode?: string;
  /** Start date (YYYY-MM-DD) for this window */
  effectiveDate?: string;
  /** Start time for the window */
  fromTime?: string;
  /** End date (YYYY-MM-DD) for this window */
  endEffectiveDate?: string;
  /** End time for the window */
  toTime?: string;
  /** Days before arrival this window applies */
  numDaysBeforeArrival?: string;
  /** Human readable start date label */
  fromDays?: string;
  /** Human readable end date label */
  toDays?: string;
  /** How the penalty is expressed */
  chargeType?: string;
  /** Rate type context */
  rateType?: string;
  /** Readable policy text */
  cancellationPolicy?: string;
  /** Currency of the penalty value */
  remoteCurrency?: string;
  /** Penalty value in remote currency */
  remoteRate?: number;
  /** Final (converted) currency */
  finalCurrency?: string;
  /** Penalty value in final currency */
  finalRate?: number;
  /** Room name */
  roomName?: string;
  /** Start datetime of the window */
  effectiveDateTime?: string;
  /** End datetime of the window */
  endEffectiveDateTime?: string;
  /** Folder number */
  fold_no?: string;
  /** Linked itinerary ID */
  itinerary_id?: string;
  /** Free-text notes */
  freetext?: string;
  /** Stay length */
  nights?: string;
}

/** Room detail in package details */
export interface HolidayRoomDetail {
  /** Room detail ID */
  id: number;
  /** Upstream selected-room key that links duplicated room rows to the original selected room option */
  selection_key?: string;
  /** Room name */
  room_name?: string;
  /** Number of nights */
  days_spent?: number;
  /** Check-in date */
  fromDate?: string;
  /** Check-out date */
  toDate?: string;
  /** Hotel ID */
  hotel_id?: number;
  /** Room price in branch currency */
  room_price?: number;
  /** Original price before discounts */
  original_price?: number | null;
  /** Room index/sequence */
  room_no?: number;
  /** Meal code */
  meal_code?: number;
  /** Meal name */
  meal_name?: string;
  /** Meal ID */
  mealId?: number;
  /** Currency code */
  currency_code?: string;
  /** Exchange rate */
  exchange_rate?: number;
  /** Net price */
  net_price?: number;
  /** Room code */
  room_code?: string;
  /** Non-refundable flag */
  nonRef?: number;
  /** Module ID */
  moduleId?: number;
  /** Check-in date */
  checkInDate?: string;
  /** Display meal code */
  display_meal_code?: string;
  /** Hotel image name */
  hotel_image_name?: string;
  /** Branch currency */
  branch_currency?: string;
  /** Quote remarks (HTML) */
  quote_remarks?: string;
}

/** Hotel details in package details response */
export interface HolidayHotelDetails {
  /** Internal hotel selection ID */
  id: number;
  /** Canonical hotel ID */
  hotel_id: number;
  /** Hotel name */
  hotel_name: string;
  /** Short description */
  quickDescription?: string;
  /** Image URL */
  image_name?: string;
  /** Star rating */
  hotel_rating?: number;
  /** Starting price */
  starting_price?: number;
  /** Search criteria ID */
  searchCriteriaId?: number;
  /** Session ID */
  session_id?: string;
  /** Vendor map ID */
  VmapId?: number;
  /** Module ID */
  moduleId?: number;
  /** Property-level remarks */
  remarks?: string[];
  /** Selected room items */
  rooms?: HolidayRoomDetail[];
  /** Check-out date */
  checkOutDate?: string;
  /** Cancellation fee amount */
  cancellation_fee_amt?: number;
  /** Cancellation fee currency */
  cancellation_fee_currency?: string;
  /** Cancellation policy ID */
  cancellation_id?: number;
  /** Visa information (HTML) */
  visaInfo?: string;
  /** Country remarks */
  countryRemarks?: string[];
  /** Vendor remarks */
  vendorRemarks?: string[];
}

/** Passenger pricing in flight data */
export interface HolidayPassengerPricing {
  /** Passenger row ID */
  id?: number;
  /** Result ID */
  psw_result_id?: number;
  /** Passenger type */
  pax_type: string;
  /** Count of this pax type */
  num_pax: number;
  /** Base fare per passenger */
  base_fare: number;
  /** Total per passenger */
  total_fare: number;
  /** Tax per passenger */
  tax: number;
  /** Markup per passenger */
  markupAmt?: number;
  /** Commission per passenger */
  CommissionAmount?: number;
}

/** Brand info for flight pricing */
export interface HolidayBrandInfo {
  /** Index of leg */
  reference?: number;
  /** Fare basis code */
  FareBasis?: string;
  /** Booking code */
  BookingCode?: string;
  /** Brand name */
  BrandName?: string;
  /** Cabin class code */
  CabinClass?: string;
  /** Cabin name */
  CabinName?: string;
  /** Flight segment ID for the leg */
  FlightId?: number;
  /** Leg departure airport */
  Departure?: string;
  /** Leg arrival airport */
  Arrival?: string;
}

/** Total fare for a brand option */
export interface HolidayBrandTotalFare {
  /** Brand option index */
  BrandId?: number;
  /** Total base fare */
  base: number;
  /** Agent net total */
  AgtNet?: number;
  /** Base currency code */
  basecurr?: string;
  /** Markup amount */
  markup?: number;
  /** Commission amount */
  comm?: number;
  /** Gross amount */
  gross?: number;
  /** Sell currency code */
  sellcurr?: string;
  /** Displayed/rounded base total */
  total_base?: number;
  /** Displayed/rounded grand total */
  total: number;
  /** Total taxes */
  tax: number;
  /** Tax currency code */
  taxcurr?: string;
  /** Primary booking code */
  BookingCode?: string;
  /** Cabin class name/code */
  CabinClass?: string;
  /** Brand name */
  Name?: string;
  /** Brand image URL */
  Image?: string;
  /** ATOL fee per booking */
  Atol_fee?: number;
  /** Number of ATOL chargeable pax */
  Atol_count?: number;
  /** SAFI value */
  SAFI?: number;
  /** Per-leg brand info */
  BrandInfo?: HolidayBrandInfo[];
}

/** Price data for flight */
export interface HolidayPriceData {
  /** Per passenger-type pricing */
  pricingArr?: HolidayPassengerPricing[];
  /** Total fare and brand details */
  Total_Fare?: HolidayBrandTotalFare;
  /** Last ticketing date */
  last_ticket_date?: string;
  /** Selected brand index flag */
  selected?: number;
}

/** Flight data result in package details */
export interface HolidayFlightDataResult {
  /** Priced result ID */
  id?: number;
  /** Search context ID */
  psc_request_id?: number;
  /** Origin airport/city */
  Origin?: string;
  /** Destination airport/city */
  Destination?: string;
  /** Total base fare */
  base_fare?: number;
  /** Total tax */
  tax?: number;
  /** Total fare */
  total_fare?: number;
  /** ISO currency code */
  iso_currency_code?: string;
  /** Last ticketing date */
  last_ticket_date?: string;
  /** Fare category */
  FareCat?: string;
  /** Brand/designator code */
  Designator?: string;
  /** GDS indicator */
  gds?: string;
  /** Applied markup amount */
  markupAmt?: number;
  /** Commission amount */
  CommissionAmount?: number;
  /** Validating carrier */
  validating_carrier?: string;
  /** Refundability indicator */
  refundable?: number;
  /** Module ID */
  module_id?: number;
}

/** Flight data in package details */
export interface HolidayFlightData {
  /** Flight pricing result */
  result?: HolidayFlightDataResult;
  /** Flight segments */
  flights?: HolidayFlightSegment[];
  /** Passenger breakdown */
  passengers?: HolidayPassengerPricing[];
  /** Price/brand options */
  price_data?: HolidayPriceData[];
  /** Session identifier */
  sessionId?: string;
  /** Booking price check request ID */
  bpc_request_id?: number;
  /** Published search request ID */
  psc_request_id?: number;
  /** GDS identifier */
  gds?: string;
  /** Flight psw_result_id */
  psw_result_id?: number;
}

/** Full package details response */
export interface HolidayDetailResponse {
  /** Quote ID */
  quoteId?: number;
  /** Cancellation policies */
  Cancellation?: HolidayCancellationPolicy[];
  /** Hotel details */
  hotels?: HolidayHotelDetails;
  /** Success flag for hotel block */
  success?: number;
  /** Flight data */
  flight_data?: HolidayFlightData;
  /** Formatted package price */
  packageprice?: string;
}

// ============================================================================
// Frontend Types (Transformed)
// ============================================================================

/** Frontend package search criteria */
export interface PackageSearchCriteria {
  /** Departure airport/city code */
  departureCode: string;
  /** Departure airport/city name */
  departureName: string;
  /** Destination code (IATA) */
  destinationCode: string;
  /** Destination name */
  destinationName: string;
  /** Destination hidden value for API (IATA;cityId;cityName) */
  destinationHiddenValue: string;
  /** Check-in date (YYYY-MM-DD) */
  checkIn: string;
  /** Number of nights */
  nights: number;
  /** Room configurations */
  rooms: RoomConfiguration[];
  /** Direct flights only */
  directFlightsOnly?: boolean;
  /** Hotel filters */
  hotelFilters?: HolidayHotelFilters;
  /** Custom sort */
  customSort?: HolidayCustomSort;
}

/** Room configuration */
export interface RoomConfiguration {
  /** Number of adults */
  adults: number;
  /** Number of children */
  children: number;
  /** Child ages (array of ages) */
  childAges: number[];
  /** Number of infants */
  infants: number;
}

/** Transformed package search result for frontend */
export interface PackageSearchResult {
  /** Hotel search result ID */
  id: number;
  /** Hotel ID */
  hotelId: number;
  /** Hotel name */
  hotelName: string;
  /** Hotel description */
  description?: string;
  /** Hotel image URL */
  imageUrl?: string;
  /** Hotel star rating */
  starRating?: number;
  /** Hotel address */
  address?: HolidayHotelAddress;
  /** Room options by room number */
  rooms: HolidayRooms;
  /** Starting price (cheapest room) */
  startingPrice?: number;
  /** Currency code */
  currency?: string;
  /** Flight details for this package */
  flight?: {
    outbound: TransformedFlightLeg;
    inbound?: TransformedFlightLeg;
  };
}

/** Transformed flight leg for frontend */
export interface TransformedFlightLeg {
  /** Total flying time in minutes */
  duration: number;
  /** Segments */
  segments: TransformedFlightSegment[];
  /** Price summary */
  price?: number;
}

/** Transformed flight segment for frontend */
export interface TransformedFlightSegment {
  /** Segment ID */
  id: number;
  /** PSW result ID */
  pswResultId: number;
  /** Airline code */
  airlineCode: string;
  /** Airline name */
  airlineName: string;
  /** Flight number */
  flightNumber: number;
  /** Departure airport */
  departureAirport: string;
  /** Arrival airport */
  arrivalAirport: string;
  /** Departure date (YYYY-MM-DD) */
  departureDate: string;
  /** Arrival date (YYYY-MM-DD) */
  arrivalDate: string;
  /** Departure time (HHmm) */
  departureTime: number;
  /** Arrival time (HHmm) */
  arrivalTime: number;
  /** Number of stops */
  stops: number;
  /** Travel time in minutes */
  travelTime: number;
  /** Cabin class */
  cabinClass: string;
  /** Baggage allowance */
  baggage?: string;
}

/** Package search result metadata */
export interface PackageResultsMeta {
  /** Package search request ID */
  requestId: number;
  /** Hotel request/search ID */
  hotelRequestId?: number;
  /** Hotel request/search ID for next-day fallback */
  hotelRequestIdNextDay?: number;
  /** Flight request/search ID */
  flightRequestId?: number;
  /** Selected/default flight result ID */
  selectedFlightResultId: string;
  /** Pagination */
  pagination?: HolidayPagination;
  /** Hotel day option returned by upstream */
  hotelDayOption?: number;
  /** Search completed flag */
  completed: boolean;
  /** Optional upstream empty-state message */
  emptyMessage?: string;
  /** Legacy fields kept optional for compatibility with older callers */
  flightSearchCriteriaId?: number;
  hotelSearchCriteriaIds?: number;
  selectedFlightPswResultId?: number;
}

/** Selected package for booking */
export interface SelectedPackage {
  /** Hotel search result */
  hotel: PackageSearchResult;
  /** Selected room IDs */
  roomIds: string[];
  /** Flight details */
  flight: {
    outbound: TransformedFlightLeg;
    inbound?: TransformedFlightLeg;
  };
  /** Selected/default flight result ID for booking */
  flightResultId?: string;
  /** Legacy PSW result ID kept for compatibility with older callers */
  pswResultId?: number;
  /** Total package price */
  totalPrice?: number;
}

/** Transformed alternate flight for frontend */
export interface TransformedAlternateFlight {
  /** Live result ID */
  resultId: string;
  /** Price difference from base package */
  priceDifference: number;
  /** Price difference per person */
  priceDifferencePerPerson?: number;
  /** Flight total fare */
  totalFare: number;
  /** Package total */
  holidayPrice?: number;
  /** Package total per room */
  holidayPricePerRoom?: number;
  /** Raw journey segments */
  segments?: HolidayFlightDirection[];
  /** Airline code */
  airlineCode: string;
  /** Airline name */
  airlineName: string;
  /** Flight number */
  flightNumber: number;
  /** Departure airport */
  departureAirport: string;
  /** Arrival airport */
  arrivalAirport: string;
  /** Departure date */
  departureDate: string;
  /** Arrival date */
  arrivalDate: string;
  /** Departure time */
  departureTime: number;
  /** Arrival time */
  arrivalTime: number;
  /** Number of stops */
  stops: number;
  /** Travel time in minutes */
  travelTime: number;
  /** Cabin class */
  cabinClass?: string;
  /** Baggage */
  baggage?: string;
  /** Currency */
  currency?: string;
  /** Refundable text */
  refundableText?: string;
  /** GDS source */
  gds?: string;
  /** Upstream module identifier */
  moduleId?: number;
  /** Fare type/category */
  fareType?: string;
  /** Validating carrier */
  validatingCarrier?: string;
}

export interface PackageRoomsParams {
  requestId?: number;
  flightResultId?: string;
  hotelResultId: number;
}

export interface PackageRoomsResponse {
  results: Array<{
    id: number;
    hotel_id: number;
    hotel_name: string;
    quickDescription?: string;
    hotel_rating?: number;
    image_name?: string;
    geo_loc_latitude?: number;
    geo_loc_longitude?: number;
    address1?: string | null;
    address2?: string | null;
    SellCur?: string;
    rooms?: Record<string, Array<{
      id: string;
      room_name?: string;
      days_spent?: number;
      allocated_rooms?: number;
      allocation_status?: number;
      allocation_status_text?: string;
      supplier_id?: number;
      supplier_name?: string;
      MealPlan?: string;
      meal_name?: string;
      mealId?: number;
      currency_code?: string;
      sell_currency_code?: string;
      cust_tot_sell_amt?: number;
      net_price?: number;
      nonRef?: number;
      cancellation_policy?: string;
    }>>;
  }>;
}
