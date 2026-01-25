/**
 * Hotel API Comparison Script
 * Compares Vyspa (via Concorde) vs HotelBeds Direct API
 * 
 * Usage:
 *   node scripts/compare-hotel-apis.mjs [city] [checkIn] [checkOut]
 *   
 * Example:
 *   node scripts/compare-hotel-apis.mjs "dubai" 2026-02-22 2026-02-24
 */

import crypto from 'crypto';
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

// ============================================
// VYSPA API Configuration
// ============================================
const VYSPA_CONFIG = {
  apiUrl: process.env.VYSPA_API_URL?.replace(/\/+$/, '') || '',
  username: process.env.VYSPA_USERNAME || '',
  password: process.env.VYSPA_PASSWORD || '',
  branchCode: process.env.VYSPA_BRANCH_CODE || 'UK',
};

function vyspaBasicAuth() {
  const b64 = Buffer.from(`${VYSPA_CONFIG.username}:${VYSPA_CONFIG.password}`).toString('base64');
  return `Basic ${b64}`;
}

async function vyspaPost(endpoint, payload) {
  const res = await fetch(`${VYSPA_CONFIG.apiUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: vyspaBasicAuth(),
      'Api-Version': process.env.VYSPA_API_VERSION || '1',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

// ============================================
// HOTELBEDS API Configuration
// ============================================
const HOTELBEDS_CONFIG = {
  apiKey: '5435c13882fe02b74beb1dab243813e6',
  secret: 'a114a6be49',
  baseUrl: 'https://api.hotelbeds.com',
};

function hotelbedsSignature() {
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = `${HOTELBEDS_CONFIG.apiKey}${HOTELBEDS_CONFIG.secret}${timestamp}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function hotelbedsRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'Api-key': HOTELBEDS_CONFIG.apiKey,
    'X-Signature': hotelbedsSignature(),
    'Content-Type': 'application/json',
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${HOTELBEDS_CONFIG.baseUrl}${endpoint}`, options);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

// ============================================
// City coordinates for HotelBeds geolocation search
// ============================================
const CITY_COORDS = {
  london: { lat: 51.5074, lng: -0.1278 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  new_york: { lat: 40.7128, lng: -74.0060 },
  paris: { lat: 48.8566, lng: 2.3522 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  singapore: { lat: 1.3521, lng: 103.8198 },
};

function pickCity(items, q) {
  if (!Array.isArray(items)) return null;
  const query = String(q || '').trim().toLowerCase();
  const cities = items.filter((x) => String(x?.loc).toLowerCase() === 'city');
  const normCountry = (x) => String(x?.country || x?.country_name || '').trim().toLowerCase();
  const normLabel = (x) => String(x?.label || '').trim().toLowerCase();
  const exactUk = cities.find((x) => normLabel(x) === query && normCountry(x).includes('united kingdom'));
  if (exactUk) return exactUk;
  const exact = cities.find((x) => normLabel(x) === query);
  if (exact) return exact;
  return cities[0] || items[0] || null;
}

// ============================================
// VYSPA Search
// ============================================
async function searchVyspa(cityQuery, checkIn, checkOut) {
  console.log('\n========================================');
  console.log('VYSPA API Search');
  console.log('========================================');
  
  const startTime = Date.now();
  
  // Step 1: Lookup city
  const cities = await vyspaPost('/rest/v4/get_cities/', [cityQuery, true]);
  if (!cities.ok) {
    return { error: 'City lookup failed', details: cities.json };
  }
  
  const city = pickCity(cities.json, cityQuery);
  if (!city) {
    return { error: 'No city found' };
  }
  
  console.log(`City found: ${city.label} (${city.country})`);
  
  // Step 2: Search availability
  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  
  const availabilityPayload = [{
    location: city.label,
    hidden_id: String(city.id),
    hidden_key: String(city.loc),
    nights: String(nights),
    rooms: '1',
    adults: '2',
    children: '0',
    arrivalDate: checkIn,
    departureDate: checkOut,
    internal_rates: 1,
    live_rates: 1,
    optionsRadios: 'hotels',
    branches: VYSPA_CONFIG.branchCode,
  }];
  
  const avail = await vyspaPost('/rest/v4/accommodationAvailabilityV3/', availabilityPayload);
  const responseTime = Date.now() - startTime;
  
  if (!avail.ok) {
    return { error: 'Availability search failed', details: avail.json, responseTime };
  }
  
  const results = Array.isArray(avail.json?.Results) ? avail.json.Results : [];
  const searchCriteriaId = avail.json?.Criteria?.searchCriteriaId;
  
  // Filter out error messages
  const hotels = results.filter(r => typeof r === 'object' && r !== null && r.hotel_id);
  
  console.log(`Found ${hotels.length} hotels in ${responseTime}ms`);
  
  // Get room details for first hotel if available
  let roomDetails = null;
  if (hotels.length > 0 && searchCriteriaId) {
    const firstHotel = hotels[0];
    const roomsPayload = [{ SearchCriteriaId: searchCriteriaId, hotelIds: String(firstHotel.hotel_id) }];
    const rooms = await vyspaPost('/rest/v4/getRoomsV3/', roomsPayload);
    if (rooms.ok) {
      roomDetails = rooms.json;
    }
  }
  
  return {
    provider: 'Vyspa (Concorde)',
    city: city.label,
    country: city.country,
    checkIn,
    checkOut,
    nights,
    totalHotels: hotels.length,
    responseTime,
    searchCriteriaId,
    sampleHotels: hotels.slice(0, 5).map(h => ({
      id: h.hotel_id,
      name: h.hotel_name,
      rating: h.hotel_rating,
      address: h.address1,
      city: h.cityName,
      country: h.countryName,
      minPrice: h.minPrice,
      maxPrice: h.maxPrice,
      currency: h.SellCur,
      image: h.image_name,
      description: h.quickDescription?.substring(0, 200),
      mealPlans: h.MealPlans,
      suppliers: h.suppliers,
      coordinates: { lat: h.geo_loc_latitude, lng: h.geo_loc_longitude },
      refundableOptions: h.RefPrices?.length > 0,
      nonRefundableOptions: h.NonRefPrices?.length > 0,
      reviewsRating: h.reviews_rating,
      totalReviews: h.total_reviews,
    })),
    roomDetails: roomDetails ? {
      hotelName: roomDetails.hotel_name,
      roomCount: roomDetails.rooms?.room1options?.length || 0,
      sampleRooms: roomDetails.rooms?.room1options?.slice(0, 3).map(r => ({
        name: r.room_name,
        mealPlan: r.meal_name,
        price: r.net_price,
        currency: r.currency_code,
        refundable: r.nonRef !== 1,
        allocationStatus: r.allocation_status_text,
      })),
    } : null,
    rawSampleHotel: hotels[0] || null,
  };
}

// ============================================
// HOTELBEDS Search
// ============================================
async function searchHotelbeds(cityQuery, checkIn, checkOut) {
  console.log('\n========================================');
  console.log('HOTELBEDS API Search');
  console.log('========================================');
  
  const startTime = Date.now();
  const cityKey = cityQuery.toLowerCase().replace(/\s+/g, '_');
  const coords = CITY_COORDS[cityKey];
  
  if (!coords) {
    return { error: `No coordinates configured for city: ${cityQuery}` };
  }
  
  console.log(`Using coordinates: ${coords.lat}, ${coords.lng}`);
  
  const payload = {
    stay: {
      checkIn,
      checkOut,
    },
    occupancies: [{
      rooms: 1,
      adults: 2,
      children: 0,
    }],
    geolocation: {
      latitude: coords.lat,
      longitude: coords.lng,
      radius: 25,
      unit: 'km',
    },
  };
  
  const result = await hotelbedsRequest('/hotel-api/1.0/hotels', 'POST', payload);
  const responseTime = Date.now() - startTime;
  
  if (!result.ok) {
    return { error: 'Availability search failed', details: result.json, responseTime };
  }
  
  const hotels = result.json?.hotels?.hotels || [];
  console.log(`Found ${hotels.length} hotels in ${responseTime}ms`);
  
  return {
    provider: 'HotelBeds Direct',
    city: cityQuery,
    checkIn,
    checkOut,
    nights: Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))),
    totalHotels: hotels.length,
    responseTime,
    sampleHotels: hotels.slice(0, 5).map(h => ({
      id: h.code,
      name: h.name,
      rating: parseInt(h.categoryName) || h.categoryCode,
      categoryName: h.categoryName,
      address: null, // Not in availability response
      city: h.destinationName,
      country: h.countryCode,
      minPrice: parseFloat(h.minRate),
      maxPrice: parseFloat(h.maxRate),
      currency: h.currency,
      image: h.rooms?.[0]?.rates?.[0]?.rooms > 0 ? `https://photos.hotelbeds.com/giata/${h.code}/${h.code}a_hb_a_001.jpg` : null,
      description: null, // Not in availability response (requires content API)
      mealPlans: [...new Set(h.rooms?.flatMap(r => r.rates?.map(rt => rt.boardName)) || [])],
      coordinates: { lat: h.latitude, lng: h.longitude },
      refundableOptions: h.rooms?.some(r => r.rates?.some(rt => rt.cancellationPolicies?.some(p => p.amount === '0.00'))),
      nonRefundableOptions: h.rooms?.some(r => r.rates?.some(rt => rt.rateClass === 'NRF')),
      roomCount: h.rooms?.length || 0,
    })),
    roomDetails: hotels[0] ? {
      hotelName: hotels[0].name,
      roomCount: hotels[0].rooms?.length || 0,
      sampleRooms: hotels[0].rooms?.slice(0, 3).map(r => ({
        name: r.name,
        rates: r.rates?.slice(0, 2).map(rt => ({
          mealPlan: rt.boardName,
          price: rt.net,
          currency: hotels[0].currency,
          refundable: rt.rateClass !== 'NRF',
          cancellationDeadline: rt.cancellationPolicies?.[0]?.from,
        })),
      })),
    } : null,
    rawSampleHotel: hotels[0] || null,
  };
}

