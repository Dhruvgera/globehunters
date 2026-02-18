# HotelBeds + Vyspa Deduplication (liveProperties-driven)

This document describes how deduplication is wired for hotel search when `HOTELS_PROVIDER=hybrid`.

## Why this approach

- Current booking/folder flow is Vyspa-first, so output must remain Vyspa-compatible.
- `liveProperties` gives the cross-reference needed for future supplier merge/dedupe.
- Hybrid mode enriches Vyspa cards with HotelBeds content when a mapping exists, without breaking booking flow.

## Mapping strategy

1. Fetch Vyspa live properties from `/rest/v4/liveProperties/?limit=<N>` (follow `nextLink` pages until exhausted).
2. Build map:
   - key = HotelBeds code (`code`, fallback `mapToVendor`)
   - value = Vyspa mapping ID (`id`) which matches availability `VmapId`
3. Match HotelBeds availability rows against Vyspa availability rows by Vyspa identifiers:
   - `VmapId`, `vMapId`, `vmapid`, `hotel_id`, `hotelId`, `id`

Code references:
- `/Users/dhruvgera/dev/globehunters/ghfe/src/lib/vyspa/liveProperties.ts`
- `/Users/dhruvgera/dev/globehunters/ghfe/src/lib/hotels/dedupe.ts`
- `/Users/dhruvgera/dev/globehunters/ghfe/src/app/api/hotels/availability/route.ts`

## Runtime behavior (`HOTELS_PROVIDER`)

- `vyspa`: uses `/rest/v4/accommodationAvailabilityV3/` directly.
- `hotelbeds`: uses HotelBeds `/hotels` and maps to UI result shape.
- `hybrid`:
  - executes Vyspa search (canonical output),
  - executes HotelBeds search,
  - fetches `liveProperties` mapping for the city,
  - dedupes mapped overlaps and also includes unmapped HotelBeds rows by default.

`HYBRID_INCLUDE_UNMAPPED_HOTELBEDS` behavior:
- unset / empty / any value except `false` => include unmapped HotelBeds rows in hybrid output (recommended).
- `false` => strict mode (Vyspa output + mapped overlap enrichment only).

`VYSPA_LIVEPROPERTIES_MAX_PAGES` behavior:
- unset / empty / `0` => fetch all pages until `nextLink` ends (recommended for full coverage with cache),
- positive number => cap page fetch count.

Timeout safeguards for request latency:
- `VYSPA_LIVEPROPERTIES_TIMEOUT_MS` (default `8000`) caps total liveProperties fetch time per hotel search request.
- `VYSPA_LIVEPROPERTIES_PAGE_TIMEOUT_MS` (default `4500`) caps each liveProperties page request.

## Live validation script

Run:

```bash
node scripts/test-hotel-dedupe-live.mjs Dubai 2026-03-19 2026-03-26 2 0 1 500 6
```

Arguments:
1. location
2. checkIn (`YYYY-MM-DD`)
3. checkOut (`YYYY-MM-DD`)
4. adults
5. children
6. rooms
7. liveProperties `limit`
8. max pages

Output:
- JSON report at `/Users/dhruvgera/dev/globehunters/ghfe/scripts/output/hotel-dedupe-live-<timestamp>.json`
- Includes counts for mapped, matched, mapped-but-missing, unmapped.

## Latest test snapshot

Run date: 2026-02-12  
Command: `node scripts/test-hotel-dedupe-live.mjs Dubai 2026-03-19 2026-03-26 2 0 1 500 6`

Summary:
- Vyspa hotels: `79`
- HotelBeds hotels: `188`
- City liveProperties rows: `224`
- HotelBeds mapped by liveProperties: `16`
- HotelBeds matched in Vyspa availability: `0`
- HotelBeds mapped but not present in Vyspa availability: `16`
- HotelBeds unmapped in liveProperties: `172`

Interpretation:
- In sampled data, `liveProperties.code` behaves as HotelBeds code.
- `liveProperties.mapToVendor` often aligns with Vyspa `hotel_id` (not HB code).
- Hybrid mode safely falls back to Vyspa-only rows when no mapped overlap is present.
