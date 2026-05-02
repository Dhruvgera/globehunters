#!/bin/bash
set -euo pipefail

if [ -f "$(dirname "$0")/../.env" ]; then
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env"
fi

: "${VYSPA_USERNAME:?VYSPA_USERNAME is not set}"
: "${VYSPA_PASSWORD:?VYSPA_PASSWORD is not set}"

AUTH=$(printf '%s:%s' "$VYSPA_USERNAME" "$VYSPA_PASSWORD" | base64)

RESPONSE=$(curl --silent --location 'https://a1.stagev4.vyspa.net/rest/v4/accommodationAvailabilityV3/' \
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
        "arrivalDate": "2026-05-07",
        "departureDate": "2026-05-09",
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

echo "$RESPONSE" | jq -r '.Results[:5][] | "\(.hotel_name)\n  Deeplink: \(.DeepLink)&key=\(.mainKey)\n  Stars: \(.hotel_rating) | Min Price: £\(.minPrice)\n"'
