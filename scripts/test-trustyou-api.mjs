#!/usr/bin/env node

const TRUSTYOU_TEST_IDS = [
  "6585e543-83d5-44c9-a21a-5aeb9b88396d",
  "730791b4-5d9f-450e-8374-1d23f61c50d5",
  "34b3fc51-95a6-4eec-9414-a0b1f5882abf",
  "73a3cb1b-815c-421d-978e-befc639ebb49",
  "af93bc1f-37c3-4e97-8ca6-3b26360ed8ec",
  "39b1a19e-362b-4d8c-8982-3ee1b2313f63",
  "0a201e54-98b3-4dcc-8dd6-fc1f9548f361",
  "964c8047-5c46-4798-b95f-8cfc0c3d89fa",
  "df89d574-ff73-4245-8251-5bdac068c394",
  "1d4aa8f0-5e6c-455d-9cd3-94bf455e280a",
  "7a3cd9fe-e759-444a-9451-7264b14d8fe1",
  "0c4d5917-c1c4-495a-84ca-5c4f1c1550b5",
  "91b5e7f7-13d8-4cc7-a140-4eef58d15495",
  "032d53ef-5b73-4a99-a2c9-97b14a358758",
  "7ecf3a8d-443d-4770-9e63-baf1448b4cb6",
  "33236d62-d9a6-4403-b4c8-350c109c4033",
  "0fcfb83a-70b1-425b-aeac-bac8f8c5e833",
  "07024b29-1bd2-464b-8b9d-19e0d0ae7fa3",
  "4c0ef9b5-aa21-47e3-9751-b1f307a90654",
  "e9e86fac-0137-4c96-b703-dff30d4a4371",
  "b03a16a3-718c-47a7-910f-e849c91c6e00",
];

function parseArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] || null;
}

const apiKey = parseArg("--key") || process.env.TRUSTYOU_API_KEY || null;
if (!apiKey) {
  console.error("Missing TrustYou API key. Pass --key <value> or set TRUSTYOU_API_KEY.");
  process.exit(1);
}

const requestList = TRUSTYOU_TEST_IDS.map((tyId) => `/hotels/${tyId}/trust_score.json`);
const url = `https://api.trustyou.com/bulk?request_list=${encodeURIComponent(
  JSON.stringify(requestList)
)}&key=${encodeURIComponent(apiKey)}`;

const response = await fetch(url, { headers: { Accept: "application/json" } });
const payload = await response.json().catch(() => null);

if (!response.ok || !payload || Number(payload?.meta?.code || 0) !== 200) {
  console.error("TrustYou bulk API call failed.");
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const list = payload?.response?.response_list || [];
console.log(`Fetched ${list.length} TrustYou trust_score records:\n`);
for (const entry of list) {
  const code = Number(entry?.meta?.code || 0);
  const row = entry?.response || {};
  const line = [
    code.toString().padStart(3, " "),
    String(row.ty_id || "--"),
    String(row.score || "--").padStart(3, " "),
    String(row.reviews_count || "--").padStart(6, " "),
    String(row.name || "--"),
  ].join("  ");
  console.log(line);
}
