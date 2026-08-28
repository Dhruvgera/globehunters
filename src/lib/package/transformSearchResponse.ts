import { fixStubaImageUrl } from '@/lib/hotels/imageUrl';
import { parsePackageHotelContent } from '@/lib/package/hotelContent';
import type {
  HolidayFlightDirection,
  HolidayFlightSegment,
  HolidayPackageSearchResponse,
  PackageResultsMeta,
  PackageSearchResult,
  TransformedFlightLeg,
  TransformedFlightSegment,
} from '@/types/holidayPackage';

function extractPackageAmenities(hotel: Record<string, unknown>): string[] {
  const labels = new Set<string>();
  const attributes = hotel.attributes;
  if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
    Object.values(attributes as Record<string, unknown>)
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .forEach((label) => labels.add(label));
  }
  const parsed = parsePackageHotelContent(hotel.quickDescription ?? hotel.description ?? '');
  parsed.amenities.forEach((label) => labels.add(label));
  return Array.from(labels).slice(0, 24);
}

function extractMealPlans(hotel: Record<string, unknown>): string[] {
  const mealPlans = hotel.MealPlans;
  if (!Array.isArray(mealPlans)) return [];
  return Array.from(new Set(mealPlans.map((value) => String(value || '').trim()).filter(Boolean)));
}

function transformFlightLeg(direction: HolidayFlightDirection): TransformedFlightLeg {
  const rawDirection = direction as unknown as {
    Flights?: HolidayFlightSegment[];
    flights?: HolidayFlightSegment[];
    Flying_time?: number;
    flying_time?: number;
  };
  const flightRows = Array.isArray(rawDirection.Flights)
    ? rawDirection.Flights
    : Array.isArray(rawDirection.flights)
      ? rawDirection.flights
      : [];
  const segments: TransformedFlightSegment[] = flightRows.map((segment, index) => ({
    id: Number(segment.id ?? index + 1),
    pswResultId: Number(segment.psw_result_id ?? 0),
    airlineCode: segment.airline_code,
    airlineName: segment.airline_name,
    flightNumber: segment.flight_number,
    departureAirport: segment.departure_airport,
    arrivalAirport: segment.arrival_airport,
    departureDate: segment.departure_date,
    arrivalDate: segment.arrival_date,
    departureTime: segment.departure_time,
    arrivalTime: segment.arrival_time,
    stops: Number(segment.number_stops ?? 0),
    travelTime: Number(segment.travel_time ?? 0),
    cabinClass: segment.class_name || segment.cabin_class,
    baggage: segment.Baggage,
  }));
  return { duration: Number(rawDirection.Flying_time ?? rawDirection.flying_time ?? 0), segments };
}

function extractStartingPrice(hotel: Record<string, unknown>): number | undefined {
  const candidates = ['MinSC', 'MinRO', 'MinBB', 'MinHB', 'MinFB', 'MinAI']
    .map((key) => Number(hotel[key]))
    .filter((value) => Number.isFinite(value) && value > 0);
  return candidates.length > 0 ? Math.min(...candidates) : undefined;
}

function extractPackageEmptyMessage(rawResults: unknown): string | undefined {
  if (!Array.isArray(rawResults) || rawResults.length < 2) return undefined;
  const [, message] = rawResults;
  if (typeof message !== 'string') return undefined;
  return message.trim() || undefined;
}

function isPackageHotelResultRow(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return Number.isFinite(Number(row.id))
    && Number.isFinite(Number(row.hotel_id))
    && Boolean(String(row.hotel_name || '').trim());
}

