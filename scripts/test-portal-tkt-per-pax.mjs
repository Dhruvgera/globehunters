/**
 * Smoke test: verify per-passenger TKT mapping (pax_no + gds_pax_type_code) via the local init-folder route.
 *
 * This script calls the local Next route `/api/vyspa/init-folder` so we exercise:
 * client payload -> route mapping -> REAL Portal `saveBasketToFolder` request.
 *
 * Prereq:
 * - run `npm run dev` (or `next dev`) and set LOCAL_BASE_URL if not on http://localhost:3000
 * - set Portal creds in your env (do NOT hardcode):
 *   - VYSPA_PORTAL_URL
 *   - VYSPA_PORTAL_USERNAME
 *   - VYSPA_PORTAL_PASSWORD
 *   - VYSPA_PORTAL_TOKEN
 *
 * NOTE: This creates real folders in the Portal system. Use a test account/environment if available.
 */

const BASE_URL = process.env.LOCAL_BASE_URL || 'http://localhost:3000';

function yyyyMmDdDaysFromNow(days) {
  const now = new Date();
  const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dateOfBirthForPassengerType(type) {
  const code = mapPassengerTypeToExpectedCode(type);
  // Portal validation is strict; ensure realistic ages:
  // - ADT: ~30 years old
  // - CHD: ~8 years old
  // - INF: ~6 months old
  if (code === 'INF') return yyyyMmDdDaysFromNow(-180);
  if (code === 'CHD') return yyyyMmDdDaysFromNow(-8 * 365);
  return yyyyMmDdDaysFromNow(-30 * 365);
}

function mapPassengerTypeToExpectedCode(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'child' || t === 'chd') return 'CHD';
  if (t === 'infant' || t === 'inf') return 'INF';
  return 'ADT';
}

function buildBody({ caseName, passengers }) {
  const departureDate = yyyyMmDdDaysFromNow(14);

  // passengerPricing is intentionally grouped by paxType (ADT/CHD/INF) and NOT by passenger ordering.
  // Our route must still map each created TKT segment to the correct pax_no based on passenger ordering.
  const passengerPricing = [
    { paxType: 'ADT', count: passengers.filter((p) => mapPassengerTypeToExpectedCode(p.type) === 'ADT').length, baseFare: 100, taxes: 10, totalFare: 110 },
    { paxType: 'CHD', count: passengers.filter((p) => mapPassengerTypeToExpectedCode(p.type) === 'CHD').length, baseFare: 70, taxes: 7, totalFare: 77 },
    { paxType: 'INF', count: passengers.filter((p) => mapPassengerTypeToExpectedCode(p.type) === 'INF').length, baseFare: 25, taxes: 2, totalFare: 27 },
  ].filter((p) => p.count > 0);

  return {
    passengers: passengers.map((p, idx) => ({
      title: p.title || 'Mr',
      firstName: p.firstName || `PAX${idx + 1}`,
      middleName: '',
      lastName: p.lastName || `TKT-MAP-${caseName}-${Date.now()}`,
      dateOfBirth: p.dateOfBirth || dateOfBirthForPassengerType(p.type),
      email: p.email || `tkt.map+${caseName}.${Date.now()}.${idx}@example.com`,
      phone: p.phone || '07123456789',
      countryCode: p.countryCode || '+44',
      type: p.type, // "adult" | "child" | "infant"
    })),
    currency: 'GBP',
    pswResultId: `TKT_MAP_${caseName}_${Date.now()}`,
    destinationAirportCode: 'JFK',
    departureDate,
    fareSelectedPrice: 999,
    cabinClass: 'Economy',
    affiliateCode: 'tkt_map_script',
    originAirportCode: 'LHR',
    airlineCode: 'BA',
    airlineName: 'British Airways',
    flightSegments: [
      {
        type: 'AIR',
        airlineCode: 'BA',
        flightNumber: '0105',
        departureAirport: 'LHR',
        arrivalAirport: 'JFK',
        departureDate,
        arrivalDate: departureDate,
        departureTime: '10:00',
        arrivalTime: '13:00',
        duration: '7h 0m',
        cabinClass: 'Economy',
      },
    ],
    // Fields relevant to ticket mapping:
    passengerPricing,
    // Keep these empty for the smoke test
    markupIds: '',
    moduleId: '',
    cabinClassCode: 'Y',
    gds: 'G',
    chooseSupplier: 'GALNEW',
  };
}

