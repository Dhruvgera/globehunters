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
  adult_room?: number[];
  children_room?: number[];
  child_age?: Array<Record<string, number>>;
  timeout?: number;
  searchCriteriaId?: number | string;
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
    return jsonFetch<VyspaCityHotelLookupItem[]>('/api/hotels/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, json_format: true }),
    });
  }

  async availabilityV3(payload: Record<string, any> | Record<string, any>[]): Promise<VyspaAvailabilityV3Response> {
    return jsonFetch<VyspaAvailabilityV3Response>('/api/hotels/availability', {
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

    const defaultTimeoutSec = (() => {
      const raw = Number(process.env.NEXT_PUBLIC_VYSPA_HOTELS_TIMEOUT_SEC || 5);
      if (!Number.isFinite(raw) || raw <= 0) return 5;
      return Math.trunc(raw);
    })();
    const timeoutSec = (() => {
      const raw = typeof params.timeout === 'number' ? params.timeout : Number(params.timeout);
      if (!Number.isFinite(raw) || raw <= 0) return Math.max(5, defaultTimeoutSec);
      return Math.max(5, Math.trunc(raw));
    })();

    const criteria: Record<string, any> = {
      location: params.location,
      hidden_id: params.hidden_id,
      hidden_key: params.hidden_key,
      minimalResponse: false,
      timeout: timeoutSec,
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

    if (params.searchCriteriaId !== undefined && params.searchCriteriaId !== null && String(params.searchCriteriaId).trim()) {
      criteria.searchCriteriaId = params.searchCriteriaId;
    }

    if (params.children > 0) {
      const rooms = Math.max(1, Number(params.rooms || 1));
      const totalAdults = Math.max(1, Number(params.adults || 2));
      const totalChildren = Math.max(0, Number(params.children || 0));

      const adultRoom = Array.isArray(params.adult_room) && params.adult_room.length === rooms
        ? params.adult_room
        : (() => {
          const out = Array.from({ length: rooms }, () => 0);
          let remaining = totalAdults;
          for (let i = 0; i < rooms; i += 1) {
            if (remaining <= 0) break;
            const roomsLeft = rooms - i;
            const allocation = Math.ceil(remaining / roomsLeft);
            out[i] = allocation;
            remaining -= allocation;
          }
          return out;
        })();

      const childrenRoom = Array.isArray(params.children_room) && params.children_room.length === rooms
        ? params.children_room
        : (() => {
          const out = Array.from({ length: rooms }, () => 0);
          let remaining = totalChildren;
          for (let i = 0; i < rooms; i += 1) {
            if (remaining <= 0) break;
            const roomsLeft = rooms - i;
            const allocation = Math.ceil(remaining / roomsLeft);
            out[i] = allocation;
            remaining -= allocation;
          }
          return out;
        })();

      const childAge = Array.isArray(params.child_age) && params.child_age.length === rooms
        ? params.child_age
        : childrenRoom.map((count) => {
          const roomAges: Record<string, number> = {};
          for (let index = 1; index <= count; index += 1) roomAges[String(index)] = 9;
          return roomAges;
        });

      criteria.adult_room = adultRoom;
      criteria.children_room = childrenRoom;
      criteria.child_age = childAge;
    }

    return this.availabilityV3([criteria]);
  }

  async getRoomsV3(searchCriteriaId: number | string, hotelId: string, srId?: string): Promise<VyspaGetRoomsV3Response> {
    const trySrIds = async () =>
      jsonFetch<VyspaGetRoomsV3Response>('/api/hotels/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ SearchCriteriaId: searchCriteriaId, srIds: String(srId) }]),
      });

    const tryHotelIds = async () =>
      jsonFetch<VyspaGetRoomsV3Response>('/api/hotels/rooms', {
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

    // When metadata is missing, the route param can be srId-like. Try both shapes.
    try {
      return await tryHotelIds();
    } catch {
      return await jsonFetch<VyspaGetRoomsV3Response>('/api/hotels/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ SearchCriteriaId: searchCriteriaId, srIds: String(hotelId) }]),
      });
    }
  }

  async hotelSearchDetails(payload: unknown[]): Promise<VyspaHotelSearchDetailsResponse> {
    return jsonFetch<VyspaHotelSearchDetailsResponse>('/api/hotels/details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async accommodationDetails(payload: unknown[]): Promise<unknown> {
    return jsonFetch<unknown>('/api/hotels/accommodation-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async createCustomerFolder(params: CreateHotelFolderParams): Promise<VyspaCreateCustomerFolderResponse> {
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

    return jsonFetch<VyspaCreateCustomerFolderResponse>('/api/hotels/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async submitHotelbedsToFolder(payload: {
    provider?: 'hotelbeds';
    folderNumber: number;
    currency: string;
    hotel: { hotelId: string; hotelName: string };
    stay: { checkIn: string; checkOut: string; rooms: number; adults: number; children: number };
    passengers?: Array<{
      pax_no?: number;
      title?: string;
      first_name: string;
      middle_name?: string;
      last_name: string;
      birth_date?: string;
      age?: number;
      pax_type: 'ADT' | 'CHD' | 'INF';
      api_gender?: 'M' | 'F';
      email?: string;
      phone?: string;
      telephone?: string;
    }>;
    comments?: string[];
    selection: { total: number; nightly?: number; rateKey?: string; boardName?: string; refundable?: boolean };
  }): Promise<{ success: boolean; result?: unknown; message?: string }> {
    return jsonFetch<{ success: boolean; result?: unknown; message?: string }>('/api/hotels/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'hotelbeds', ...payload }),
    });
  }
}

export const hotelService = new HotelService();
