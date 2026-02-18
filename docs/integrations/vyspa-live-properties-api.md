# Vyspa liveProperties API Documentation

**Date Tested:** 2026-01-22  
**Account:** RemBook  
**Status:** ❌ **NOT AVAILABLE** - Endpoint returns 501 (method unavailable)

---

## 1. Overview

The `liveProperties` API is designed to provide:
- A paginated list of all available properties
- Full supplier original content for individual properties

This could supplement missing data in hotel search results (descriptions, addresses, coordinates, amenities, images).

---

## 2. Endpoints

### 2.1 List All Properties (Paginated)

**Endpoint:**
```
GET https://a1.stagev4.vyspa.net/rest/v4/liveProperties/?limit=500
```

**Description:**  
Returns a paginated list of all properties. Follow the `next` link until there are no more pages.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results per page (e.g., 500) |

---

### 2.2 Get Property Details

**Endpoint:**
```
GET https://a1.stagev4.vyspa.net/rest/v4/liveProperties/{propertyId}
```

**Description:**  
Returns the full supplier original content for a single property.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `propertyId` | integer | The property ID (e.g., 6373651) |

---

## 3. Authentication

**Method:** HTTP Basic Authentication

**Header:**
```
Authorization: Basic {base64(username:password)}
```

**Example:**
```
Authorization: Basic UmVtQm9vazpHSFIzbVBhNTU=
```

---

## 4. Request Examples

### 4.1 List Properties Request

```http
GET /rest/v4/liveProperties/?limit=500 HTTP/1.1
Host: a1.stagev4.vyspa.net
Content-Type: application/json
Authorization: Basic UmVtQm9vazpHSFIzbVBhNTU=
Api-Version: 4
```

**cURL:**
```bash
curl -X GET "https://a1.stagev4.vyspa.net/rest/v4/liveProperties/?limit=500" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic UmVtQm9vazpHSFIzbVBhNTU=" \
  -H "Api-Version: 4"
```

### 4.2 Get Property Details Request

```http
GET /rest/v4/liveProperties/6373651 HTTP/1.1
Host: a1.stagev4.vyspa.net
Content-Type: application/json
Authorization: Basic UmVtQm9vazpHSFIzbVBhNTU=
Api-Version: 4
```

**cURL:**
```bash
curl -X GET "https://a1.stagev4.vyspa.net/rest/v4/liveProperties/6373651" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic UmVtQm9vazpHSFIzbVBhNTU=" \
  -H "Api-Version: 4"
```

---

## 5. Response Examples

### 5.1 Current Response (Account Not Authorized)

**HTTP Status:** `501 Not Implemented`

**Response Body:**
```json
{
  "error_no": 1269,
  "message": "'liveProperties' The requested method was unavailable."
}
```

**Response Headers:**
```
cache-control: no-store, no-cache, must-revalidate
content-type: application/json
date: Thu, 22 Jan 2026 17:42:02 GMT
expires: Thu, 19 Nov 1981 08:52:00 GMT
pragma: no-cache
server: nginx/1.20.1
set-cookie: loggedIn=1; path=/
```

### 5.2 Without Authentication

**HTTP Status:** `401 Unauthorized`

**Response Body:**
```json
{
  "error_no": 1266,
  "message": "Authentication failed. Invalid credentials."
}
```

### 5.3 Expected Success Response (Once Enabled)

Based on typical REST API patterns, the expected responses would be:

**List Properties (expected):**
```json
{
  "count": 15000,
  "next": "https://a1.stagev4.vyspa.net/rest/v4/liveProperties/?limit=500&offset=500",
  "previous": null,
  "results": [
    {
      "id": 6373651,
      "name": "Example Hotel",
      "description": "Full supplier description...",
      "address1": "123 Main Street",
      "address2": "Westminster",
      "city": "London",
      "post_code": "SW1A 1AA",
      "country": "United Kingdom",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "star_rating": 4,
      "images": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "amenities": ["WiFi", "Pool", "Gym", "Restaurant"]
    }
    // ... more properties
  ]
}
```

**Property Details (expected):**
```json
{
  "id": 6373651,
  "name": "Example Hotel",
  "description": "Full supplier original description with all details...",
  "short_description": "Brief description for cards...",
  "address": {
    "address1": "123 Main Street",
    "address2": "Westminster",
    "city": "London",
    "post_code": "SW1A 1AA",
    "country": "United Kingdom"
  },
  "location": {
    "latitude": 51.5074,
    "longitude": -0.1278
  },
  "star_rating": 4,
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "caption": "Hotel Exterior"
    },
    {
      "url": "https://example.com/image2.jpg",
      "caption": "Lobby"
    }
  ],
  "amenities": [
    {"id": "wifi", "name": "Free WiFi", "category": "Internet"},
    {"id": "pool", "name": "Swimming Pool", "category": "Recreation"},
    {"id": "gym", "name": "Fitness Center", "category": "Recreation"}
  ],
  "supplier_data": {
    // Raw supplier-specific data
  }
}
```

---

## 6. Error Codes

| HTTP Status | Error No | Message | Meaning |
|-------------|----------|---------|---------|
| 401 | 1266 | Authentication failed. Invalid credentials. | Invalid or missing auth header |
| 501 | 1269 | 'liveProperties' The requested method was unavailable. | **Account not authorized for this endpoint** |
| 200 | B15403 | Id Not Found | Property ID does not exist |

---

## 7. URL Variations Tested

| URL Pattern | Result |
|-------------|--------|
| `https://a1.stagev4.vyspa.net/rest/v4/liveProperties/?limit=500` | 501 Not Implemented |
| `https://a1.stagev4.vyspa.net/rest/v4/liveProperties/6373651` | 501 Not Implemented |
| `https://a1.stagev4.vyspa.net/anon.php/rest/v4/liveProperties/?limit=10` | 501 Not Implemented |
| `https://a1.stagev4.vyspa.net/anon.php/rest/v4/liveProperties/6373651` | 501 Not Implemented |

All variations return the same 501 error, confirming the endpoint exists but is not enabled for this account.

---

## 8. Action Required

**Contact Vyspa Support** to request:

1. **Enable `liveProperties` access** for the `RemBook` API account
2. **Documentation** on available fields in the response
3. **Property ID mapping** - clarify relationship between:
   - `hotel_id` from `accommodationAvailabilityV3`
   - `VmapId` from search results
   - Property ID used in `liveProperties/{id}`

---

## 9. Implementation Status

| Component | Status |
|-----------|--------|
| Service file | ✅ Created: `src/services/api/livePropertiesService.ts` |
| Test script | ✅ Created: `scripts/test-live-properties.mjs` |
| API access | ❌ **Blocked** - needs Vyspa to enable |

---

## 10. Potential Use Cases

Once enabled, these endpoints could supplement:

| Missing Field | Current Source | Could Get From liveProperties |
|--------------|----------------|-------------------------------|
| `description` | Empty in search results | Full supplier description |
| `quickDescription` | Empty | Short description |
| `address1`, `address2` | Empty in most results | Full address |
| `geo_loc_latitude/longitude` | Null in some results | Accurate coordinates |
| `attributes` | Empty array | Structured amenities |
| Gallery images | Only single `image_name` | Multiple images |

---

## 11. Test Script

Run the test script to verify once access is granted:

```bash
cd ghfe
node scripts/test-live-properties.mjs
```
