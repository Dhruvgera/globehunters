/**
 * Globehunters REST v4 API Test Script
 * Tests new flights_availability_search endpoint compatibility with existing transformers
 * Run with: node scripts/test-globehunters-api.mjs
 */

const CONFIG = {
  apiUrl: process.env.VYSPA_API_URL || 'https://api.globehunters.com',
  apiVersion: process.env.VYSPA_API_VERSION || '1',
  username: process.env.VYSPA_USERNAME || '',
  password: process.env.VYSPA_PASSWORD || '',
  basicAuthB64: process.env.GH_BASIC_AUTH_B64 || '', // optional: provide pre-encoded basic auth
};

function getAuthHeader() {
  if (CONFIG.basicAuthB64) {
    return `Basic ${CONFIG.basicAuthB64}`;
  }
  if (!CONFIG.username || !CONFIG.password) {
    throw new Error('Missing VYSPA_USERNAME/VYSPA_PASSWORD or GH_BASIC_AUTH_B64 for Basic auth');
  }
  const b64 = Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64');
  return `Basic ${b64}`;
}

// Test cases (includes the user-provided example)
const TEST_CASES = [
  {
    name: 'NYC to LHR - Round Trip (user sample)',
    body: [{
      version: '2',
      departure_airport: 'NYC',
      arrival_airport: 'LHR',
      departure_date: '2025-11-19',
      return_date: '2025-12-12',
      adults: '1',
      children: '0',
      child_ages: [],
      infants: '0',
      direct_flight_only: '0',
      cabin_class: 'M',
      inbound_cabin_class: 'M',
      limit: 20,
      page: 1,
    }],
  },
  {
    name: 'LHR to JFK - One Way',
    body: [{
      version: '2',
      departure_airport: 'LHR',
      arrival_airport: 'JFK',
      departure_date: '2025-12-15',
      return_date: '',
      adults: '1',
      children: '0',
      child_ages: [],
      direct_flight_only: '0',
    }],
  },
];

function buildFlightsUrl() {
  const base = CONFIG.apiUrl.replace(/\/+$/, '');
  return `${base}/rest/v4/flights_availability_search/`;
}

async function callGhApi(body) {
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

function analyzeResponse(data, testName) {
  console.log(`\n📊 Results for: ${testName}`);
  console.log('━'.repeat(60));

  if (data.error) {
    console.log('❌ API Error:', data.error);
    return false;
  }
  if (!data.Results || !Array.isArray(data.Results)) {
    console.log('❌ Incompatible shape: missing Results[]');
    return false;
  }
  if (data.Results.length === 0) {
    console.log('⚠️  No flights found');
    return false;
  }

  const r = data.Results[0];
  const hasCore =
    typeof r.Result_id !== 'undefined' &&
    typeof r.Total !== 'undefined' &&
    typeof r.currency_code !== 'undefined' &&
    Array.isArray(r.Segments) &&
    r.Segments.length > 0 &&
    r.Segments[0].Route &&
    Array.isArray(r.Segments[0].Flights) &&
    r.Segments[0].Flights.length > 0;

  if (!hasCore) {
    console.log('❌ Incompatible shape: missing expected Vyspa fields');
    console.dir(r, { depth: 3 });
    return false;
  }

  console.log(`✅ Looks compatible. ${data.Results.length} results`);
  console.log(`   First Fare ID: ${r.Result_id}, Total: ${r.Total} ${r.currency_code}`);
  return true;
}

async function run() {
  console.log('🚀 Globehunters REST v4 API Test');
  console.log('═'.repeat(60));
  console.log('Base URL:', CONFIG.apiUrl);

  const results = { total: TEST_CASES.length, passed: 0, failed: 0 };

  for (const t of TEST_CASES) {
    try {
      const data = await callGhApi(t.body);
      const ok = analyzeResponse(data, t.name);
      if (ok) results.passed++; else results.failed++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      results.failed++;
      console.log(`\n❌ Test failed: ${t.name}`);
      console.log(`   Error: ${e.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  process.exit(results.failed === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


