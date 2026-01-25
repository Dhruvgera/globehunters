/**
 * HotelBeds API Credential Test Script
 * 
 * Tests the provided HotelBeds API credentials by making a simple status/availability call.
 * 
 * Usage:
 *   node scripts/test-hotelbeds-api.mjs
 * 
 * The credentials are from the support ticket:
 *   API Key: ad19f67279e9f276455497650dd4f779
 *   Secret: (needs to be retrieved from https://developer.hotelbeds.com/login)
 */

import crypto from 'crypto';

// HotelBeds API credentials from Shekhar
const API_KEY = '5435c13882fe02b74beb1dab243813e6';
const API_SECRET = process.env.HOTELBEDS_SECRET || 'a114a6be49';

// API endpoints (Production)
const API_BASE_URL = 'https://api.hotelbeds.com';
const CONTENT_API_BASE_URL = 'https://api.hotelbeds.com/hotel-content-api/1.0';

/**
 * Generate the X-Signature header for HotelBeds API
 * Signature = SHA256(ApiKey + Secret + Timestamp)
 */
function generateSignature() {
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureRaw = `${API_KEY}${API_SECRET}${timestamp}`;
  const signature = crypto.createHash('sha256').update(signatureRaw).digest('hex');
  return signature;
}

/**
 * Make a request to HotelBeds API
 */
async function makeRequest(endpoint, method = 'GET', body = null) {
  const signature = generateSignature();
  
  const headers = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'Api-key': API_KEY,
    'X-Signature': signature,
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`\n🔗 Request: ${method} ${API_BASE_URL}${endpoint}`);
  console.log('📋 Headers:', {
    'Api-key': API_KEY,
    'X-Signature': signature.substring(0, 20) + '...',
  });

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const text = await response.text();
  
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    json,
  };
}

/**
 * Test 1: Get API Status
 */
async function testStatus() {
  console.log('\n========================================');
  console.log('TEST 1: API Status Check');
  console.log('========================================');
  
  const result = await makeRequest('/hotel-api/1.0/status');
  console.log(`✅ Status: ${result.status} ${result.statusText}`);
  console.log('📄 Response:', JSON.stringify(result.json, null, 2));
  return result;
}

/**
 * Test 2: Hotel Availability Search (by geolocation - London center)
 */
async function testAvailability() {
  console.log('\n========================================');
  console.log('TEST 2: Hotel Availability Search (London - Geolocation)');
  console.log('========================================');

  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30); // 30 days from now
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2); // 2 nights

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Search by geolocation (London center coordinates)
  const payload = {
    stay: {
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
    },
    occupancies: [
      {
        rooms: 1,
        adults: 2,
        children: 0,
      },
    ],
    geolocation: {
      latitude: 51.5074,   // London latitude
      longitude: -0.1278,  // London longitude
      radius: 20,          // 20 km radius
      unit: 'km',
    },
  };

  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  const result = await makeRequest('/hotel-api/1.0/hotels', 'POST', payload);
  console.log(`✅ Status: ${result.status} ${result.statusText}`);
  
  if (result.ok && result.json?.hotels?.hotels) {
    const hotels = result.json.hotels.hotels;
    console.log(`🏨 Found ${hotels.length} hotels`);
    if (hotels.length > 0) {
      console.log('\n📍 First 5 hotels:');
      hotels.slice(0, 5).forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.name} (${h.code}) - ${h.categoryName}`);
        if (h.minRate) {
          console.log(`     💰 From ${h.currency} ${h.minRate}`);
        }
      });
    }
  } else {
    console.log('📄 Response:', JSON.stringify(result.json, null, 2));
  }
  
  return result;
}

/**
 * Test 3: Hotel Availability by specific hotel codes
 */
async function testAvailabilityByHotel() {
  console.log('\n========================================');
  console.log('TEST 3: Hotel Availability (Specific Hotels)');
  console.log('========================================');

  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Search by specific hotel codes (some popular London hotels)
  const payload = {
    stay: {
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
    },
    occupancies: [
      {
        rooms: 1,
        adults: 2,
        children: 0,
      },
    ],
    hotels: {
      hotel: [77795, 77796, 77797, 229318, 229319], // Sample hotel codes
    },
  };

  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  const result = await makeRequest('/hotel-api/1.0/hotels', 'POST', payload);
  console.log(`✅ Status: ${result.status} ${result.statusText}`);
  
  if (result.ok && result.json?.hotels?.hotels) {
    const hotels = result.json.hotels.hotels;
    console.log(`🏨 Found ${hotels.length} hotels with availability`);
    if (hotels.length > 0) {
      console.log('\n📍 Hotels:');
      hotels.forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.name} (${h.code}) - ${h.categoryName}`);
        if (h.minRate) {
          console.log(`     💰 From ${h.currency} ${h.minRate}`);
        }
        if (h.rooms && h.rooms.length > 0) {
          console.log(`     🛏️  ${h.rooms.length} room type(s) available`);
        }
      });
    }
  } else {
    console.log('📄 Response:', JSON.stringify(result.json, null, 2));
  }
  
  return result;
}

/**
 * Main test runner
 */
async function main() {
  console.log('🔐 HotelBeds API Credential Test');
  console.log('================================');
  console.log(`API Key: ${API_KEY}`);
  console.log(`API Secret: ${API_SECRET ? '****' + API_SECRET.slice(-4) : '❌ NOT SET'}`);
  console.log(`API Base URL: ${API_BASE_URL}`);

  if (!API_SECRET) {
    console.log('\n⚠️  WARNING: API_SECRET is not set!');
    console.log('To set it, run:');
    console.log('  export HOTELBEDS_SECRET="your-secret-key-here"');
    console.log('\nYou can get the secret key from: https://developer.hotelbeds.com/login');
    console.log('Note: Secret keys are only visible for 14 days after creation.');
    console.log('\nContinuing test anyway (will likely fail)...');
  }

  try {
    // Test 1: Status
    const statusResult = await testStatus();
    
    if (!statusResult.ok) {
      console.log('\n❌ Status check failed. Possible reasons:');
      console.log('  - Invalid API Key');
      console.log('  - Invalid or missing Secret Key');
      console.log('  - API credentials not activated yet');
      console.log('  - Network/firewall issues');
      
      if (statusResult.json?.error) {
        console.log('\n🔍 Error details:', statusResult.json.error);
      }
      return;
    }

    // Test 2: Availability by geolocation
    const geoResult = await testAvailability();
    
    // Test 3: Availability by hotel codes (if geolocation doesn't work)
    if (!geoResult.ok) {
      await testAvailabilityByHotel();
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }

  console.log('\n================================');
  console.log('Test completed.');
}

main();
