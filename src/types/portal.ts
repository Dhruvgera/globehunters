/**
 * Vyspa Portal API Types
 * Types for the portal.globehunters.com API methods
 */

// ============================================================================
// Common Types
// ============================================================================

export type PortalApiMethod =
    | 'saveBasketToFolder'
    | 'api_update_folder_status'
    | 'save_customer_details'
    | 'saveBarclaycardPayments'
    | 'matchAllContacts';

export type PassengerTypeCode = 'ADT' | 'CHD' | 'INF';
export type FolderItemType = 'AIR' | 'TKT' | 'OTH';
export type SegmentStatus = 'QU' | 'OK' | 'HK' | 'HL';

// ============================================================================
// Folder Creation (saveBasketToFolder)
// ============================================================================

export interface PortalPassenger {
    pId: string;
    pax_no: string;
    pax_type: PassengerTypeCode;
    title: string;
    first_name: string;
    last_name: string;
    api_gender: 'M' | 'F';
    email: string;
    telephone: string;
    api_document_expiry_date?: string;
    api_document_number?: string;
    api_document_type?: string;
    api_first_name?: string;
    api_last_name?: string;
    api_middle_name?: string;
    api_nationality?: string;
    birth_date: string;
}

export interface FlightSegment {
    fi_type: 'AIR';
    airline_code: string;
    route_no: string;
    start_point_code: string;
    end_point_code: string;
    start_date_time_dt: string; // DD/MM/YYYY
    end_date_time_dt: string; // DD/MM/YYYY
    start_date_time_tm: string; // HH:MM
    end_date_time_tm: string; // HH:MM
    status: SegmentStatus;
    operating_airline_code?: string;
    air_craft_type?: string;
    start_point_loc?: string;
    end_point_loc?: string;
    journey_time?: string;
    journey_dist?: string;
    num_stop?: string;
    booking_ref?: string;
    conf_no?: string;
    booked_via?: string;
    cc_class_code?: string;
    baggage_allow?: string;
    meal_note?: string;
    seat_note?: string;
    fare_basis?: string;
    link_id_key?: string;
    gds_pax_type_code?: PassengerTypeCode;
    num_bum?: string;
}

export interface FolderPricing {
    tot_net_amt: string;
    tot_sell_amt: string;
    desc: string;
    fi_type?: FolderItemType;
    cu_curr_code: string;
}

export interface TicketSegment {
    fi_type: 'TKT';
    airline_code: string;
    finan_vend_id?: number;
    route_no?: string;
    start_point_code: string;
    end_point_code: string;
    start_date_time_dt: string;
    end_date_time_dt: string;
    start_date_time_tm?: string;
    end_date_time_tm?: string;
    status: SegmentStatus;
    rate_note?: string; // Markup IDs
    operating_airline_code?: string;
    air_craft_type?: string;
    start_point_loc?: string;
    end_point_loc?: string;
    journey_time?: string;
    journey_dist?: string;
    num_stop?: string;
    booking_ref?: string;
    conf_no?: string;
    booked_via?: string;
    cc_class_code?: string;
    baggage_allow?: string;
    meal_note?: string;
    seat_note?: string;
    fare_basis?: string;
    link_id_key?: string;
    gds_pax_type_code?: PassengerTypeCode;
    num_bum?: string;
    pax_no?: string;
}

export interface OtherSegment {
    fi_type: 'OTH';
    start_date_time_dt: string;
    end_date_time_dt: string;
    status: SegmentStatus;
    finan_vend_id: number;
    itin_vend_id: number;
    num_bum: string;
    pax_no: string;
    desc: string;
    printing_note?: string;
}

export interface ManualItem {
    Segment: FlightSegment | TicketSegment | OtherSegment;
    FolderPricings?: FolderPricing[];
}