// ============================================
// Main comparison
// ============================================
async function main() {
  const cityQuery = process.argv[2] || 'dubai';
  const checkIn = process.argv[3] || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();
  const checkOut = process.argv[4] || (() => {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  })();
  
  console.log('==========================================');
  console.log('HOTEL API COMPARISON');
  console.log('==========================================');
  console.log(`City: ${cityQuery}`);
  console.log(`Check-in: ${checkIn}`);
  console.log(`Check-out: ${checkOut}`);
  
  // Run both searches
  const [vyspaResult, hotelbedsResult] = await Promise.all([
    searchVyspa(cityQuery, checkIn, checkOut).catch(e => ({ error: e.message })),
    searchHotelbeds(cityQuery, checkIn, checkOut).catch(e => ({ error: e.message })),
  ]);
  
  // Generate comparison report
  const report = {
    searchParams: { city: cityQuery, checkIn, checkOut },
    timestamp: new Date().toISOString(),
    vyspa: vyspaResult,
    hotelbeds: hotelbedsResult,
    comparison: {
      hotelCount: {
        vyspa: vyspaResult.totalHotels || 0,
        hotelbeds: hotelbedsResult.totalHotels || 0,
        winner: (vyspaResult.totalHotels || 0) > (hotelbedsResult.totalHotels || 0) ? 'Vyspa' : 'HotelBeds',
      },
      responseTime: {
        vyspa: vyspaResult.responseTime || 'N/A',
        hotelbeds: hotelbedsResult.responseTime || 'N/A',
        winner: (vyspaResult.responseTime || Infinity) < (hotelbedsResult.responseTime || Infinity) ? 'Vyspa' : 'HotelBeds',
      },
    },
  };
  
  // Save results
  const outDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `api-comparison-${cityQuery}-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nResults saved to: ${outPath}`);
  
  // Print summary
  console.log('\n==========================================');
  console.log('COMPARISON SUMMARY');
  console.log('==========================================');
  console.log(`\nVYSPA: ${vyspaResult.totalHotels || 0} hotels in ${vyspaResult.responseTime || 'N/A'}ms`);
  console.log(`HOTELBEDS: ${hotelbedsResult.totalHotels || 0} hotels in ${hotelbedsResult.responseTime || 'N/A'}ms`);
  
  return report;
}

main().catch(console.error);
