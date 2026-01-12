import type {
  VyspaAvailabilityV3Response,
  VyspaCityHotelLookupItem,
  VyspaGetRoomsV3Response,
  VyspaHotelSearchDetailsResponse,
  VyspaCreateCustomerFolderResponse,
} from '@/types/vyspaHotels';

export interface HotelSearchParams {
  location: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  rooms: number;
  adults: number;
  children: number;
  hidden_id?: string;
  hidden_key?: string;
  branches?: string;
  internal_rates?: 0 | 1;
  live_rates?: 0 | 1;
}

export interface CreateHotelFolderParams {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchCode: string;
  desAirportCode?: string;
  departureDate: string; // YYYY-MM-DD
  address?: string;
  zipCode?: string;
}

function jsonFetch<T>(url: string, init: RequestInit): Promise<T> {
  return fetch(url, init).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message = (data as any)?.message || `HTTP ${r.status}`;
      throw new Error(message);
    }
    return data as T;
  });
}

export class HotelService {
  async lookupCities(location: string): Promise<VyspaCityHotelLookupItem[]> {
    return jsonFetch<VyspaCityHotelLookupItem[]>('/api/vyspa/hotels/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, json_format: true }),
    });
  }

  async availabilityV3(payload: Record<string, any> | Record<string, any>[]): Promise<VyspaAvailabilityV3Response> {
    return jsonFetch<VyspaAvailabilityV3Response>('/api/vyspa/hotels/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async searchAvailabilityV3(params: HotelSearchParams): Promise<VyspaAvailabilityV3Response> {
    const nights = Math.max(
      1,
      Math.round((new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) / (1000 * 60 * 60 * 24))
    );

    const criteria: Record<string, any> = {
      location: params.location,
      hidden_id: params.hidden_id,
      hidden_key: params.hidden_key,
      nights: String(nights),
      rooms: String(params.rooms),
      adults: String(params.adults),
      children: String(params.children),
      arrivalDate: params.checkIn,
      departureDate: params.checkOut,
      internal_rates: params.internal_rates ?? 1,
      live_rates: params.live_rates ?? 1,
      optionsRadios: 'hotels',
      branches: params.branches,
    };

    return this.availabilityV3([criteria]);
  }

  async getRoomsV3(searchCriteriaId: number, hotelId: string, srId?: string): Promise<VyspaGetRoomsV3Response> {
    const trySrIds = async () =>
      jsonFetch<VyspaGetRoomsV3Response>('/api/vyspa/hotels/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ SearchCriteriaId: searchCriteriaId, srIds: String(srId) }]),
      });

    const tryHotelIds = async () =>
      jsonFetch<VyspaGetRoomsV3Response>('/api/vyspa/hotels/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ SearchCriteriaId: searchCriteriaId, hotelIds: String(hotelId) }]),
      });

    // Vyspa behavior: some hotels fail when using srIds but succeed with hotelIds.
    if (srId) {
      try {
        return await trySrIds();
      } catch {
        return await tryHotelIds();
      }
    }

    return await tryHotelIds();
  }

  async hotelSearchDetails(payload: unknown[]): Promise<VyspaHotelSearchDetailsResponse> {
    return jsonFetch<VyspaHotelSearchDetailsResponse>('/api/vyspa/hotels/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async createCustomerFolder(params: CreateHotelFolderParams): Promise<VyspaCreateCustomerFolderResponseItem | VyspaCreateCustomerFolderResponseItem[]> {
    const payload = [
      {
        customer_type: 'C',
        title: params.title,
        last_name: params.lastName,
        first_name: params.firstName,
        address: params.address ?? 'NA',
        contact_types: [
          { type: 'EMAILTO', contact: params.email },
          { type: 'HOME', contact: params.phone },
        ],
        branch_code: params.branchCode,
        zip_code: params.zipCode ?? 'NA',
        des_airport_code: params.desAirportCode ?? '',
        departuredate: params.departureDate,
        staff_code: 'SYS',
        owned_by: 'SYS',
      },
    ];

    return jsonFetch<VyspaCreateCustomerFolderResponse>('/api/vyspa/hotels/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}

export const hotelService = new HotelService();


