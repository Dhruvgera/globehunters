import { searchFlightsVyspa } from '@/lib/vyspa/client';
import type { FlightSearchRequest } from '@/types/vyspa';
import { searchFlights } from './searchFlights';

jest.mock('@/lib/vyspa/client', () => ({
  searchFlightsVyspa: jest.fn(),
}));

const validRequest: FlightSearchRequest = {
  origin1: 'NYC',
  destinationid: 'LON',
  fr: '08/12/2026',
  to: '15/12/2026',
  adt1: '2',
  chd1: '0',
  inf1: '0',
  ow: '0',
  dir: '0',
  cl: '1',
};

describe('searchFlights Server Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns upstream failures as serializable response data', async () => {
    (searchFlightsVyspa as jest.Mock).mockRejectedValue({
      type: 'API_ERROR',
      message: 'Vyspa returned a non-JSON response (text/html)',
      userMessage: 'Flight search service is currently unavailable. Please try again later.',
    });

    await expect(searchFlights(validRequest)).resolves.toEqual({
      flights: [],
      filters: { airlines: [], departureAirports: [], arrivalAirports: [], minPrice: 0, maxPrice: 0 },
      error: 'Flight search service is currently unavailable. Please try again later.',
    });
  });

  it('does not expose unexpected server or supplier error details', async () => {
    (searchFlightsVyspa as jest.Mock).mockRejectedValue(
      new SyntaxError('Unexpected token < in raw upstream HTML body')
    );

    await expect(searchFlights(validRequest)).resolves.toMatchObject({
      flights: [],
      error: 'Flight search failed. Please try again.',
    });
  });
});
