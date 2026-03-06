import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(__dirname, 'output');
const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://localhost:3001';

function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env');
  const values = {};
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    values[key] = value;
  }
  return values;
}

function tsTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeText(filePath, data) {
  fs.writeFileSync(filePath, data);
}

function toJsonBlock(value) {
  return JSON.stringify(value, null, 2);
}

function pushSection(sections, title, payload) {
  sections.push(`## ${title}`);
  sections.push('');
  sections.push('```json');
  sections.push(typeof payload === 'string' ? payload : toJsonBlock(payload));
  sections.push('```');
  sections.push('');
}

async function httpRequest({ label, url, method = 'GET', headers = {}, body, sections }) {
  const requestLog = {
    label,
    url,
    method,
    headers,
    body: body == null ? null : (() => {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    })(),
  };
  pushSection(sections, `${label} Request`, requestLog);

  const response = await fetch(url, { method, headers, body });
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
  pushSection(sections, `${label} Response`, responseLog);
  return responseLog;
}

function extractFolderNumber(createFolderBody) {
  if (typeof createFolderBody === 'number') return createFolderBody;
  if (typeof createFolderBody === 'string' && /^\d+$/.test(createFolderBody)) return Number(createFolderBody);
  if (Array.isArray(createFolderBody)) {
    const first = createFolderBody[0];
    return Number(first?.folder_no || first?.folderNumber || first?.fold_no || 0);
  }
  return Number(createFolderBody?.folder_no || createFolderBody?.folderNumber || createFolderBody?.fold_no || 0);
}

function extractFolderEntries(folderDetails) {
  const pageData = Array.isArray(folderDetails?.pagedata) ? folderDetails.pagedata : [];
  return pageData.map((item) => ({
    fi_type: item?.Segment?.fi_type || '',
    desc: item?.Segment?.desc || item?.Segment?.textdesc || '',
    pricing: Array.isArray(item?.SegmentPricing)
      ? item.SegmentPricing.map((segmentPricing) => segmentPricing?.FolderPricing?.desc || '').filter(Boolean)
      : [],
    payable: item?.Segment?.payable || '',
  }));
}

async function fetchPortalFolderDetails({ env, folderNumber, sections, label }) {
  const params = [{ fold_no: String(folderNumber) }];
  const body = new URLSearchParams();
  body.append('username', env.VYSPA_PORTAL_USERNAME || '');
  body.append('password', env.VYSPA_PORTAL_PASSWORD || '');
  body.append('token', env.VYSPA_PORTAL_TOKEN || '');
  body.append('method', 'getFolderDetails');
  body.append('params', JSON.stringify(params));

  pushSection(sections, `${label} Request`, {
    label,
    url: env.VYSPA_PORTAL_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: {
      method: 'getFolderDetails',
      params,
      auth: 'omitted',
    },
  });

  const response = await fetch(env.VYSPA_PORTAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
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
    body: parsedBody,
    rawText,
  };
  pushSection(sections, `${label} Response`, responseLog);
  return responseLog;
}

