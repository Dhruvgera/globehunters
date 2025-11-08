/**
 * Multi Price Check Runner
 * - Runs a flight search
 * - Takes top N segment IDs
 * - Executes price_check for each
 * - Summarizes upgrade options/cabin classes found
 *
 * Usage:
 *   node scripts/multi-price-check.mjs [N=10]
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local (non-interactive)
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
  return envVars;
}

const env = loadEnv();
const VYSPA_API_URL = (env.VYSPA_API_URL || '').replace(/\/+$/, '');
const VYSPA_USERNAME = env.VYSPA_USERNAME || '';
const VYSPA_PASSWORD = env.VYSPA_PASSWORD || '';
const basicAuth = Buffer.from(`${VYSPA_USERNAME}:${VYSPA_PASSWORD}`).toString('base64');

if (!VYSPA_API_URL || !VYSPA_USERNAME || !VYSPA_PASSWORD) {
  console.error('❌ Missing environment variables (VYSPA_API_URL/VYSPA_USERNAME/VYSPA_PASSWORD)');
  process.exit(1);
}

const TOP_N = parseInt(process.argv[2] || '10', 10);

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function flightSearch() {
  // Use flights_availability_search
  const searchBody = [{
    version: '2',
    departure_airport: 'JFK',
    arrival_airport: 'LHR',
    departure_date: '2025-11-30',
    return_date: '2025-12-04',
    adults: '2',
    children: '1',
    child_ages: ['9'],
    direct_flight_only: '0',
  }];

  const res = await fetch(`${VYSPA_API_URL}/rest/v4/flights_availability_search/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Api-Version': '1',
    },
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    throw new Error(`Search HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function priceCheck(segmentId) {
  const body = [{ segment_psw_result1: parseInt(String(segmentId), 10) }];
  const res = await fetch(`${VYSPA_API_URL}/rest/v4/price_check/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Api-Version': '1',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PriceCheck ${segmentId} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  console.log('🧪 MULTI PRICE CHECK RUNNER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const searchData = await flightSearch();
  const results = Array.isArray(searchData?.Results) ? searchData.Results : [];
  console.log(`🔍 Found ${results.length} search results`);

  const take = Math.min(TOP_N, results.length);
  const segmentIds = results.slice(0, take).map((r) => r.Result_id);
  console.log(`🧾 Testing top ${take} segment IDs\n`);

  const summary = [];

  for (let i = 0; i < segmentIds.length; i++) {
    const segId = segmentIds[i];
    try {
      console.log(`💰 [${i + 1}/${take}] Price check for segment ${segId}`);
      const pcData = await priceCheck(segId);
      const priceData = pcData?.priceCheck?.price_data || [];

      const cabins = new Set();
      const brands = new Set();
      for (const option of priceData) {
        const totalFare = option?.Total_Fare || {};
        const pricingArr = option?.pricingArr || [];
        const cabin = pricingArr[0]?.CabinClass || option?.BrandInfo?.[0]?.cabinCode || totalFare.CabinClass || '';
        const brand = totalFare.Name || option?.BrandInfo?.[0]?.BrandName || '';
        if (cabin) cabins.add(String(cabin));
        if (brand) brands.add(String(brand));
      }

      console.log(`   ➤ Options: ${priceData.length}, Cabins: ${Array.from(cabins).join(', ') || 'N/A'}`);

      summary.push({
        segmentId: segId,
        options: priceData.length,
        cabins: Array.from(cabins),
        brands: Array.from(brands),
      });

      // Be gentle to API
      await delay(300);
    } catch (err) {
      console.log(`   ✖ Failed: ${err.message}`);
      summary.push({
        segmentId: segId,
        error: err.message,
      });
    }
  }

  const outDir = join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'multi-price-check-summary.json');
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2));
  console.log(`\n💾 Summary saved to: ${outFile}`);
  console.log('✅ Done');
}

main().catch((e) => {
  console.error('❌ Runner failed:', e);
  process.exit(1);
});


