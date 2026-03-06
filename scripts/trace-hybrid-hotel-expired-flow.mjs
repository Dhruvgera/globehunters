import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_ROOT = path.join(__dirname, 'output');
const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://localhost:3001';

function tsTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toJson(value) {
  return JSON.stringify(value, null, 2);
}

function pushJsonSection(sections, title, value) {
  sections.push(`## ${title}`);
  sections.push('');
  sections.push('```json');
  sections.push(typeof value === 'string' ? value : toJson(value));
  sections.push('```');
  sections.push('');
}

async function httpJson({ label, url, method = 'GET', headers = {}, body, sections }) {
  let parsedRequestBody = null;
  if (typeof body === 'string') {
    try {
      parsedRequestBody = JSON.parse(body);
    } catch {
      parsedRequestBody = body;
    }
  } else {
    parsedRequestBody = body ?? null;
  }

  pushJsonSection(sections, `${label} Request`, {
    label,
    url,
    method,
    headers,
    body: parsedRequestBody,
  });

  const response = await fetch(url, {
    method,
    headers,
    body: typeof body === 'string' ? body : body == null ? undefined : JSON.stringify(body),
  });

  const rawText = await response.text();
  let parsedBody = null;
  try {
    parsedBody = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsedBody = null;
  }

  const responseLog = {
    label,
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    body: parsedBody,
    rawText,
  };
  pushJsonSection(sections, `${label} Response`, responseLog);
  return responseLog;
}

function pickDubaiCity(cities) {
  if (!Array.isArray(cities)) return null;
  return (
    cities.find((item) => String(item?.loc || '').toLowerCase() === 'city' && String(item?.label || '').toLowerCase() === 'dubai') ||
    cities.find((item) => String(item?.loc || '').toLowerCase() === 'city' && String(item?.label || '').toLowerCase().includes('dubai')) ||
    null
  );
}

function pickVyspaResult(results) {
  if (!Array.isArray(results)) return null;
  return results.find((item) => !item?._hotelbeds && String(item?.id || '').trim()) || null;
}

