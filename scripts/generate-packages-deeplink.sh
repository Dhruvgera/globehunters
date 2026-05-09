#!/bin/bash
set -euo pipefail

if [ -f "$(dirname "$0")/../.env" ]; then
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env"
fi

: "${VYSPA_USERNAME:?VYSPA_USERNAME is not set}"
: "${VYSPA_PASSWORD:?VYSPA_PASSWORD is not set}"

AUTH=$(printf '%s:%s' "$VYSPA_USERNAME" "$VYSPA_PASSWORD" | base64)

RESPONSE=$(curl --silent --location 'https://a1.stagev4.vyspa.net/rest/v4/holiday_package_search/' \
--header 'Content-Type: application/json' \
--header 'Api-Version: 2' \
--header "Authorization: Basic $AUTH" \
--data '[
    {
      "DestinationFrom": "LON",
      "Destination": "DXB;11945;Dubai",
      "departure_date": "20/05/2026",
      "nights": "5",
      "rooms": "1",
      "adults": ["2"],
      "children": ["0"],
      "child_ages": [{}],
      "infants": ["0"],
      "minimalResponse": false,
      "timeout": 30,
      "direct_flight_only": 0
    }
  ]')

echo "$RESPONSE" | jq -r '.Packages.results[:5][] | "\(.hotel_name)\n  Deeplink: \(.DeepLink)&key=\(.mainKey)\n  Stars: \(.hotel_rating) | Min Price: £\(.minPrice)\n"'
