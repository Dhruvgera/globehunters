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

## API / integration scripts

This repo includes Node scripts under `scripts/` for testing external integrations and data transformations.

From `package.json`:

- `bun run test:api` → `node scripts/test-vyspa-api.mjs`
- `bun run test:api:gh` → `node scripts/test-globehunters-api.mjs`
- `bun run test:api:gh:airports` → `node scripts/test-globehunters-airports.mjs`

Other useful scripts:

- `scripts/live-price-check-test.mjs`
- `scripts/full-flow-test.mjs`
- `scripts/verify-multi-city-implementation.mjs`

## Email preview testing

- `GET /api/test-email` returns the HTML email template for preview in a browser.
- `POST /api/test-email` sends a test email.


