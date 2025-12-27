/**
 * Fetch All Airports Script
 * Fetches all airports from Vyspa/Globehunters API and saves to src/data/airports.json
 * Run with: node scripts/fetch-all-airports.mjs
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local or .env (non-interactive)
function loadEnv() {
  let envPath = join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    envPath = join(__dirname, '..', '.env');
  }
  if (!fs.existsSync(envPath)) {
      console.warn('⚠️  Neither .env.local nor .env found, relying on process.env');
      return {};
  }
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

const env = { ...process.env, ...loadEnv() };
const VYSPA_API_URL = (env.VYSPA_API_URL || '').replace(/\/+$/, '');
const VYSPA_USERNAME = env.VYSPA_USERNAME || '';
const VYSPA_PASSWORD = env.VYSPA_PASSWORD || '';
const API_VERSION = env.VYSPA_API_VERSION || '1';

if (!VYSPA_API_URL || !VYSPA_USERNAME || !VYSPA_PASSWORD) {
  console.error('❌ Missing environment variables (VYSPA_API_URL/VYSPA_USERNAME/VYSPA_PASSWORD)');
  process.exit(1);
}

function getAuthHeader() {
  const b64 = Buffer.from(`${VYSPA_USERNAME}:${VYSPA_PASSWORD}`).toString('base64');
  return `Basic ${b64}`;
}

/**
 * Normalize country code to ISO2 format
 */
function normalizeCountryCode(countryInput) {
  if (!countryInput) return '';
  
  const raw = String(countryInput).trim();
  const upper = raw.toUpperCase();
  
  // Common mappings to ISO2
  const mapping = {
    'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GREAT BRITAIN': 'GB',
    'UNITED STATES': 'US', 'USA': 'US', 'U.S.A.': 'US',
    'UNITED ARAB EMIRATES': 'AE', 'UAE': 'AE', 'U.A.E.': 'AE',
    'SAUDI ARABIA': 'SA', 'KSA': 'SA',
    'TURKEY': 'TR', 'TÜRKİYE': 'TR', 'TURKIYE': 'TR',
    'SOUTH KOREA': 'KR', 'KOREA, REPUBLIC OF': 'KR',
    'NETHERLANDS': 'NL',
    'GERMANY': 'DE', 'FRANCE': 'FR', 'SPAIN': 'ES', 'ITALY': 'IT',
    'CANADA': 'CA', 'INDIA': 'IN', 'AUSTRALIA': 'AU', 'JAPAN': 'JP',
    'CHINA': 'CN', 'BRAZIL': 'BR', 'MEXICO': 'MX', 'RUSSIA': 'RU',
  };
  
  if (mapping[upper]) {
    return mapping[upper];
  }
  
  // If already ISO2
  if (upper.length === 2 && upper.match(/^[A-Z]{2}$/)) {
    return upper;
  }
  
  // If ISO3-like, try common conversions
  if (upper.length === 3 && upper.match(/^[A-Z]{3}$/)) {
    const iso3Map = {
      'UAE': 'AE',
      'GBR': 'GB',
      'USA': 'US',
      'CAN': 'CA',
      'AUS': 'AU',
      'IND': 'IN',
    };
    if (iso3Map[upper]) {
      return iso3Map[upper];
    }
  }
  
  // Fallback to first 2 letters
  return upper.substring(0, 2);
}

/**
 * Transform Vyspa airport response to Airport type
 */
function transformVyspaAirport(item) {
  const code = String(item.id || '').toUpperCase().trim();
  const name = String(item.name || '').trim();
  const city = String(item.city || '').trim();
  const country = String(item.country || '').trim();
  const countryCode = normalizeCountryCode(item.country_code || item.country);
  
  if (!code) {
    return null;
  }
  
  return {
    code,
    name: name || city || code,
    city: city || code,
    country: country || countryCode,
    countryCode,
  };
}

async function fetchAllAirports() {
  const url = `${VYSPA_API_URL}/rest/v4/get_airports`;
  console.log(`Fetching from: ${url}`);
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
        'Api-Version': API_VERSION,
      },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${res.statusText} - ${text.substring(0, 100)}`);
    }

    const data = await res.json();
    
    if (!Array.isArray(data)) {
      throw new Error('API did not return an array');
    }

    console.log(`Received ${data.length} raw records.`);

    const airports = data
      .map(transformVyspaAirport)
      .filter(a => a !== null);

    console.log(`Processed ${airports.length} valid airports.`);
    return airports;

  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

async function run() {
  console.log('🚀 Fetching All Airports...');
  
  try {
    const airports = await fetchAllAirports();
    
    const targetDir = join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetFile = join(targetDir, 'airports.json');
    fs.writeFileSync(targetFile, JSON.stringify(airports, null, 2));
    
    console.log(`✅ Saved to ${targetFile}`);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

run();

