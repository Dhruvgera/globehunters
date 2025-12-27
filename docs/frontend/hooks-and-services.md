# Frontend: Hooks & Services

The codebase uses a fairly consistent pattern:

- **Hooks** (`src/hooks/*`) manage React state + side effects.
- **Services** (`src/services/*`) encapsulate API calls and transformations.

## Core hooks

- `useFlights` (`src/hooks/useFlights.ts`)
  - Calls `flightService.searchFlights`
  - Tracks `loading/error`, returns `flights/filters/datePrices/requestId`
- `usePriceCheck` (`src/hooks/usePriceCheck.ts`)
  - Calls `/api/price-check`
  - In-memory cache with separate failure TTL to avoid repeated bad requests
- `useBoxPay` (`src/hooks/useBoxPay.ts`)
  - Calls `/api/boxpay/session` and `/api/boxpay/inquiry`
- `useReviews` (`src/hooks/useReviews.ts`)
  - Calls `/api/reviews` (Yotpo)
- `useAirportSearch` (`src/hooks/useAirportSearch.ts`)
  - Calls `/api/airports?q=...`
- Funnel utilities:
  - `useIdleTimer` (session timeout UX)
  - `useFilterExpansion` (search filter UI state)

## Core services

- `flightService` (`src/services/api/flightService.ts`)
  - Maps UI `SearchParams` → Vyspa search request format
  - Uses a **server action** to run search on the server
  - Maintains a session-scoped in-memory cache (TTL)
- `boxpayService` (`src/services/api/boxpayService.ts`)
  - Calls BoxPay merchant endpoints (server-side)
  - Normalizes request shape and maps statuses for the UI
- `emailService` (`src/services/emailService.ts`)
  - Generates HTML emails and sends via SMTP (Amazon SES SMTP style)

## “Why some calls are server actions vs API routes”

- **Server action** (flight search) keeps code close to the services layer and avoids an extra API layer.
- **API routes** are used when:
  - secrets must stay server-side
  - the code is a direct third-party integration endpoint (BoxPay, Portal, email)
  - the frontend expects to call a REST-ish endpoint (`/api/price-check`)