export function transformPackageSearchResponse(
  vyspaResponse: HolidayPackageSearchResponse,
): { results: PackageSearchResult[]; meta: PackageResultsMeta } {
  const criteria = Array.isArray(vyspaResponse.SearchCriteria)
    ? vyspaResponse.SearchCriteria[0]
    : vyspaResponse.SearchCriteria;
  const flightDirections = Array.isArray(vyspaResponse.FlightDetails) ? vyspaResponse.FlightDetails : [];
  const outboundLeg = flightDirections[0] ? transformFlightLeg(flightDirections[0]) : undefined;
  const inboundLeg = flightDirections[1] ? transformFlightLeg(flightDirections[1]) : undefined;
  const rawHotelRows = Array.isArray(vyspaResponse.Packages?.results) ? vyspaResponse.Packages.results : [];
  const hotelRows = rawHotelRows.filter(isPackageHotelResultRow);
  const checkInDate = typeof criteria?.CheckInDate === 'string' ? criteria.CheckInDate : undefined;
  const checkOutDate = typeof criteria?.CheckOutDate === 'string' ? criteria.CheckOutDate : undefined;

  const results: PackageSearchResult[] = hotelRows.map((hotel) => {
    const hotelRow = hotel as unknown as Record<string, unknown>;
    const hotelInfo = hotelRow.HotelInfo && typeof hotelRow.HotelInfo === 'object' && !Array.isArray(hotelRow.HotelInfo)
      ? hotelRow.HotelInfo as Record<string, unknown>
      : undefined;
    return {
      id: Number(hotel.id),
      hotelId: Number(hotel.hotel_id),
      hotelName: String(hotel.hotel_name),
      description: typeof hotel.quickDescription === 'string' ? hotel.quickDescription : undefined,
      imageUrl: fixStubaImageUrl(hotel.image_name),
      starRating: Number(hotelRow.hotel_rating ?? hotelInfo?.hotel_rating ?? 0) || undefined,
      address: {
        street1: typeof hotelRow.address1 === 'string' ? hotelRow.address1 : undefined,
        street2: typeof hotelRow.address2 === 'string' ? hotelRow.address2 : undefined,
        city: typeof hotelRow.cityName === 'string' ? hotelRow.cityName : undefined,
        country: typeof hotelRow.countryName === 'string' ? hotelRow.countryName : undefined,
        latitude: Number(hotelRow.geo_loc_latitude ?? 0) || undefined,
        longitude: Number(hotelRow.geo_loc_longitude ?? 0) || undefined,
      },
      rooms: {},
      startingPrice: extractStartingPrice(hotelRow),
      currency: typeof hotelRow.SellCur === 'string' ? hotelRow.SellCur : undefined,
      amenities: extractPackageAmenities(hotelRow),
      mealPlans: extractMealPlans(hotelRow),
      cityName: typeof hotelRow.cityName === 'string' ? hotelRow.cityName : undefined,
      countryName: typeof hotelRow.countryName === 'string' ? hotelRow.countryName : undefined,
      rawSearchResult: hotelRow,
      checkInDate,
      checkOutDate,
      deepLinkKeys: typeof hotelRow.keys === 'object' && hotelRow.keys !== null && !Array.isArray(hotelRow.keys)
        ? hotelRow.keys as Record<string, string>
        : undefined,
      deepLinkUrl: typeof hotelRow.DeepLink === 'string' ? hotelRow.DeepLink : undefined,
      flight: outboundLeg ? { outbound: outboundLeg, inbound: inboundLeg } : undefined,
    };
  });

  const meta: PackageResultsMeta = {
    requestId: Number(criteria?.RequestId ?? 0),
    hotelRequestId: Number(criteria?.HotelRequestId ?? 0) || undefined,
    hotelRequestIdNextDay: Number(criteria?.HotelRequestIdNextDay ?? 0) || undefined,
    flightRequestId: Number(criteria?.FlightRequestId ?? 0) || undefined,
    selectedFlightResultId: String(criteria?.FlightResultId ?? ''),
    hotelDayOption: Number(criteria?.HotelDayOption ?? vyspaResponse.HotelDayOption ?? 0) || undefined,
    pagination: vyspaResponse.Packages?.pagination,
    completed: Boolean(criteria?.searchComplete),
    emptyMessage: results.length === 0 ? extractPackageEmptyMessage(rawHotelRows) : undefined,
    flightSearchCriteriaId: Number(criteria?.FlightRequestId ?? 0) || undefined,
    hotelSearchCriteriaIds: Number(criteria?.HotelRequestId ?? 0) || undefined,
  };
  return { results, meta };
}
