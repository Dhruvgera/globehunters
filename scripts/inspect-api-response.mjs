/**
 * Script to fetch and inspect Vyspa API response
 * Run with: node scripts/inspect-api-response.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  apiUrl: process.env.VYSPA_API_URL || 'https://api.globehunters.com',
  apiVersion: process.env.VYSPA_API_VERSION || '1',
  username: process.env.VYSPA_USERNAME || 'FlightsUS',
  password: process.env.VYSPA_PASSWORD || 'GHR3mPa55',
};

function getAuthHeader() {
  const b64 = Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64');
  return `Basic ${b64}`;
}

function buildFlightsUrl() {
  const base = CONFIG.apiUrl.replace(/\/+$/, '');
  return `${base}/rest/v4/flights_availability_search/`;
}

async function callApi(body) {
  console.log('🔍 Fetching flight data from API...\n');
  console.log('API URL:', buildFlightsUrl());
  console.log('Request params:', JSON.stringify(body[0], null, 2));
  console.log('\n' + '='.repeat(80) + '\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(buildFlightsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
        'Api-Version': CONFIG.apiVersion,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function inspectApiResponse() {
  // Use the same search parameters from the screenshot: JFK -> LHR
  const searchParams = [{
    version: '2',
    departure_airport: 'JFK',
    arrival_airport: 'LHR',
    departure_date: '2025-11-30',
    return_date: '2025-12-04',
    adults: '1',
    children: '0',
    child_ages: [],
    direct_flight_only: '0',
  }];

  try {
    const response = await callApi(searchParams);

    console.log('✅ API Response received!\n');
    console.log('Total Results:', response.Results?.length || 0);
    console.log('\n' + '='.repeat(80) + '\n');

    if (response.Results && response.Results.length > 0) {
      // Get first result for detailed inspection
      const firstResult = response.Results[0];
      
      console.log('📋 FIRST RESULT OVERVIEW:');
      console.log('  Result ID:', firstResult.Result_id);
      console.log('  Total Price:', firstResult.Total);
      console.log('  Currency:', firstResult.currency_code);
      console.log('  Number of Segments:', firstResult.Segments?.length || 0);
      console.log('\n' + '='.repeat(80) + '\n');

      // Inspect each segment
      firstResult.Segments?.forEach((segment, segIdx) => {
        console.log(`🛫 SEGMENT ${segIdx + 1}:`);
        console.log('  Stops:', segment.Stops);
        console.log('  Flying Time (minutes):', segment.FlyingTime);
        console.log('  Number of Flights:', segment.Flights?.length || 0);
        console.log('\n  FLIGHTS IN THIS SEGMENT:');

        segment.Flights?.forEach((flight, flightIdx) => {
          console.log(`\n    ✈️  Flight ${flightIdx + 1}:`);
          console.log('      Airline:', flight.airline_name, `(${flight.airline_code})`);
          console.log('      Flight Number:', flight.flight_number);
          console.log('      Route:', `${flight.departure_airport} -> ${flight.arrival_airport}`);
          console.log('      Departure:', flight.departure_date, flight.departure_time);
          console.log('      Arrival:', flight.arrival_date, flight.arrival_time);
          console.log('      Cabin Class:', flight.cabin_class);
          console.log('      Aircraft Type:', flight.aircraft_type);
          console.log('      Distance:', flight.distance, '(type:', typeof flight.distance, ')');
          console.log('      Departure Terminal:', flight.departure_terminal || 'N/A');
          console.log('      Arrival Terminal:', flight.arrival_terminal || 'N/A');
          console.log('      Baggage:', flight.Baggage || 'N/A');
          console.log('      Baggage Quantity:', flight.BaggageQuantity || 'N/A');
          console.log('      Baggage Unit:', flight.BaggageUnit || 'N/A');
        });

        console.log('\n' + '-'.repeat(80) + '\n');
      });

      // Save full response to file for detailed inspection
      const outputDir = path.join(__dirname, 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFile = path.join(outputDir, 'api-response.json');
      fs.writeFileSync(outputFile, JSON.stringify(response, null, 2));
      console.log(`\n💾 Full API response saved to: ${outputFile}\n`);

      // Inspect specific fields that are showing in the modal
      console.log('🔍 SPECIFIC FIELD ANALYSIS:\n');
      
      const firstFlight = firstResult.Segments[0]?.Flights[0];
      if (firstFlight) {
        console.log('━'.repeat(80));
        console.log('DISTANCE FIELD:');
        console.log('  - Value:', firstFlight.distance);
        console.log('  - Type:', typeof firstFlight.distance);
        console.log('  - Raw JSON:', JSON.stringify(firstFlight.distance));
        console.log('  - Question: Is this in KM, miles, or nautical miles?');
        console.log('  - Note: From screenshot 3856 • 333 displayed without units');
        console.log('');

        console.log('AIRCRAFT TYPE FIELD:');
        console.log('  - Value:', firstFlight.aircraft_type);
        console.log('  - Type:', typeof firstFlight.aircraft_type);
        console.log('  - Analysis: Aircraft codes (e.g., 333 = Airbus A330-300, 788 = Boeing 787-8)');
        console.log('  - Should display as: "A330-300" or "Boeing 787-8" etc.');
        console.log('');

        console.log('━'.repeat(80));
        console.log('DURATION/TIME ANALYSIS:');
        console.log('');
        console.log('Segment-level Flying Time:', firstResult.Segments[0]?.FlyingTime, 'minutes');
        console.log('  - This is TOTAL flight time for the segment');
        console.log('  - Shown in modal as "Travel time: 9h 35m"');
        console.log('');

        // Calculate layover times
        if (firstResult.Segments[0]?.Flights?.length > 1) {
          console.log('LAYOVER CALCULATIONS:');
          for (let i = 0; i < firstResult.Segments[0].Flights.length - 1; i++) {
            const current = firstResult.Segments[0].Flights[i];
            const next = firstResult.Segments[0].Flights[i + 1];
            
            const arrivalDateTime = new Date(`${current.arrival_date}T${current.arrival_time}`);
            const departureDateTime = new Date(`${next.departure_date}T${next.departure_time}`);
            const layoverMinutes = (departureDateTime - arrivalDateTime) / (1000 * 60);
            const hours = Math.floor(layoverMinutes / 60);
            const minutes = Math.round(layoverMinutes % 60);
            
            console.log(`  Layover ${i + 1} at ${current.arrival_airport}:`);
            console.log(`    - Current flight arrives: ${current.arrival_date} ${current.arrival_time}`);
            console.log(`    - Next flight departs: ${next.departure_date} ${next.departure_time}`);
            console.log(`    - Layover duration: ${layoverMinutes} minutes (${hours}h ${minutes}m)`);
            console.log('');
          }
          console.log('  - User confusion: Layover can be longer than individual flight duration');
          console.log('  - This is NORMAL for connecting flights (waiting time at airport)');
        }
        console.log('━'.repeat(80));
      }

      // Additional analysis
      console.log('\n📊 DATA RECOMMENDATIONS:\n');
      console.log('1. Distance Field:');
      console.log('   - API returns numeric value without unit');
      console.log('   - Need to verify: Is it km, miles, or nautical miles?');
      console.log('   - Solution: Add unit suffix (e.g., "3856 km" or "3856 mi")');
      console.log('');
      console.log('2. Aircraft Type:');
      console.log('   - API returns aircraft code (e.g., "333")');
      console.log('   - Solution: Map to readable names (333 → "Airbus A330-300")');
      console.log('');
      console.log('3. Duration vs Layover:');
      console.log('   - Segment FlyingTime = Total actual flight time');
      console.log('   - Layover = Waiting time between connecting flights');
      console.log('   - Layover can be > individual flight time (this is normal!)');
      console.log('   - Total journey time = FlyingTime + all layovers');
      console.log('');

    } else {
      console.log('❌ No results found in the API response');
      if (response.error) {
        console.log('Error:', response.error);
      }
    }

  } catch (error) {
    console.error('❌ Error fetching data:', error.message);
  }
}

// Run the script
inspectApiResponse();

