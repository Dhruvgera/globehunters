# Architecture Overview

This repository is a **Next.js App Router** application (React + TypeScript) that implements a flight search + booking funnel with:

- **Search** via Vyspa Search API (server-side).
- **Deeplinks** (meta channels like Skyscanner) via Vyspa `FlightView`.
- **Price verification / upgrades** via Vyspa `price_check`.
- **Folder/itinerary creation and sync** via **Vyspa Portal API**.
- **Checkout** via **BoxPay** with a redirect-based payment flow.
- **Affiliate / tracking** plumbing (utm params, `cnc`, affiliate codes, region mapping).

## High-level component map

### Frontend (App Router pages)

Pages live under `src/app/*` and implement the funnel:

- `/` (`src/app/page.tsx`): landing + optional deeplink processing (`key` query param).
- `/search` (`src/app/search/page.tsx`): search results, filtering, sorting, date price tiles.
- `/booking` (`src/app/booking/page.tsx`): passenger details + price check (upgrade options).
- `/payment` (`src/app/payment/page.tsx`): add-ons + BoxPay session creation + redirect.
- `/payment-complete` (`src/app/payment-complete/page.tsx`): returns from BoxPay; records payment in Vyspa portal; sends confirmation email.
- `/checkout` (`src/app/checkout/page.tsx`): legacy deeplink handler (e.g., `/checkout.htm?flight=...`).
- `/FlightSearch` (`src/app/FlightSearch/page.tsx`): legacy route (rewritten from `/FlightSearch.htm`).

### Global state

Global state is managed via Zustand in `src/store/bookingStore.ts`.

This store is the backbone of the funnel:

- Selected flight + fare/upgrade selection
- Search params + request/session IDs
- Passenger/contact details
- Add-ons selection
- Vyspa folder information
- Current step tracking

### Server-side integration surface

There are two styles of “backend” code in this repo:

- **Next.js API routes** (`src/app/api/**/route.ts`): used for Node-only secrets and third-party integrations (Vyspa, BoxPay, email).
- **Next.js Server Actions** (`src/actions/**`): used by some services (notably flight search) to execute server-side code without an explicit API route.

Key integration modules:

- **Vyspa Search API client + transformation pipeline**: `src/lib/vyspa/*`
  - Request validation: `src/lib/vyspa/validators.ts`
  - API client: `src/lib/vyspa/client.ts`
  - Response transformers: `src/lib/vyspa/transformers/*`
  - Business rules: `src/lib/vyspa/rules/*`
- **Vyspa Portal API** (folder/init, extras, payment recording): `src/app/api/vyspa/*` + `src/config/vyspaPortal.ts`
- **BoxPay**: `src/app/api/boxpay/*` + `src/services/api/boxpayService.ts`
- **Email**: `src/app/api/send-confirmation-email/route.ts` + `src/services/emailService.ts` (and `nodemailer`)

## “Data flow” summary (what talks to what)

- The UI pages and components call **hooks** (`src/hooks/*`) and **services** (`src/services/api/*`).
- Services either:
  - call a **server action** (e.g. flight search), or
  - call a **Next.js API route** (e.g. price-check, folder init, add-extras, boxpay session).
- API routes then call third-party APIs using credentials from env/config.

## Where to start in code (recommended reading order)

- **Funnel state model**: `src/store/bookingStore.ts`
- **Search page**: `src/app/search/page.tsx`
- **Booking page**: `src/app/booking/page.tsx`
- **Payment page**: `src/app/payment/page.tsx`
- **Payment-complete**: `src/app/payment-complete/page.tsx`
- **API route index**: `src/app/api/**/route.ts`



