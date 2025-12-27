/**
 * Test script for Vyspa API v3 response structure
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env manually
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
const USERNAME = envVars.VYSPA_USERNAME || 'ShahidTest';
const PASSWORD = envVars.VYSPA_PASSWORD;
const API_VERSION = envVars.VYSPA_API_VERSION || '3';

const basicAuth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

async function testV3FlightSearch() {
  console.log('🔍 Testing Vyspa API v3 - Flight search LHR -> DXB');
  console.log(`API Version: ${API_VERSION}`);
  console.log(`API URL: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const searchParams = [{
    version: '2',
    departure_airport: 'LHR',
    arrival_airport: 'DXB',
    departure_date: '2025-12-27',
    adults: '1',
    children: '0',
    child_ages: [],
    infants: '0',
    direct_flight_only: '0',
  }];

  // Detect endpoint format: if URL ends with anon.php, use the REST v4 endpoint
  const isAnonPhp = API_URL.includes('anon.php');
  let endpoint, headers, body;
  
  if (isAnonPhp) {
    // Use REST v4 endpoint (append /rest/v4/...)
    const base = API_URL.replace(/\/+$/, '');
    endpoint = `${base}/rest/v4/flights_availability_search/`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Api-Version': API_VERSION,
    };
    body = JSON.stringify(searchParams);
    console.log('Using REST v4 endpoint:', endpoint);
  } else {
    // Legacy method
    endpoint = API_URL;
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({
      username: USERNAME,
      password: PASSWORD,
      token: '',
      method: 'flights_availability_search',
      params: JSON.stringify(searchParams),
    });
  }

  console.log('Request params:', JSON.stringify(searchParams, null, 2));
  console.log('\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();

    // Save full response
    const outputDir = join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(join(outputDir, 'v3-search-response.json'), JSON.stringify(data, null, 2));
    console.log('✅ Full response saved to scripts/output/v3-search-response.json\n');

    if (data.error_no || data.message?.includes('unavailable')) {
      console.log('❌ Error from API:', data);
      return;
    }

    console.log('📋 Response structure:');
    console.log(`  Request_id: ${data.Request_id}`);
    console.log(`  Results count: ${data.Results?.length || 0}\n`);

    if (!data.Results || data.Results.length === 0) {
      console.log('❌ No results returned');
      return;
    }

    // Analyze first result
    const firstResult = data.Results[0];
    console.log('📦 First Result structure:');
    console.log(JSON.stringify(firstResult, null, 2));
    console.log('\n');

    // Analyze Result_id structure
    console.log('📊 Result_id analysis (first 5 results):');
    data.Results.slice(0, 5).forEach((result, idx) => {
      const parts = result.Result_id.split('-');
      console.log(`  ${idx + 1}. Result_id: ${result.Result_id}`);
      console.log(`     Parts: request_id=${parts[0]}, seg=${parts[1]}, idx=${parts[2]}, module=${parts[3]}`);
    });
    console.log('\n');

    // Now test price check with the new Result_id
    const resultId = firstResult.Result_id;
    const requestIdPart = resultId.split('-')[0];
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 Testing Price Check with Result_id:', resultId);
    console.log('   Extracted Request ID part:', requestIdPart);
    console.log('═══════════════════════════════════════════════════════════════\n');

    await testPriceCheck(resultId);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testPriceCheck(resultId) {
  // Try with full Result_id
  const priceCheckBody = [{
    segment_psw_result1: resultId
  }];

  console.log('Price Check Request (full ID):', JSON.stringify(priceCheckBody, null, 2));
  console.log('\n');

  const base = API_URL.replace(/\/+$/, '');
  const endpoint = `${base}/rest/v4/price_check/`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': API_VERSION,
      },
      body: JSON.stringify(priceCheckBody),
    });

    const data = await response.json();

    // Save price check response
    const outputDir = join(__dirname, 'output');
    fs.writeFileSync(join(outputDir, 'v3-price-check-response.json'), JSON.stringify(data, null, 2));
    console.log('✅ Price check response saved to scripts/output/v3-price-check-response.json\n');

    if (!data.success) {
      console.log('❌ Price check failed:', data.message || data);
      
      // Try with just the request ID part (first number before hyphen)
      const requestIdOnly = resultId.split('-')[0];
      console.log('\n🔄 Retrying with just request ID:', requestIdOnly);
      
      const retryBody = [{
        segment_psw_result1: parseInt(requestIdOnly, 10)
      }];
      
      const retryResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'Api-Version': API_VERSION,
        },
        body: JSON.stringify(retryBody),
      });
      
      const retryData = await retryResponse.json();
      fs.writeFileSync(join(outputDir, 'v3-price-check-retry.json'), JSON.stringify(retryData, null, 2));
      console.log('✅ Retry response saved to scripts/output/v3-price-check-retry.json\n');
      
      if (retryData.success) {
        console.log('✅ Price check succeeded with just request ID\n');
        analyzePriceCheckResponse(retryData);
      } else {
        console.log('❌ Retry also failed:', retryData.message || retryData);
      }
      return;
    }

    console.log('✅ Price check succeeded\n');
    analyzePriceCheckResponse(data);

  } catch (error) {
    console.error('❌ Price Check Error:', error.message);
  }
}

function analyzePriceCheckResponse(data) {
  console.log('📋 Price Check Response Analysis:');
  console.log(`  success: ${data.success}`);
  console.log(`  message: ${data.message}`);
  
  const pc = data.priceCheck;
  if (!pc) {
    console.log('  No priceCheck data');
    return;
  }
  
  console.log(`  sessionId: ${pc.sessionId}`);
  console.log(`  psw_result_id: ${pc.psw_result_id}`);
  console.log(`  psc_request_id: ${pc.psc_request_id}`);
  console.log('\n');

  // Check price_data structure for upgrade options
  const priceData = pc.price_data;
  console.log('📊 Price Data (Upgrade Options):');
  
  if (Array.isArray(priceData)) {
    console.log(`  Type: Array with ${priceData.length} options`);
    priceData.forEach((pd, idx) => {
      console.log(`\n  Option ${idx + 1}:`);
      console.log(`    Total: ${pd.Total_Fare?.total}`);
      console.log(`    Brand Name: ${pd.Total_Fare?.Name}`);
      console.log(`    Cabin Class: ${pd.CabinClass}`);
      console.log(`    Baggage: ${JSON.stringify(pd.baggageTxt)}`);
      console.log(`    Pricing breakdown: ${pd.pricingArr?.length} entries`);
    });
  } else if (typeof priceData === 'object' && priceData !== null) {
    const keys = Object.keys(priceData);
    console.log(`  Type: Object with ${keys.length} keys`);
    keys.forEach((key, idx) => {
      const pd = priceData[key];
      console.log(`\n  Option ${key}:`);
      console.log(`    Total: ${pd.Total_Fare?.total}`);
      console.log(`    Brand Name: ${pd.Total_Fare?.Name}`);
      console.log(`    Cabin Class: ${pd.CabinClass}`);
      console.log(`    Baggage: ${JSON.stringify(pd.baggageTxt)}`);
    });
  } else {
    console.log(`  price_data is: ${typeof priceData}`);
  }
  
  // Check baggage info in flight_data
  console.log('\n📦 Baggage in Flight Data:');
  const flights = pc.flight_data?.flights || [];
  flights.forEach((flight, idx) => {
    const link = flight.Link || {};
    console.log(`  Flight ${idx + 1}:`);
    console.log(`    Baggage: ${link.Baggage}`);
    console.log(`    Cabin Class: ${link.CabinClass}`);
    console.log(`    Fare Basis: ${link.FareBasis}`);
  });
}

testV3FlightSearch();
