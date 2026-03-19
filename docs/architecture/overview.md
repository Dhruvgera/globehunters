# Architecture Overview

This repository is a **Next.js App Router** application (React + TypeScript) that implements a travel search and booking platform with:

- **Flight Search** via Vyspa Search API (server-side).
- **Deeplinks** (meta channels like Skyscanner) via Vyspa `FlightView`.
- **Price verification / upgrades** via Vyspa `price_check`.
- **Hotel Search** via hybrid Vyspa + Hotelbeds providers with deduplication and TrustYou review scores.
- **Holiday Packages** via Vyspa package search (flight + hotel bundles with room selection).
- **Folder/itinerary creation and sync** via **Vyspa Portal API**.
- **Checkout** via **BoxPay** with a redirect-based payment flow.
- **Affiliate / tracking** plumbing (utm params, `cnc`, affiliate codes, region mapping).

## High-level component map

### Frontend (App Router pages)

Pages live under `src/app/*` and implement three product funnels:

**Flight funnel:**

- `/` (`src/app/page.tsx`): landing + optional deeplink processing (`key` query param).
- `/search` (`src/app/search/page.tsx`): search results, filtering, sorting, date price tiles.
- `/booking` (`src/app/booking/page.tsx`): passenger details + price check (upgrade options).
- `/payment` (`src/app/payment/page.tsx`): add-ons + BoxPay session creation + redirect.
- `/payment-complete` (`src/app/payment-complete/page.tsx`): returns from BoxPay; records payment in Vyspa portal; sends confirmation email.

**Hotel funnel:**

- `/hotels` (`src/app/hotels/page.tsx`): hotel search with filters, Vyspa + Hotelbeds hybrid results, TrustYou review scores.
- `/hotels/[id]` (`src/app/hotels/[id]/page.tsx`): hotel detail page with room selection and package entry point.
- `/hotels/checkout` (`src/app/hotels/checkout/page.tsx`): hotel standalone booking checkout.

**Package funnel:**

- `/packages/review` (`src/app/packages/review/page.tsx`): package review with baggage, protection plan, and flight change options.
- `/packages/checkout` (`src/app/packages/checkout/page.tsx`): package booking checkout with passenger forms.

**Other pages:**

- `/offers` (`src/app/offers/page.tsx`): special offers and deals.
- `/contact` (`src/app/contact/page.tsx`): contact information and form.
- `/checkout` (`src/app/checkout/page.tsx`): legacy deeplink handler (e.g., `/checkout.htm?flight=...`).
- `/FlightSearch` (`src/app/FlightSearch/page.tsx`): legacy route (rewritten from `/FlightSearch.htm`).
- `/dev/trustyou-preview` (`src/app/dev/trustyou-preview/page.tsx`): dev-only TrustYou widget preview.

### Global state

Global state is managed via Zustand in `src/store/bookingStore.ts`.

This store is the backbone of the funnel:

- Selected flight + fare/upgrade selection
- Search params + request/session IDs
- Passenger/contact details
- Add-ons selection
- Vyspa folder information
- Hotel and package selections
- Current step tracking

### Server-side integration surface

There are two styles of "backend" code in this repo:

- **Next.js API routes** (`src/app/api/**/route.ts`): used for Node-only secrets and third-party integrations (Vyspa, BoxPay, Hotelbeds, TrustYou, email).
- **Next.js Server Actions** (`src/actions/**`): used by some services (notably flight search) to execute server-side code without an explicit API route.

Key integration modules:

- **Vyspa Search API client + transformation pipeline**: `src/lib/vyspa/*`
  - Request validation: `src/lib/vyspa/validators.ts`
  - API client: `src/lib/vyspa/client.ts`
  - Response transformers: `src/lib/vyspa/transformers/*`
  - Business rules: `src/lib/vyspa/rules/*`
- **Vyspa Portal API** (folder/init, extras, payment recording): `src/app/api/vyspa/*` + `src/config/vyspaPortal.ts`
- **Hotel providers**:
  - Vyspa Hotels: `src/app/api/vyspa/hotels/*` (cities, availability, details, rooms, folder creation)
  - Hotelbeds: `src/lib/hotelbeds/*` (client, mappers, content extraction, occupancy)
  - Hotel utilities: `src/lib/hotels/*` (deduplication, image URLs, geocoding, provider abstraction)
- **TrustYou**: `src/lib/trustyou/*` (API client, hotel ID mapping, bulk score fetching)
- **Package pricing**: `src/lib/package/*` (pricing logic, flight handling)
- **BoxPay**: `src/app/api/boxpay/*` + `src/services/api/boxpayService.ts`
- **Email**: `src/app/api/send-confirmation-email/route.ts` + `src/services/emailService.ts` (and `nodemailer`)

## "Data flow" summary (what talks to what)

- The UI pages and components call **hooks** (`src/hooks/*`) and **services** (`src/services/api/*`).
- Services either:
  - call a **server action** (e.g. flight search), or
  - call a **Next.js API route** (e.g. price-check, folder init, hotel search, package search, boxpay session).
- API routes then call third-party APIs using credentials from env/config.

## Where to start in code (recommended reading order)

- **Funnel state model**: `src/store/bookingStore.ts`
- **Search page**: `src/app/search/page.tsx`
- **Booking page**: `src/app/booking/page.tsx`
- **Payment page**: `src/app/payment/page.tsx`
- **Payment-complete**: `src/app/payment-complete/page.tsx`
- **Hotel search**: `src/app/hotels/page.tsx`
- **Package review**: `src/app/packages/review/page.tsx`
- **API route index**: `src/app/api/**/route.ts`