async function main() {
  const env = loadEnvFile();
  const runId = `hotel-folder-trace-${tsTag()}`;
  const outDir = path.join(OUTPUT_ROOT, runId);
  fs.mkdirSync(outDir, { recursive: true });
  const sections = [];

  const createFolderPayload = [
    {
      customer_type: 'C',
      title: 'Mr',
      last_name: 'Verify',
      first_name: 'Codex',
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
  ];

  const createFolderResult = await httpRequest({
    label: '01-create-folder',
    url: `${LOCAL_API_URL}/api/hotels/create-folder`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createFolderPayload),
    sections,
  });

  if (!createFolderResult.ok) {
    throw new Error(`Create folder failed with HTTP ${createFolderResult.status}`);
  }

  const folderNumber = extractFolderNumber(createFolderResult.body);
  if (!folderNumber) {
    throw new Error('Could not extract folder number from create folder response');
  }

  const invalidVyspaAddPayload = {
    folderNumber,
    itineraryNumber: '1',
    foldcur: 'GBP',
    travelPurpose: 'Holiday',
    comments: ['test invalid vyspa hotel'],
    set_as_preferred_itinerary: true,
    passengers: [
      {
        pax_no: 1,
        title: 'Mr',
        first_name: 'CODEX',
        middle_name: '',
        last_name: 'VERIFY',
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
        search_result_id: '12345',
        roomCodes: '1',
        roomIds: '1',
        passengers: { '1': '1' },
        expectedNetPrice: ['591.18'],
      },
    ],
  };

  const invalidVyspaAddResult = await httpRequest({
    label: '02-invalid-vyspa-add-to-folder',
    url: `${LOCAL_API_URL}/api/vyspa/add-to-folder`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidVyspaAddPayload),
    sections,
  });

  const hotelbedsSubmitPayload = {
    provider: 'hotelbeds',
    folderNumber,
    currency: 'GBP',
    hotel: { hotelId: '54321', hotelName: 'Dubai Verify Hotel' },
    stay: {
      checkIn: '2026-03-22',
      checkOut: '2026-03-29',
      rooms: 1,
      adults: 2,
      children: 0,
    },
    passengers: [
      {
        pax_no: 1,
        title: 'Mr',
        first_name: 'CODEX',
        last_name: 'VERIFY',
        birth_date: '1990-01-01',
        pax_type: 'ADT',
        api_gender: 'M',
        email: 'dhruvgera61@gmail.com',
        phone: '447000000000',
      },
    ],
    comments: ['Special Request: Verify persistence'],
    selection: {
      total: 642.55,
      nightly: 91.79,
      rateKey: 'VERIFY_RATE',
      boardName: 'Breakfast',
      refundable: true,
    },
  };

  const hotelbedsSubmitResult = await httpRequest({
    label: '03-hotelbeds-submit',
    url: `${LOCAL_API_URL}/api/hotels/submit`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hotelbedsSubmitPayload),
    sections,
  });

  await sleep(4000);

  const folderDetailsResult = await fetchPortalFolderDetails({
    env,
    folderNumber,
    sections,
    label: '04-portal-get-folder-details',
  });

  const folderEntries = extractFolderEntries(folderDetailsResult.body);

  const summary = {
    runId,
    localApiUrl: LOCAL_API_URL,
    folderNumber,
    invalidVyspaAdd: {
      status: invalidVyspaAddResult.status,
      ok: invalidVyspaAddResult.ok,
      message: invalidVyspaAddResult.body?.message || null,
    },
    hotelbedsSubmit: {
      status: hotelbedsSubmitResult.status,
      ok: hotelbedsSubmitResult.ok,
      success: hotelbedsSubmitResult.body?.success ?? null,
      verification: hotelbedsSubmitResult.body?.verification ?? null,
    },
    folderEntries,
  };

  const traceMd = [
    '# Hotel Folder Trace',
    '',
    `- Run ID: \`${runId}\``,
    `- Local API URL: \`${LOCAL_API_URL}\``,
    `- Folder Number: \`${folderNumber}\``,
    '',
    '## Invalid Vyspa Hotel Add',
    '',
    `- HTTP Status: \`${invalidVyspaAddResult.status}\``,
    `- Success: \`${invalidVyspaAddResult.ok}\``,
    `- Message: ${invalidVyspaAddResult.body?.message || 'n/a'}`,
    '',
    '## HotelBeds Submit',
    '',
    `- HTTP Status: \`${hotelbedsSubmitResult.status}\``,
    `- Success: \`${hotelbedsSubmitResult.ok}\``,
    `- API Success: \`${hotelbedsSubmitResult.body?.success ?? 'n/a'}\``,
    `- Verification: \`${JSON.stringify(hotelbedsSubmitResult.body?.verification || {})}\``,
    '',
    '## CMS Readback',
    '',
    ...folderEntries.map((entry, index) => `- Entry ${index + 1}: fi_type=\`${entry.fi_type}\`, desc=\`${entry.desc}\`, pricing=\`${entry.pricing.join(', ') || 'n/a'}\`, payable=\`${entry.payable || 'n/a'}\``),
    '',
    ...sections,
  ].join('\n');

  const tracePath = path.join(outDir, 'hotel-folder-trace.md');
  writeText(tracePath, traceMd);

  console.log(`Trace complete: ${outDir}`);
  console.log(`Folder number: ${folderNumber}`);
  console.log(`Trace: ${tracePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
