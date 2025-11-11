/**
 * Verify date fetch logic (windows and waves)
 * Run: node scripts/verify-date-fetch-logic.mjs
 */

function normalizeDate(d) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function fmt(d) {
  return normalizeDate(d).toISOString().slice(0, 10);
}

function generateDateRange(center, count = 7) {
  const dates = [];
  const centerIndex = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    const date = new Date(center);
    date.setDate(date.getDate() + (i - centerIndex));
    dates.push(date);
  }
  return dates;
}

function planFetchWaves({ selectedDeparture, selectedReturn, dates, type }) {
  const centerIndex = Math.floor(dates.length / 2);
  const waves = {};
  let maxDist = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === centerIndex) continue; // skip center (already loaded)
    const dist = Math.abs(i - centerIndex);
    if (!waves[dist]) waves[dist] = [];
    waves[dist].push(i);
    maxDist = Math.max(maxDist, dist);
  }
  const ordered = [];
  for (let d = 1; d <= maxDist; d++) {
    if (waves[d]) {
      ordered.push(...waves[d].sort((a, b) => a - b));
    }
  }

  const plan = [];
  for (const idx of ordered) {
    const candidate = normalizeDate(dates[idx]);
    const dep = normalizeDate(selectedDeparture);
    const ret = selectedReturn ? normalizeDate(selectedReturn) : null;

    if (type === 'return') {
      // return must be strictly after departure
      if (candidate.getTime() <= dep.getTime()) {
        plan.push({ type, idx, candidate: fmt(candidate), fixed: fmt(dep), action: 'SKIP (return<=departure)' });
        continue;
      }
      plan.push({ type, idx, candidate: fmt(candidate), fixed: fmt(dep), action: 'FETCH' });
    } else {
      // departure must be strictly before return (when round-trip)
      if (ret && candidate.getTime() >= ret.getTime()) {
        plan.push({ type, idx, candidate: fmt(candidate), fixed: fmt(ret), action: 'SKIP (departure>=return)' });
        continue;
      }
      plan.push({ type, idx, candidate: fmt(candidate), fixed: ret ? fmt(ret) : 'N/A', action: 'FETCH' });
    }
  }
  return plan;
}

function run() {
  const selectedDeparture = new Date('2025-11-30');
  const selectedReturn = new Date('2025-12-03');

  const depDates = generateDateRange(selectedDeparture, 7);
  const retDates = generateDateRange(selectedReturn, 7);

  console.log('=== VERIFY FETCH WINDOWS ===');
  console.log(`Selected departure: ${fmt(selectedDeparture)}, selected return: ${fmt(selectedReturn)}`);

  const depPlan = planFetchWaves({
    selectedDeparture,
    selectedReturn,
    dates: depDates,
    type: 'departure',
  });
  console.log('\nDeparture fetch plan (vary departure, fixed return):');
  depPlan.forEach(p => console.log(`  ${p.action}: dep=${p.candidate} ret=${p.fixed}`));

  const retPlan = planFetchWaves({
    selectedDeparture,
    selectedReturn,
    dates: retDates,
    type: 'return',
  });
  console.log('\nReturn fetch plan (vary return, fixed departure):');
  retPlan.forEach(p => console.log(`  ${p.action}: dep=${p.fixed} ret=${p.candidate}`));
}

run();




