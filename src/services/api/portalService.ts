/**
 * Vyspa Portal API Service
 * Handles all portal.globehunters.com API calls
 */

import { VYSPA_PORTAL_CONFIG, getPortalRegionConfig, CONTACT_TYPES } from '@/config/vyspaPortal';
import { getMarketSourceMapping } from '@/lib/utils/affiliateMapping';
import {
    PortalApiMethod,
    CreateFolderRequest,
    CreateFolderResponse,
    PortalPassenger,
    ManualItem,
    FlightSegment,
    TicketSegment,
    OtherSegment,
    FolderPricing,
    SavePaymentRequest,
    UpdateFolderStatusRequest,
    SaveCustomerDetailsRequest,
    PortalFolderParams,
    PortalInsuranceParams,
    PortalPaymentParams,
    IAssurePlanType,
    FOLDER_STATUS_CODES,
    PassengerTypeCode,
} from '@/types/portal';

/**
 * Format date from various formats to DD/MM/YYYY for Portal API
 */
function formatDateForPortal(dateStr: string): string {
    if (!dateStr) return '';

    // If already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }

    // Try parsing as Date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Handle format like "SUN, 30 NOV 25" or "30 Nov 2025"
    const match = dateStr.match(/(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2,4})/);
    if (match) {
        const [, d, monStr, y] = match;
        const day = d.padStart(2, '0');
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthIndex = monthNames.indexOf(monStr.toUpperCase());
        const month = monthIndex >= 0 ? String(monthIndex + 1).padStart(2, '0') : '01';
        let yearNum = parseInt(y, 10);
        if (yearNum < 100) yearNum += 2000;
        return `${day}/${month}/${yearNum}`;
    }

    return dateStr;
}

/**
 * Format date to YYYY-MM-DD for departure date field
 */
function formatDepartureDateForPortal(dateStr: string): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return dateStr;
}

/**
 * Map passenger type string to code
 */
function mapPassengerType(type: string): PassengerTypeCode {
    const t = type.toLowerCase();
    if (t === 'child' || t === 'chd') return 'CHD';
    if (t === 'infant' || t === 'inf') return 'INF';
    return 'ADT';
}

/**
 * Map gender from title
 */
function mapGenderFromTitle(title: string): 'M' | 'F' {
    const t = title.toLowerCase();
    if (t === 'mr' || t === 'mstr') return 'M';
    return 'F';
}

/**
 * Get iAssure plan description
 */
function getIAssurePlanDescription(planType: IAssurePlanType): string {
    const descriptions: Record<IAssurePlanType, string> = {
        basic: 'Basic',
        premium: 'Premium',
        all: 'All Included',
    };
    return descriptions[planType] || 'Basic';
}