async function main() {
  const runId = `hybrid-hotel-expired-trace-${tsTag()}`;
  const outDir = path.join(OUTPUT_ROOT, runId);
  fs.mkdirSync(outDir, { recursive: true });
  const sections = [];

  const searchConfig = {
    location: 'Dubai',
    checkIn: '2026-03-22',
    checkOut: '2026-03-24',
    rooms: '1',
    adults: '2',
    children: '0',
    branches: 'UK',
  };

  const citiesResponse = await httpJson({
    label: '01-city-lookup',
    url: `${LOCAL_API_URL}/api/hotels/cities`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { location: searchConfig.location, json_format: true },
    sections,
  });

  if (!citiesResponse.ok) {
    throw new Error(`City lookup failed with HTTP ${citiesResponse.status}`);
  }

  const city = pickDubaiCity(citiesResponse.body);
  if (!city) {
    throw new Error('Could not find Dubai city lookup result');
  }

  const availabilityPayload = [
    {
      location: city.label,
      hidden_id: String(city.id),
      hidden_key: String(city.loc),
      nights: '2',
      rooms: searchConfig.rooms,
      adults: searchConfig.adults,
      children: searchConfig.children,
      arrivalDate: searchConfig.checkIn,
      departureDate: searchConfig.checkOut,
      internal_rates: 1,
      live_rates: 1,
      optionsRadios: 'hotels',
      branches: searchConfig.branches,
    },
  ];

  let availabilityResponse = await httpJson({
    label: '02-hybrid-availability-initial',
    url: `${LOCAL_API_URL}/api/hotels/availability?debug=1`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: availabilityPayload,
    sections,
  });

  if (!availabilityResponse.ok) {
    throw new Error(`Availability failed with HTTP ${availabilityResponse.status}`);
  }

  let criteriaId = availabilityResponse.body?.Criteria?.searchCriteriaId;
  let selectedHotel = pickVyspaResult(availabilityResponse.body?.Results);
  let pollCount = 0;

  while ((!selectedHotel || availabilityResponse.body?.Criteria?.searchComplete !== true) && pollCount < 5) {
    pollCount += 1;
    await sleep(5000);
    availabilityResponse = await httpJson({
      label: `02b-hybrid-availability-poll-${pollCount}`,
      url: `${LOCAL_API_URL}/api/hotels/availability?debug=1`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: [
        {
          ...availabilityPayload[0],
          searchCriteriaId: String(criteriaId),
        },
      ],
      sections,
    });
    if (!availabilityResponse.ok) {
      throw new Error(`Availability poll ${pollCount} failed with HTTP ${availabilityResponse.status}`);
    }
    criteriaId = availabilityResponse.body?.Criteria?.searchCriteriaId || criteriaId;
    selectedHotel = pickVyspaResult(availabilityResponse.body?.Results);
  }

  if (!selectedHotel) {
    throw new Error('Could not find a Vyspa result in hybrid availability response');
  }

  const roomsResponse = await httpJson({
    label: '03-vyspa-rooms',
    url: `${LOCAL_API_URL}/api/hotels/rooms`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: [{ SearchCriteriaId: Number(criteriaId), srIds: String(selectedHotel.id) }],
    sections,
  });

  if (!roomsResponse.ok) {
    throw new Error(`Rooms lookup failed with HTTP ${roomsResponse.status}`);
  }

  const roomOption = roomsResponse.body?.rooms?.room1options?.[0] || null;

  const createFolderPayload = [
    {
      customer_type: 'C',
      title: 'Mr',
      last_name: 'Hybrid',
      first_name: 'Trace',
      address: 'NA',
      contact_types: [
        { type: 'EMAILTO', contact: 'dhruvgera61@gmail.com' },
        { type: 'HOME', contact: '447000000000' },
      ],
      branch_code: 'UK',
      zip_code: 'NA',
      des_airport_code: 'DXB',
      departuredate: searchConfig.checkIn,
      staff_code: 'SYS',
      owned_by: 'SYS',
    },
  ];

  const createFolderResponse = await httpJson({
    label: '04-create-folder',
    url: `${LOCAL_API_URL}/api/hotels/create-folder`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: createFolderPayload,
    sections,
  });

  if (!createFolderResponse.ok) {
    throw new Error(`Create folder failed with HTTP ${createFolderResponse.status}`);
  }

  const folderNumber = Number(createFolderResponse.body);
  if (!folderNumber) {
    throw new Error('Create folder did not return a folder number');
  }

  const addToFolderPayload = {
    folderNumber,
    itineraryNumber: '1',
    foldcur: 'GBP',
    travelPurpose: 'Holiday',
    comments: [
      'Hybrid mode real search repro',
      `Hotel: ${selectedHotel.hotel_name || selectedHotel.hotelName}`,
      `search_result_id: ${selectedHotel.id}`,
      `Real room option id: ${roomOption?.id || 'n/a'}`,
      'Submitting real Vyspa result + real room id through ApiAddToFolder',
    ],
    set_as_preferred_itinerary: true,
    passengers: [
      {
        pax_no: 1,
        title: 'Mr',
        first_name: 'TRACE',
        middle_name: '',
        last_name: 'HYBRID',
        birth_date: '1990-01-01',
        pax_type: 'ADT',
        api_gender: 'M',
        email: 'dhruvgera61@gmail.com',
        phone: '447000000000',
      },
    ],
    requestData: [
      {
        type: 'hotel',
        search_result_id: String(selectedHotel.id),
        roomCodes: String(roomOption?.room_code || roomOption?.id || '1'),
        roomIds: String(roomOption?.id || '1'),
        passengers: { [String(roomOption?.id || '1')]: '1' },
        expectedNetPrice: [String(roomOption?.net_price || selectedHotel?.minPrice || '')],
      },
    ],
  };

  const addToFolderResponse = await httpJson({
    label: '05-add-to-folder-with-real-hybrid-result',
    url: `${LOCAL_API_URL}/api/vyspa/add-to-folder`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: addToFolderPayload,
    sections,
  });

  const summary = {
    runId,
    folderNumber,
    selectedHotel: {
      id: selectedHotel.id,
      hotelName: selectedHotel.hotel_name || selectedHotel.hotelName,
      hotelId: selectedHotel.hotel_id,
      searchCriteriaId: criteriaId,
      roomOption: roomOption
        ? {
            id: roomOption.id,
            room_code: roomOption.room_code,
            room_name: roomOption.room_name,
            net_price: roomOption.net_price,
            rateKey: roomOption.rateKey,
          }
        : null,
    },
    addToFolderFailure: {
      status: addToFolderResponse.status,
      ok: addToFolderResponse.ok,
      body: addToFolderResponse.body,
    },
  };

  const markdown = [
    '# Hybrid Hotel Expired Flow Trace',
    '',
    `- Run ID: \`${runId}\``,
    `- Local API URL: \`${LOCAL_API_URL}\``,
    `- Folder Number: \`${folderNumber}\``,
    '',
    '## Summary',
    '',
    '```json',
    toJson(summary),
    '```',
    '',
    ...sections,
  ].join('\n');

  const tracePath = path.join(outDir, 'hybrid-hotel-expired-trace.md');
  fs.writeFileSync(tracePath, markdown);

  console.log(`Trace complete: ${tracePath}`);
  console.log(`Folder number: ${folderNumber}`);
  console.log(`Selected hotel: ${selectedHotel.hotel_name || selectedHotel.hotelName}`);
  console.log(`Failure status: ${addToFolderResponse.status}`);
  console.log(`Failure message: ${addToFolderResponse.body?.message || 'n/a'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
