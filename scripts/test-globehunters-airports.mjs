/**
 * Globehunters REST v4 Airports Test
 * Run with: node scripts/test-globehunters-airports.mjs
 */

const CONFIG = {
  apiUrl: process.env.VYSPA_API_URL || 'https://api.globehunters.com',
  apiVersion: process.env.VYSPA_API_VERSION || '1',
  username: process.env.VYSPA_USERNAME || '',
  password: process.env.VYSPA_PASSWORD || '',
  basicAuthB64: process.env.GH_BASIC_AUTH_B64 || '',
};

function getAuthHeader() {
  if (CONFIG.basicAuthB64) return `Basic ${CONFIG.basicAuthB64}`;
  if (!CONFIG.username || !CONFIG.password) {
    throw new Error('Missing VYSPA_USERNAME/VYSPA_PASSWORD or GH_BASIC_AUTH_B64');
  }
  const b64 = Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64');
  return `Basic ${b64}`;
}

function buildAirportsUrl(query = 'dubai') {
  const base = CONFIG.apiUrl.replace(/\/+$/, '');
  const q = encodeURIComponent(query);
  return `${base}/rest/v4/get_airports/${q}`;
}

async function fetchAirports(query = 'dubai') {
  const url = buildAirportsUrl(query);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      'Api-Version': CONFIG.apiVersion,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function run() {
  console.log('🚀 GH Airports Test');
  console.log('Base URL:', CONFIG.apiUrl);
  const query = process.argv[2] || 'dubai';
  console.log('Query:', query);

  try {
    const data = await fetchAirports(query);
    if (!Array.isArray(data)) {
      console.log('❌ Expected array response');
      console.dir(data, { depth: 2 });
      process.exit(1);
    }
    console.log(`✅ Received ${data.length} airports`);
    if (data.length > 0) {
      console.log('🧩 Sample item keys:', Object.keys(data[0]).join(', '));
      console.dir(data[0], { depth: 1 });
    }
    process.exit(0);
  } catch (e) {
    console.error('❌ Airports test failed:', e.message);
    process.exit(1);
  }
}

run();