export interface CreateFolderRequest {
    SaveBasketToFolder: string | boolean;
    CartSessionKey: string;
    fromApi: string | boolean;
    folderNumber: string | number;
    itineraryNumber: string | number;
    website_name: string;
    brand: string;
    branch_code: string;
    booker: string;
    departuredate: string; // YYYY-MM-DD
    folder_status: string;
    customer_type: 'C' | 'B'; // C=Customer, B=Business
    sell_curr_code: string;
    foldcur: string;
    des_airport_code: string;
    agencyReference?: string;
    marketsource?: string;
    marketsubsource?: string;
    comments?: string[];
    customer_id?: string;
    matchAllContacts?: boolean;
    passengers: PortalPassenger[];
    manual_items: ManualItem[];
}

// ============================================================================
// iAssure Insurance (saveBasketToFolder with OTH type)
// ============================================================================

export interface AddInsuranceRequest {
    SaveBasketToFolder: boolean;
    fromApi: boolean;
    folderNumber: number;
    itineraryNumber: string;
    customer_type: 'C';
    manual_items: ManualItem[];
}

export type IAssurePlanType = 'basic' | 'premium' | 'all';

// ============================================================================
// Customer Details (save_customer_details)
// ============================================================================

export interface CustomerContact {
    id: string;
    cn_contact_type: '2' | '3'; // 2=Phone, 3=Email
    cn_contact_info: string;
}

export interface SaveCustomerDetailsRequest {
    id: string;
    first_name: string;
    name: string; // Last name
    address1?: string;
    address2?: string;
    address3?: string;
    city_name?: string;
    country_code?: string;
    post_code?: string;
    CustomerNumber?: CustomerContact[];
}

// ============================================================================
// Payment Recording (saveBarclaycardPayments)
// ============================================================================

export interface SavePaymentRequest {
    transaction_id: string;
    folder_no: string;
    itinerary_id: string;
}

// ============================================================================
// Folder Status Update (api_update_folder_status)
// ============================================================================

export interface UpdateFolderStatusRequest {
    folder_no: string;
    new_folder_status_code: string;
    comments?: string[];
}

// Status codes (common ones)
export const FOLDER_STATUS_CODES = {
    BASKET: '1',
    QUOTE: '10',
    BOOKED: '20',
    CONFIRMED: '30',
    TICKETED: '40',
    PAID: '51',
    CANCELLED: '90',
} as const;

// ============================================================================
// API Response Types
// ============================================================================

export interface PortalApiResponse<T = unknown> {
    success?: boolean;
    error?: string;
    message?: string;
    data?: T;
    folder_no?: string | number;
    customer_id?: string | number;
    [key: string]: unknown;
}

export interface CreateFolderResponse {
    folder_no?: string | number;
    customer_id?: string | number;
    email_address?: string;
    success?: boolean;
    error?: string;
}

// ============================================================================
// Service Request Types (simplified for internal use)
// ============================================================================

export interface PortalFolderParams {
    passengers: {
        type: string;
        title: string;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        email: string;
        phone: string;
        gender?: 'M' | 'F';
    }[];
    flight: {
        currency: string;
        totalPrice: number;
        farePrice: number;
        taxPrice: number;
        airlineCode: string;
        departureDate: string;
        returnDate?: string;
        originCode: string;
        destinationCode: string;
        segments: {
            airlineCode: string;
            flightNumber: string;
            departureAirport: string;
            arrivalAirport: string;
            departureDate: string;
            departureTime: string;
            arrivalDate: string;
            arrivalTime: string;
            duration: number;
            distance?: number;
            stops?: number;
            cabinClass?: string;
        }[];
    };
    affiliateCode?: string;
    cabinClass?: string;
    searchRequestId?: string;
    customerId?: string;
}

export interface PortalInsuranceParams {
    folderNumber: number;
    planType: IAssurePlanType;
    price: number;
    currency: string;
    startDate: string;
    endDate: string;
}

export interface PortalPaymentParams {
    folderNumber: string;
    transactionId: string;
    amount: number;
    currency: string;
}
