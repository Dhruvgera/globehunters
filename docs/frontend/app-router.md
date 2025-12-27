# Frontend: App Router (`src/app`)

This app uses Next.js App Router. Pages are colocated with routes in `src/app/*`.

## Route map

### `/` (Landing)

- File: `src/app/page.tsx`
- Responsibilities:
  - render the landing hero + `SearchBar`
  - handle **deeplink key** (`?key=...`) by calling `/api/flight-view` and redirecting to `/booking`
  - initialize affiliate + tracking session storage

### `/search` (Search results)

- File: `src/app/search/page.tsx`
- Responsibilities:
  - read search params from URL/store
  - fetch flights via `useFlights`
  - render filters, sort tabs, flight list
  - handle **deeplink** (`?flight=...`) via `/api/flight-view`

### `/booking` (Passenger details)

- File: `src/app/booking/page.tsx`
- Responsibilities:
  - enforce “must have selectedFlight” (after store hydration)
  - prefetch **price check** (upgrade options) via `usePriceCheck`
  - collect passenger + contact info into Zustand store

### `/payment` (Add-ons + payment initiation)

- File: `src/app/payment/page.tsx`
- Responsibilities:
  - compute totals (base fare + add-ons)
  - initialize folder (Vyspa portal) if needed
  - sync extras to folder if selected
  - create BoxPay session and redirect

### `/payment-complete` (Return from BoxPay)

- File: `src/app/payment-complete/page.tsx`
- Responsibilities:
  - inquire BoxPay status using `redirectionResult`
  - if successful:
    - record payment in Vyspa portal (`/api/vyspa/save-payment`)
    - send confirmation email (`/api/send-confirmation-email`)
    - reset booking store

### `/checkout` (Legacy deeplink)

- File: `src/app/checkout/page.tsx`
- Responsibilities:
  - legacy handler for `/checkout.htm?...&flight=...`
  - calls `/api/flight-view` and redirects to `/booking`

### `/FlightSearch` (Legacy route)

- File: `src/app/FlightSearch/page.tsx`
- Purpose:
  - compatibility for `/FlightSearch.htm` rewrite (see `next.config.ts`)


