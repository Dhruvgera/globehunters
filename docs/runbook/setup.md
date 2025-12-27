# Runbook: Setup & Environment

## Requirements

- Node.js 18+ (or Bun)
- Package manager: Bun is recommended (`bun.lock` exists)

## Install & run

```bash
bun install
bun run dev
```

Other scripts:

- `bun run build`
- `bun run start`
- `bun run test` (Jest)

## Environment variables (by feature)

This list is derived from scanning `process.env.*` usage in `src/`.

### App URLs / client configuration

- `NEXT_PUBLIC_APP_URL` (**important**): used to build BoxPay return/back URLs
- `NEXT_PUBLIC_API_URL` (optional): default is `http://localhost:3000/api`
- `NEXT_PUBLIC_CONTACT_PHONE` (optional): default phone fallback

### Debug toggles (client)

- `NEXT_PUBLIC_DEBUG_FLIGHT_IDS` (`true/false`)
- `NEXT_PUBLIC_DEBUG_FLIGHT_DATES` (`true/false`)
- `NEXT_PUBLIC_MOCK_BOOKING_CONFIRMATION` (`true/false`)
- `NEXT_PUBLIC_DATE_SLIDER_STAGGER_MS` (number; default 500)
- `NEXT_PUBLIC_DATE_SLIDER_CHUNK_SIZE` (number; default 2)

### Vyspa (Search API)

- `VYSPA_API_URL`
- `VYSPA_API_VERSION` (default `'1'`)
- `VYSPA_BRANCH_CODE` (default `'HQ'`)
- `VYSPA_USERNAME`
- `VYSPA_PASSWORD`
- `VYSPA_TOKEN`
- `VYSPA_FLIGHTVIEW_URL` (optional override for FlightView endpoint)

### Vyspa Portal

- `VYSPA_PORTAL_URL` (defaults to `https://portal.globehunters.com/jsonserver.php`)
- `VYSPA_PORTAL_USERNAME`
- `VYSPA_PORTAL_PASSWORD`
- `VYSPA_PORTAL_TOKEN`

### BoxPay

- `BOXPAY_MERCHANT_ID`
- `BOXPAY_BEARER_TOKEN`
- `BOXPAY_BASE_URL`
- `BOXPAY_CHECKOUT_URL`
- `BOXPAY_STATUS_NOTIFY_URL` (optional)

### Email (SMTP)

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`

### Reviews (Yotpo)

- `YOTPO_APP_KEY`
- `YOTPO_SECRET_KEY`

## Docker

`next.config.ts` sets `output: 'standalone'` which is commonly used for Docker deployments.
See `Dockerfile` at repo root for the specific container build.


