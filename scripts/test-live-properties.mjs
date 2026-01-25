/**
 * Test script for Vyspa liveProperties API endpoints
 * 
 * Endpoints:
 * 1. GET /rest/v4/liveProperties/?limit=500 - List properties with pagination
 * 2. GET /rest/v4/liveProperties/{propertyId} - Get full supplier content for a property
 *
 * Usage:
 *   node scripts/test-live-properties.mjs
 *
 * Requires env vars:
 *   VYSPA_API_URL, VYSPA_USERNAME, VYSPA_PASSWORD
 */

import process from 'process';
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
  // The liveProperties endpoint uses a1.stagev4.vyspa.net directly without anon.php
  const envUrl = requireEnv('VYSPA_API_URL').replace(/\/+$/, '');
  // Extract just the host part
  return envUrl.replace('/anon.php', '');
}

function basicAuth() {
  const user = requireEnv('VYSPA_USERNAME');
  const pass = requireEnv('VYSPA_PASSWORD');
  const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
  return `Basic ${b64}`;
}

async function get(urlPath, useAuth = true) {
  const url = `${baseUrl()}${urlPath}`;
  console.log(`📡 GET ${url} (auth: ${useAuth})`);
  
  const headers = {
    'Content-Type': 'application/json',
    'Api-Version': process.env.VYSPA_API_VERSION || '4',
  };
  
  if (useAuth) {
    headers.Authorization = basicAuth();
  }
  
  const res = await fetch(url, {
    method: 'GET',
    headers,
  });
  
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function fetchAllProperties(maxPages = 3) {
  let allProperties = [];
  let nextUrl = '/rest/v4/liveProperties/?limit=500';
  let page = 0;
  
  while (nextUrl && page < maxPages) {
    page++;
    console.log(`\n📄 Page ${page}: ${nextUrl}`);
    
    const result = await get(nextUrl);
    console.log(`   Status: ${result.status}, OK: ${result.ok}`);
    
    if (!result.ok) {
      console.error('❌ Failed to fetch properties:', result.json);
      break;
    }
    
    // Check response structure
    const data = result.json;
    console.log('   Response keys:', Object.keys(data || {}).slice(0, 20));
    console.log('   Raw response (first 500 chars):', JSON.stringify(data).slice(0, 500));
    
    // Handle different possible response structures
    if (data && Array.isArray(data.results)) {
      allProperties = allProperties.concat(data.results);
      console.log(`   Found ${data.results.length} properties (total: ${allProperties.length})`);
      nextUrl = data.next || null;
    } else if (Array.isArray(data)) {
      allProperties = allProperties.concat(data);
      console.log(`   Found ${data.length} properties (total: ${allProperties.length})`);
      nextUrl = null; // No pagination info
    } else if (!data) {
      console.log('   ⚠️ Response is null or empty');
      break;
    } else if (data.next) {
      // Pagination link might be in root
      nextUrl = data.next;
      const props = data.properties || data.items || data.data || [];
      allProperties = allProperties.concat(props);
      console.log(`   Found ${props.length} properties (total: ${allProperties.length})`);
    } else {
      console.log('   Unknown response structure:', JSON.stringify(data).slice(0, 500));
      break;
    }
    
    if (nextUrl) {
      // Make next URL relative if it's absolute
      if (nextUrl.startsWith('http')) {
        const urlObj = new URL(nextUrl);
        nextUrl = urlObj.pathname + urlObj.search;
      }
      console.log(`   Next URL: ${nextUrl}`);
    } else {
      console.log('   No more pages.');
    }
  }
  
  return allProperties;
}

async function getPropertyDetails(propertyId) {
  console.log(`\n🏨 Fetching full details for property: ${propertyId}`);
  
  const result = await get(`/rest/v4/liveProperties/${propertyId}`);
  console.log(`   Status: ${result.status}, OK: ${result.ok}`);
  
  if (!result.ok) {
    console.error('❌ Failed to fetch property details:', result.json);
    return null;
  }
  
  return result.json;
}

async function main() {
  console.log('== Vyspa liveProperties API Test ==');
  console.log('Base URL:', baseUrl());
  console.log('');
  
  // Test with and without auth
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PRE-TEST: Try different auth combinations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Test without auth
  console.log('\n1️⃣ Without auth:');
  const noAuthResult = await get('/rest/v4/liveProperties/?limit=10', false);
  console.log('   Status:', noAuthResult.status, '| Response:', noAuthResult.text?.slice(0, 300));
  
  // Test with auth
  console.log('\n2️⃣ With auth:');
  const authResult = await get('/rest/v4/liveProperties/?limit=10', true);
  console.log('   Status:', authResult.status, '| Response:', authResult.text?.slice(0, 300));
  
  // Test property endpoint without auth
  console.log('\n3️⃣ Property 6373651 without auth:');
  const propNoAuth = await get('/rest/v4/liveProperties/6373651', false);
  console.log('   Status:', propNoAuth.status, '| Response:', propNoAuth.text?.slice(0, 500));
  
  // Test property endpoint with auth
  console.log('\n4️⃣ Property 6373651 with auth:');
  const propAuth = await get('/rest/v4/liveProperties/6373651', true);
  console.log('   Status:', propAuth.status, '| Response:', propAuth.text?.slice(0, 500));

  // Try different ID types from actual hotel search results
  console.log('\n5️⃣ Try hotel_id 115998 (from actual search):');
  const hotelId = await get('/rest/v4/liveProperties/115998', true);
  console.log('   Status:', hotelId.status, '| Response:', hotelId.text?.slice(0, 500));

  console.log('\n6️⃣ Try VmapId 6362820 (from actual search):');
  const vmapId = await get('/rest/v4/liveProperties/6362820', true);
  console.log('   Status:', vmapId.status, '| Response:', vmapId.text?.slice(0, 500));

  console.log('\n7️⃣ Try search result id 2062649916 (from actual search):');
  const srId = await get('/rest/v4/liveProperties/2062649916', true);
  console.log('   Status:', srId.status, '| Response:', srId.text?.slice(0, 500));

  // Try with trailing slash
  console.log('\n8️⃣ Try with trailing slash /liveProperties/6373651/:');
  const trailSlash = await get('/rest/v4/liveProperties/6373651/', true);
  console.log('   Status:', trailSlash.status, '| Response:', trailSlash.text?.slice(0, 500));

  // Try properties endpoint (without "live")
  console.log('\n9️⃣ Try /rest/v4/properties/?limit=10:');
  const props = await get('/rest/v4/properties/?limit=10', true);
  console.log('   Status:', props.status, '| Response:', props.text?.slice(0, 500));

  // Try hotel endpoint
  console.log('\n🔟 Try /rest/v4/hotels/?limit=10:');
  const hotels = await get('/rest/v4/hotels/?limit=10', true);
  console.log('   Status:', hotels.status, '| Response:', hotels.text?.slice(0, 500));

  // Try accommodations endpoint
  console.log('\n1️⃣1️⃣ Try /rest/v4/accommodations/?limit=10:');
  const accom = await get('/rest/v4/accommodations/?limit=10', true);
  console.log('   Status:', accom.status, '| Response:', accom.text?.slice(0, 500));

  // Check available API endpoints
  console.log('\n1️⃣2️⃣ Try /rest/v4/ (API root):');
  const root = await get('/rest/v4/', true);
  console.log('   Status:', root.status, '| Response:', root.text?.slice(0, 1000));

  // Test 1: Fetch first page of properties
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Fetch properties list (first 2 pages)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const properties = await fetchAllProperties(2);
  
  if (properties.length > 0) {
    console.log(`\n✅ Total properties fetched: ${properties.length}`);
    
    // Analyze first property structure
    const first = properties[0];
    console.log('\n📋 First property structure:');
    console.log('   Keys:', Object.keys(first || {}).join(', '));
    console.log('   Sample:', JSON.stringify(first, null, 2).slice(0, 1000));
    
    // Test 2: Fetch specific property details
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Fetch single property full details (ID: 6373651)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const specificDetails = await getPropertyDetails('6373651');
    
    if (specificDetails) {
      console.log('\n📋 Property 6373651 full details:');
      console.log('   Keys:', Object.keys(specificDetails || {}).join(', '));
      console.log('\n   Full response:');
      console.log(JSON.stringify(specificDetails, null, 2));
    }
    
    // Also test with first property from list
    const firstPropertyId = first?.id || first?.property_id || first?.hotelId;
    if (firstPropertyId && firstPropertyId !== '6373651') {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`TEST 3: Fetch details for first property from list (ID: ${firstPropertyId})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const firstDetails = await getPropertyDetails(firstPropertyId);
      if (firstDetails) {
        console.log('\n📋 First property full details:');
        console.log('   Keys:', Object.keys(firstDetails || {}).join(', '));
        console.log('\n   Full response (first 3000 chars):');
        console.log(JSON.stringify(firstDetails, null, 2).slice(0, 3000));
      }
    }
  } else {
    // If no properties, still test the specific property endpoint
    console.log('\n⚠️ No properties from list endpoint, testing specific property...');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Fetch single property full details (ID: 6373651)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const specificDetails = await getPropertyDetails('6373651');
    if (specificDetails) {
      console.log('\n📋 Property 6373651 full details:');
      console.log('   Keys:', Object.keys(specificDetails || {}).join(', '));
      console.log('\n   Full response:');
      console.log(JSON.stringify(specificDetails, null, 2));
    }
  }
  
  // Save results
  const outDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `live-properties-test-${ts}.json`);
  
  const output = {
    timestamp: new Date().toISOString(),
    baseUrl: baseUrl(),
    propertiesCount: properties.length,
    sampleProperties: properties.slice(0, 10),
  };
  
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Results saved to: ${outPath}`);
  
  console.log('\n== Done ==');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
