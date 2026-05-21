#!/bin/bash
set -euo pipefail

AUTH='UmVtQm9vazpHSFIzbVBhNTU='
VYSPA_API_VERSION=2
VYSPA_API_URL='https://a1.stagev4.vyspa.net'

RESPONSE=$(curl --silent --location "${VYSPA_API_URL}/rest/v4/accommodationAvailabilityV3/" \
--header 'Content-Type: application/json' \
--header "Authorization: Basic $AUTH" \
--data '[
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
        "arrivalDate": "2026-07-07",
        "departureDate": "2026-07-09",
        "internal_rates": 1,
        "live_rates": 1,
        "optionsRadios": "hotels",
        "branches": "UK",
        "supplier_id": 100,
        "hotel_cache": "redis",
        "filters": {
            "sort_by": "preferred"
        }
    }
]')

echo "$RESPONSE" | jq -r '.Results[:5][] | "\(.hotel_name)\n  Deeplink BB: \(.DeepLink)\(.keys.BB)\n Deeplink RO: \(.DeepLink)\(.keys.RO)\n  Stars: \(.hotel_rating) | Min Price: £\(.minPrice)\n"'

# echo "--- Pretty print Results[0:2] ---"
# echo "$RESPONSE" | jq '.Results[:2]'
