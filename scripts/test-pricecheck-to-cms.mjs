/**
 * Verify: Price Check pax breakdown -> payload sent to CMS (Portal saveBasketToFolder) -> what CMS stored.
 *
 * Flow:
 * 1) Call local `/api/price-check` with a real segmentResultId/flightKey.
 * 2) Print selected `priceOptions[optionIndex].passengerBreakdown`.
 * 3) Build `passengerPricing` exactly like the UI (TermsAndConditions).
 * 4) Call local `/api/vyspa/init-folder` with `debugPortalPayload: true`.
 * 5) Print:
 *    - portalPayloadPreview.tktSegments (what we sent to CMS)
 *    - folderDetails TKT segments per pax_no (what CMS stored)
 *
 * Prereq:
 * - Dev server running
 * - Env vars:
 *   - LOCAL_BASE_URL (default http://localhost:3000)
 *   - SEGMENT_RESULT_ID (recommended) OR FLIGHT_KEY
 *   - OPTION_INDEX (optional, default 0)
 *   - SHUFFLE_PASSENGERS ("true" to shuffle pax order to prove mapping)
 */

const BASE_URL = process.env.LOCAL_BASE_URL || 'http://localhost:3000';
const SEGMENT_RESULT_ID = process.env.SEGMENT_RESULT_ID || process.env.segmentResultId || '';
const FLIGHT_KEY = process.env.FLIGHT_KEY || process.env.flightKey || '';
const OPTION_INDEX = Number.parseInt(process.env.OPTION_INDEX || '0', 10) || 0;
const SHUFFLE_PASSENGERS = String(process.env.SHUFFLE_PASSENGERS || '').toLowerCase() === 'true';
const USE_DEEPLINK_KEY = String(process.env.USE_DEEPLINK_KEY || '').toLowerCase() === 'true';
const PRICE_CHECK_TIMEOUT_MS = Number.parseInt(process.env.PRICE_CHECK_TIMEOUT_MS || '90000', 10) || 90000;

