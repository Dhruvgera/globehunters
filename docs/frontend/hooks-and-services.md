# Frontend: Hooks & Services

The codebase uses a fairly consistent pattern:

- **Hooks** (`src/hooks/*`) manage React state + side effects.
- **Services** (`src/services/*`) encapsulate API calls and transformations.

## Hooks

### Flight hooks

- `useFlights` (`src/hooks/useFlights.ts`)
  - Calls `flightService.searchFlights`
  - Tracks `loading/error`, returns `flights/filters/datePrices/requestId`
- `useFlightDetails` (`src/hooks/useFlightDetails.ts`)
  - Fetches a single flight by ID via `flightService`
  - Returns `flight/loading/error/refetch`
- `usePriceCheck` (`src/hooks/usePriceCheck.ts`)
  - Calls `/api/price-check`
  - In-memory cache with separate failure TTL to avoid repeated bad requests
- `useDatePrices` (`src/hooks/useDatePrices.ts`)
  - Background date-price tile fetching via `/api/search-flights-batch`
  - Staggered chunk loading (configurable via `NEXT_PUBLIC_DATE_SLIDER_STAGGER_MS` / `NEXT_PUBLIC_DATE_SLIDER_CHUNK_SIZE`)
  - In-memory cache via `flightCache`
- `useDeeplink` (`src/hooks/useDeeplink.ts`)
  - Utilities for parsing meta channel deeplink params (`key`, `utm_*`, `cnc`)
  - Used by landing, search, and checkout pages

### Hotel hooks

- `useHotelLocationSearch` (`src/hooks/useHotelLocationSearch.ts`)
  - Debounced city/hotel location lookup via `/api/hotels/cities` (Vyspa `get_cities`)
  - Session-scoped in-memory cache
  - Returns `results/loading/error/setQuery`

### Package hooks

- `usePackageSearch` (`src/hooks/usePackageSearch.ts`)
  - Manages full package lifecycle: search, destinations, details, alternate flights, room selection
  - Calls `packageService` methods
  - Reads/writes package state from Zustand store

### Payment & booking hooks

- `useBoxPay` (`src/hooks/useBoxPay.ts`)
  - Calls `/api/boxpay/session` and `/api/boxpay/inquiry`
- `usePayment` (`src/hooks/usePayment.ts`)
  - Wraps `paymentService.processPayment` and `bookingService.confirmBooking`
  - Returns `processPayment/confirmPayment/confirmBooking/loading/error`
- `useBookingFlow` (`src/hooks/useBookingFlow.ts`)
  - Wraps `bookingService.createBooking`
  - Stores booking response in Zustand store

### Search & utility hooks

- `useSearchForm` (`src/hooks/useSearchForm.ts`)
  - Full search form state management (trip type, passengers, airports, dates, multi-city segments)
  - URL sync and store hydration
- `useAirportSearch` (`src/hooks/useAirportSearch.ts`)
  - Calls `/api/airports?q=...`
- `useReviews` (`src/hooks/useReviews.ts`)
  - Calls `/api/reviews` (Yotpo)
- `useIdleTimer` (`src/hooks/useIdleTimer.ts`)
  - Session timeout UX (idle detection + callback)
- `useFilterExpansion` (`src/hooks/useFilterExpansion.ts`)
  - Search filter panel expand/collapse state

## Services

### Flight services

- `flightService` (`src/services/api/flightService.ts`)
  - Maps UI `SearchParams` → Vyspa search request format
  - Uses a **server action** to run search on the server
  - Session-scoped in-memory cache (TTL)
- `flightViewService` (`src/services/api/flightViewService.ts`)
  - Resolves deeplink flight keys via `/api/flight-view`
- `priceCheckService` (`src/services/api/priceCheckService.ts`)
  - Price verification and upgrade option fetching

### Hotel services

- `hotelService` (`src/services/api/hotelService.ts`)
  - Hotel search, details, rooms, content, and accommodation details
  - Calls `/api/hotels/*` routes
- `livePropertiesService` (`src/services/api/livePropertiesService.ts`)
  - Vyspa `liveProperties` API integration for hotel mapping

### Package services

- `packageService` (`src/services/api/packageService.ts`)
  - Package search, details, destinations, rooms, and flight changes
  - Calls `/api/packages/*` routes

### Payment & portal services

- `boxpayService` (`src/services/api/boxpayService.ts`)
  - BoxPay merchant endpoint calls (server-side)
  - Normalizes request shape and maps statuses
- `paymentService` (`src/services/api/paymentService.ts`)
  - Payment processing abstraction
- `bookingService` (`src/services/api/bookingService.ts`)
  - Booking creation and confirmation
- `portalService` (`src/services/api/portalService.ts`)
  - Vyspa Portal method calls (folder init, extras, payment recording)
- `folderService` (`src/services/api/folderService.ts`)
  - Folder/itinerary management (add-to-folder, status updates)

### Other services

- `emailService` (`src/services/emailService.ts`)
  - HTML email generation and SMTP sending (Amazon SES style)
- `affiliateService` (`src/services/affiliateService.ts`)
  - Affiliate data resolution and tracking
- `client` (`src/services/api/client.ts`)
  - Shared HTTP client / fetch wrapper

## "Why some calls are server actions vs API routes"

- **Server action** (flight search) keeps code close to the services layer and avoids an extra API layer.
- **API routes** are used when:
  - secrets must stay server-side
  - the code is a direct third-party integration endpoint (BoxPay, Portal, Hotelbeds, TrustYou, email)
  - the frontend expects to call a REST-ish endpoint (`/api/price-check`, `/api/hotels/*`, `/api/packages/*`)