class PortalService {
    /**
     * Make a Portal API call
     */
    private async callPortalApi<T = unknown>(
        method: PortalApiMethod,
        params: unknown[]
    ): Promise<T> {
        const { apiUrl, credentials, timeout } = VYSPA_PORTAL_CONFIG;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // Build form data
            const formData = new URLSearchParams();
            formData.append('username', credentials.username);
            formData.append('password', credentials.password);
            formData.append('token', credentials.token);
            formData.append('method', method);
            formData.append('params', JSON.stringify(params));

            console.log(`[PortalService] Calling ${method}`, {
                paramsPreview: JSON.stringify(params).substring(0, 200),
            });

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error(`[PortalService] ${method} failed`, {
                    status: response.status,
                    errorSnippet: errorText.substring(0, 500),
                });
                throw new Error(`Portal API ${method} failed: HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log(`[PortalService] ${method} response`, {
                success: data?.success !== false,
                hasError: !!data?.error,
            });

            return data as T;
        } catch (error: any) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Portal API ${method} timeout after ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Create a new folder with flight details
     * Uses saveBasketToFolder method
     */
    async createFolder(params: PortalFolderParams): Promise<CreateFolderResponse> {
        const regionConfig = getPortalRegionConfig();
        const marketMapping = getMarketSourceMapping(
            params.affiliateCode,
            regionConfig.branchCode === 'UKHQ' ? 'UK' : regionConfig.branchCode as any,
            params.cabinClass || 'Economy'
        );
        const leadPassenger = params.passengers[0];

        // Build passenger array
        const portalPassengers: PortalPassenger[] = params.passengers.map((p, index) => ({
            pId: '',
            pax_no: String(index + 1),
            pax_type: mapPassengerType(p.type),
            title: p.title,
            first_name: p.firstName.toUpperCase(),
            last_name: p.lastName.toUpperCase(),
            api_gender: p.gender || mapGenderFromTitle(p.title),
            email: p.email,
            telephone: p.phone,
            api_document_expiry_date: '',
            api_document_number: '',
            api_document_type: '',
            api_first_name: '',
            api_last_name: '',
            api_middle_name: '',
            api_nationality: '',
            birth_date: p.dateOfBirth,
        }));

        // Build flight segments (AIR type for each leg)
        const manualItems: ManualItem[] = [];
        let linkIdKey = 'null';

        for (let i = 0; i < params.flight.segments.length; i++) {
            const seg = params.flight.segments[i];

            const airSegment: FlightSegment = {
                fi_type: 'AIR',
                airline_code: seg.airlineCode,
                route_no: seg.flightNumber,
                start_point_code: seg.departureAirport,
                end_point_code: seg.arrivalAirport,
                start_date_time_dt: formatDateForPortal(seg.departureDate),
                end_date_time_dt: formatDateForPortal(seg.arrivalDate),
                start_date_time_tm: seg.departureTime,
                end_date_time_tm: seg.arrivalTime,
                status: 'QU',
                operating_airline_code: '',
                air_craft_type: '',
                start_point_loc: '',
                end_point_loc: '',
                journey_time: String(seg.duration || ''),
                journey_dist: String(seg.distance || ''),
                num_stop: String(seg.stops || 0),
                booking_ref: '',
                conf_no: '',
                booked_via: VYSPA_PORTAL_CONFIG.defaultBookedVia,
                cc_class_code: seg.cabinClass?.charAt(0) || 'Y',
                baggage_allow: '',
                meal_note: '',
                seat_note: '',
                fare_basis: '',
                link_id_key: linkIdKey,
                gds_pax_type_code: 'ADT',
                num_bum: '1',
            };

            manualItems.push({ Segment: airSegment });
            linkIdKey = '0'; // Subsequent segments link to first
        }

        // Add ticket segment (TKT type with pricing)
        const ticketSegment: TicketSegment = {
            fi_type: 'TKT',
            airline_code: params.flight.airlineCode,
            route_no: '',
            start_point_code: params.flight.originCode,
            end_point_code: params.flight.destinationCode,
            start_date_time_dt: formatDateForPortal(params.flight.departureDate),
            end_date_time_dt: formatDateForPortal(params.flight.returnDate || params.flight.departureDate),
            start_date_time_tm: params.flight.segments[0]?.departureTime || '',
            end_date_time_tm: params.flight.segments[params.flight.segments.length - 1]?.arrivalTime || '',
            status: 'QU',
            booked_via: VYSPA_PORTAL_CONFIG.defaultBookedVia,
            cc_class_code: params.cabinClass?.charAt(0) || 'Y',
            link_id_key: '0',
            gds_pax_type_code: 'ADT',
            num_bum: '1',
            pax_no: '1',
        };

        const ticketPricings: FolderPricing[] = [
            {
                tot_net_amt: String(params.flight.farePrice),
                tot_sell_amt: String(params.flight.farePrice),
                desc: 'Fare',
                fi_type: 'TKT',
                cu_curr_code: params.flight.currency,
            },
            {
                tot_net_amt: String(params.flight.taxPrice),
                tot_sell_amt: String(params.flight.taxPrice),
                desc: 'Tax',
                fi_type: 'TKT',
                cu_curr_code: params.flight.currency,
            },
        ];

        manualItems.push({
            Segment: ticketSegment,
            FolderPricings: ticketPricings,
        });

        // Build folder creation request
        const folderRequest: CreateFolderRequest = {
            SaveBasketToFolder: 'True',
            CartSessionKey: '',
            fromApi: 'True',
            folderNumber: '0',
            itineraryNumber: '0',
            website_name: regionConfig.websiteName,
            brand: regionConfig.brand,
            branch_code: regionConfig.branchCode,
            booker: `${leadPassenger.firstName} ${leadPassenger.lastName}`,
            departuredate: formatDepartureDateForPortal(params.flight.departureDate),
            folder_status: 'Basket',
            customer_type: 'C',
            sell_curr_code: params.flight.currency,
            foldcur: params.flight.currency,
            des_airport_code: params.flight.destinationCode,
            agencyReference: params.searchRequestId || '',
            marketsource: marketMapping.sourceId,
            marketsubsource: marketMapping.subSourceId,
            comments: [],
            customer_id: params.customerId || '',
            matchAllContacts: !params.customerId, // Check for existing customer if no ID
            passengers: portalPassengers,
            manual_items: manualItems,
        };

        try {
            const response = await this.callPortalApi<CreateFolderResponse>('saveBasketToFolder', [folderRequest]);
            return response;
        } catch (error) {
            console.error('[PortalService] createFolder failed', error);
            throw error;
        }
    }

    /**
     * Add iAssure insurance to an existing folder
     */
    async addInsurance(params: PortalInsuranceParams): Promise<unknown> {
        const insuranceSegment: OtherSegment = {
            fi_type: 'OTH',
            start_date_time_dt: formatDateForPortal(params.startDate),
            end_date_time_dt: formatDateForPortal(params.endDate),
            status: 'OK',
            finan_vend_id: VYSPA_PORTAL_CONFIG.iAssureVendorId,
            itin_vend_id: VYSPA_PORTAL_CONFIG.iAssureVendorId,
            num_bum: '1',
            pax_no: '1',
            desc: getIAssurePlanDescription(params.planType),
            printing_note: 'OTH',
        };

        const insurancePricing: FolderPricing = {
            tot_net_amt: String(params.price.toFixed(2)),
            tot_sell_amt: String(params.price.toFixed(2)),
            desc: 'iAssure Insurance',
            cu_curr_code: params.currency,
        };

        const request = {
            SaveBasketToFolder: true,
            fromApi: true,
            folderNumber: params.folderNumber,
            itineraryNumber: '1',
            customer_type: 'C',
            manual_items: [
                {
                    Segment: insuranceSegment,
                    FolderPricings: [insurancePricing],
                },
            ],
        };

        try {
            const response = await this.callPortalApi('saveBasketToFolder', [request]);
            return response;
        } catch (error) {
            console.error('[PortalService] addInsurance failed', error);
            throw error;
        }
    }

    /**
     * Add baggage to an existing folder
     */
    async addBaggage(params: {
        folderNumber: number;
        quantity: number;
        pricePerBag: number;
        currency: string;
        startDate: string;
        endDate: string;
    }): Promise<unknown> {
        const baggageSegment: OtherSegment = {
            fi_type: 'OTH',
            start_date_time_dt: formatDateForPortal(params.startDate),
            end_date_time_dt: formatDateForPortal(params.endDate),
            status: 'OK',
            finan_vend_id: 0, // No specific vendor for baggage
            itin_vend_id: 0,
            num_bum: String(params.quantity),
            pax_no: '1',
            desc: `Extra Baggage x${params.quantity}`,
            printing_note: 'OTH',
        };

        const totalPrice = params.quantity * params.pricePerBag;
        const baggagePricing: FolderPricing = {
            tot_net_amt: String(totalPrice.toFixed(2)),
            tot_sell_amt: String(totalPrice.toFixed(2)),
            desc: 'Additional Baggage',
            cu_curr_code: params.currency,
        };

        const request = {
            SaveBasketToFolder: true,
            fromApi: true,
            folderNumber: params.folderNumber,
            itineraryNumber: '1',
            customer_type: 'C',
            manual_items: [
                {
                    Segment: baggageSegment,
                    FolderPricings: [baggagePricing],
                },
            ],
        };

        try {
            const response = await this.callPortalApi('saveBasketToFolder', [request]);
            return response;
        } catch (error) {
            console.error('[PortalService] addBaggage failed', error);
            throw error;
        }
    }

    /**
     * Save payment transaction to folder
     */
    async savePayment(params: PortalPaymentParams): Promise<unknown> {
        const request: SavePaymentRequest = {
            transaction_id: params.transactionId,
            folder_no: params.folderNumber,
            itinerary_id: '1',
        };

        try {
            const response = await this.callPortalApi('saveBarclaycardPayments', [request]);
            return response;
        } catch (error) {
            console.error('[PortalService] savePayment failed', error);
            throw error;
        }
    }

    /**
     * Update folder status
     */
    async updateFolderStatus(params: {
        folderNumber: string;
        statusCode: string;
        comments?: string[];
    }): Promise<unknown> {
        const request: UpdateFolderStatusRequest = {
            folder_no: params.folderNumber,
            new_folder_status_code: params.statusCode,
            comments: params.comments || [],
        };

        try {
            const response = await this.callPortalApi('api_update_folder_status', [request]);
            return response;
        } catch (error) {
            console.error('[PortalService] updateFolderStatus failed', error);
            throw error;
        }
    }

    /**
     * Save customer details
     */
    async saveCustomerDetails(params: {
        customerId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        address?: string;
        city?: string;
        postalCode?: string;
        countryCode?: string;
    }): Promise<unknown> {
        const request: SaveCustomerDetailsRequest = {
            id: params.customerId,
            first_name: params.firstName,
            name: params.lastName,
            address1: params.address || '',
            address2: '',
            address3: '',
            city_name: params.city || '',
            country_code: params.countryCode || 'GB',
            post_code: params.postalCode || '',
            CustomerNumber: [
                {
                    id: '',
                    cn_contact_type: CONTACT_TYPES.PHONE,
                    cn_contact_info: params.phone,
                },
                {
                    id: '',
                    cn_contact_type: CONTACT_TYPES.EMAIL,
                    cn_contact_info: params.email,
                },
            ],
        };

        try {
            const response = await this.callPortalApi('save_customer_details', [request]);
            return response;
        } catch (error) {
            console.error('[PortalService] saveCustomerDetails failed', error);
            throw error;
        }
    }

    /**
     * Mark folder as paid (convenience method)
     */
    async markFolderAsPaid(folderNumber: string, amount: number, currency: string): Promise<unknown> {
        return this.updateFolderStatus({
            folderNumber,
            statusCode: FOLDER_STATUS_CODES.PAID,
            comments: [`${currency} ${amount.toFixed(2)}`],
        });
    }
}

// Export singleton instance
export const portalService = new PortalService();