async function loadEnvLocalIfPresent() {
  // Node scripts don't automatically load .env.local; dev server does.
  // We only load it here to be able to call Vyspa search directly and extract Deep_link.
  try {
    const fs = await import('node:fs');
    if (!fs.existsSync('.env.local')) return;
    const raw = fs.readFileSync('.env.local', 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function extractFlightKeyFromDeepLink(deepLink) {
  if (!deepLink) return '';
  const m = String(deepLink).match(/flight=([^&"]+)/);
  return m ? m[1] : '';
}

async function liveVyspaSearchExtractDeepLinkKey() {
  await loadEnvLocalIfPresent();

  const apiUrl = process.env.VYSPA_API_URL;
  const username = process.env.VYSPA_USERNAME || process.env.VYSPA_API_USERNAME || '';
  const password = process.env.VYSPA_PASSWORD || '';
  const apiVersion = process.env.VYSPA_API_VERSION || '3';

  if (!apiUrl || !username || !password) {
    throw new Error('Missing VYSPA_API_URL/VYSPA_USERNAME/VYSPA_PASSWORD for live Vyspa search (needed to extract Deep_link key).');
  }

  // Defaults chosen to be a "high-likelihood" route on the stage feed.
  const from = process.env.SEARCH_FROM || 'LHR';
  const to = process.env.SEARCH_TO || 'DXB';
  const depDays = Number.parseInt(process.env.SEARCH_DEPART_DAYS || '14', 10) || 14;
  const retDays = Number.parseInt(process.env.SEARCH_RETURN_DAYS || '21', 10) || 21;
  const adults = process.env.SEARCH_ADULTS || '2';
  const children = process.env.SEARCH_CHILDREN || '1';
  const infants = process.env.SEARCH_INFANTS || '0';
  const cabin = (process.env.SEARCH_CABIN || 'M').toUpperCase(); // M/W/C/F

  const childrenNum = Number.parseInt(String(children), 10) || 0;
  const childAges = childrenNum > 0 ? Array(childrenNum).fill('9') : [];

  const searchParams = {
    version: '3',
    departure_airport: from,
    arrival_airport: to,
    departure_date: yyyyMmDdDaysFromNow(depDays),
    return_date: yyyyMmDdDaysFromNow(retDays),
    adults: String(adults),
    children: String(children),
    child_ages: childAges,
    infants: String(infants),
    direct_flight_only: '0',
    cabin_class: cabin,
    inbound_cabin_class: cabin,
  };

  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `${apiUrl.replace(/\/+$/, '')}/rest/v4/flights_availability_search/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Api-Version': apiVersion,
    },
    body: JSON.stringify([searchParams]),
  });
  const rawText = await res.text().catch(() => '');
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(`Vyspa search failed: HTTP ${res.status} ${res.statusText}. Body: ${rawText.slice(0, 200)}`);
  }
  if (!json) {
    throw new Error(`Vyspa search returned non-JSON response. Body: ${rawText.slice(0, 200)}`);
  }
  if (json?.error) {
    throw new Error(`Vyspa search returned error: ${json.error}`);
  }

  const results = Array.isArray(json?.Results) ? json.Results : [];
  if (!results.length) {
    console.log('\n[debug] Vyspa search response keys:', Object.keys(json || {}));
    console.log('[debug] Vyspa search response snippet:', rawText.slice(0, 500));
    throw new Error('Vyspa search returned 0 results');
  }
  const firstWithDeepLink = results.find((r) => r?.Deep_link || r?.deep_link) || results[0];
  const deepLinkRaw = firstWithDeepLink?.Deep_link || firstWithDeepLink?.deep_link || '';
  const flightKey = extractFlightKeyFromDeepLink(deepLinkRaw);
  if (!flightKey) {
    console.log('\n[debug] No flight key found in Deep_link. First result keys:', Object.keys(firstWithDeepLink || {}).slice(0, 40));
    console.log('[debug] Deep_link sample:', String(deepLinkRaw).slice(0, 200));
    throw new Error('Could not extract flight key from Vyspa Deep_link');
  }

  console.log('\n=== Live search (Vyspa) ===');
  console.log('Deep_link length:', String(deepLinkRaw).length);
  console.log('Extracted flight key length:', String(flightKey).length);
  console.log('Deep_link sample:', String(deepLinkRaw).slice(0, 120) + '...');
  console.log('Key sample:', String(flightKey).slice(0, 60) + '...');

  return { flightKey };
}

function hhmmToColon(hhmm) {
  const s = String(hhmm || '').trim();
  if (!s) return '';
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s;
}

function yyyyMmDdDaysFromNow(days) {
  const now = new Date();
  const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function paxTypeFromUiType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'child' || t === 'chd') return 'CHD';
  if (t === 'infant' || t === 'inf') return 'INF';
  return 'ADT';
}

function dateOfBirthForPaxType(paxType) {
  if (paxType === 'INF') return yyyyMmDdDaysFromNow(-180);
  if (paxType === 'CHD') return yyyyMmDdDaysFromNow(-8 * 365);
  return yyyyMmDdDaysFromNow(-30 * 365);
}

function buildPassengersFromBreakdown(passengerBreakdown) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function randomLetters(len) {
    let out = '';
    for (let i = 0; i < len; i++) out += letters[Math.floor(Math.random() * letters.length)];
    return out;
  }

  const pax = [];
  let idx = 0;
  for (const b of passengerBreakdown) {
    const paxType = String(b.type || 'ADT').toUpperCase();
    const count = Number(b.count || 0) || 0;
    for (let i = 0; i < count; i++) {
      idx++;
      pax.push({
        title: paxType === 'INF' ? 'Inf' : paxType === 'CHD' ? 'Mstr' : 'Mr',
        // Portal validation is strict: passenger names must not contain numbers/special chars.
        firstName: paxType === 'CHD' ? 'Child' : paxType === 'INF' ? 'Infant' : 'Adult',
        middleName: '',
        lastName: `PCTEST${randomLetters(6)}`,
        dateOfBirth: dateOfBirthForPaxType(paxType),
        email: `pc2cms+${Date.now()}.${idx}@example.com`,
        phone: '07123456789',
        countryCode: '+44',
        type: paxType === 'CHD' ? 'child' : paxType === 'INF' ? 'infant' : 'adult',
      });
    }
  }
  return pax;
}

function maybeShuffle(arr) {
  if (!SHUFFLE_PASSENGERS) return arr;
  // Simple stable shuffle: ADT first, then INF, then CHD (to differ from typical breakdown order)
  const weight = (p) => (paxTypeFromUiType(p.type) === 'ADT' ? 0 : paxTypeFromUiType(p.type) === 'INF' ? 1 : 2);
  return [...arr].sort((a, b) => weight(a) - weight(b));
}

function buildPassengerPricingFromSelectedOption(selectedOption) {
  const pb = Array.isArray(selectedOption?.passengerBreakdown) ? selectedOption.passengerBreakdown : [];
  return pb.map((breakdown) => ({
    paxType: String(breakdown.type || 'ADT').toUpperCase(),
    count: Number(breakdown.count || 0) || 0,
    baseFare: Number(breakdown.basePrice || 0) || 0,
    taxes: Number(breakdown.taxesPerPerson || 0) || 0,
    totalFare: Number(breakdown.totalPrice || 0) || 0,
  })).filter((p) => p.count > 0);
}

function buildFlightSegmentsFromPriceCheck(flightDetails) {
  const segments = Array.isArray(flightDetails?.segments) ? flightDetails.segments : [];
  const flights = segments.flatMap((s) => Array.isArray(s?.flights) ? s.flights : []);
  return flights.map((f) => ({
    type: 'AIR',
    airlineCode: f.airline || '',
    flightNumber: String(f.flightNumber || ''),
    departureAirport: f.departureAirport || '',
    arrivalAirport: f.arrivalAirport || '',
    departureDate: f.departureDate || '',
    arrivalDate: f.arrivalDate || f.departureDate || '',
    departureTime: hhmmToColon(f.departureTime),
    arrivalTime: hhmmToColon(f.arrivalTime),
    duration: String(f.duration || ''),
    cabinClass: String(f.cabinClass || ''),
  }));
}

function extractPortalTktSegments(folderDetails) {
  const pagedata = Array.isArray(folderDetails?.pagedata) ? folderDetails.pagedata : [];
  const tkts = pagedata.filter((p) => p?.Segment?.fi_type === 'TKT');
  return tkts.map((t) => {
    const pricing = Array.isArray(t?.SegmentPricing) ? t.SegmentPricing : [];
    const fare = pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'fare')?.FolderPricing?.cust_tot_sell_amt
      ?? pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'fare')?.FolderPricing?.net
      ?? null;
    const tax = pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'tax')?.FolderPricing?.cust_tot_sell_amt
      ?? pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'tax')?.FolderPricing?.net
      ?? null;
    return {
      pax_no: String(t?.Segment?.pax_no || ''),
      pax_type: String(t?.Segment?.pax_type || ''),
      gds_pax_type_code: String(t?.Segment?.gds_pax_type_code || ''),
      fare,
      tax,
    };
  });
}

async function callPriceCheck({ segmentResultId, flightKey }) {
  const url = new URL('/api/price-check', BASE_URL).toString();
  const body = segmentResultId
    ? { segmentResultId, timeoutMs: PRICE_CHECK_TIMEOUT_MS }
    : { flightKey, timeoutMs: PRICE_CHECK_TIMEOUT_MS };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function callInitFolder({ passengers, priceCheckResult, selectedOption, passengerPricing }) {
  const url = new URL('/api/vyspa/init-folder', BASE_URL).toString();

  const flightDetails = priceCheckResult?.flightDetails;
  const flightSegments = buildFlightSegmentsFromPriceCheck(flightDetails);

  const firstFlight = flightDetails?.segments?.[0]?.flights?.[0];
  const departureDate = firstFlight?.departureDate || yyyyMmDdDaysFromNow(14);

  const destinationAirportCode =
    flightDetails?.destination ||
    firstFlight?.arrivalAirport ||
    'JFK';
  const originAirportCode =
    flightDetails?.origin ||
    firstFlight?.departureAirport ||
    'LHR';

  const currency = String(selectedOption?.currency || flightDetails?.currency || 'USD');
  const fareSelectedPrice = Number(selectedOption?.totalPrice || 0) || 0;

  const body = {
    debugPortalPayload: true,
    passengers,
    currency,
    pswResultId: String(priceCheckResult?.sessionInfo?.pswResultId || SEGMENT_RESULT_ID || `PC2CMS_${Date.now()}`),
    destinationAirportCode,
    departureDate,
    fareSelectedPrice,
    originAirportCode,
    airlineCode: firstFlight?.airline || '',
    airlineName: firstFlight?.airline || '',
    flightSegments,
    baseFare: Number(selectedOption?.baseFare || 0) || 0,
    taxes: Number(selectedOption?.taxes || 0) || 0,
    // The key fields we want to validate:
    passengerPricing,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json, requestBody: body };
}

async function main() {
  let liveFlightKey = FLIGHT_KEY;
  if ((!SEGMENT_RESULT_ID && !FLIGHT_KEY) || USE_DEEPLINK_KEY) {
    const extracted = await liveVyspaSearchExtractDeepLinkKey();
    liveFlightKey = extracted.flightKey;
    process.env.FLIGHT_KEY = liveFlightKey;
  }

  console.log('Base URL:', BASE_URL);
  console.log('Input:', SEGMENT_RESULT_ID ? { segmentResultId: SEGMENT_RESULT_ID } : { flightKey: `${String(liveFlightKey).slice(0, 16)}...` });

  const pc = await callPriceCheck({ segmentResultId: SEGMENT_RESULT_ID || '', flightKey: liveFlightKey });
  console.log('\n=== Price Check ===');
  console.log('HTTP:', pc.res.status, pc.res.statusText);
  if (!pc.res.ok) {
    console.log('Response:', pc.json);
    process.exitCode = 1;
    return;
  }

  const result = pc.json;
  const options = Array.isArray(result?.priceOptions) ? result.priceOptions : [];
  const selectedOption = options[OPTION_INDEX];
  if (!selectedOption) {
    console.error(`No priceOptions[${OPTION_INDEX}] available. Count: ${options.length}`);
    process.exitCode = 1;
    return;
  }

  console.log('Selected option:', {
    optionIndex: OPTION_INDEX,
    id: selectedOption.id,
    cabinClass: selectedOption.cabinClassDisplay,
    totalPrice: selectedOption.totalPrice,
    currency: selectedOption.currency,
  });

  console.log('\nPassenger breakdown (from price_check -> transformed):');
  console.table(selectedOption.passengerBreakdown || []);

  const passengerPricing = buildPassengerPricingFromSelectedOption(selectedOption);
  console.log('\nPassengerPricing (what UI sends to init-folder):');
  console.table(passengerPricing);

  let passengers = buildPassengersFromBreakdown(selectedOption.passengerBreakdown || []);
  passengers = maybeShuffle(passengers);

  console.log('\nPassengers (order used for pax_no assignment):');
  console.table(
    passengers.map((p, i) => ({
      pax_no: i + 1,
      pax_type: paxTypeFromUiType(p.type),
      name: `${p.title} ${p.firstName} ${p.lastName}`,
      dob: p.dateOfBirth,
    }))
  );

  const init = await callInitFolder({ passengers, priceCheckResult: result, selectedOption, passengerPricing });
  console.log('\n=== init-folder (Portal/CMS) ===');
  console.log('HTTP:', init.res.status, init.res.statusText, 'folder:', init.json?.folderNumber || '(none)');

  if (init.json?.portalPayloadPreview) {
    console.log('\nPortal payload preview (what we sent to CMS) - TKT segments:');
    console.table(init.json.portalPayloadPreview.tktSegments || []);
  } else {
    console.log('\n(No portalPayloadPreview in response — ensure dev server NODE_ENV!=production and debugPortalPayload=true)');
  }

  if (init.json?.folderDetails?.pagedata) {
    console.log('\nFolderDetails TKT segments (what CMS stored):');
    console.table(extractPortalTktSegments(init.json.folderDetails));
  } else {
    console.log('\n(No folderDetails returned; response snippet):', {
      error: init.json?.error,
      message: init.json?.message,
      details: init.json?.details,
    });
  }

  if (!init.res.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});


