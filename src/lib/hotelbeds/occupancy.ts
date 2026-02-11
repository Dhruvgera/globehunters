export function buildHotelbedsOccupancy(input: {
  rooms: number;
  adults: number;
  children: number;
  childAges?: number[];
}): { rooms: number; adults: number; children: number; paxes?: { type: 'AD' | 'CH'; age: number }[] } {
  const rooms = Math.max(1, Math.trunc(Number(input.rooms) || 1));
  const adults = Math.max(1, Math.trunc(Number(input.adults) || 1));
  const children = Math.max(0, Math.trunc(Number(input.children) || 0));

  const defaultAdultAge = (() => {
    const raw = String(process.env.HOTELBEDS_DEFAULT_ADULT_AGE || '').trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 18 && n <= 120 ? Math.trunc(n) : 30;
  })();

  const defaultChildAge = (() => {
    const raw = String(process.env.HOTELBEDS_DEFAULT_CHILD_AGE || '').trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 17 ? Math.trunc(n) : 8;
  })();

  const ages = Array.isArray(input.childAges) ? input.childAges : [];
  const childAges: number[] = Array.from({ length: children }, (_, idx) => {
    const candidate = ages[idx];
    const n = Number(candidate);
    if (Number.isFinite(n) && n >= 0 && n <= 17) return Math.trunc(n);
    return defaultChildAge;
  });

  const paxes =
    children > 0
      ? [
          ...Array.from({ length: adults }, () => ({ type: 'AD' as const, age: defaultAdultAge })),
          ...childAges.map((age) => ({ type: 'CH' as const, age })),
        ]
      : undefined;

  return { rooms, adults, children, ...(paxes ? { paxes } : {}) };
}

