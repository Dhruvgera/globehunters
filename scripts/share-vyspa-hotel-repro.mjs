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

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, json, rawText };
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

function jsonForShell(value) {
  return JSON.stringify(value).replace(/'/g, `'\\''`);
}

async function main() {
  const runId = `vyspa-hotel-repro-${tsTag()}`;
  const outDir = path.join(OUTPUT_ROOT, runId);
  fs.mkdirSync(outDir, { recursive: true });

  const cityLookup = await postJson(`${LOCAL_API_URL}/api/hotels/cities`, {
    location: 'Dubai',
    json_format: true,
  });
  if (!cityLookup.ok) throw new Error(`City lookup failed: HTTP ${cityLookup.status}`);

  const city = pickDubaiCity(cityLookup.json);
  if (!city) throw new Error('Dubai city lookup result not found');

  const searchPayload = [
    {
      location: city.label,
      hidden_id: String(city.id),
      hidden_key: String(city.loc),
      nights: '2',
      rooms: '1',
      adults: '2',
      children: '0',
      arrivalDate: '2026-03-22',
      departureDate: '2026-03-24',
      internal_rates: 1,
      live_rates: 1,
      optionsRadios: 'hotels',
      branches: 'UK',
    },
  ];

  let availability = await postJson(`${LOCAL_API_URL}/api/hotels/availability?debug=1`, searchPayload);
  if (!availability.ok) throw new Error(`Availability failed: HTTP ${availability.status}`);

  let criteriaId = availability.json?.Criteria?.searchCriteriaId;
  let selectedHotel = pickVyspaResult(availability.json?.Results);

  for (let attempt = 0; attempt < 5 && (!selectedHotel || availability.json?.Criteria?.searchComplete !== true); attempt += 1) {
    await sleep(5000);
    availability = await postJson(`${LOCAL_API_URL}/api/hotels/availability?debug=1`, [
      { ...searchPayload[0], searchCriteriaId: String(criteriaId) },
    ]);
    if (!availability.ok) throw new Error(`Availability poll failed: HTTP ${availability.status}`);
    criteriaId = availability.json?.Criteria?.searchCriteriaId || criteriaId;
    selectedHotel = pickVyspaResult(availability.json?.Results);
  }

  if (!selectedHotel) throw new Error('No Vyspa result found in hybrid availability response');

  const roomsLookup = await postJson(`${LOCAL_API_URL}/api/hotels/rooms`, [
    {
      SearchCriteriaId: Number(criteriaId),
      srIds: String(selectedHotel.id),
    },
  ]);
  if (!roomsLookup.ok) throw new Error(`Rooms lookup failed: HTTP ${roomsLookup.status}`);

  const room = roomsLookup.json?.rooms?.room1options?.[0];
  if (!room) throw new Error('No room option found for selected Vyspa hotel');

  const createFolder = await postJson(`${LOCAL_API_URL}/api/hotels/create-folder`, [
    {
      customer_type: 'C',
      title: 'Mr',
      last_name: 'Vyspa',
      first_name: 'Trace',
      address: 'NA',
      contact_types: [
        { type: 'EMAILTO', contact: 'dhruvgera61@gmail.com' },
        { type: 'HOME', contact: '447000000000' },
      ],
      branch_code: 'UK',
      zip_code: 'NA',
      des_airport_code: 'DXB',
      departuredate: '2026-03-22',
      staff_code: 'SYS',
      owned_by: 'SYS',
    },
  ]);
  if (!createFolder.ok) throw new Error(`Create folder failed: HTTP ${createFolder.status}`);

  const folderNumber = Number(createFolder.json);
  if (!folderNumber) throw new Error('Folder number missing from create folder response');

  const addToFolderPayload = {
    folderNumber,
    itineraryNumber: '1',
    foldcur: 'GBP',
    travelPurpose: 'Holiday',
    comments: ['Real hybrid Vyspa hotel repro'],
    set_as_preferred_itinerary: true,
    passengers: [
      {
        pax_no: 1,
        title: 'Mr',
        first_name: 'TRACE',
        middle_name: '',
        last_name: 'VYSPA',
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
        roomCodes: String(room.room_code || room.id),
        roomIds: String(room.id),
        passengers: { [String(room.id)]: '1' },
        expectedNetPrice: [String(room.net_price)],
      },
    ],
  };

  const addToFolder = await postJson(`${LOCAL_API_URL}/api/vyspa/add-to-folder`, addToFolderPayload);

  const searchCurl = [
    'curl -sS',
    `'${LOCAL_API_URL}/api/hotels/availability?debug=1'`,
    "-H 'Content-Type: application/json'",
    `--data '${jsonForShell([{ ...searchPayload[0], searchCriteriaId: String(criteriaId) }])}'`,
  ].join(' ');

  const addToFolderCurl = [
    'curl -sS -i',
    `'${LOCAL_API_URL}/api/vyspa/add-to-folder'`,
    "-H 'Content-Type: application/json'",
    `--data '${jsonForShell(addToFolderPayload)}'`,
  ].join(' ');

  const markdown = [
    '# Vyspa Hotel Repro',
    '',
    `- Generated: \`${new Date().toISOString()}\``,
    `- Local API URL: \`${LOCAL_API_URL}\``,
    `- Folder Number Used: \`${folderNumber}\``,
    `- Selected Hotel: \`${selectedHotel.hotel_name || selectedHotel.hotelName}\``,
    `- Vyspa search_result_id: \`${selectedHotel.id}\``,
    `- Room ID: \`${room.id}\``,
    `- Room Code: \`${room.room_code || 'n/a'}\``,
    '',
    '## Hotel Search Curl',
    '',
    '```bash',
    searchCurl,
    '```',
    '',
    '## Add To Folder Curl',
    '',
    '```bash',
    addToFolderCurl,
    '```',
    '',
    '## Add To Folder Response',
    '',
    '```json',
    addToFolder.rawText || JSON.stringify(addToFolder.json, null, 2),
    '```',
    '',
  ].join('\n');

  const outputPath = path.join(outDir, 'vyspa-hotel-repro.md');
  fs.writeFileSync(outputPath, markdown);

  console.log(`Output: ${outputPath}`);
  console.log(`Folder: ${folderNumber}`);
  console.log(`Hotel: ${selectedHotel.hotel_name || selectedHotel.hotelName}`);
  console.log(`Add-to-folder status: ${addToFolder.status}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
