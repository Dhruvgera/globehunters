# Vyspa API Integration Library

Complete implementation of Vyspa flight search API integration for GlobeHunters.

## Overview

This library provides a complete abstraction layer over the Vyspa API, including:
- HTTP client for API communication
- Request/response transformation
- Validation and error handling
- Business rules and filtering
- TypeScript type safety

## Directory Structure

```
src/lib/vyspa/
├── client.ts         # HTTP client for Vyspa API calls
├── transformers.ts   # Response transformation logic
├── validators.ts     # Parameter validation
├── utils.ts          # Helper utilities
├── rules.ts          # Business rules and filtering
├── errors.ts         # Error handling utilities
├── index.ts          # Barrel export
└── README.md         # This file
```

## Usage

### Basic Flight Search

```typescript
import { searchFlightsVyspa, transformVyspaResponse } from '@/lib/vyspa';

// Prepare search parameters
const params: FlightSearchRequest = {
  origin1: 'LHR',
  destinationid: 'JFK',
  fr: '01/12/2025',
  to: '08/12/2025',
  adt1: '2',
  chd1: '0',
  ow: '0',
  dir: '0',
  cl: '1',
};

// Call API
const vyspaResponse = await searchFlightsVyspa(params);

// Transform to frontend format
const flightData = transformVyspaResponse(vyspaResponse);
```

### Using Server Actions (Recommended)

```typescript
import { searchFlights } from '@/actions/flights';

// Server action handles all the complexity
const results = await searchFlights(params);
```

## Modules

### client.ts

HTTP client for calling Vyspa API.

**Key Functions:**
- `searchFlightsVyspa()` - Main API call function
- `testVyspaConnection()` - Test API connectivity

**Features:**
- Automatic timeout handling (30s)
- Credential management
- Error wrapping with user-friendly messages

### transformers.ts

Transform Vyspa API responses to frontend types.

**Key Functions:**
- `transformVyspaResponse()` - Main transformation function
- `transformResult()` - Transform individual result
- `transformSegmentToFlightSegment()` - Transform segment data

**Transformations:**
- Vyspa `Result[]` → `Flight[]`
- Vyspa `Segment` → `FlightSegment`
- Price parsing and calculation
- Filter generation (airlines, airports, price range)

### validators.ts

Parameter validation before API calls.

**Key Functions:**
- `validateSearchParams()` - Validate search parameters
- `validateVyspaConfig()` - Validate API configuration
- `validateDateNotPast()` - Date validation
- `validateCabinClass()` - Cabin class validation

**Validations:**
- Required fields
- Date formats (DD/MM/YYYY)
- Airport codes (3 letters)
- Passenger counts (within limits)
- Return date after departure date

### utils.ts

Helper utilities for data manipulation.

**Key Functions:**
- `convertDateFormat()` - DD/MM/YYYY → YYYY-MM-DD
- `formatTime()` - HHMM → HH:MM
- `parsePriceValue()` - Parse prices from various formats
- `generateChildAges()` - Generate default child ages
- `formatDuration()` - Format minutes to "Xh Ym"
- `calculateDuration()` - Calculate duration between times

### rules.ts

Business logic and filtering.

**Key Functions:**
- `applyBusinessRules()` - Main rules engine
- `filterDirectFlightsOnly()` - Direct flights filter
- `removeDuplicateFlights()` - Deduplicate results
- `sortFlightsByPrice()` - Sort by price

**Features:**
- Direct flights filtering
- Duplicate removal
- Price sorting
- Filter regeneration

### errors.ts

Comprehensive error handling.

**Key Functions:**
- `createVyspaError()` - Create standardized errors
- `getUserFriendlyErrorMessage()` - Get user-facing message
- `handleVyspaApiError()` - Handle API errors
- `retryOnError()` - Retry with exponential backoff
- `logError()` - Structured error logging

**Error Types:**
- Network errors
- Timeout errors
- API errors
- Module not found (route not supported)
- Validation errors

## Configuration

Set environment variables in `.env.local`:

```env
VYSPA_API_URL=https://a1.stagev4.vyspa.net/jsonserver.php
VYSPA_USERNAME=your_username
VYSPA_PASSWORD=your_password
VYSPA_TOKEN=your_token
```

## Error Handling

All errors are wrapped with user-friendly messages:

```typescript
try {
  const results = await searchFlights(params);
} catch (error) {
  // Error will have user-friendly message
  console.error(error.message); 
  // "No flights available for this route"
  // "Unable to connect to flight search service"
  // etc.
}
```

## Type Safety

All functions are fully typed:

```typescript
// Request type
interface FlightSearchRequest {
  origin1: string;
  destinationid: string;
  fr: string; // DD/MM/YYYY
  // ... more fields
}

// Response type
interface VyspaApiResponse {
  Results?: VyspaResult[];
  error?: string;
}

// Transformed type
interface FlightSearchResponse {
  flights: Flight[];
  filters: {
    airlines: AirlineFilter[];
    // ... more filters
  };
}
```

## Testing

Test API connection:

```typescript
import { testVyspaConnection } from '@/lib/vyspa';

const isConnected = await testVyspaConnection();
console.log('Vyspa API connected:', isConnected);
```

## Performance

- Typical response time: 2-5 seconds
- Timeout: 30 seconds
- Automatic retry on transient errors
- No client-side caching (implement if needed)

## Limitations

1. **No flight details endpoint** - Vyspa only provides search, not individual flight details
2. **Limited airport data** - API returns airport codes only, not full names
3. **Date pricing** - Not provided by Vyspa (using mock data)

## Future Enhancements

- [ ] Implement response caching
- [ ] Add currency conversion
- [ ] Integrate with CMS for discount rules
- [ ] Add route restriction rules
- [ ] Implement airline priority scoring
- [ ] Add request deduplication

## Support

For issues or questions:
1. Check error logs in console
2. Verify environment variables
3. Test API connection
4. Review Vyspa API documentation

## References

- Implementation plan: `/plans/vyspa-api-integration.md`
- Type definitions: `/src/types/vyspa.ts`
- Server actions: `/src/actions/flights/`
- travcart-be reference: `e:\travcart\travcartbe\flights\views.py`
