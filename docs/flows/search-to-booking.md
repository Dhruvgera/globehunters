# Flow: Search → Results → Booking

This doc covers the *default* funnel where a user searches and then selects a flight.

## Responsibilities by layer

- **UI**: `src/app/search/page.tsx`
- **Flight fetching**: `src/hooks/useFlights.ts` → `src/services/api/flightService.ts`
- **Search execution**: server action `src/actions/flights/searchFlights.ts` → `src/lib/vyspa/*`
- **State handoff**: `src/store/bookingStore.ts` (`setSearchParams`, `setSelectedFlight`, `setSearchRequestId`)

## Sequence diagram

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant S as /search page (client)
  participant H as useFlights hook
  participant FS as flightService
  participant SA as Server Action (searchFlights)
  participant VC as Vyspa client
  participant VT as Transformers + Rules
  participant V as Vyspa Search API
  participant Z as bookingStore (Zustand)

  U->>S: Submit search form
  S->>Z: setSearchParams(params)
  S->>H: useFlights(params)
  H->>FS: searchFlights(params, requestId?)
  FS->>SA: searchFlightsAction(vyspaParams)
  SA->>VT: validate + transform + applyBusinessRules
  VT->>VC: searchFlightsVyspa(params)
  VC->>V: HTTP call (rest/v4/...)
  V-->>VC: raw Vyspa response
  VC-->>VT: response
  VT-->>SA: FlightSearchResponse
  SA-->>FS: FlightSearchResponse
  FS-->>H: flights + filters + requestId (+ mock datePrices)
  H-->>S: flights + filters + datePrices + requestId
  S->>Z: setSearchRequestId(requestId)
  U->>S: Click a flight / fare
  S->>Z: setSelectedFlight(flight, fareType)
  S->>S: router.push(/booking)
```

## Notes / important details

### Two “search” paths exist

- **Primary search** (used by `useFlights`): server action `src/actions/flights/searchFlights.ts`.
- **Batch search** (used for “date tile min price” or bulk min-price requests): API route `src/app/api/search-flights-batch/route.ts`.

They share the same underlying Vyspa transformation pipeline:

- `validateSearchParams`
- `searchFlightsVyspa`
- `transformVyspaResponse`
- `applyBusinessRules`

### Search session restoration (Request_id)

Vyspa supports a “restore session” style query via `Request_id`.

- The repo stores this as `searchRequestId` in Zustand (see `src/store/bookingStore.ts`).
- When present, the Vyspa client (`src/lib/vyspa/client.ts`) can submit a minimal payload that contains only `Request_id` + version fields.


