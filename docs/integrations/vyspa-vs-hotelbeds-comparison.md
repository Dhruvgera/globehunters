# Hotel API Comparison: Vyspa (Concorde) vs HotelBeds Direct

**Date:** January 24, 2026  
**Test Locations:** London, Dubai  
**Search Parameters:** 2 adults, 1 room, 2 nights (Feb 22-24, 2026)

## Executive Summary

| Metric | Vyspa (via Concorde) | HotelBeds Direct | Winner |
|--------|---------------------|------------------|--------|
| **Hotel Inventory (Dubai)** | 3 hotels | 398 hotels | HotelBeds |
| **Hotel Inventory (London)** | 0 hotels | 397 hotels | HotelBeds |
| **Response Time (Dubai)** | 18,233ms | 2,462ms | HotelBeds |
| **Response Time (London)** | 17,750ms | 1,722ms | HotelBeds |
| **Data Richness** | Rich (w/ extra calls) | Very Rich | HotelBeds |
| **Booking Integration** | Existing | Requires Build | Vyspa |

**Key Finding:** HotelBeds Direct API provides **130x more hotels** with **7-10x faster response times** and richer data per hotel in the availability response.

---

## Detailed Comparison

### 1. Hotel Inventory

#### Dubai Search Results
| Provider | Hotels Found | Price Range (GBP) |
|----------|--------------|-------------------|
| Vyspa | 3 | £66 - £670 |
| HotelBeds | 398 | £68 - £3,174 |

#### London Search Results
| Provider | Hotels Found | Price Range (GBP) |
|----------|--------------|-------------------|
| Vyspa | 0 | N/A |
| HotelBeds | 397 | £98 - £3,025 |

**Analysis:** Vyspa returned zero hotels for London, which is a major concern for a UK-focused travel site. This suggests limited inventory or configuration issues. HotelBeds consistently returns 400+ hotels for major destinations.

---

### 2. Response Time Performance

| Location | Vyspa | HotelBeds | Difference |
|----------|-------|-----------|------------|
| Dubai | 18.2 seconds | 2.5 seconds | HotelBeds 7.4x faster |
| London | 17.8 seconds | 1.7 seconds | HotelBeds 10.3x faster |

**User Experience Impact:** 
- Vyspa: User waits ~18 seconds for results (poor UX)
- HotelBeds: User waits ~2 seconds for results (good UX)

---

### 3. Data Structure Comparison

#### Vyspa Availability Response (per hotel)
```json
{
  "hotel_id": 5118,
  "hotel_name": "Sun And Sands Downtown",
  "hotel_rating": 3,
  "address1": "Al Jaazira Street, off Al Rigga Road",
  "geo_loc_latitude": 25.2644852,
  "geo_loc_longitude": 55.3190208,
  "image_name": "https://photos.hotelbeds.com/giata/...",
  "quickDescription": "Located in Deira's heart...",
  "SellCur": "GBP",
  "MealPlans": ["RO"],
  "minPrice": 66.52,
  "maxPrice": 670,
  "Prices": [66.52, 92.12, 175.46, ...],
  "RefPrices": [],
  "NonRefPrices": [66.52, 92.12, ...],
  "suppliers": ["100~Hotelbeds"],
  "cityName": "Dubai",
  "countryName": "United Arab Emirates",
  "reviews_rating": 0,
  "total_reviews": null
}
```

**Vyspa Pros:**
- ✅ Includes description in availability response
- ✅ Shows all price tiers upfront
- ✅ Indicates supplier (shows Hotelbeds is the source!)
- ✅ Refundable vs non-refundable price separation

**Vyspa Cons:**
- ❌ No room-level detail in availability
- ❌ No cancellation policies
- ❌ No promotions/offers
- ❌ No rate breakdown
- ❌ No allotment/availability status
- ❌ Requires extra API call for room details

---

#### HotelBeds Direct Availability Response (per hotel)
```json
{
  "code": 666425,
  "name": "TIME Express Hotel Al Khan",
  "categoryCode": "3EST",
  "categoryName": "3 STARS",
  "destinationName": "Sharjah",
  "latitude": "25.33027100000000000000",
  "longitude": "55.36757400000000000000",
  "currency": "GBP",
  "minRate": "95.04",
  "maxRate": "3174.84",
  "rooms": [
    {
      "code": "TWN.DX",
      "name": "Deluxe Express Twin",
      "rates": [
        {
          "rateKey": "...", // Booking reference
          "rateClass": "NRF", // Non-refundable indicator
          "net": "95.04",
          "sellingRate": "111.82",
          "allotment": 10, // Rooms available
          "boardCode": "RO",
          "boardName": "ROOM ONLY",
          "cancellationPolicies": [
            {
              "amount": "95.04",
              "from": "2026-01-23T23:59:00+04:00"
            }
          ],
          "promotions": [
            {
              "code": "073",
              "name": "Non-refundable rate. No amendments permitted"
            }
          ],
          "offers": [
            {
              "code": "9005",
              "name": "Exclusive discount",
              "amount": "-10.57"
            }
          ]
        }
      ]
    }
  ]
}
```

