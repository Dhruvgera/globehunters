# Integration: Vyspa Search API

This repository uses Vyspa as the flight search provider. The integration is split into:

- **Client** that calls Vyspa: `src/lib/vyspa/client.ts`
- **Validation**: `src/lib/vyspa/validators.ts`
- **Transformers** (Vyspa → internal UI types): `src/lib/vyspa/transformers/*`
- **Business rules**: `src/lib/vyspa/rules/*`
- **Entry points**:
  - Server Action: `src/actions/flights/searchFlights.ts`
  - API route (batch use-case): `src/app/api/search-flights-batch/route.ts`

## Config + credentials

Primary config lives in `src/config/vyspa.ts` (`VYSPA_CONFIG`):

- `VYSPA_API_URL`
- `VYSPA_API_VERSION`
- `VYSPA_BRANCH_CODE`
- `VYSPA_USERNAME` / `VYSPA_PASSWORD` / `VYSPA_TOKEN`

Domain/region-aware behavior:

- `VYSPA_CONFIG.credentials.username` uses `getApiUsername()` from `src/lib/utils/domainMapping.ts` so `.co.uk` vs `.com` can pick different Vyspa accounts.

## Request construction

### Standard search (one-way / round-trip)

`src/services/api/flightService.ts` maps `SearchParams` (UI model) to `FlightSearchRequest` (Vyspa model) and calls the server action.

Key fields:

- `origin1`, `destinationid`
- `fr` (departure date, formatted `DD/MM/YYYY`)
- `to` (return date, optional)
- `adt1`, `chd1`, `inf1`
- `ow` (`'1'` one-way, `'0'` round-trip)
- `cl` (cabin class)

### Multi-city

Multi-city is encoded in a single request by adding leg-specific fields:

- `origin2/destination2/fr2`, `origin3/destination3/fr3`, … up to leg 6

See `src/services/api/flightService.ts` multi-city mapping logic.

### Search session restoration (`Request_id`)

Vyspa supports “restore search session” requests using `Request_id`.

- In `src/lib/vyspa/client.ts`, if `params.Request_id` exists, the request body is reduced to just version + `Request_id` (special-case logic).
- At the UI layer, `requestId` is stored as `searchRequestId` in `src/store/bookingStore.ts` and reused for “web ref” display until a folder exists.

## Response transformation

The response pipeline is:

1. `searchFlightsVyspa()` returns raw Vyspa response.
2. `transformVyspaResponse()` converts it to internal `Flight` objects + filter primitives.
3. `applyBusinessRules()` applies filtering/prioritization and pricing rules (including currency behavior).

## Where search is invoked from the UI

- `src/app/search/page.tsx` uses `useFlights` (`src/hooks/useFlights.ts`)
- `useFlights` calls `flightService.searchFlights(...)`
- `flightService.searchFlights` calls server action `actions/flights/searchFlights`

## Batch search endpoint (min-price tiles)

`POST /api/search-flights-batch` exists to run multiple searches efficiently and return a minimum price per item.

- Route handler: `src/app/api/search-flights-batch/route.ts`
- It sanitizes/coerces dates from incoming JSON and then runs the same validation/transform/rules pipeline.


