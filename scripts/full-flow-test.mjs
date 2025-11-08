/**
 * Full flow test: Flight search → Get segment ID → Price check
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const VYSPA_API_URL = envVars.VYSPA_API_URL;
const VYSPA_USERNAME = envVars.VYSPA_USERNAME;
const VYSPA_PASSWORD = envVars.VYSPA_PASSWORD;

if (!VYSPA_API_URL || !VYSPA_USERNAME || !VYSPA_PASSWORD) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const basicAuth = Buffer.from(`${VYSPA_USERNAME}:${VYSPA_PASSWORD}`).toString('base64');

console.log('🧪 FULL FLOW TEST: SEARCH → PRICE CHECK');
console.log('═══════════════════════════════════════════════════════════════\n');

async function searchFlights() {
  console.log('🔍 STEP 1: Searching for flights...');
  console.log('  Route: JFK → LHR');
  console.log('  Dates: 2025-11-30 to 2025-12-04');
  console.log('  Passengers: 1 Adult\n');

  const searchBody = {
    "1": {
      "from": "JFK",
      "to": "LHR",
      "date": "2025-11-30"
    },
    "2": {
      "from": "LHR",
      "to": "JFK",
      "date": "2025-12-04"
    },
    "adults": 1,
    "children": 0,
    "infants": 0,
    "cabin_class": "",
    "airline_preference": ""
  };

  try {
    const response = await fetch(`${VYSPA_API_URL}/rest/v4/flight_search/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': '1',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Flight search successful');
    console.log(`  Found ${data.Results?.length || 0} results\n`);

    if (!data.Results || data.Results.length === 0) {
      throw new Error('No flights found');
    }

    // Get first result's segment ID
    const firstResult = data.Results[0];
    const segmentId = firstResult.Result_id;
    
    console.log('📋 First Flight Result:');
    console.log(`  Segment ID: ${segmentId}`);
    console.log(`  Price: ${firstResult.Total_Fare} ${firstResult.Currency}`);
    console.log(`  Airline: ${firstResult.Carrier}`);
    console.log('');

    return segmentId;

  } catch (error) {
    console.error('❌ Flight search failed:', error.message);
    throw error;
  }
}

async function priceCheck(segmentId) {
  console.log('💰 STEP 2: Running price check...');
  console.log(`  Segment ID: ${segmentId}\n`);

  const priceCheckBody = [{
    segment_psw_result1: parseInt(segmentId)
  }];

  try {
    const response = await fetch(`${VYSPA_API_URL}/rest/v4/price_check/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': '1',
      },
      body: JSON.stringify(priceCheckBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Price check successful\n');
    
    if (!data.success || !data.priceCheck) {
      throw new Error('Invalid price check response');
    }

    const priceData = data.priceCheck.price_data || [];
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 PRICE CHECK RESULTS: ${priceData.length} fare options`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    priceData.forEach((option, index) => {
      const totalFare = option.Total_Fare || {};
      const pricingArr = option.pricingArr || [];
      const baggageTxt = option.baggageTxt || {};
      const brandInfo = option.BrandInfo || [];

      const brandName = totalFare.Name || '';
      const cabinClass = pricingArr[0]?.CabinClass || '';
      const cabinName = brandInfo[0]?.CabinName || '';
      const bookingCode = pricingArr[0]?.BookingCode || '';
      
      const routes = Object.keys(baggageTxt);
      const baggageInfo = routes[0] ? baggageTxt[routes[0]]?.ADT : '';

      console.log(`Option ${index + 1}: ${brandName || 'N/A'}`);
      console.log(`  Total_Fare.Name: "${totalFare.Name}"`);
      console.log(`  Price: ${totalFare.total} USD`);
      console.log(`  Cabin Class Code: ${cabinClass} → ${cabinName}`);
      console.log(`  Booking Code: ${bookingCode}`);
      console.log(`  Baggage: ${baggageInfo}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    
    return data;

  } catch (error) {
    console.error('❌ Price check failed:', error.message);
    throw error;
  }
}

// Run the full flow
try {
  const segmentId = await searchFlights();
  await priceCheck(segmentId);
  
  console.log('\n✅ FULL FLOW TEST COMPLETED SUCCESSFULLY');
  
} catch (error) {
  console.error('\n❌ TEST FAILED:', error);
  process.exit(1);
}

