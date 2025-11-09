#!/usr/bin/env node
/**
 * Test script for Vyspa Price Check API endpoint
 * 
 * This script tests the price_check endpoint to verify:
 * - API connectivity and authentication
 * - Response structure and data
 * - Upgrade options availability
 * - Passenger pricing breakdown
 * - Baggage information
 * 
 * Usage: node scripts/test-price-check-api.mjs
 */

import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
const ENV_PATH = path.resolve(process.cwd(), '.env.local');

async function loadEnv() {
  try {
    const envContent = await fs.readFile(ENV_PATH, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    process.exit(1);
  }
}

/**
 * Make API request to price check endpoint
 */
async function priceCheck(baseUrl, username, password, segmentResultId) {
  return new Promise((resolve, reject) => {
    const apiUrl = baseUrl.replace(/\/+$/, '');
    const endpoint = '/rest/v4/price_check/';
    const fullUrl = `${apiUrl}${endpoint}`;
    
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    const requestBody = JSON.stringify([{
      segment_psw_result1: segmentResultId
    }]);
    
    console.log('🔍 Price Check API Request:');
    console.log('  URL:', fullUrl);
    console.log('  Method: POST');
    console.log('  Segment ID:', segmentResultId);
    console.log('  Body:', requestBody);
    console.log('');
    
    const urlObj = new URL(fullUrl);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': '1',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 API Response Status:', res.statusCode);
        console.log('📥 Response Headers:', JSON.stringify(res.headers, null, 2));
        console.log('');
        
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Set timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(requestBody);
    req.end();
  });
}

/**
 * Analyze price check response structure
 */
