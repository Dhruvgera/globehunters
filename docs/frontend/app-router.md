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
  - date-price tiles via `useDatePrices`
  - handle **deeplink** (`?flight=...`) via `/api/flight-view`

### `/booking` (Passenger details)

- File: `src/app/booking/page.tsx`
- Responsibilities:
  - enforce "must have selectedFlight" (after store hydration)
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

### `/hotels` (Hotel search)

- File: `src/app/hotels/page.tsx`
- Responsibilities:
  - hotel/city location search via `useHotelLocationSearch` (Vyspa `get_cities`)
  - hybrid hotel search across Vyspa and Hotelbeds providers
  - TrustYou review score enrichment (bulk fetch)
  - filters sidebar (star rating, price, board type, supplier)
  - sorting toolbar (price, rating, name)
  - package mode entry (flight + hotel)

### `/hotels/[id]` (Hotel detail)

- File: `src/app/hotels/[id]/page.tsx`
- Responsibilities:
  - fetch hotel details, content, and room availability
  - display hotel images, amenities, TrustYou reviews
  - room selection with pricing
  - entry point for creating a package (hotel + flight)

### `/hotels/checkout` (Hotel checkout)

- File: `src/app/hotels/checkout/page.tsx`
- Responsibilities:
  - hotel standalone booking checkout
  - passenger forms, hotel summary
  - folder creation and payment initiation

### `/packages/review` (Package review)

- File: `src/app/packages/review/page.tsx`
- Responsibilities:
  - review selected package (flight + hotel)
  - add-ons: baggage, protection plan
  - change flights (alternate flight selection)
  - package pricing summary

### `/packages/checkout` (Package checkout)

- File: `src/app/packages/checkout/page.tsx`
- Responsibilities:
  - passenger details collection
  - flight + hotel summary cards
  - price summary with add-ons
  - proceed to payment

### `/offers` (Special offers)

- File: `src/app/offers/page.tsx`
- Responsibilities:
  - display promotional offers and deals

### `/contact` (Contact)

- File: `src/app/contact/page.tsx`
- Responsibilities:
  - contact information (phone, email, address)
  - contact form

### `/checkout` (Legacy deeplink)

- File: `src/app/checkout/page.tsx`
- Responsibilities:
  - legacy handler for `/checkout.htm?...&flight=...`
  - calls `/api/flight-view` and redirects to `/booking`

### `/FlightSearch` (Legacy route)

- File: `src/app/FlightSearch/page.tsx`
- Purpose:
  - compatibility for `/FlightSearch.htm` rewrite (see `next.config.ts`)

### `/dev/trustyou-preview` (Dev tool)

- File: `src/app/dev/trustyou-preview/page.tsx`
- Purpose:
  - development-only preview of TrustYou review widget rendering
