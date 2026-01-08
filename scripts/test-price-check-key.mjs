/**
 * Test script to verify price check with direct key parameter
 * Tests the flow: search -> get flightKey -> price check with key directly
 */

const VYSPA_API_URL = process.env.VYSPA_API_URL || 'https://a1.stagev4.vyspa.net/anon.php';
const VYSPA_USERNAME = process.env.VYSPA_USERNAME || 'RemBook';
const VYSPA_PASSWORD = process.env.VYSPA_PASSWORD || 'GHR3mPa55';
const VYSPA_API_VERSION = process.env.VYSPA_API_VERSION || '1';

async function main() {
  console.log('🧪 Testing Price Check with Direct Key Parameter\n');
  console.log('='.repeat(60));

  // Step 1: Search for flights LHR -> DXB
  console.log('\n📍 Step 1: Searching for flights LHR -> DXB...');
  
  const searchParams = {
    version: '3',  // Search version in params
    departure_airport: 'LHR',
    arrival_airport: 'DXB',
    departure_date: '2026-01-21',
    return_date: '2026-01-28',
    adults: '2',
    children: '1',
    infants: '0',
    direct_flight_only: '0',
    cabin_class: 'M',
  };

  const basicAuth = Buffer.from(`${VYSPA_USERNAME}:${VYSPA_PASSWORD}`).toString('base64');
  
  console.log(`   API URL: ${VYSPA_API_URL}`);
  console.log(`   Username: ${VYSPA_USERNAME}`);
  console.log(`   API Version header: ${VYSPA_API_VERSION}`);
  
  const searchResponse = await fetch(`${VYSPA_API_URL}/rest/v4/flights_availability_search/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Api-Version': VYSPA_API_VERSION,
    },
    body: JSON.stringify([searchParams]),
  });

  if (!searchResponse.ok) {
    console.error('❌ Search failed:', searchResponse.status, searchResponse.statusText);
    const text = await searchResponse.text();
    console.error('Response:', text.substring(0, 500));
    return;
  }

  const searchData = await searchResponse.json();
  
  if (!searchData.Results || searchData.Results.length === 0) {
    console.error('❌ No search results found');
    return;
  }

  console.log(`✅ Found ${searchData.Results.length} flight results`);
  console.log(`   Request_id: ${searchData.Request_id}`);

  // Get first result with a Deep_link
  const firstResult = searchData.Results.find(r => r.Deep_link);
  
  if (!firstResult) {
    console.error('❌ No results with Deep_link found');
    return;
  }

  console.log(`\n📍 First result:`);
  console.log(`   Result_id: ${firstResult.Result_id}`);
  console.log(`   Total: ${firstResult.Total} ${firstResult.Currency_code}`);
  console.log(`   Deep_link: ${firstResult.Deep_link?.substring(0, 80)}...`);

  // Extract flight key from Deep_link
  const flightKeyMatch = firstResult.Deep_link?.match(/flight=([^&"]+)/);
  const flightKey = flightKeyMatch ? flightKeyMatch[1] : null;

  if (!flightKey) {
    console.error('❌ Could not extract flight key from Deep_link');
    return;
  }

  console.log(`\n📍 Step 2: Extracted flight key`);
  console.log(`   Key: ${flightKey.substring(0, 40)}...`);

  // Step 3: Call price check with direct key parameter
  console.log('\n📍 Step 3: Calling price check with direct key parameter...');
  
  const priceCheckRequest = [{ key: flightKey }];
  
  console.log(`   Request body: ${JSON.stringify(priceCheckRequest)}`);

  const priceCheckResponse = await fetch(`${VYSPA_API_URL}/rest/v4/price_check/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Api-Version': '4.0',
    },
    body: JSON.stringify(priceCheckRequest),
  });

  console.log(`   Response status: ${priceCheckResponse.status}`);

  const priceCheckText = await priceCheckResponse.text();
  
  let priceCheckData;
  try {
    priceCheckData = JSON.parse(priceCheckText);
  } catch (e) {
    console.error('❌ Failed to parse price check response');
    console.error('   Raw response:', priceCheckText.substring(0, 500));
    return;
  }

  if (!priceCheckResponse.ok) {
    console.error('❌ Price check failed');
    console.error('   Response:', JSON.stringify(priceCheckData, null, 2).substring(0, 500));
    return;
  }

  console.log('✅ Price check successful!');
  console.log(`   Success: ${priceCheckData.success}`);
  console.log(`   Message: ${priceCheckData.message}`);
  
  if (priceCheckData.priceCheck) {
    const pc = priceCheckData.priceCheck;
    console.log(`   Session ID: ${pc.sessionId}`);
    console.log(`   PSW Result ID: ${pc.psw_result_id}`);
    console.log(`   GDS: ${pc.gds}`);
    console.log(`   Choose Supplier: ${pc.ChooseSupplier}`);
    
    if (pc.flight_data?.result?.FlightPswResult) {
      const fr = pc.flight_data.result.FlightPswResult;
      console.log(`\n   Flight Details:`);
      console.log(`     Origin: ${fr.Origin}`);
      console.log(`     Destination: ${fr.Destination}`);
      console.log(`     Total Fare: ${fr.total_fare} ${fr.iso_currency_code}`);
      console.log(`     Refundable: ${fr.refundable}`);
    }

    // Check price_data for OptionalService
    if (pc.price_data) {
      const priceDataArray = Array.isArray(pc.price_data) ? pc.price_data : Object.values(pc.price_data);
      if (priceDataArray.length > 0) {
        const firstOption = priceDataArray[0];
        console.log(`\n   Price Options: ${priceDataArray.length}`);
        console.log(`   First option total: ${firstOption.Total_Fare?.total}`);
        
        // Check OptionalService for fare rules
        const optionalServices = firstOption.Total_Fare?.OptionalService || [];
        if (optionalServices.length > 0) {
          console.log(`\n   OptionalService items (${optionalServices.length}):`);
          for (const svc of optionalServices.slice(0, 5)) {
            console.log(`     - Tag: ${svc.Tag}, Type: ${svc.Type}, Chargeable: ${svc.Chargeable}`);
            if (svc.text) console.log(`       Text: ${svc.text}`);
          }
          if (optionalServices.length > 5) {
            console.log(`     ... and ${optionalServices.length - 5} more`);
          }
        }

        // Check passenger breakdown
        const pricingArr = firstOption.pricingArr || [];
        if (pricingArr.length > 0) {
          console.log(`\n   Passenger Breakdown (${pricingArr.length} types):`);
          for (const pax of pricingArr) {
            console.log(`     - ${pax.paxtype}: ${pax.passengers} pax, Base: ${pax.base}, Tax: ${pax.tax}, Total: ${pax.total}`);
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed successfully!');
  console.log('   The price check API accepts the key parameter directly.');
}

main().catch(console.error);

