# Runbook: Testing

## Unit tests (Jest)

Scripts (see `package.json`):

- `bun run test`
- `bun run test:watch`
- `bun run test:coverage`

Jest config:

- `jest.config.js`
- `jest.setup.js`

Tests live in:

- `__tests__/...`

Current test coverage:

- `__tests__/lib/package/pricing.test.ts` – package pricing logic
- `__tests__/lib/utils/gdsMapping.test.ts` – GDS code mapping
- `__tests__/lib/vyspa/utils.test.ts` – Vyspa utility functions

## API / integration scripts

This repo includes Node scripts under `scripts/` for testing external integrations and data transformations.

### Flight scripts

| npm script | Command | Purpose |
|------------|---------|---------|
| `test:api` | `node scripts/test-vyspa-api.mjs` | Vyspa Search API smoke test |
| `test:api:gh` | `node scripts/test-globehunters-api.mjs` | GlobeHunters API integration test |
| `test:api:gh:airports` | `node scripts/test-globehunters-airports.mjs` | Airport search API test |
| – | `node scripts/test-price-check-api.mjs` | Price check API test |
| – | `node scripts/live-price-check-test.mjs` | Live price check end-to-end test |
| – | `node scripts/multi-price-check.mjs` | Multi-flight price check test |
| – | `node scripts/full-flow-test.mjs` | Full search → booking flow test |

### Hotel scripts

| npm script | Command | Purpose |
|------------|---------|---------|
| `test:hotel:dedupe` | `node scripts/test-hotel-dedupe-live.mjs` | Hotel deduplication (Vyspa + Hotelbeds) |
| `test:hotel:hybrid-expired` | `node scripts/trace-hybrid-hotel-expired-flow.mjs` | Hybrid hotel expired session flow |
| `test:hotel:folder-flow` | `node scripts/trace-hotel-folder-flow.mjs` | Hotel folder creation trace |
| `test:hotel:vyspa:timing` | `node scripts/time-vyspa-hotels-search.mjs` | Vyspa hotel search timing/perf |
| `test:hotel:vyspa:timeout-poll` | `node scripts/verify-vyspa-timeout-poll.mjs` | Vyspa timeout + polling verification |
| `share:vyspa:hotel-repro` | `node scripts/share-vyspa-hotel-repro.mjs` | Vyspa hotel issue reproduction |
| – | `node scripts/compare-hotel-apis.mjs` | Compare Vyspa vs Hotelbeds results |
| – | `node scripts/test-live-properties.mjs` | Test Vyspa liveProperties API |

### Other scripts

| npm script | Command | Purpose |
|------------|---------|---------|
| `test:portal:tkt` | `node scripts/test-portal-tkt-per-pax.mjs` | Portal ticket-per-pax test |
| `test:trustyou` | `node scripts/test-trustyou-api.mjs` | TrustYou API connectivity test |
| – | `node scripts/fetch-all-airports.mjs` | Fetch full airport list |

## Email preview testing

- `GET /api/test-email` returns the HTML email template for preview in a browser.
- `POST /api/test-email` sends a test email.

## Script output

Integration test scripts write their output to `scripts/output/` as JSON files (e.g. `live-price-check.json`). These are gitignored and useful for debugging API responses.