**HotelBeds Pros:**
- ✅ Room-level detail in single response
- ✅ Complete cancellation policies with exact dates
- ✅ Allotment/inventory levels
- ✅ Rate key for direct booking
- ✅ Promotions and offers with discount amounts
- ✅ Both net and selling rates
- ✅ Multiple meal plans per room type

**HotelBeds Cons:**
- ❌ No description in availability (requires Content API)
- ❌ No address in availability (requires Content API)
- ❌ Geolocation search only (destination search disabled for this account)

---

### 4. Meal Plan Coverage

| Meal Plan | Vyspa | HotelBeds |
|-----------|-------|-----------|
| Room Only (RO) | ✅ | ✅ |
| Bed & Breakfast (BB) | ✅ | ✅ |
| Half Board (HB) | ✅ | ✅ |
| Full Board (FB) | ✅ | ✅ |
| All Inclusive (AI) | ✅ | ✅ |

**Both APIs support all standard meal plans.**

---

### 5. Booking Flow Comparison

#### Current Vyspa Flow
1. `get_cities/` - Lookup destination
2. `accommodationAvailabilityV3/` - Search availability
3. `getRoomsV3/` - Get room details (extra call)
4. `hotel_search_details/` - Get cancellation policies (extra call)
5. `createApiCustomerFolder/` - Create booking folder
6. **Total API calls: 4-5**

#### HotelBeds Flow
1. `POST /hotel-api/1.0/hotels` - Search availability (includes rooms, rates, cancellation)
2. `POST /hotel-api/1.0/checkrates` - Verify price before booking
3. `POST /hotel-api/1.0/bookings` - Create booking
4. **Total API calls: 3**

---

### 6. Website UI Data Mapping

| UI Element | Vyspa Source | HotelBeds Source |
|------------|--------------|------------------|
| Hotel Name | ✅ `hotel_name` | ✅ `name` |
| Star Rating | ✅ `hotel_rating` | ✅ `categoryName` |
| Price | ✅ `minPrice` | ✅ `minRate` |
| Currency | ✅ `SellCur` | ✅ `currency` |
| Image | ✅ `image_name` | ⚠️ Construct from code |
| Description | ✅ `quickDescription` | ❌ Content API needed |
| Address | ✅ `address1` | ❌ Content API needed |
| Coordinates | ✅ `geo_loc_*` | ✅ `latitude/longitude` |
| City | ✅ `cityName` | ✅ `destinationName` |
| Room Types | ⚠️ Separate call | ✅ Included |
| Meal Plans | ⚠️ Code only ("RO") | ✅ Full name |
| Cancellation | ⚠️ Separate call | ✅ Included |
| Refundable Flag | ✅ `RefPrices` array | ✅ `rateClass` |
| Reviews | ⚠️ Not populated | ❌ Not available |

---

### 7. Interesting Discovery: Vyspa Sources from HotelBeds

The Vyspa API response shows:
```json
"suppliers": ["100~Hotelbeds"],
"modules": ["100~192~HotelBeds B2C - Live Creds"]
```

**This means Vyspa/Concorde is a reseller of HotelBeds inventory.** Going direct to HotelBeds:
- Removes the middleman
- Potentially offers better rates (no markup)
- Provides more inventory (full catalog vs curated)
- Faster response times (no proxy layer)

---

## Recommendations

### Short-term (Keep Vyspa)
If integration time is a concern:
1. Continue using Vyspa for hotels
2. Address London inventory issue with Vyspa support
3. Accept slower performance

### Long-term (Migrate to HotelBeds Direct)
For best user experience:
1. **Integrate HotelBeds directly** - You already have credentials
2. **Use Content API** for descriptions/images (cache locally)
3. **Request destination search** - Contact `apitude@hotelbeds.com`
4. **Build booking flow** - Use rateKey from availability response

### Hybrid Approach
1. Use HotelBeds for search/availability (better UX)
2. Route bookings through Vyspa if business logic requires it
3. Gradually migrate booking flow to HotelBeds direct

---

## API Credentials Summary

### HotelBeds Direct (Verified Working)
- **API Key:** `5435c13882fe02b74beb1dab243813e6`
- **Secret:** `a114a6be49`
- **Booking API:** `https://api.hotelbeds.com/hotel-api/1.0/`
- **Content API:** `https://api.hotelbeds.com/hotel-content-api/1.0/`

### Limitations
- Destination code search is disabled (use geolocation instead)
- Contact `apitude@hotelbeds.com` to enable destination search

---

## Test Scripts

Both APIs can be tested using:
```bash
# Compare both APIs
node scripts/compare-hotel-apis.mjs dubai 2026-02-22 2026-02-24

# Test HotelBeds only
node scripts/test-hotelbeds-api.mjs

# Test Vyspa only  
node scripts/test-hotels-vyspa.mjs london 2026-02-22 2026-02-24
```

---

## Conclusion

**HotelBeds Direct is significantly better** for the hotel search experience:
- **130x more inventory** (398 vs 3 hotels)
- **10x faster** (2s vs 18s)
- **Richer data** in single API call
- **Better booking UX** with real-time cancellation policies

The main trade-off is development effort to integrate the new API. However, given that Vyspa is already sourcing from HotelBeds, going direct provides strictly better results.

**Recommended Action:** Begin HotelBeds direct integration for hotel search while maintaining Vyspa for flights.
