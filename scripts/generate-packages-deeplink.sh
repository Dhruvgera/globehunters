#!/bin/bash
set -euo pipefail

AUTH='UmVtQm9vazpHSFIzbVBhNTU='
VYSPA_API_VERSION=2
VYSPA_API_URL='https://a1.stagev4.vyspa.net'
# VYSPA_API_URL='https://api.globehunters.com'

RESPONSE=$(curl --silent --location "${VYSPA_API_URL}/rest/v4/holiday_package_search/" \
--header 'Content-Type: application/json' \
--header "Api-Version: ${VYSPA_API_VERSION}" \
--header "Authorization: Basic $AUTH" \
--data '[
    {
      "DestinationFrom": "LON",
      "Destination": "DXB;11945;Dubai",
      "departure_date": "20/06/2026",
      "nights": "3",
      "rooms": "2",
      "adults": ["2", "2"],
      "children": ["0"],
      "child_ages": [{}],
      "infants": ["0"],
      "minimalResponse": false,
      "direct_flight_only": 0,
      "timeout": 120
    }
  ]')

echo "$RESPONSE"
echo "$RESPONSE" | jq -r '.Packages.results[:5][] | "\(.hotel_name)\n  Deeplink Main: \(.DeepLink)\(.main)\n  Deeplink RO: \(.DeepLink)\(.keys.RO) \n  Deeplink BB: \(.DeepLink)\(.keys.BB) \n  Stars: \(.hotel_rating) | Min Price: £\(.minPrice)\n"'
