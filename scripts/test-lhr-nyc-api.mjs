#!/usr/bin/env node

/**
 * Test script to verify API response for LHR -> NYC route
 * Checking if Stops field matches actual flight count
 * Uses the EXACT same API format as src/lib/vyspa/client.ts
 */

const CONFIG = {
    // From .env file
    apiUrl: 'https://a1.stagev4.vyspa.net/anon.php',
    apiVersion: '1',
    username: 'ShahidTest',
    password: 'GHR3mPa55',
    branchCode: 'UK',
};

function getAuthHeader() {
    const credentials = `${CONFIG.username}:${CONFIG.password}`;
    return 'Basic ' + Buffer.from(credentials).toString('base64');
}

async function testLhrNycRoute() {
    console.log('🔍 Testing LHR -> NYC route to check Stops vs Flights count...\n');

    // Using version 3 like the app (VYSPA_CONFIG.defaults.version = '3')
    // LHR -> LGA to match the user's screenshot which shows stopover flights
    const searchParams = [{
        version: '3',
        departure_airport: 'LHR',
        arrival_airport: 'LGA',
        departure_date: '2026-01-01',
        return_date: '2026-01-09',
        adults: '1',
        children: '0',
        child_ages: [],
        infants: '0',
        direct_flight_only: '0',
    }];

    // Build URL exactly like client.ts does
    const base = CONFIG.apiUrl.replace(/\/+$/, '');
    const flightsUrl = `${base}/rest/v4/flights_availability_search/`;

    console.log('📤 Request:', {
        url: flightsUrl,
        route: `${searchParams[0].departure_airport} → ${searchParams[0].arrival_airport}`,
        dates: `${searchParams[0].departure_date} - ${searchParams[0].return_date}`,
    });

    try {
        const response = await fetch(flightsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader(),
                'Api-Version': CONFIG.apiVersion,
            },
            body: JSON.stringify(searchParams),
        });

        console.log('📥 Response Status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Response body:', text.substring(0, 500));
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log(`\n✅ API Response received!`);
        console.log(`Total Results: ${data.Results?.length || 0}\n`);

        if (data.error) {
            console.log('API Error:', data.error);
            return;
        }

        console.log('='.repeat(80) + '\n');

        if (!data.Results || data.Results.length === 0) {
            console.log('❌ No results found');
            return;
        }

        // Analyze first 15 results for Stops vs Flights mismatch
        console.log('📊 ANALYZING STOPS VS FLIGHTS COUNT:\n');

        let mismatches = 0;
        const resultsToCheck = data.Results.slice(0, 15);

        for (const result of resultsToCheck) {
            const resultId = result.Result_id;

            for (let segIndex = 0; segIndex < result.Segments.length; segIndex++) {
                const segment = result.Segments[segIndex];
                const apiStops = segment.Stops ?? 0;
                const flightCount = segment.Flights?.length || 0;
                const computedStops = Math.max(0, flightCount - 1);

                const isMismatch = apiStops !== computedStops;

                if (isMismatch) {
                    mismatches++;
                    console.log(`⚠️  MISMATCH in Result ${resultId}, Segment ${segIndex + 1}:`);
                } else {
                    console.log(`✅ Result ${resultId}, Segment ${segIndex + 1}:`);
                }

                console.log(`   Route: ${segment.Route}`);
                console.log(`   API Stops: ${apiStops}`);
                console.log(`   Flight Count: ${flightCount}`);
                console.log(`   Computed Stops: ${computedStops}`);

                // Show flight details
                if (segment.Flights && segment.Flights.length > 0) {
                    console.log('   Flights:');
                    for (const flight of segment.Flights) {
                        console.log(`     - ${flight.departure_airport} → ${flight.arrival_airport} (${flight.airline_code}${flight.flight_number})`);
                    }
                }
                console.log('');
            }
        }

        console.log('='.repeat(80));
        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total segments checked: ${resultsToCheck.reduce((sum, r) => sum + r.Segments.length, 0)}`);
        console.log(`   Mismatches found: ${mismatches}`);

        if (mismatches > 0) {
            console.log('\n⚠️  CONCLUSION: API Stops field is sometimes incorrect.');
            console.log('   We need to compute stops from Flights.length - 1');
        } else {
            console.log('\n✅ CONCLUSION: API Stops field appears correct.');
            console.log('   The issue may be elsewhere in the code.');
        }

    } catch (error) {
        console.error('❌ API Error:', error.message);
    }
}

testLhrNycRoute();
