/**
 * Test script to check if Vyspa hotel API returns variable results
 * Run with: bun run test-hotel-variability.ts
 */

// Bun automatically loads .env files

const VYSPA_API_URL = process.env.VYSPA_API_URL || 'https://api.vyspa.com';
const VYSPA_USERNAME = process.env.VYSPA_USERNAME || '';
const VYSPA_PASSWORD = process.env.VYSPA_PASSWORD || '';
const VYSPA_API_VERSION = process.env.VYSPA_API_VERSION || '4';

async function searchHotels() {
    const payload = [{
        location: "Dubai",
        hidden_id: "11945",  // Dubai city ID from your URL
        hidden_key: "City",
        nights: "9",
        rooms: "1",
        adults: "2",
        children: "0",
        arrivalDate: "2026-02-11",
        departureDate: "2026-02-20",
        internal_rates: 1,
        live_rates: 1,
        optionsRadios: "hotels",
        branches: "UK"
    }];

    const basicAuth = Buffer.from(`${VYSPA_USERNAME}:${VYSPA_PASSWORD}`).toString('base64');

    const response = await fetch(`${VYSPA_API_URL}/rest/v4/accommodationAvailabilityV3/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`,
            'Api-Version': VYSPA_API_VERSION,
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    const rawResults = data?.Results || [];
    const validResults = rawResults.filter(
        (r: any) => r && typeof r === 'object' && !Array.isArray(r) && (r.hotel_id || r.hotelId || r.id)
    );

    return {
        rawCount: rawResults.length,
        validCount: validResults.length,
        hotelNames: validResults.slice(0, 5).map((r: any) => r.hotel_name || r.hotelName || 'Unknown')
    };
}

async function main() {
    console.log('Testing Vyspa Hotel API variability - Dubai, Feb 11-20, 2026');
    console.log('Running 20 searches...\n');

    const results: { run: number; rawCount: number; validCount: number; hotelNames: string[] }[] = [];

    for (let i = 1; i <= 20; i++) {
        try {
            const result = await searchHotels();
            results.push({ run: i, ...result });
            console.log(`Run ${i.toString().padStart(2)}: Raw=${result.rawCount}, Valid=${result.validCount} hotels`);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
            console.log(`Run ${i.toString().padStart(2)}: ERROR - ${error.message}`);
        }
    }

    console.log('\n--- Summary ---');
    const validCounts = results.map(r => r.validCount);
    const uniqueCounts = [...new Set(validCounts)];
    console.log(`Unique result counts: ${uniqueCounts.join(', ')}`);
    console.log(`Min: ${Math.min(...validCounts)}, Max: ${Math.max(...validCounts)}`);

    if (uniqueCounts.length === 1) {
        console.log('\n✅ API returns CONSISTENT results');
    } else {
        console.log('\n⚠️  API returns VARIABLE results - this is Vyspa behavior, not a rendering bug');
    }
}

main().catch(console.error);
