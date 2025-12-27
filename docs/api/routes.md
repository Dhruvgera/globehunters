# API Routes Reference (`src/app/api/**`)

These are **Next.js Route Handlers** (Node runtime) that encapsulate secrets and call third-party services.

> Tip: Most front-end fetches call these routes directly (`fetch('/api/...')`).

## Summary table

| Route | Method | Purpose | Used by |
|------|--------|---------|---------|
| `/api/airports` | GET | Airport lookup (cached; supports `?q=`) | airport search UI/hooks |
| `/api/affiliates` | GET | Fetch affiliates list from external CMS API | `AffiliateContext` |
| `/api/reviews` | GET | Fetch + filter reviews from Yotpo (OAuth token + reviews) | booking UI (`useReviews`) |
| `/api/flight-view` | POST | Resolve deeplink flight key → flight + params | `/`, `/search`, `/checkout` deeplink flows |
| `/api/price-check` | POST | Price verification + upgrade options (V1+V3 flows) | `/booking` (prefetch) + upgrade modal |
| `/api/search-flights-batch` | POST | Batch min-price (date tiles / prefetch) | `useDatePrices` / search UI |
| `/api/boxpay/session` | POST | Create BoxPay checkout session + return URLs | `/payment` |
| `/api/boxpay/inquiry` | POST | Inquire transaction status using `redirectionResult` | `/payment-complete` |
| `/api/vyspa/init-folder` | POST | Create folder / customer details in Portal | `/payment` (before BoxPay) |
| `/api/vyspa/add-to-folder` | POST | Add items (flight etc.) to a folder (Vyspa REST v4) | folder services / booking flow |
| `/api/vyspa/add-extras` | POST | Add insurance/baggage extras (Portal) | `/payment` |
| `/api/vyspa/save-payment` | POST | Record payment transaction + update folder status (Portal) | `/payment-complete` |
| `/api/vyspa/portal` | POST | Generic Portal method wrapper (form-encoded) | internal/debug/utility use |
| `/api/send-confirmation-email` | POST | Send confirmation email (nodemailer) | `/payment-complete` |
| `/api/test-email` | POST | Test email sending | dev tooling |

## External dependencies called by API routes

- **Yotpo** (reviews): `src/app/api/reviews/route.ts` uses `YOTPO_APP_KEY` + `YOTPO_SECRET_KEY`
- **TravCart CMS API** (affiliates): `src/app/api/affiliates/route.ts` calls a remote API (POST)
- **Vyspa** (search + flight view + price check + add to folder): multiple routes and server actions
- **Vyspa Portal** (folder init/extras/payment recording): `src/app/api/vyspa/*`
- **BoxPay** (payments): `src/app/api/boxpay/*`

## Route deep-links (implementation pointers)

### Flight deeplink resolver: `/api/flight-view`

- Implementation: `src/app/api/flight-view/route.ts`
- Calls: Vyspa FlightView endpoint (configurable via `VYSPA_FLIGHTVIEW_URL`)

### Price check: `/api/price-check`

- Implementation: `src/app/api/price-check/route.ts`
- Supports two flows:
  - **V3**: `flightKey → FlightView → psw_result_id → price_check`
  - **V1**: `segmentResultId → price_check`

### Search batch: `/api/search-flights-batch`

- Implementation: `src/app/api/search-flights-batch/route.ts`
- Input shape:
  - either an array of items, or `{ items: [...] }`
  - each item includes a `key` echo back and `params` (search params)

### BoxPay routes

- `/api/boxpay/session`: `src/app/api/boxpay/session/route.ts`
  - builds `returnUrl` and `backUrl` from `origin` header or `NEXT_PUBLIC_APP_URL`
- `/api/boxpay/inquiry`: `src/app/api/boxpay/inquiry/route.ts`

### Vyspa Portal routes

- Portal config: `src/config/vyspaPortal.ts`
- Key routes:
  - `/api/vyspa/init-folder`
  - `/api/vyspa/add-extras`
  - `/api/vyspa/save-payment`