function analyzeResponse(response) {
  console.log('📊 RESPONSE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const { data } = response;
  
  if (!data || typeof data !== 'object') {
    console.log('❌ Invalid response data structure');
    return;
  }
  
  // Check main structure
  console.log('✅ Main Structure:');
  console.log('  - success:', data.success);
  console.log('  - message:', data.message);
  console.log('  - has priceCheck:', !!data.priceCheck);
  console.log('');
  
  if (!data.priceCheck) {
    console.log('❌ No priceCheck data found');
    return;
  }
  
  const pc = data.priceCheck;
  
  // Flight data
  if (pc.flight_data?.result?.FlightPswResult) {
    const flightResult = pc.flight_data.result.FlightPswResult;
    console.log('✅ Flight Result:');
    console.log('  - ID:', flightResult.id);
    console.log('  - PSC Request ID:', flightResult.psc_request_id);
    console.log('  - Route:', `${flightResult.Origin} → ${flightResult.Destination}`);
    console.log('  - Base Fare:', flightResult.base_fare, flightResult.iso_currency_code);
    console.log('  - Tax:', flightResult.tax, flightResult.iso_currency_code);
    console.log('  - Total Fare:', flightResult.total_fare, flightResult.iso_currency_code);
    console.log('  - Fare Type:', flightResult.fare_type);
    console.log('  - Fare Category:', flightResult.FareCat);
    console.log('  - Validating Carrier:', flightResult.validating_carrier);
    console.log('  - Last Ticket Date:', flightResult.last_ticket_date);
    console.log('  - Flight Count:', flightResult.flight_count);
    console.log('  - Trip Count:', flightResult.trip_count);
    console.log('  - Refundable:', flightResult.refundable);
    console.log('  - Available Seats:', flightResult.avlSeats);
    console.log('');
  }
  
  // Flight segments
  if (pc.flight_data?.flights && Array.isArray(pc.flight_data.flights)) {
    console.log('✅ Flight Segments:', pc.flight_data.flights.length, 'segments');
    pc.flight_data.flights.forEach((flight, idx) => {
      const f = flight.FlightPswFlightnew;
      const link = flight.Link;
      console.log(`  Segment ${idx + 1}:`);
      console.log('    - Flight:', `${f.airline_code}${f.flight_number}`);
      console.log('    - Route:', `${f.departure_airport} → ${f.arrival_airport}`);
      console.log('    - Date:', f.flight_date, `(${f.flight_day})`);
      console.log('    - Time:', `${f.departure_time} → ${f.arrival_time}`);
      console.log('    - Travel Time:', f.travel_time, 'minutes');
      console.log('    - Aircraft:', f.aircraft_type);
      console.log('    - Cabin Class:', link?.CabinClass);
      console.log('    - Fare Basis:', link?.FareBasis);
      console.log('    - Baggage:', link?.Baggage);
      console.log('');
    });
  }
  
  // Price data (upgrade options)
  if (pc.price_data && Array.isArray(pc.price_data) && pc.price_data.length > 0) {
    console.log('✅ Price Data (Potential Upgrade Options):', pc.price_data.length, 'option(s)');
    pc.price_data.forEach((priceOption, idx) => {
      console.log(`  Option ${idx + 1}:`);
      
      if (priceOption.pricingArr && Array.isArray(priceOption.pricingArr)) {
        console.log('    Passenger Breakdown:');
        priceOption.pricingArr.forEach(pax => {
          console.log(`      - ${pax.paxtype} (${pax.passengers} pax):`, {
            base: `${pax.base} ${pax.base_cur}`,
            tax: `${pax.tax} ${pax.sellcurr}`,
            gross: `${pax.gross} ${pax.sellcurr}`,
            total: `${pax.total} ${pax.sellcurr}`,
          });
        });
      }
      
      if (priceOption.Total_Fare) {
        console.log('    Total Fare:');
        console.log('      - Base:', priceOption.Total_Fare.base, priceOption.Total_Fare.basecurr);
        console.log('      - Tax:', priceOption.Total_Fare.tax, priceOption.Total_Fare.taxcurr);
        console.log('      - Total:', priceOption.Total_Fare.total, priceOption.Total_Fare.sellcurr);
        console.log('      - Markup:', priceOption.Total_Fare.markup);
        console.log('      - Commission:', priceOption.Total_Fare.comm);
        console.log('      - ATOL Fee:', priceOption.Total_Fare.Atol_fee);
        console.log('      - Cabin Class:', priceOption.CabinClass || priceOption.Total_Fare.CabinClass);
        console.log('      - Booking Code:', priceOption.BookingCode || priceOption.Total_Fare.BookingCode);
      }
      
      // Baggage information
      if (priceOption.baggageTxt && Array.isArray(priceOption.baggageTxt) && priceOption.baggageTxt.length > 0) {
        console.log('    Baggage Info: Available (', priceOption.baggageTxt[0].substring(0, 100), '...)');
      }
      
      console.log('');
    });
  } else {
    console.log('⚠️  No price_data array found (no upgrade options available)');
    console.log('');
  }
  
  // Passengers
  if (pc.passengers && Array.isArray(pc.passengers)) {
    console.log('✅ Passenger Data:', pc.passengers.length, 'passenger(s)');
  }
  
  // Session info
  console.log('✅ Session Information:');
  console.log('  - Session ID:', pc.sessionId);
  console.log('  - PSC Request ID:', pc.psc_request_id);
  console.log('  - PSW Result ID:', pc.psw_result_id);
  console.log('  - GDS:', pc.gds);
  console.log('  - File Type:', pc.filetype);
  console.log('');
}

/**
 * Save response to file for inspection
 */
async function saveResponse(response) {
  const outputDir = path.resolve(process.cwd(), 'scripts', 'output');
  const outputFile = path.join(outputDir, 'price-check-response.json');
  
  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(
      outputFile,
      JSON.stringify(response, null, 2),
      'utf8'
    );
    console.log('💾 Response saved to:', outputFile);
    console.log('');
  } catch (error) {
    console.error('❌ Error saving response:', error.message);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 VYSPA PRICE CHECK API TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Load environment
  const env = await loadEnv();
  const apiUrl = env.VYSPA_API_URL;
  const username = env.VYSPA_USERNAME;
  const password = env.VYSPA_PASSWORD;
  
  if (!apiUrl || !username || !password) {
    console.error('❌ Missing required environment variables:');
    console.error('  - VYSPA_API_URL:', !!apiUrl);
    console.error('  - VYSPA_USERNAME:', !!username);
    console.error('  - VYSPA_PASSWORD:', !!password);
    process.exit(1);
  }
  
  console.log('✅ Environment loaded:');
  console.log('  - API URL:', apiUrl);
  console.log('  - Username:', username);
  console.log('');
  
  // Example segment result ID - you should replace this with a real one
  // from a flight search response
  const segmentResultId = process.argv[2] || '630977135';
  
  console.log('⚠️  NOTE: Using segment result ID:', segmentResultId);
  console.log('⚠️  If this ID is invalid, the test may fail.');
  console.log('⚠️  Run a flight search first to get a valid Result_id.');
  console.log('');
  
  try {
    // Make API call
    const response = await priceCheck(apiUrl, username, password, segmentResultId);
    
    // Save response
    await saveResponse(response);
    
    // Analyze response
    analyzeResponse(response);
    
    console.log('✅ Test completed successfully!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();


