# Vyspa `accommodationAvailability` (Non-V3) API

**Date:** 2026-01-26  
**Status:** ⚠️ **Account Access Required**

## Overview

Shekhar shared a new endpoint `accommodationAvailability` (not V3) that can return **all room types in Stage 1** of the search, with additional filtering capabilities including **supplier filtering**.

## API Details

### Endpoint
```
POST /rest/v4/accommodationAvailability/
```

### Key Differences from `accommodationAvailabilityV3`

| Feature | V3 | Non-V3 |
|---------|-----|--------|
| Results key | `Results` array | `rows` array |
| Criteria key | `Criteria` object | `searchCriteriaId` at root |
| Supplier filter | ❌ Not available | ✅ `supplier_id: 100` for HotelBeds |
| Server-side filters | ❌ Client-side only | ✅ `filters` object |
| Pagination | Not explicit | ✅ `limit`, `page`, `total` |
| Room occupancy | String format | Array format (`adult_room`, `children_room`) |
| Room types in Stage 1 | ❌ Need getRoomsV3 | ✅ **All room types returned** |

### Payload Format (from Shekhar)

```json
[
  {
    "location": "city",
    "hidden_id": "14327",
    "hidden_key": "City",
    "limit": 50,
    "nights": 2,
    "rooms": 1,
    "adults": 2,
    "children": 0,
    "adult_room": [2],
    "children_room": [0],
    "arrivalDate": "2026-05-07",
    "departureDate": "2026-05-09",
    "internal_rates": 1,
    "live_rates": 1,
    "optionsRadios": "hotels",
    "branches": "HQ",
    "supplier_id": 100,
    "filters": {
      "sort_by": "preferred",
      "meal_code": ["HB"],
      "hotel_rating": ["5"]
    }
  }
]
```

### Supplier IDs

| Supplier ID | Supplier |
|-------------|----------|
| `100` | HotelBeds |
| (others TBD) | ... |

### Filter Options

```json
{
  "filters": {
    "sort_by": "preferred",
    "meal_code": ["HB", "BB", "RO", "FB", "AI"],
    "hotel_rating": ["3", "4", "5"]
  }
}
```

| Meal Code | Meaning |
|-----------|---------|
| `RO` | Room Only |
| `BB` | Bed & Breakfast |
| `HB` | Half Board |
| `FB` | Full Board |
| `AI` | All Inclusive |

### Response Structure

```json
{
  "location": "city",
  "hidden_id": 14327,
  "hidden_key": "City",
  "limit": 50,
  "nights": 2,
  "arrivalDate": "2026-05-07",
  "departureDate": "2026-05-09",
  "searchCriteriaId": 52015695,
  "rows": [
    // Hotel results with ALL room types
  ],
  "page": 1,
  "total": 150,
  "start": 0,
  "count": 50,
  "end": 50,
  "market": { ... },
  "book_info": { ... }
}
```

## Current Status

### Test Results (2026-01-26)

```
Endpoint: /rest/v4/accommodationAvailability/
Status: 200 OK
Response: Valid structure, but rows: [] (empty)
```

The endpoint is **recognized** and returns a valid response structure, but returns **0 results**. In comparison, `accommodationAvailabilityV3` returns results for the same search.

### Likely Cause

The FlightsUK/FlightsUS API account (`RemBook`) appears to **not have access** to this endpoint's data, similar to the `liveProperties` endpoint situation.

## Action Required

**Contact Vyspa to request access to `accommodationAvailability` (non-V3) for the RemBook account.**

Questions for Vyspa:
1. Is the `accommodationAvailability` endpoint enabled for our account?
2. What's the difference in access between V3 and non-V3 versions?
3. Can we get the `supplier_id` filter enabled?
4. What are all available supplier IDs?
5. What additional fields are returned in `rows` vs V3 `Results`?

## Benefits Once Enabled

1. **Supplier filtering** - Filter by HotelBeds only (`supplier_id: 100`) to avoid mixing with internal rates
2. **Server-side filters** - Reduce payload size by filtering on server
3. **All room types in Stage 1** - Eliminates need for separate `getRoomsV3` call
4. **Pagination** - Better control over result sets
5. **Performance** - Smaller payloads, fewer API calls

## Implementation Plan (Once Access Granted)

1. Create new types for non-V3 response structure
2. Update or create new availability service
3. Add supplier filter to hotel search
4. Compare response fields with V3 for mapping
5. Update UI to leverage room types in Stage 1

## Test Script

```bash
node scripts/test-accommodation-availability.mjs "london" 2026-05-07 2026-05-09
node scripts/test-accommodation-availability.mjs "dubai" 2026-05-07 2026-05-09 --hotelbeds-only
```

## References

- Shekhar's curl example (2026-01-26)
- Test script: `scripts/test-accommodation-availability.mjs`
- Test output: `scripts/output/accommodation-availability-*.json`