function extractTktSegmentsFromInitFolderResponse(json) {
  const pagedata =
    json?.folderDetails?.pagedata ||
    json?.folderDetails?.folder_data?.pagedata ||
    json?.createFolderRaw?.folder_data?.pagedata ||
    [];

  return Array.isArray(pagedata)
    ? pagedata.filter((p) => p?.Segment?.fi_type === 'TKT')
    : [];
}

function extractPricingAmounts(seg) {
  // Portal getFolderDetails typically returns pricing under SegmentPricing[].FolderPricing
  const pricing = Array.isArray(seg?.SegmentPricing) ? seg.SegmentPricing : [];
  const fare = pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'fare')?.FolderPricing?.cust_tot_sell_amt
    ?? pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'fare')?.FolderPricing?.net
    ?? null;
  const tax = pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'tax')?.FolderPricing?.cust_tot_sell_amt
    ?? pricing.find((p) => String(p?.FolderPricing?.desc || '').toLowerCase() === 'tax')?.FolderPricing?.net
    ?? null;
  return { fare, tax };
}

function extractPassengerTypeFromTktSegment(seg) {
  // Some Portal responses do not echo back gds_pax_type_code; fall back to pax_type.
  const byGds = String(seg?.Segment?.gds_pax_type_code || '').trim();
  if (byGds) return byGds;
  const byPaxType = String(seg?.Segment?.pax_type || '').trim();
  if (byPaxType) return byPaxType;
  return '';
}

async function runOne({ caseName, passengers }) {
  const url = new URL('/api/vyspa/init-folder', BASE_URL).toString();
  const body = buildBody({ caseName, passengers });

  console.log('\n==============================');
  console.log(`Case: ${caseName}`);
  console.log(
    'Passenger order:',
    body.passengers.map((p) => `${p.firstName}:${mapPassengerTypeToExpectedCode(p.type)}`).join(' | ')
  );

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  console.log('HTTP:', res.status, res.statusText, 'Folder:', json?.folderNumber || json?.folder_no || '(unknown)');

  const tktSegments = extractTktSegmentsFromInitFolderResponse(json);
  if (!tktSegments.length) {
    console.log('No TKT segments found in response (folderDetails/createFolderRaw missing or unexpected shape).');
    return { ok: false, res, json };
  }

  // Verify mapping: for pax_no i, TKT.gds_pax_type_code should match passenger[i-1].type mapping.
  const expectedByPaxNo = new Map();
  for (let i = 0; i < body.passengers.length; i++) {
    expectedByPaxNo.set(String(i + 1), mapPassengerTypeToExpectedCode(body.passengers[i].type));
  }

  const problems = [];
  for (const seg of tktSegments) {
    const paxNo = String(seg?.Segment?.pax_no || '');
    const paxType = extractPassengerTypeFromTktSegment(seg);
    const expected = expectedByPaxNo.get(paxNo);
    if (!paxNo || !expected) {
      problems.push({ paxNo, paxType, expected, reason: 'missing pax_no or expected type' });
    } else if (paxType !== expected) {
      problems.push({ paxNo, paxType, expected, reason: 'type mismatch' });
    }
  }

  console.log(
    'TKT mapping:',
    tktSegments
      .map((s) => {
        const paxNo = s?.Segment?.pax_no;
        const paxType = extractPassengerTypeFromTktSegment(s);
        const { fare, tax } = extractPricingAmounts(s);
        return `pax_no=${paxNo} type=${paxType} fare=${fare ?? '-'} tax=${tax ?? '-'}`;
      })
      .join(' | ')
  );

  if (problems.length) {
    console.error('❌ FAIL: TKT pax mapping problems:', problems);
    return { ok: false, res, json };
  }

  console.log('✅ PASS: Each pax_no has a correctly-typed TKT segment.');
  return { ok: true, res, json };
}

async function main() {
  // Case A: normal order
  await runOne({
    caseName: 'normal_order',
    passengers: [
      { type: 'adult', title: 'Mr', firstName: 'Lead', lastName: 'Adult' },
      { type: 'child', title: 'Mstr', firstName: 'Kid', lastName: 'Child' },
      { type: 'infant', title: 'Inf', firstName: 'Baby', lastName: 'Infant' },
    ],
  });

  // Case B: intentionally shuffled order (this is where the old server logic could mis-map pax_no)
  await runOne({
    caseName: 'shuffled_order',
    passengers: [
      { type: 'adult', title: 'Mr', firstName: 'Lead', lastName: 'Adult' },
      { type: 'infant', title: 'Inf', firstName: 'Baby', lastName: 'Infant' },
      { type: 'child', title: 'Mstr', firstName: 'Kid', lastName: 'Child' },
    ],
  });
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});


