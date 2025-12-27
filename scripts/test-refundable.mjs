/**
 * Test script to check refundable field in API response
 * LHR -> DXB for Dec 2025
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local manually (no dotenv dependency)
const envPath = join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const API_URL = envVars.VYSPA_API_URL;
const USERNAME = envVars.VYSPA_USERNAME || 'FlightsUK';
const PASSWORD = envVars.VYSPA_PASSWORD;

const basicAuth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

async function testFlightSearch() {
  console.log('🔍 Testing flight search LHR -> DXB for Dec 2025');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // VyspaSearchParams format
  const searchBody = [{
    version: '2',
    departure_airport: 'LHR',
    arrival_airport: 'DXB',
    departure_date: '2025-12-15',
    return_date: '2025-12-22',
    adults: '1',
    children: '0',
    child_ages: [],
    infants: '0',
    direct_flight_only: '0',
  }];

  console.log('Request:', JSON.stringify(searchBody, null, 2));
  console.log('\n');

  try {
    const response = await fetch(`${API_URL}/rest/v4/flights_availability_search/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': '1',
      },
      body: JSON.stringify(searchBody),
    });

    const data = await response.json();

    if (!data.Results || data.Results.length === 0) {
      console.log('❌ No results returned');
      console.log('Response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log(`✅ Got ${data.Results.length} results\n`);

    // Check refundable field in first 5 results
    console.log('📋 Checking refundable field in first 10 results:\n');
    
    const refundableCounts = { 1: 0, 2: 0, 3: 0, 4: 0, other: 0 };
    
    data.Results.slice(0, 10).forEach((result, idx) => {
      const firstFlight = result.Segments?.[0]?.Flights?.[0];
      if (firstFlight) {
        console.log(`Result ${idx + 1}:`);
        console.log(`  Result_id: ${result.Result_id}`);
        console.log(`  refundable: ${firstFlight.refundable} (type: ${typeof firstFlight.refundable})`);
        console.log(`  refundable_text: "${firstFlight.refundable_text}"`);
        console.log(`  airline: ${firstFlight.airline_name}`);
        console.log('');
      }
    });

    // Count all refundable values
    data.Results.forEach(result => {
      const firstFlight = result.Segments?.[0]?.Flights?.[0];
      if (firstFlight) {
        const code = firstFlight.refundable;
        if (code === 1 || code === '1') refundableCounts[1]++;
        else if (code === 2 || code === '2') refundableCounts[2]++;
        else if (code === 3 || code === '3') refundableCounts[3]++;
        else if (code === 4 || code === '4') refundableCounts[4]++;
        else refundableCounts.other++;
      }
    });

    console.log('\n📊 Refundable code distribution across all results:');
    console.log(`  Code 1 (Refundable): ${refundableCounts[1]}`);
    console.log(`  Code 2 (Non-Refundable): ${refundableCounts[2]}`);
    console.log(`  Code 3 (Refundable with Penalty): ${refundableCounts[3]}`);
    console.log(`  Code 4 (Fully Refundable): ${refundableCounts[4]}`);
    console.log(`  Other/Missing: ${refundableCounts.other}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFlightSearch();
