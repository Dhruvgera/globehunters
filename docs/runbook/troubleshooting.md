# Runbook: Troubleshooting

## Search returns empty / errors

- **Missing Vyspa credentials**:
  - Check `VYSPA_API_URL`, `VYSPA_USERNAME`, `VYSPA_PASSWORD`, `VYSPA_TOKEN`
  - `src/config/vyspa.ts` logs warnings in development if missing.
- **Request_id restore issues**:
  - `src/lib/vyspa/client.ts` has special handling for `Request_id` requests.
  - Verify `searchRequestId` in `bookingStore` is set.

## Deeplink fails (redirects to `/search?error=flight_unavailable`)

- `/api/flight-view` is the critical endpoint (see `src/app/api/flight-view/route.ts`).
- Confirm `VYSPA_FLIGHTVIEW_URL` if you need a non-default endpoint.

## Price check errors / no upgrade options

- The UI uses `/api/price-check` (see `src/app/api/price-check/route.ts`).
- Common cases:
  - **V3** flow requires a valid `flightKey` to resolve `psw_result_id` via FlightView.
  - **API quirks**: FlightView sometimes returns HTTP 500 with usable body; the route handles this by parsing body anyway.
- Client-side caching:
  - `src/hooks/usePriceCheck.ts` caches failures for 30s to avoid repeated bad requests.

## Payment issues

- **Return URL wrong / missing orderId**:
  - `/api/boxpay/session` builds return/back URLs from `origin` header or `NEXT_PUBLIC_APP_URL`.
- **Inquiry token expired**:
  - `redirectionResult` is time-limited; `/api/boxpay/inquiry` may fail after expiry.
  - `/payment-complete` uses `sessionStorage` fallbacks for pending/completed orders.

## Portal issues (folder/extras/payment recording)

- Portal API is slower; timeout is 60s by default (`VYSPA_PORTAL_CONFIG.timeout`).
- Verify portal credentials:
  - `VYSPA_PORTAL_URL`, `VYSPA_PORTAL_USERNAME`, `VYSPA_PORTAL_PASSWORD`, `VYSPA_PORTAL_TOKEN`

## Reviews not loading

- `/api/reviews` requires Yotpo credentials:
  - `YOTPO_APP_KEY`, `YOTPO_SECRET_KEY`

## Emails not sending

- SMTP credentials required:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`
- Use `/api/test-email` to preview HTML and validate configuration quickly.


