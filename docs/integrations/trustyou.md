# Integration: TrustYou

TrustYou provides hotel review scores, category breakdowns, and meta-review summaries displayed on hotel search results and detail pages.

## Source files

- API client: `src/lib/trustyou/client.ts`
- Hotel ID mapping: `src/lib/trustyou/hotelMapping.ts`
- Types: `src/types/trustyou.ts`
- API routes:
  - Single hotel: `src/app/api/hotels/trustyou/route.ts`
  - Bulk (search results): `src/app/api/hotels/trustyou/bulk/route.ts`
- Dev preview: `src/app/dev/trustyou-preview/page.tsx`

## API endpoints used

### Trust score (`/api/hotels/trustyou`)

Fetches the overall trust score for a single hotel. Used on the hotel detail page.

### Bulk trust scores (`/api/hotels/trustyou/bulk`)

Fetches trust scores for multiple hotels in one call. Used on the hotel search results page to enrich each card with a review score.

## How it works

1. The client resolves a hotel to its TrustYou ID using partner IDs (`TRUSTYOU_PARTNER_ID` / `TRUSTYOU_PARTNER_IDS`) or falls back to the seed mapping in `hotelMapping.ts`.
2. The client calls the TrustYou API for trust score and/or meta review data.
3. Response is mapped to `TrustYouHotelReviewSummary` with:
   - Overall score + description
   - Reviews count
   - Category breakdowns (e.g. cleanliness, location, service)
   - Sentiment highlights

## Environment variables

- `TRUSTYOU_API_KEY` – API key for TrustYou
- `TRUSTYOU_PARTNER_ID` – single partner ID for hotel-to-TrustYou-ID resolution
- `TRUSTYOU_PARTNER_IDS` – comma-separated list of partner IDs (checked in order)

## Hotel ID mapping

`hotelMapping.ts` contains a seed list (`TRUSTYOU_HOTEL_SEEDS`) of known hotel-to-TrustYou-ID mappings with name aliases. This is used as a fallback when the partner ID resolution doesn't return a match.
