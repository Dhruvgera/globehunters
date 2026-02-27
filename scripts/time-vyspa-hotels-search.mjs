#!/usr/bin/env node

/**
 * Time Vyspa hotel search list latency for accommodationAvailabilityV3.
 *
 * Usage examples:
 *   set -a; source .env; set +a; node scripts/time-vyspa-hotels-search.mjs
 *   set -a; source .env; set +a; node scripts/time-vyspa-hotels-search.mjs --runs 5
 *   set -a; source .env; set +a; node scripts/time-vyspa-hotels-search.mjs --location city --hiddenId 14327 --hiddenKey City
 */

import { performance } from 'node:perf_hooks';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = 'true';
    }
  }
  return args;
}

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toBaseUrl(rawUrl) {
  const cleaned = String(rawUrl || '').trim();
  if (!cleaned) return '';
  return cleaned
    .replace(/\/(anon|jsonserver)\.php\/?$/i, '')
    .replace(/\/+$/, '');
}

function stats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { min, max, avg, median };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = toBaseUrl(args.baseUrl || process.env.VYSPA_API_URL || 'https://a1.stagev4.vyspa.net');
  const username = args.username || process.env.VYSPA_USERNAME;
  const password = args.password || process.env.VYSPA_PASSWORD;
  const apiVersion = args.apiVersion || process.env.VYSPA_API_VERSION || '1';

  if (!baseUrl || !username || !password) {
    console.error('Missing config. Required: VYSPA_API_URL, VYSPA_USERNAME, VYSPA_PASSWORD (or --baseUrl/--username/--password).');
    process.exit(1);
  }

  const endpoint = `${baseUrl}/rest/v4/accommodationAvailabilityV3/`;
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  const payload = [
    {
      location: args.location || 'city',
      hidden_id: args.hiddenId || '14327',
      hidden_key: args.hiddenKey || 'City',
      limit: toInt(args.limit, 50),
      nights: toInt(args.nights, 2),
      rooms: toInt(args.rooms, 1),
      adults: toInt(args.adults, 2),
      children: toInt(args.children, 0),
      adult_room: [toInt(args.adultsPerRoom, toInt(args.adults, 2))],
      children_room: [toInt(args.childrenPerRoom, toInt(args.children, 0))],
      arrivalDate: args.arrivalDate || '2026-05-07',
      departureDate: args.departureDate || '2026-05-09',
      internal_rates: toInt(args.internalRates, 1),
      live_rates: toInt(args.liveRates, 1),
      optionsRadios: args.optionsRadios || 'hotels',
      branches: args.branches || 'UK',
      supplier_id: toInt(args.supplierId, 100),
      hotel_cache: args.hotelCache || 'redis',
      filters: {
        sort_by: args.sortBy || 'preferred',
      },
    },
  ];

  const runs = Math.max(1, toInt(args.runs, 3));
  const timeoutMs = Math.max(1000, toInt(args.timeoutMs, 30000));

  console.log('Vyspa Hotel Search Timing');
  console.log('Endpoint:', endpoint);
  console.log('Runs:', runs);
  console.log('Payload summary:', {
    location: payload[0].location,
    hidden_id: payload[0].hidden_id,
    nights: payload[0].nights,
    rooms: payload[0].rooms,
    adults: payload[0].adults,
    children: payload[0].children,
    supplier_id: payload[0].supplier_id,
    arrivalDate: payload[0].arrivalDate,
    departureDate: payload[0].departureDate,
  });

  const durations = [];
  let lastStatus = null;
  let lastResultsCount = null;

  for (let i = 1; i <= runs; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
          'Api-Version': String(apiVersion),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await response.text();
      const endedAt = performance.now();
      const ms = endedAt - startedAt;
      durations.push(ms);
      lastStatus = response.status;

      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      const results = Array.isArray(data?.Results) ? data.Results.length : null;
      lastResultsCount = results;

      console.log(
        `Run ${i}: status=${response.status} time=${ms.toFixed(2)}ms results=${results ?? 'n/a'}`
      );
    } catch (error) {
      const endedAt = performance.now();
      const ms = endedAt - startedAt;
      const message = error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : (error?.message || 'unknown error');
      console.log(`Run ${i}: FAILED time=${ms.toFixed(2)}ms error=${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  const computed = stats(durations);
  if (!computed) {
    console.error('All runs failed.');
    process.exit(1);
  }

  console.log('\nSummary');
  console.log(`Successful runs: ${durations.length}/${runs}`);
  console.log(`HTTP status (last): ${lastStatus ?? 'n/a'}`);
  console.log(`Results count (last): ${lastResultsCount ?? 'n/a'}`);
  console.log(`Min: ${computed.min.toFixed(2)}ms`);
  console.log(`Max: ${computed.max.toFixed(2)}ms`);
  console.log(`Avg: ${computed.avg.toFixed(2)}ms`);
  console.log(`Median: ${computed.median.toFixed(2)}ms`);
}

run().catch((err) => {
  console.error('Script failed:', err?.message || err);
  process.exit(1);
});
