/**
 * End-to-end hotel API smoke test for Vyspa REST v4.
 *
 * Usage:
 *   node scripts/test-hotels-vyspa.mjs "london" 2026-02-10 2026-02-12
 *
 * Requires env vars (same as the app):
 *   VYSPA_API_URL, VYSPA_API_VERSION, VYSPA_USERNAME, VYSPA_PASSWORD, VYSPA_BRANCH_CODE
 */

import process from 'process';
import fs from 'fs';
import path from 'path';

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

async function post(path, payload) {
  const res = await fetch(`${baseUrl()}${path}`, {
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

function pickCity(items) {
  if (!Array.isArray(items)) return null;
  return items.find((x) => String(x.loc).toLowerCase() === 'city') || items[0] || null;
}

async function main() {
  const q = (process.argv[2] || 'london').trim();
  const checkIn = process.argv[3] || '2026-02-10';
  const checkOut = process.argv[4] || '2026-02-12';
  const branches = process.env.VYSPA_BRANCH_CODE || 'UK';

  console.log('== Vyspa hotels smoke test ==');
  console.log({ q, checkIn, checkOut, branches, base: baseUrl() });

  const cities = await post('/rest/v4/get_cities/', [q, true]);
  console.log('get_cities', { ok: cities.ok, status: cities.status });
  if (!cities.ok) {
    console.log(JSON.stringify(cities.json, null, 2));
    process.exit(1);
  }

  const city = pickCity(cities.json);
  if (!city) throw new Error('No city found');

  console.log('Picked', { id: city.id, label: city.label, loc: city.loc, arrival_point_code: city.arrival_point_code });

  const availabilityPayload = [
    {
      location: city.label,
      hidden_id: String(city.id),
      hidden_key: String(city.loc),
      nights: '2',
      rooms: '1',
      adults: '2',
      children: '0',
      arrivalDate: checkIn,
      departureDate: checkOut,
      internal_rates: 1,
      live_rates: 1,
      optionsRadios: 'hotels',
      branches,
    },
  ];

  const avail = await post('/rest/v4/accommodationAvailabilityV3/', availabilityPayload);
  console.log('accommodationAvailabilityV3', { ok: avail.ok, status: avail.status });
  if (!avail.ok) {
    console.log(JSON.stringify(avail.json, null, 2));
    process.exit(1);
  }

  const searchCriteriaId = avail.json?.Criteria?.searchCriteriaId;
  const results = Array.isArray(avail.json?.Results) ? avail.json.Results : [];
  console.log('Availability meta', {
    hasCriteria: !!avail.json?.Criteria,
    searchCriteriaId,
    resultsCount: results.length,
    topKeys: Object.keys(avail.json || {}).slice(0, 20),
  });

  const firstHotel = results[0] || null;
  if (!searchCriteriaId || !firstHotel) {
    console.log('No results / missing searchCriteriaId');
    console.log(JSON.stringify(avail.json, null, 2));
    process.exit(1);
  }

  console.log('Picked hotel (raw keys)', Object.keys(firstHotel || {}).slice(0, 30));
  console.log('Picked hotel (id candidates)', {
    hotel_id: firstHotel.hotel_id,
    hotelId: firstHotel.hotelId,
    hotelid: firstHotel.hotelid,
    id: firstHotel.id,
    srId: firstHotel.srId,
    hotel_name: firstHotel.hotel_name,
    hotelName: firstHotel.hotelName,
  });

  const hotelIdCandidate = firstHotel.hotel_id || firstHotel.hotelId || firstHotel.hotelid;
  const srIdCandidate = firstHotel.id || firstHotel.srId;

  const roomsPayload = hotelIdCandidate
    ? [{ SearchCriteriaId: searchCriteriaId, hotelIds: String(hotelIdCandidate) }]
    : [{ SearchCriteriaId: searchCriteriaId, srIds: String(srIdCandidate) }];
  const rooms = await post('/rest/v4/getRoomsV3/', roomsPayload);
  console.log('getRoomsV3', { ok: rooms.ok, status: rooms.status });
  if (!rooms.ok) {
    console.log(JSON.stringify(rooms.json, null, 2));
    // Still try create folder below.
    console.log('Continuing despite getRoomsV3 failure…');
  }

  // Find a likely room/detail id from nested numeric keys or id fields
  function findFirstNumericKey(node) {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const it of node) {
        const found = findFirstNumericKey(it);
        if (found) return found;
      }
      return null;
    }
    if (typeof node !== 'object') return null;
    const keys = Object.keys(node);
    for (const k of keys) {
      if (/^\d+$/.test(k)) return k;
    }
    for (const v of Object.values(node)) {
      const found = findFirstNumericKey(v);
      if (found) return found;
    }
    return null;
  }

  function findFirstNumericIdField(node) {
    const wanted = new Set([
      'id',
      'room_id',
      'roomId',
      'detail_id',
      'detailId',
      'rate_id',
      'rateId',
      'search_result_detail_id',
      'searchResultDetailId',
    ]);
    const seen = new Set();
    function walk(n) {
      if (!n || seen.has(n)) return null;
      if (typeof n === 'object') seen.add(n);
      if (Array.isArray(n)) {
        for (const it of n) {
          const found = walk(it);
          if (found) return found;
        }
        return null;
      }
      if (typeof n !== 'object') return null;
      for (const [k, v] of Object.entries(n)) {
        if (wanted.has(k)) {
          const s = String(v ?? '').trim();
          if (/^\d+$/.test(s)) return s;
        }
      }
      for (const v of Object.values(n)) {
        const found = walk(v);
        if (found) return found;
      }
      return null;
    }
    return walk(node);
  }

  const roomsRoot = rooms.json?.rooms;
  console.log('getRoomsV3 rooms type', { type: typeof roomsRoot, isArray: Array.isArray(roomsRoot) });

  const firstRoomDetailId = findFirstNumericKey(roomsRoot) || findFirstNumericIdField(roomsRoot);
  console.log('Room detail id (best-effort)', firstRoomDetailId);

  // hotel_search_details requires echo criteria + ids
  let details = null;
  if (rooms.ok && firstRoomDetailId) {
    const detailsPayload = [
      {
        location: city.label,
        hidden_id: String(city.id),
        hidden_key: String(city.loc),
        nights: '2',
        rooms: '1',
        adults: '2',
        children: '0',
        arrivalDate: checkIn,
        departureDate: checkOut,
        internal_rates: 1,
        live_rates: 1,
        optionsRadios: 'hotels',
        branches,
        arrival: checkIn,
        departure: checkOut,
        searchCriteriaId,
      },
      { 1: { ids: String(firstRoomDetailId) } },
    ];

    details = await post('/rest/v4/hotel_search_details/', detailsPayload);
    console.log('hotel_search_details', { ok: details.ok, status: details.status, keys: Object.keys(details.json || {}).slice(0, 10) });
    if (!details.ok) {
      console.log(JSON.stringify(details.json, null, 2));
    }
  } else {
    console.log('Skipping hotel_search_details (no room detail id found)');
  }

  // createApiCustomerFolder (creates a folder_no)
  const createFolderPayload = [
    {
      customer_type: 'C',
      title: 'Mr',
      last_name: 'Test',
      first_name: 'Hotel',
      address: '1 Test Street',
      contact_types: [
        { type: 'EMAILTO', contact: 'test@test.com' },
        { type: 'HOME', contact: '+447700900000' },
      ],
      branch_code: branches,
      zip_code: 'SW1A 1AA',
      des_airport_code: city.arrival_point_code || '',
      departuredate: checkIn,
      staff_code: 'SYS',
      owned_by: 'SYS',
    },
  ];

  const folder = await post('/rest/v4/createApiCustomerFolder/', createFolderPayload);
  const folderData = Array.isArray(folder.json) ? folder.json[0] : folder.json;
  const folderNo =
    folderData?.folder_no ??
    folderData?.fold_no ??
    folderData?.folderNumber ??
    folderData?.folderNo ??
    null;
  console.log('createApiCustomerFolder', {
    ok: folder.ok,
    status: folder.status,
    keys: Object.keys(folderData || {}).slice(0, 20),
    folderNo,
  });
  if (!folder.ok) {
    console.log(JSON.stringify(folder.json, null, 2));
  }

  // Persist raw responses for inspection (no credentials are written)
  const outDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `vyspa-hotels-smoke-${q.replace(/\s+/g, '_')}-${ts}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        query: { q, checkIn, checkOut, branches, base: baseUrl() },
        get_cities: cities,
        accommodationAvailabilityV3: avail,
        getRoomsV3: rooms,
        hotel_search_details: details,
        createApiCustomerFolder: folder,
      },
      null,
      2
    )
  );
  console.log('Saved responses to', outPath);

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


