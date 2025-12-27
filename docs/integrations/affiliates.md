# Integration: Affiliates + Tracking

This repository supports affiliate attribution and meta-channel tracking (e.g. Skyscanner).

## Concepts

- **Affiliate code**: a string that can come from:
  - `aff` query param (legacy)
  - `utm_source` query param (meta channels)
- **Tracking fields**: `utm_source`, `utm_medium`, `utm_campaign`, `cnc`
- **Affiliate record**: loaded from an external CMS API
- **Market source mapping**: maps `(affiliate, region, cabinClass)` → `(sourceId, subSourceId)` for portal/folder attribution.

## AffiliateContext (client)

`src/lib/AffiliateContext.tsx` provides:

- `affiliateCode` (current code)
- `affiliate` (matched record, if any)
- `phoneNumber` (affiliate phone or default)
- `affiliates` list (cached)

Data sources:

- Loads a persisted code from `sessionStorage` key `affiliate_code`
- Fetches affiliates from `GET /api/affiliates` (see below)
- Mirrors data into Zustand store via `setAffiliateData(...)`

## Affiliates API route

`GET /api/affiliates` → `src/app/api/affiliates/route.ts`

- Calls a remote CMS endpoint (POST)
- Cached (`revalidate = 600`)

## Affiliate mapping to Portal “source/subsource”

`src/lib/utils/affiliateMapping.ts` provides:

- `getMarketSourceMapping(affiliateCode, regionCode, cabinClass)`

This is used by the Portal integration (folder init) to tag bookings with a market source/subsource derived from:

- affiliate code (normalized)
- region (derived from host)
- cabin class (economy/business/…)

## Region and domain mapping

`src/lib/utils/domainMapping.ts` is used for:

- picking region codes based on hostname (e.g., UK vs US)
- choosing Vyspa API username based on domain (FlightsUK vs FlightsUS)

## Where tracking params are captured

Deeplink entry points store tracking data into both:

- Zustand `bookingStore` (for runtime flow)
- `sessionStorage` (persistence across page transitions/reloads)

See:

- `src/app/page.tsx` (landing deeplink `key=...`)
- `src/app/search/page.tsx` (search deeplink `flight=...`)
- `src/app/checkout/page.tsx` (legacy checkout deeplink)


