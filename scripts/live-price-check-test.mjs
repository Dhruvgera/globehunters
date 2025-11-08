/**
 * Live API test: Call actual Vyspa price check endpoint
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local
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

console.log('🧪 LIVE VYSPA PRICE CHECK API TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

const segmentId = process.argv[2] || '251495544';
console.log(`Using Segment ID: ${segmentId}`);
console.log(`API URL: ${VYSPA_API_URL}\n`);

const basicAuth = Buffer.from(`${VYSPA_USERNAME}:${VYSPA_PASSWORD}`).toString('base64');

async function callPriceCheck() {
  const requestBody = [{
    segment_psw_result1: parseInt(segmentId)
  }];

  console.log('📤 Making API request...');
  console.log(`  URL: ${VYSPA_API_URL}/rest/v4/price_check/`);
  console.log(`  Body: ${JSON.stringify(requestBody)}\n`);

  try {
    const response = await fetch(`${VYSPA_API_URL}/rest/v4/price_check/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': '1',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 Response Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Save response
    const outputPath = join(__dirname, 'output', 'live-price-check.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved response to: ${outputPath}\n`);

    if (!data.success || !data.priceCheck) {
      console.error('❌ Invalid response structure');
      return;
    }

    const priceData = data.priceCheck.price_data || [];
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ PRICE CHECK SUCCESS: ${priceData.length} fare options`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    priceData.forEach((option, index) => {
      const totalFare = option.Total_Fare || {};
      const pricingArr = option.pricingArr || [];
      const baggageTxt = option.baggageTxt || {};
      const brandInfo = option.BrandInfo || [];

      console.log(`\n📋 OPTION ${index + 1}:`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log(`Total_Fare.Name: "${totalFare.Name || 'MISSING'}"`);
      console.log(`Total_Fare.total: ${totalFare.total} USD`);
      console.log(`pricingArr[0].CabinClass: ${pricingArr[0]?.CabinClass || 'MISSING'}`);
      console.log(`pricingArr[0].BookingCode: ${pricingArr[0]?.BookingCode || 'MISSING'}`);
      console.log(`BrandInfo[0].BrandName: ${brandInfo[0]?.BrandName || 'MISSING'}`);
      console.log(`BrandInfo[0].CabinName: ${brandInfo[0]?.CabinName || 'MISSING'}`);
      
      const routes = Object.keys(baggageTxt);
      if (routes.length > 0) {
        const baggageInfo = baggageTxt[routes[0]]?.ADT || 'MISSING';
        console.log(`baggageTxt: ${baggageInfo}`);
      } else {
        console.log(`baggageTxt: MISSING`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETED SUCCESSFULLY');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

callPriceCheck();

