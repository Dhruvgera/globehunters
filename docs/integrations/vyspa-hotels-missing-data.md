# Vyspa Hotel APIs - Missing Data Fields Documentation

**Date:** 2026-01-07  
**Test Query:** London, UK (2026-02-10 to 2026-02-12)  
**API Base:** `https://a1.stagev4.vyspa.net/anon.php`

This document lists all data fields that are **missing, null, or empty** in the Vyspa hotel API responses, preventing full UI population.

---

## 1. `accommodationAvailabilityV3` (Hotel Search Results)

### Missing/Null Fields

| Field | Status | UI Impact | Notes |
|-------|--------|-----------|-------|
| `address1` | `null` | Hotel card address | Falls back to "Content missing from API: address" |
| `address2` | `null` | Hotel card address | Falls back to "Content missing from API: address" |
| `post_code` | `null` | Hotel card address | Not displayed |
| `geo_loc_latitude` | `null` | Map view (disabled) | Cannot enable map view without coordinates |
| `geo_loc_longitude` | `null` | Map view (disabled) | Cannot enable map view without coordinates |
| `quickDescription` | `null` | Hotel card description | Not displayed in search results |
| `reviews_rating` | `0` | Hotel card rating | Falls back to "Content missing from API: rating" |
| `total_reviews` | `null` | Hotel card review count | Always shows "0 reviews" |
| `tripadvisor_id` | `null` | External review links | Cannot link to TripAdvisor |
| `hotel_classification` | `null` | Hotel classification | Not displayed |
| `attributes` | `[]` (empty) | Amenities filter | Cannot populate amenities filter |
| `interest` | `[]` (empty) | Interest tags | Not displayed |
| `city_name` | Empty string in some cases | City display | Falls back to `label` from `get_cities` |

### Fields Not Present in Response

- **Amenities list** - No structured amenities array (only `MealPlans` array exists)
- **Neighborhood** - No neighborhood/district field
- **Room amenities** - Not available at search level
- **Hotel images** - Only single `image_name` (no gallery)
- **Hotel description** - Not available at search level

### Available Fields (Working)

✅ `hotel_id`, `hotel_name`, `hotel_rating`, `image_name`, `SellCur`, `MealPlans`, `NetPrices`, `suppliers`, `AvailabilityStatuses`

---

## 2. `getRoomsV3` (Hotel Details & Room Options)

### Missing/Null Fields

| Field | Status | UI Impact | Notes |
|-------|--------|-----------|-------|
| `address1` | `null` | Hotel header address | Falls back to "Content missing from API: address" |
| `address2` | `null` | Hotel header address | Falls back to "Content missing from API: address" |
| `post_code` | `null` | Hotel header address | Not displayed |
| `geo_loc_latitude` | `null` | Map view | Cannot show hotel on map |
| `geo_loc_longitude` | `null` | Map view | Cannot show hotel on map |
| `quickDescription` | `""` (empty string) | Hotel description | Falls back to "Content missing from API: description" |
| `vendor_name` | `null` | Supplier display | Not displayed |

### Room-Level Missing Fields

| Field | Status | UI Impact | Notes |
|-------|--------|-----------|-------|
| Room amenities | Not in response | Room card amenities | Cannot show room-specific amenities |
| Room images | Not in response | Room gallery | Cannot show room photos |
| Room description | Not in response | Room details | Cannot show detailed room info |
| `discount_details` | `""` (empty) | Discount badges | Not displayed |
| `rules_applied` | `null` | Room rules | Not displayed |

### Available Fields (Working)

✅ `hotel_id`, `hotel_name`, `hotel_rating`, `image_name`, `SellCur`, `rooms.room1options[]` with:
- `id`, `room_name`, `meal_name`, `MealPlan`, `net_price`, `nonRef` (refundability), `days_spent`

---

## 3. `hotel_search_details` (Hotel Description & Policies)

### Missing/Empty Fields

| Field | Status | UI Impact | Notes |
|-------|--------|-----------|-------|
| `description` | `""` (empty string) | Hotel description section | Falls back to "Content missing from API: description" |
| `accomodation_rules` | `null` | Hotel rules/policies | Not displayed |
| `hotels.quickDescription` | `""` (empty string) | Hotel quick description | Not displayed |
| `hotels.remarks` | `[]` (empty array) | Hotel remarks | Not displayed |

### Fields Not Present in Response

- **Gallery images** - No `VendorImages` or image array (only single `image_name` from `getRoomsV3`)
- **FAQs** - No frequently asked questions section
- **Reviews** - No review data (separate API may exist)
- **Hotel amenities** - No structured amenities list
- **Nearby attractions** - Not available
- **Transportation info** - Not available

### Available Fields (Working)

✅ `Cancellation[].SearchResultCancellation.cancellationPolicy` (HTML-formatted cancellation policy)

---

## 4. `get_cities` (Location Autocomplete)

### Missing/Empty Fields

| Field | Status | UI Impact | Notes |
|-------|--------|-----------|-------|
| `city_name` | `""` (empty in some results) | City display | Falls back to `label` |
| `arrival_point_code` | `undefined` (in some results) | Airport code | Not displayed if missing |

### Available Fields (Working)

✅ `id`, `label`, `loc`, `country_name`

---

## 5. Filter & Sort Features Impact

### Filters That Cannot Work (No API Data)

