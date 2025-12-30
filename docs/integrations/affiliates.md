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

- Loads a persisted code from cookie `affiliate_code` (30-day expiry)
- Loads static affiliate list from `src/data/affiliates.ts` (replaced legacy API fetch)
- Mirrors data into Zustand store via `setAffiliateData(...)`

## Affiliate Data

Affiliate data is now managed statically in `src/data/affiliates.ts`, generated from `Globehunters Affiliate.csv`. This avoids external API dependencies for affiliate metadata.

## Affiliate mapping to Portal “source/subsource”

`src/lib/utils/affiliateMapping.ts` provides:

- `getMarketSourceMapping(affiliateCode, regionCode, cabinClass)`

This is used by the Portal integration (folder init) to tag bookings with a market source/subsource derived from:

- affiliate code (normalized against `AFFILIATE_CODE_MAP`)
- region (derived from host/domain)
- cabin class (economy/business/…)

Mappings are strictly defined based on `CRM_Affilate Details (1).csv`. Unsupported codes fallback to default values (CheapFlights UK).

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


