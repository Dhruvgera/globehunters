# Vyspa Hotel Flow: `accommodationAvailabilityV3` -> `getRoomsV3` Empty Response

Last verified by live curl runs: February 16, 2026 (UTC)

## Summary

In current Vyspa hotel search responses, many rows come back with:

- `hotel_id: 0`
- valid search result id in `id` (srId)

For these rows, calling `getRoomsV3` with `srIds` can return HTTP `200` but an error payload:

```json
{
  "error": true,
  "desc": "No hotels found in this area."
}
```

So the call is technically successful at HTTP level, but has no room data (`rooms.room1options` missing).

## End-to-End API Flow

1. Resolve destination via `get_cities`
2. Search hotels via `accommodationAvailabilityV3`
3. Pick a result row
4. Call `getRoomsV3`:
   - Prefer `hotelIds` if `hotel_id > 0`
   - Otherwise use `srIds` from `Results.id`
5. If `getRoomsV3` returns `{ error, desc }`, treat as no-room-availability for that row (not as a transport failure)

## Live Run Artifacts

All files below were captured from live curls on February 16, 2026:

- `scripts/output/live-curl-proof-20260216T205010Z/summary.json`
- `scripts/output/live-curl-proof-20260216T205010Z/no_cache_getrooms_summary.json`
- `scripts/output/live-curl-proof-20260216T205010Z/getrooms_sr.json`
- `scripts/output/live-curl-proof-20260216T205010Z/getrooms_sr_no_cache.json`
- `scripts/output/live-curl-proof-20260216T205010Z/getrooms_hotel_no_cache.json`

## cURL Requests (Executed Live)

Set env first:

```bash
export VYSPA_ENDPOINT="https://a1.stagev4.vyspa.net/anon.php"
export VYSPA_USER="<username>"
export VYSPA_PASS="<password>"
```

### 1) Get city

```bash
curl --globoff --request POST "$VYSPA_ENDPOINT/rest/v4/get_cities/" \
  -u "$VYSPA_USER:$VYSPA_PASS" \
  --header 'Content-Type: application/json' \
  --header 'Api-Version: 1' \
  --data '["london", true]'
```

Expected: array with city objects (example city id: `14095`, `loc: "City"`).

### 2) Availability search (`accommodationAvailabilityV3`) with `hotel_cache: "redis"`

```bash
curl --globoff --request POST "$VYSPA_ENDPOINT/rest/v4/accommodationAvailabilityV3/" \
  -u "$VYSPA_USER:$VYSPA_PASS" \
  --header 'Content-Type: application/json' \
  --header 'Api-Version: 1' \
  --data '[{
    "location":"London",
    "hidden_id":"14095",
    "hidden_key":"City",
    "nights":"2",
    "rooms":"1",
    "adults":"2",
    "children":"0",
    "arrivalDate":"2026-03-10",
    "departureDate":"2026-03-12",
    "internal_rates":1,
    "live_rates":1,
    "optionsRadios":"hotels",
    "branches":"UK",
    "hotel_cache":"redis"
  }]'
```

Observed in live run (`summary.json`):

- `criteriaId`: `52016126`
- `availabilityCount`: `313`
- `srIdExample`: `2063113256`
- `hotelIdExample`: empty in this run (`hotel_id > 0` rows not found in sampled extraction)

### 3A) Get rooms by `srIds` (for rows with `hotel_id: 0`)

```bash
curl --globoff --request POST "$VYSPA_ENDPOINT/rest/v4/getRoomsV3/" \
  -u "$VYSPA_USER:$VYSPA_PASS" \
  --header 'Content-Type: application/json' \
  --header 'Api-Version: 1' \
  --data '[{"SearchCriteriaId":52016118,"srIds":"2063101845"}]'
```

Observed live payload from `getrooms_sr.json` (HTTP 200):

```json
{
  "error": true,
  "desc": "No hotels found in this area."
}
```

### 3B) Additional live run without `hotel_cache` to verify `hotelIds`

Availability request used:

```bash
curl --globoff --request POST "$VYSPA_ENDPOINT/rest/v4/accommodationAvailabilityV3/" \
  -u "$VYSPA_USER:$VYSPA_PASS" \
  --header 'Content-Type: application/json' \
  --header 'Api-Version: 1' \
  --data '[{
    "location":"London",
    "hidden_id":"14095",
    "hidden_key":"City",
    "nights":"2",
    "rooms":"1",
    "adults":"2",
    "children":"0",
    "arrivalDate":"2026-03-10",
    "departureDate":"2026-03-12",
    "internal_rates":1,
    "live_rates":1,
    "optionsRadios":"hotels",
    "branches":"UK"
  }]'
```

Observed in live run (`no_cache_getrooms_summary.json`):

- `criteria`: `52016127`
- positive-id sample:
  - `id`: `2063115017`
  - `hotel_id`: `142842`
  - `hotel_name`: `Amsterdam Hotel London`

`getRoomsV3` by `srIds` on that row:

```bash
curl --globoff --request POST "$VYSPA_ENDPOINT/rest/v4/getRoomsV3/" \
  -u "$VYSPA_USER:$VYSPA_PASS" \
  --header 'Content-Type: application/json' \
  --header 'Api-Version: 1' \
  --data '[{"SearchCriteriaId":52016127,"srIds":"2063115017"}]'
```

Observed live payload from `getrooms_sr_no_cache.json`:

```json
"Internal Error - Contact Support ref GHTRAVEL699383588e32a"
```

`getRoomsV3` by `hotelIds` on the same row:

```bash
curl --globoff --request POST "$VYSPA_ENDPOINT/rest/v4/getRoomsV3/" \
  -u "$VYSPA_USER:$VYSPA_PASS" \
  --header 'Content-Type: application/json' \
  --header 'Api-Version: 1' \
  --data '[{"SearchCriteriaId":52016127,"hotelIds":"142842"}]'
```

Observed in live run (`no_cache_getrooms_summary.json`):

- top-level keys include `hotel_id`, `hotel_name`, `rooms`, etc.
- `rooms.room1options` count: `6`

## Practical Handling Rules

- Do not assume HTTP 200 means rooms are present.
- Validate room payload by checking:
  - `rooms` object exists
  - `rooms.room1options` is an array
  - array has at least 1 option
- If response is `{ error, desc }` or string error text:
  - show a no-availability state for this hotel/stay
  - keep listing/details context from availability metadata
  - optionally retry with changed dates/occupancy

## Reproduction Notes (from live checks)

- Query: `London`
- Dates: `2026-03-10 -> 2026-03-12`
- Branch: `UK`
- Run A (`hotel_cache: "redis"`): `getRoomsV3(srIds)` returned `{ error, desc }`.
- Run B (no `hotel_cache`): same flow produced:
  - `getRoomsV3(srIds)` string internal error
  - `getRoomsV3(hotelIds)` valid room payload with 6 options.