| Filter | Reason | UI Status |
|--------|--------|-----------|
| **Neighborhood** | No `neighborhood` field in any response | Disabled with note: "Content missing from API: neighborhood data" |
| **Amenities** | No `attributes` or amenities array | Disabled with note: "Content missing from API: amenities" |
| **Popular: Breakfast included** | Cannot reliably detect from `MealPlans` alone | Disabled with note: "Content missing from API: breakfast filter" |
| **Popular: Airport shuttle** | No shuttle/transportation data | Disabled with note: "Content missing from API: airport shuttle filter" |
| **Popular: Reserve without card** | No payment method data | Disabled with note: "Content missing from API: payment method filter" |
| **Popular: Reserve now, pay later** | No payment terms data | Disabled with note: "Content missing from API: payment terms filter" |
| **Bedrooms** | No bedroom count in room data | Disabled with note: "Content missing from API: bedroom count" |
| **Accessibility** | No accessibility features | Disabled with note: "Content missing from API: accessibility features" |

### Filters That Work

✅ **Property name** - Filters by `hotel_name`  
✅ **Price range** - Filters by `NetPrices` (total price)  
✅ **Star rating** - Filters by `hotel_rating`  
✅ **Meal plans** - Filters by `MealPlans` array  
✅ **Fully refundable** - Filters by `nonRef === 0` in room options

### Sort Options

✅ **Price (low to high)** - Works (default)  
✅ **Recommended** - Falls back to price sort (no recommendation score)  
✅ **Rating** - Falls back to price sort (`reviews_rating` is always 0)

---

## 6. UI Components Affected

### Hotel Search Results Page (`/hotels`)

- ✅ Hotel name, star rating, price, image, meal plans
- ❌ Address (shows "Content missing from API: address")
- ❌ Review score/count (shows "Content missing from API: rating")
- ❌ Neighborhood filter (disabled)
- ❌ Amenities filter (disabled)
- ❌ Popular filters (most disabled)

### Hotel Details Page (`/hotels/[id]`)

- ✅ Hotel name, star rating, main image, room options, prices, meal plans, refundability
- ❌ Address (shows "Content missing from API: address")
- ❌ Description (shows "Content missing from API: description" if empty)
- ❌ Gallery images (only single image available)
- ❌ Room amenities (not displayed)
- ❌ Room images (not displayed)
- ❌ Room descriptions (not displayed)
- ❌ FAQs (not available)
- ❌ Reviews (not available - separate API may exist)
- ✅ Cancellation policy (from `hotel_search_details`)

### Hotel Checkout Page (`/hotels/checkout`)

- ✅ Hotel name, dates, selected room, meal plan, price
- ✅ All fields populated from cached data

---

## 7. Recommendations

### Short-term (Current Implementation)

1. ✅ **Keep UI elements visible** - Don't remove filters/components, just disable and show "Content missing from API" notes
2. ✅ **Use fallback text** - Show "Content missing from API: [field]" instead of empty/null values
3. ✅ **Cache available data** - Persist hotel details in Zustand store to avoid refetching

### Long-term (API Enhancements Needed)

1. **Request from Vyspa:**
   - Structured amenities array in `accommodationAvailabilityV3`
   - Neighborhood/district field
   - Gallery images array (not just single `image_name`)
   - Room-level amenities, images, descriptions
   - Review data (rating + count)
   - Hotel description text
   - Address fields (`address1`, `address2`, `post_code`)
   - Coordinates (`geo_loc_latitude`, `geo_loc_longitude`)

2. **Alternative Data Sources:**
   - Consider integrating TripAdvisor API for reviews (if `tripadvisor_id` becomes available)
   - Consider Google Places API for address/coordinates if Vyspa cannot provide
   - Consider separate image CDN for hotel galleries

---

## 9. liveProperties API (Potential Solution)

**Date Tested:** 2026-01-22

Vyspa has a `liveProperties` REST API that could supplement missing hotel data:

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rest/v4/liveProperties/?limit=500` | GET | List properties with pagination (follow `next` link) |
| `/rest/v4/liveProperties/{propertyId}` | GET | Get full supplier original content for one property |

### Current Access Status

⚠️ **The FlightsUK/FlightsUS account currently has NO ACCESS to this data:**

```
GET /rest/v4/liveProperties/?limit=500 → 200 OK, body: null
GET /rest/v4/liveProperties/6373651    → 200 OK, body: {"error":"B15403","message":"Id Not Found"}
```

- Authentication works (401 without auth, 200 with auth)
- The endpoint is recognized (not 501 "method unavailable")
- But account returns no data

### Action Required

**Contact Vyspa to request liveProperties access for your API account.** Specifically:
1. Request access to `GET /rest/v4/liveProperties/` endpoints
2. Ask which property ID format they use (hotel_id, VmapId, or internal ID)
3. Ask what data fields are available in the liveProperties response

### Implementation Ready

Service implementation is prepared at `src/services/api/livePropertiesService.ts`:

```typescript
import { 
  fetchAllLiveProperties, 
  getLivePropertyDetails,
  supplementHotelWithLiveData 
} from '@/services/api/livePropertiesService';

// Fetch all properties (with pagination)
const properties = await fetchAllLiveProperties();

// Get full supplier content for a specific property
const details = await getLivePropertyDetails(propertyId);

// Supplement hotel search results with live data
const enrichedHotel = supplementHotelWithLiveData(hotelFromSearch, details);
```

### Expected Benefits (Once Enabled)

| Missing Field | Could Get From liveProperties |
|--------------|-------------------------------|
| `description` | ✅ Full supplier description |
| `address1`, `address2` | ✅ Complete address |
| `geo_loc_latitude/longitude` | ✅ Coordinates |
| `attributes/amenities` | ✅ Structured amenity list |
| Gallery images | ✅ Multiple images |
| Room descriptions | Possibly |

---

## 8. Test Response Files

Raw API responses saved to:
- `scripts/output/vyspa-hotels-smoke-london-2026-01-07T07-58-45-251Z.json`

This file contains the complete JSON responses from all endpoints for reference.



