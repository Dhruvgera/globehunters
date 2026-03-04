#!/usr/bin/env node

/**
 * Verify Vyspa accommodationAvailabilityV3 timeout + re-run flow.
 *
 * This script:
 * 1) makes an initial search with timeout + minimalResponse=false
 * 2) reads Criteria.searchCriteriaId + Criteria.searchComplete
 * 3) re-runs the same search with searchCriteriaId until searchComplete=true (or max polls hit)
 *
 * Usage:
 *   set -a; source .env; set +a
 *   node scripts/verify-vyspa-timeout-poll.mjs
 *   node scripts/verify-vyspa-timeout-poll.mjs --location Dubai --hiddenId 11945 --hiddenKey City --timeout 8
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function readDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const lineRaw of envContent.split('\n')) {
    const line = String(lineRaw || '').trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(key) {
  const value = String(process.env[key] || '').trim();
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

function normalizeBaseUrl(raw) {
  return String(raw || '')
    .trim()
    .replace(/\/+$/, '');
}

function buildAuthHeader() {
  const username = requireEnv('VYSPA_USERNAME');
  const password = requireEnv('VYSPA_PASSWORD');
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function datePlusDays(start, days) {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function postAvailability(endpoint, payload, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Version': process.env.VYSPA_API_VERSION || '1',
        Authorization: buildAuthHeader(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await response.text();
    let json = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = { raw };
    }
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs,
      json,
    };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    return {
      ok: false,
      status: 0,
      elapsedMs,
      json: { error: error?.name === 'AbortError' ? 'TIMEOUT' : 'REQUEST_ERROR', message: String(error?.message || error) },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function summarize(label, result) {
  const criteria = result?.json?.Criteria || {};
  const searchCriteriaId = criteria?.searchCriteriaId ?? null;
  const searchComplete = typeof criteria?.searchComplete === 'boolean' ? criteria.searchComplete : null;
  const resultsCount = Array.isArray(result?.json?.Results) ? result.json.Results.length : 0;
  const optionsRadios = criteria?.optionsRadios ?? null;

  console.log(`${label}:`, {
    status: result.status,
    ok: result.ok,
    elapsedMs: result.elapsedMs,
    resultsCount,
    searchCriteriaId,
    searchComplete,
    optionsRadios,
  });

  return { searchCriteriaId, searchComplete, resultsCount };
}

async function main() {
  readDotEnv();
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = normalizeBaseUrl(args.baseUrl || requireEnv('VYSPA_API_URL'));
  const endpoint = `${baseUrl}/rest/v4/accommodationAvailabilityV3/`;

  const today = new Date().toISOString().slice(0, 10);
  const arrivalDate = args.arrivalDate || today;
  const departureDate = args.departureDate || datePlusDays(arrivalDate, toInt(args.nights, 7));
  const timeoutSec = Math.max(5, toInt(args.timeout, 8));
  const bufferSec = Math.max(5, toInt(args.buffer, 7));
  const pollDelaySec = Math.max(1, toInt(args.pollDelay, timeoutSec));
  const maxPolls = Math.max(1, toInt(args.maxPolls, 4));
  const requestTimeoutMs = (timeoutSec + bufferSec) * 1000;

  const baseCriteria = {
    location: String(args.location || 'Dubai'),
    hidden_id: String(args.hiddenId || '11945'),
    hidden_key: String(args.hiddenKey || 'City'),
    nights: String(toInt(args.nights, 7)),
    rooms: toInt(args.rooms, 2),
    adults: toInt(args.adults, 3),
    children: toInt(args.children, 2),
    adult_room: [2, 1],
    children_room: [0, 1],
    child_age: [[], { '1': 10 }],
    arrivalDate,
    departureDate,
    hotel_cache: 'redis',
    timeout: timeoutSec,
    minimalResponse: false,
  };

  console.log('Vyspa timeout + poll verification');
  console.log('Config:', {
    endpoint,
    timeoutSec,
    bufferSec,
    pollDelaySec,
    requestTimeoutMs,
    maxPolls,
  });
  console.log('Criteria:', {
    location: baseCriteria.location,
    hidden_id: baseCriteria.hidden_id,
    hidden_key: baseCriteria.hidden_key,
    arrivalDate: baseCriteria.arrivalDate,
    departureDate: baseCriteria.departureDate,
    rooms: baseCriteria.rooms,
    adults: baseCriteria.adults,
    children: baseCriteria.children,
    timeout: baseCriteria.timeout,
    minimalResponse: baseCriteria.minimalResponse,
  });

  const checks = [];
  const first = await postAvailability(endpoint, [baseCriteria], requestTimeoutMs);
  const firstMeta = summarize('Initial call', first);
  checks.push({ label: 'initial', ...firstMeta, elapsedMs: first.elapsedMs, status: first.status, ok: first.ok });

  if (!first.ok) {
    console.error('Initial call failed. Full response:');
    console.error(JSON.stringify(first.json, null, 2));
    process.exit(1);
  }

  const searchCriteriaId = firstMeta.searchCriteriaId;
  if (searchCriteriaId == null || searchCriteriaId === '') {
    console.error('No Criteria.searchCriteriaId returned; cannot run retrieval calls.');
    process.exit(1);
  }

  let currentComplete = firstMeta.searchComplete;
  let polls = 0;

  while (currentComplete !== true && polls < maxPolls) {
    polls += 1;
    await new Promise((resolve) => setTimeout(resolve, pollDelaySec * 1000));

    const rerunPayload = [{ ...baseCriteria, searchCriteriaId }];
    const rerun = await postAvailability(endpoint, rerunPayload, requestTimeoutMs);
    const rerunMeta = summarize(`Re-run #${polls}`, rerun);
    checks.push({
      label: `rerun_${polls}`,
      ...rerunMeta,
      elapsedMs: rerun.elapsedMs,
      status: rerun.status,
      ok: rerun.ok,
    });

    if (!rerun.ok) {
      console.error(`Re-run #${polls} failed. Full response:`);
      console.error(JSON.stringify(rerun.json, null, 2));
      break;
    }

    currentComplete = rerunMeta.searchComplete;
  }

  const outputDir = path.join(__dirname, 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `vyspa-timeout-poll-${stamp}.json`);
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        endpoint,
        baseCriteria,
        checks,
        completed: currentComplete === true,
      },
      null,
      2
    )
  );

  console.log('Summary:', {
    checks: checks.length,
    completed: currentComplete === true,
    finalSearchComplete: currentComplete,
    outputPath,
  });
}

main().catch((error) => {
  console.error('Script failed:', error?.message || error);
  process.exit(1);
});

