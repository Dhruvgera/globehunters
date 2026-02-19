/**
 * Test script for the non-V3 accommodationAvailability endpoint.
 * 
 * This endpoint supports:
 * - supplier_id: 100 (HotelBeds only) or omit for all suppliers
 * - limit: pagination
 * - adult_room / children_room: array format for occupancy
 * - filters: { sort_by, meal_code, hotel_rating }
 *
 * Usage:
 *   node scripts/test-accommodation-availability.mjs "london" 2026-05-07 2026-05-09
 *   node scripts/test-accommodation-availability.mjs "dubai" 2026-05-07 2026-05-09 --hotelbeds-only
 */

import fs from 'fs';
import path from 'path';
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
Object.assign(process.env, envVars);

function requireEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

function baseUrl() {
  return requireEnv('VYSPA_API_URL').replace(/\/+$/, '');
}

function basicAuth() {
  const user = requireEnv('VYSPA_USERNAME');
  const pass = requireEnv('VYSPA_PASSWORD');
  const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
  return `Basic ${b64}`;
}

async function post(endpoint, payload) {
  const url = `${baseUrl()}${endpoint}`;
  console.log(`POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(),
      'Api-Version': process.env.VYSPA_API_VERSION || '1',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function pickCity(items, q) {
  if (!Array.isArray(items)) return null;
  const query = String(q || '').trim().toLowerCase();
  const cities = items.filter((x) => String(x?.loc).toLowerCase() === 'city');
  const normCountry = (x) => String(x?.country || x?.country_name || '').trim().toLowerCase();
  const normLabel = (x) => String(x?.label || '').trim().toLowerCase();

  const exactUk = cities.find((x) => normLabel(x) === query && normCountry(x).includes('united kingdom'));
  if (exactUk) return exactUk;

  const anyUk = cities.find((x) => normCountry(x).includes('united kingdom'));
  if (anyUk) return anyUk;

  const exact = cities.find((x) => normLabel(x) === query);
  if (exact) return exact;

  return cities[0] || items[0] || null;
}

async function main() {
  const q = (process.argv[2] || 'london').trim();
  const checkIn = process.argv[3] || '2026-05-07';
  const checkOut = process.argv[4] || '2026-05-09';
  const hotelbedsOnly = process.argv.includes('--hotelbeds-only');
  const branches = process.env.VYSPA_BRANCH_CODE || 'UK';
  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
  );

  console.log('== accommodationAvailability (non-V3) test ==');
  console.log({ q, checkIn, checkOut, nights, branches, hotelbedsOnly, base: baseUrl() });

  // Step 1: Get city
  const cities = await post('/rest/v4/get_cities/', [q, true]);
  console.log('get_cities', { ok: cities.ok, status: cities.status });
  if (!cities.ok) {
    console.log(JSON.stringify(cities.json, null, 2));
    process.exit(1);
  }

  const city = pickCity(cities.json, q);
  if (!city) throw new Error('No city found');

  console.log('Picked city:', { id: city.id, label: city.label, loc: city.loc });

  // Step 2: Build the new payload format (from Shekhar's curl example)
  // Note: Shekhar's example used hidden_id "14327" which might be a different city ID format
  const payload = [
    {
      location: city.loc.toLowerCase(), // "city"
      hidden_id: String(city.id),
      hidden_key: city.loc, // "City"
      limit: 50,
      nights,
      rooms: 1,
      adults: 2,
      children: 0,
      adult_room: [2],       // Array format for adults per room
      children_room: [0],     // Array format for children per room
      arrivalDate: checkIn,
      departureDate: checkOut,
      internal_rates: 1,
      live_rates: 1,
      optionsRadios: 'hotels',
      branches: 'HQ',        // Shekhar used 'HQ' not 'UK'
      // Add supplier_id 100 for HotelBeds only if flag is set
      ...(hotelbedsOnly ? { supplier_id: 100 } : {}),
      // Remove filters to get all results (Shekhar said "remove to get all the prices")
      // filters: {
      //   sort_by: 'preferred',
      //   meal_code: ['HB'],
      //   hotel_rating: ['5'],
      // },
    },
  ];

  console.log('\nPayload:', JSON.stringify(payload, null, 2));

  // Step 3: Call the non-V3 endpoint
  const avail = await post('/rest/v4/accommodationAvailability/', payload);
  console.log('\naccommodationAvailability response:', { ok: avail.ok, status: avail.status });

  if (!avail.ok) {
    console.log('Error response:', JSON.stringify(avail.json, null, 2));
    process.exit(1);
  }

  // Analyze the response structure
  const response = avail.json;
  console.log('\n=== Response Analysis ===');
  console.log('Top-level keys:', Object.keys(response || {}));
  
  const results = Array.isArray(response?.Results) ? response.Results : [];
  const criteria = response?.Criteria;
  
  console.log('Criteria:', criteria ? Object.keys(criteria) : 'none');
  console.log('Results count:', results.length);

  if (results.length > 0) {
    const first = results[0];
    console.log('\n=== First Hotel Structure ===');
    console.log('Keys:', Object.keys(first || {}));
    console.log('hotel_id:', first.hotel_id);
    console.log('hotel_name:', first.hotel_name);
    console.log('hotel_rating:', first.hotel_rating);
    console.log('suppliers:', first.suppliers);
    console.log('MealPlans:', first.MealPlans);
    console.log('NetPrices:', first.NetPrices);
    
    // Check for room types in stage 1 (this is the key feature Shekhar mentioned)
    console.log('\n=== Room Types in Stage 1 ===');
    console.log('rooms:', first.rooms);
    console.log('RoomTypes:', first.RoomTypes);
    console.log('room_options:', first.room_options);
    console.log('room_types:', first.room_types);
    
    // Check all keys that might contain room info
    const roomRelatedKeys = Object.keys(first || {}).filter(k => 
      k.toLowerCase().includes('room') || 
      k.toLowerCase().includes('rate') ||
      k.toLowerCase().includes('option')
    );
    console.log('Room-related keys:', roomRelatedKeys);
    
    for (const key of roomRelatedKeys) {
      console.log(`  ${key}:`, JSON.stringify(first[key], null, 2).slice(0, 500));
    }

    // Check suppliers structure
    console.log('\n=== Supplier Info ===');
    if (first.suppliers) {
      console.log('suppliers array:', JSON.stringify(first.suppliers, null, 2).slice(0, 1000));
    }
    
    // Log a few results for comparison
    console.log('\n=== Sample Results (first 3) ===');
    for (let i = 0; i < Math.min(3, results.length); i++) {
      const h = results[i];
      console.log(`\n[${i}] ${h.hotel_name || 'Unknown'}`);
      console.log(`    hotel_id: ${h.hotel_id}, rating: ${h.hotel_rating}`);
      console.log(`    suppliers: ${JSON.stringify(h.suppliers)}`);
      console.log(`    MealPlans: ${JSON.stringify(h.MealPlans)}`);
      console.log(`    NetPrices: ${JSON.stringify(h.NetPrices)}`);
    }
  }

  // Save full response
  const outDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = hotelbedsOnly ? '-hotelbeds' : '-all';
  const outPath = path.join(outDir, `accommodation-availability-${q.replace(/\s+/g, '_')}${suffix}-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify({
    query: { q, checkIn, checkOut, nights, branches, hotelbedsOnly },
    payload,
    response: avail.json,
  }, null, 2));
  console.log('\nSaved to:', outPath);

  // Also test with filters for comparison
  console.log('\n\n=== Testing WITH filters (5-star, Half Board) ===');
  const filteredPayload = [
    {
      ...payload[0],
      filters: {
        sort_by: 'preferred',
        meal_code: ['HB'],
        hotel_rating: ['5'],
      },
    },
  ];
  
  const filteredAvail = await post('/rest/v4/accommodationAvailability/', filteredPayload);
  console.log('Filtered response:', { ok: filteredAvail.ok, status: filteredAvail.status });
  
  if (filteredAvail.ok) {
    const filteredResults = Array.isArray(filteredAvail.json?.Results) ? filteredAvail.json.Results : [];
    console.log('Filtered results count:', filteredResults.length);
    
    // Save filtered response too
    const filteredOutPath = path.join(outDir, `accommodation-availability-${q.replace(/\s+/g, '_')}-filtered-${ts}.json`);
    fs.writeFileSync(filteredOutPath, JSON.stringify({
      query: { q, checkIn, checkOut, nights, branches, filters: filteredPayload[0].filters },
      payload: filteredPayload,
      response: filteredAvail.json,
    }, null, 2));
    console.log('Filtered saved to:', filteredOutPath);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
