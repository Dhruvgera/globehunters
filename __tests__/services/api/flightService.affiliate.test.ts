import { flightService } from '@/services/api/flightService';
import { searchFlights as searchFlightsAction } from '@/actions/flights';
import type { SearchParams } from '@/types/flight';

jest.mock('@/actions/flights', () => ({
  searchFlights: jest.fn(),
}));

const mockedSearchFlightsAction = searchFlightsAction as unknown as jest.Mock;

function makeBaseResponse() {
  return {
    flights: [],
    filters: {
      airlines: [],
      departureAirports: [],
      arrivalAirports: [],
      minPrice: 0,
      maxPrice: 0,
    },
    datePrices: [],
    requestId: 'REQ_FROM_API',
  };
}

describe('flightService affiliate propagation', () => {
  beforeEach(() => {
    mockedSearchFlightsAction.mockReset();
  });

  test('includes aff in normal search request when affiliateCode provided', async () => {
    mockedSearchFlightsAction.mockResolvedValueOnce(makeBaseResponse());

    const params: SearchParams = {
      from: 'LHR',
      to: 'JFK',
      departureDate: new Date('2026-01-10T00:00:00.000Z'),
      returnDate: new Date('2026-01-20T00:00:00.000Z'),
      passengers: { adults: 1, children: 0, infants: 0 },
      class: 'Economy',
      tripType: 'round-trip',
    };

    await flightService.searchFlights(params, undefined, 'skyscannerapi');

    expect(mockedSearchFlightsAction).toHaveBeenCalledTimes(1);
    expect(mockedSearchFlightsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        origin1: 'LHR',
        destinationid: 'JFK',
        aff: 'skyscannerapi',
      })
    );
  });

  test('includes aff in requestId restore request when affiliateCode provided', async () => {
    mockedSearchFlightsAction.mockResolvedValueOnce(makeBaseResponse());

    const params: SearchParams = {
      from: 'SYD',
      to: 'MEL',
      departureDate: new Date('2026-02-01T00:00:00.000Z'),
      returnDate: undefined,
      passengers: { adults: 2, children: 0, infants: 0 },
      class: 'Economy',
      tripType: 'one-way',
    };

    await flightService.searchFlights(params, '87989749', 'meta_partner');

    expect(mockedSearchFlightsAction).toHaveBeenCalledTimes(1);
    expect(mockedSearchFlightsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        Request_id: '87989749',
        aff: 'meta_partner',
      })
    );
  });
});


