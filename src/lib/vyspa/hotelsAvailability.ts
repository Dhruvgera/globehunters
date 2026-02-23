type AvailabilityCriteria = Record<string, unknown>;

function toInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  return Math.max(0, toInt(value, fallback));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function distributeTotal(total: number, buckets: number): number[] {
  if (buckets <= 0) return [];
  const out = Array.from({ length: buckets }, () => 0);
  let remaining = Math.max(0, total);
  for (let index = 0; index < buckets; index += 1) {
    if (remaining <= 0) break;
    const bucketsLeft = buckets - index;
    const allocation = Math.ceil(remaining / bucketsLeft);
    out[index] = allocation;
    remaining -= allocation;
  }
  return out;
}

function normalizePerRoomCounts(value: unknown, rooms: number): number[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value.map((entry) => toNonNegativeInt(entry, 0));
  if (normalized.length !== rooms) return null;
  return normalized;
}

function normalizeChildAge(value: unknown, childrenRoom: number[], defaultChildAge: number): Array<Record<string, number>> | null {
  const rooms = childrenRoom.length;
  if (!Array.isArray(value) || value.length !== rooms) return null;

  const out: Array<Record<string, number>> = [];
  for (let roomIndex = 0; roomIndex < rooms; roomIndex += 1) {
    const expectedChildren = childrenRoom[roomIndex];
    const source = value[roomIndex];
    const sourceObject =
      source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};

    const roomAges: Record<string, number> = {};
    for (let childIndex = 1; childIndex <= expectedChildren; childIndex += 1) {
      const key = String(childIndex);
      roomAges[key] = toNonNegativeInt(sourceObject[key], defaultChildAge);
    }
    out.push(roomAges);
  }

  return out;
}

export function normalizeVyspaAvailabilityCriteria(criteria: AvailabilityCriteria): AvailabilityCriteria {
  const normalized: AvailabilityCriteria = { ...criteria };
  normalized.hotel_cache = 'redis';
  // Force Vyspa availability to Hotelbeds supplier only.
  normalized.supplier_id = 100;

  const rawFilters =
    normalized.filters && typeof normalized.filters === 'object' && !Array.isArray(normalized.filters)
      ? (normalized.filters as Record<string, unknown>)
      : {};
  normalized.filters = {
    ...rawFilters,
    sort_by: rawFilters.sort_by ?? 'preferred',
  };

  const rooms = Math.max(1, toInt(normalized.rooms, 1));
  const adults = Math.max(1, toInt(normalized.adults, 2));
  const children = toNonNegativeInt(normalized.children, 0);
  const defaultChildAge = Math.max(
    0,
    toInt(process.env.VYSPA_DEFAULT_CHILD_AGE || process.env.HOTELBEDS_DEFAULT_CHILD_AGE || '9', 9)
  );

  normalized.rooms = String(rooms);
  normalized.adults = String(adults);
  normalized.children = String(children);

  if (children <= 0) {
    return normalized;
  }

  let adultRoom = normalizePerRoomCounts(normalized.adult_room, rooms);
  if (!adultRoom || sum(adultRoom) !== adults) {
    adultRoom = distributeTotal(adults, rooms);
  }
  normalized.adult_room = adultRoom;

  let childrenRoom = normalizePerRoomCounts(normalized.children_room, rooms);
  if (!childrenRoom || sum(childrenRoom) !== children) {
    childrenRoom = distributeTotal(children, rooms);
  }
  normalized.children_room = childrenRoom;

  const childAge = normalizeChildAge(normalized.child_age, childrenRoom, defaultChildAge);
  if (childAge) {
    normalized.child_age = childAge;
  } else {
    normalized.child_age = childrenRoom.map((count) => {
      const roomAges: Record<string, number> = {};
      for (let childIndex = 1; childIndex <= count; childIndex += 1) {
        roomAges[String(childIndex)] = defaultChildAge;
      }
      return roomAges;
    });
  }

  return normalized;
}

export function normalizeVyspaAvailabilityPayload(payload: unknown[]): unknown[] {
  return payload.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    return normalizeVyspaAvailabilityCriteria(entry as AvailabilityCriteria);
  });
}
