/**
 * Vyspa API Test Script
 * Tests real Vyspa API connection and data transformation
 * Run with: node scripts/test-vyspa-api.mjs
 */

// Test configuration
const VYSPA_CONFIG = {
  apiUrl: 'https://a1.stagev4.vyspa.net/jsonserver.php',
  credentials: {
    username: 'RemBook',
    password: 'GHR3mPa55',
    token: 'AE8C3HLS04NF7',
  },
};

// Test cases
const TEST_CASES = [
  {
    name: 'NYC (JFK) to London (LHR) - Round Trip',
    params: {
      version: '2',
      departure_airport: 'JFK',
      arrival_airport: 'LHR',
      departure_date: '2025-12-01',
      return_date: '2025-12-08',
      adults: '2',
      children: '0',
      child_ages: [],
      direct_flight_only: '0',
    },
  },
  {
    name: 'London (LHR) to New York (JFK) - One Way',
    params: {
      version: '2',
      departure_airport: 'LHR',
      arrival_airport: 'JFK',
      departure_date: '2025-12-15',
      return_date: '',
      adults: '1',
      children: '0',
      child_ages: [],
      direct_flight_only: '0',
    },
  },
  {
    name: 'London (LHR) to Istanbul (IST) - Round Trip',
    params: {
      version: '2',
      departure_airport: 'LHR',
      arrival_airport: 'IST',
      departure_date: '2025-11-20',
      return_date: '2025-11-27',
      adults: '1',
      children: '1',
      child_ages: ['9'],
      direct_flight_only: '0',
    },
  },
  {
    name: 'Mumbai (BOM) to Delhi (DEL) - Direct Flights Only',
    params: {
      version: '2',
      departure_airport: 'BOM',
      arrival_airport: 'DEL',
      departure_date: '2025-11-25',
      return_date: '',
      adults: '1',
      children: '0',
      child_ages: [],
      direct_flight_only: '1',
    },
  },
];

/**
 * Call Vyspa API
 */
async function callVyspaApi(params) {
  const formData = new URLSearchParams({
    username: VYSPA_CONFIG.credentials.username,
    password: VYSPA_CONFIG.credentials.password,
    token: VYSPA_CONFIG.credentials.token,
    method: 'flights_availability_search',
    params: JSON.stringify([params]),
  });

  console.log('\n📤 API Request:', {
    url: VYSPA_CONFIG.apiUrl,
    route: `${params.departure_airport} → ${params.arrival_airport}`,
    departure: params.departure_date,
    return: params.return_date || 'One Way',
    passengers: `${params.adults} adults, ${params.children} children`,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(VYSPA_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Analyze API response
 */
function analyzeResponse(data, testName) {
  console.log(`\n📊 Results for: ${testName}`);
  console.log('━'.repeat(60));

  if (data.error) {
    console.log('❌ API Error:', data.error);
    return false;
  }

  if (!data.Results || data.Results.length === 0) {
    console.log('⚠️  No flights found');
    return false;
  }

  console.log(`✅ Found ${data.Results.length} flights`);

  // Analyze first flight
  const firstFlight = data.Results[0];
  console.log('\n📋 First Flight Details:');
  console.log(`   Fare ID: ${firstFlight.Result_id}`);
  console.log(`   Total Price: ${firstFlight.Total} ${firstFlight.currency_code}`);
  console.log(`   Segments: ${firstFlight.Segments.length}`);

  // Analyze first segment
  const firstSegment = firstFlight.Segments[0];
  console.log(`\n🛫 First Segment:`);
  console.log(`   Route: ${firstSegment.Route}`);
  console.log(`   Duration: ${firstSegment.FlyingTime} minutes`);
  console.log(`   Stops: ${firstSegment.Stops}`);
  console.log(`   Flights in segment: ${firstSegment.Flights.length}`);

  // Analyze first flight in segment
  const flight = firstSegment.Flights[0];
  console.log(`\n✈️  Flight Details:`);
  console.log(`   Airline: ${flight.airline_name} (${flight.airline_code})`);
  console.log(`   Flight: ${flight.flight_number}`);
  console.log(`   Departure: ${flight.departure_airport} at ${flight.departure_time}`);
  console.log(`   Arrival: ${flight.arrival_airport} at ${flight.arrival_time}`);
  console.log(`   Date: ${flight.departure_date}`);
  console.log(`   Class: ${flight.cabin_class}`);

  // Price breakdown
  if (firstFlight.Breakdown && firstFlight.Breakdown.length > 0) {
    console.log(`\n💰 Price Breakdown:`);
    firstFlight.Breakdown.forEach(b => {
      console.log(`   ${b.pax_type}: ${b.total_pax} × ${b.total} = ${b.total} ${firstFlight.currency_code}`);
    });
  }

  // Statistics
  const prices = data.Results.map(r => parseFloat(r.Total));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  console.log(`\n📈 Price Statistics:`);
  console.log(`   Min: ${minPrice.toFixed(2)} ${firstFlight.currency_code}`);
  console.log(`   Max: ${maxPrice.toFixed(2)} ${firstFlight.currency_code}`);
  console.log(`   Avg: ${avgPrice.toFixed(2)} ${firstFlight.currency_code}`);

  // Airlines
  const airlines = new Set();
  data.Results.forEach(r => {
    r.Segments.forEach(s => {
      s.Flights.forEach(f => airlines.add(`${f.airline_name} (${f.airline_code})`));
    });
  });
  console.log(`\n🏢 Airlines: ${Array.from(airlines).join(', ')}`);

  return true;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Vyspa API Test Suite');
  console.log('═'.repeat(60));

  const results = {
    total: TEST_CASES.length,
    passed: 0,
    failed: 0,
    errors: [],
  };

  for (const testCase of TEST_CASES) {
    try {
      const data = await callVyspaApi(testCase.params);
      const success = analyzeResponse(data, testCase.name);

      if (success) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push({ test: testCase.name, error: 'No results' });
      }

      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.failed++;
      results.errors.push({ test: testCase.name, error: error.message });
      console.log(`\n❌ Test failed: ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.errors.forEach(e => {
      console.log(`   - ${e.test}: ${e.error}`);
    });
  }

  console.log('\n' + '═'.repeat(60));
  console.log(results.passed === results.total ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
  console.log('═'.repeat(60));

  return results.passed === results.total;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
