import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const firstEq = line.indexOf('=');
    if (firstEq <= 0) continue;
    const key = line.slice(0, firstEq).trim();
    const value = line.slice(firstEq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function basicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function hotelbedsSignature(apiKey, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  return crypto.createHash('sha256').update(`${apiKey}${secret}${timestamp}`).digest('hex');
}

async function vyspaPost(pathname, payload, config) {
  const url = `${config.apiUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(config.username, config.password),
      'Api-Version': config.apiVersion,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

async function vyspaGet(pathname, config) {
  const url = `${config.apiUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(config.username, config.password),
      'Api-Version': config.apiVersion,
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

async function hotelbedsPost(pathname, payload, config) {
  const url = `${config.baseUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json',
      'Api-key': config.apiKey,
      'X-Signature': hotelbedsSignature(config.apiKey, config.secret),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

async function geocode(location) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', location);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('accept-language', 'en');
  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'globehunters/ghfe dedupe validator',
    },
  });
  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Could not geocode "${location}"`);
  }
  return { latitude, longitude };
}

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(base, days) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function pickCity(items, q) {
  if (!Array.isArray(items)) return null;
  const query = String(q || '').trim().toLowerCase();
  const cities = items.filter((x) => String(x?.loc || '').toLowerCase() === 'city');
  const exact = cities.find((x) => String(x?.label || '').trim().toLowerCase() === query);
  return exact || cities[0] || items[0] || null;
}

function parseNumericId(input) {
  const s = String(input ?? '').trim();
  if (!/^\d+$/.test(s)) return null;
  return s;
}

function allVyspaKeys(row) {
  const keys = [
    parseNumericId(row?.VmapId),
    parseNumericId(row?.vMapId),
    parseNumericId(row?.vmapid),
    parseNumericId(row?.hotel_id),
    parseNumericId(row?.hotelId),
    parseNumericId(row?.id),
  ].filter(Boolean);
  return Array.from(new Set(keys));
}

function hotelbedsCodeFromProperty(property) {
  const code = parseNumericId(property?.code);
  if (code) return code;
  return parseNumericId(property?.mapToVendor);
}

async function fetchAllLiveProperties(config, limit, maxPages) {
  let nextPath = `/rest/v4/liveProperties/?limit=${limit}`;
  const all = [];
  const nextLinks = [];
  for (let page = 0; page < maxPages && nextPath; page += 1) {
    const response = await vyspaGet(nextPath, config);
    if (!response.ok) {
      throw new Error(`liveProperties failed (HTTP ${response.status})`);
    }
    const properties = Array.isArray(response.data?.properties) ? response.data.properties : [];
    all.push(...properties);
    const nextLink = String(response.data?.nextLink || '').trim();
    nextLinks.push(nextLink || null);
    if (!nextLink) break;
    nextPath = nextLink;
  }
  return { properties: all, nextLinks };
}

async function main() {
  loadEnv();

  const location = process.argv[2] || 'Dubai';
  const today = new Date();
  const checkIn = process.argv[3] || toDateString(addDays(today, 35));
  const checkOut = process.argv[4] || toDateString(addDays(today, 42));
  const adults = Number(process.argv[5] || '2');
  const children = Number(process.argv[6] || '0');
  const rooms = Number(process.argv[7] || '1');
  const liveLimit = Number(process.argv[8] || process.env.VYSPA_LIVEPROPERTIES_LIMIT || '500');
  const maxPages = Number(process.argv[9] || process.env.VYSPA_LIVEPROPERTIES_MAX_PAGES || '6');

  const vyspaConfig = {
    apiUrl: requireEnv('VYSPA_API_URL').replace(/\/+$/, ''),
    apiVersion: String(process.env.VYSPA_API_VERSION || '1'),
    username: requireEnv('VYSPA_USERNAME'),
    password: requireEnv('VYSPA_PASSWORD'),
    branchCode: String(process.env.VYSPA_BRANCH_CODE || 'HQ'),
  };
  const hotelbedsConfig = {
    baseUrl: 'https://api.hotelbeds.com/hotel-api/1.0',
    apiKey: requireEnv('HOTELBEDS_API_KEY'),
    secret: requireEnv('HOTELBEDS_SECRET'),
  };

  console.log(`\nRunning live dedupe check for ${location} (${checkIn} -> ${checkOut})`);
  const point = await geocode(location);
  console.log(`Geocode: ${point.latitude}, ${point.longitude}`);

  const citiesRes = await vyspaPost('/rest/v4/get_cities/', [location, true], vyspaConfig);
  if (!citiesRes.ok) throw new Error(`get_cities failed (HTTP ${citiesRes.status})`);
  const city = pickCity(citiesRes.data, location);
  if (!city) throw new Error(`No city found in Vyspa for ${location}`);

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  const vyspaPayload = [
    {
      location: city.label,
      hidden_id: String(city.id),
      hidden_key: String(city.loc),
      nights: String(nights),
      rooms: String(rooms),
      adults: String(adults),
      children: String(children),
      arrivalDate: checkIn,
      departureDate: checkOut,
      internal_rates: 1,
      live_rates: 1,
      optionsRadios: 'hotels',
      branches: vyspaConfig.branchCode,
    },
  ];
  const vyspaAvail = await vyspaPost('/rest/v4/accommodationAvailabilityV3/', vyspaPayload, vyspaConfig);
  if (!vyspaAvail.ok) throw new Error(`Vyspa availability failed (HTTP ${vyspaAvail.status})`);
  const vyspaResults = Array.isArray(vyspaAvail.data?.Results) ? vyspaAvail.data.Results : [];
  const vyspaHotels = vyspaResults.filter((row) => parseNumericId(row?.hotel_id));
  const vyspaDedupeIds = new Set(vyspaHotels.flatMap((row) => allVyspaKeys(row)));
  const vyspaHotelIds = new Set(vyspaHotels.map((row) => parseNumericId(row?.hotel_id)).filter(Boolean));

  const hbPayload = {
    stay: { checkIn, checkOut },
    occupancies: [{ rooms, adults, children }],
    geolocation: { latitude: point.latitude, longitude: point.longitude, radius: 20, unit: 'km' },
  };
  const hbAvail = await hotelbedsPost('/hotels', hbPayload, hotelbedsConfig);
  if (!hbAvail.ok) throw new Error(`HotelBeds /hotels failed (HTTP ${hbAvail.status})`);
  const hbHotels = Array.isArray(hbAvail.data?.hotels?.hotels) ? hbAvail.data.hotels.hotels : [];
  const hbCodes = hbHotels.map((hotel) => parseNumericId(hotel?.code)).filter(Boolean);

  const livePropsResponse = await fetchAllLiveProperties(vyspaConfig, liveLimit, maxPages);
  const cityProps = livePropsResponse.properties.filter(
    (property) => String(property?.cityName || '').trim().toLowerCase() === location.trim().toLowerCase()
  );

  const hbToVyspaMap = new Map();
  for (const property of cityProps) {
    const hbCode = hotelbedsCodeFromProperty(property);
    const vyspaId = parseNumericId(property?.id);
    if (hbCode && vyspaId) hbToVyspaMap.set(hbCode, vyspaId);
  }

  let mapped = 0;
  let matched = 0;
  let mappedNoVyspa = 0;
  let unmapped = 0;
  const sampleMatches = [];
  for (const hbCode of hbCodes) {
    const vyspaId = hbToVyspaMap.get(hbCode);
    if (!vyspaId) {
      unmapped += 1;
      continue;
    }
    mapped += 1;
    if (vyspaDedupeIds.has(vyspaId)) {
      matched += 1;
      if (sampleMatches.length < 15) sampleMatches.push({ hbCode, vyspaId });
    } else {
      mappedNoVyspa += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    query: { location, checkIn, checkOut, adults, children, rooms },
    counts: {
      vyspaHotels: vyspaHotels.length,
      hotelbedsHotels: hbHotels.length,
      livePropertiesTotalFetched: livePropsResponse.properties.length,
      livePropertiesCityFiltered: cityProps.length,
      mappingRows: hbToVyspaMap.size,
      hotelbedsMappedByLiveProperties: mapped,
      hotelbedsMatchedInVyspaAvailability: matched,
      hotelbedsMappedButMissingInVyspaAvailability: mappedNoVyspa,
      hotelbedsUnmappedInLiveProperties: unmapped,
    },
    samples: {
      vyspaDedupeIds: Array.from(vyspaDedupeIds).slice(0, 15),
      vyspaHotelIds: Array.from(vyspaHotelIds).slice(0, 15),
      hotelbedsCodes: hbCodes.slice(0, 15),
      matches: sampleMatches,
    },
    pagination: {
      limit: liveLimit,
      maxPages,
      nextLinks: livePropsResponse.nextLinks,
    },
  };

  const outDir = path.join(repoRoot, 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outputFile = path.join(outDir, `hotel-dedupe-live-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);

  console.log('\nDedupe summary:');
  console.log(JSON.stringify(report.counts, null, 2));
  console.log(`\nSaved report: ${outputFile}`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message || error}`);
  process.exit(1);
});
