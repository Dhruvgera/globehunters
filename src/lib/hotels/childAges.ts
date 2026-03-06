export type HotelChildAges = Array<Record<string, number>>;

const DEFAULT_CHILD_AGE = 9;
const MIN_CHILD_AGE = 0;
const MAX_CHILD_AGE = 17;

function clampChildAge(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_CHILD_AGE;
  return Math.max(MIN_CHILD_AGE, Math.min(MAX_CHILD_AGE, Math.trunc(numeric)));
}

export function normalizeHotelChildAges(
  input: unknown,
  rooms: number,
  totalChildren: number
): HotelChildAges {
  const roomCount = Math.max(1, Math.trunc(Number(rooms) || 1));
  const childCount = Math.max(0, Math.trunc(Number(totalChildren) || 0));
  const source = Array.isArray(input) ? input : [];
  let assignedChildren = 0;

  return Array.from({ length: roomCount }, (_, roomIndex) => {
    const rawRoom = source[roomIndex];
    const roomRecord = rawRoom && typeof rawRoom === 'object' && !Array.isArray(rawRoom)
      ? (rawRoom as Record<string, unknown>)
      : {};
    const normalizedEntries = Object.entries(roomRecord)
      .map(([key, value]) => [String(key), clampChildAge(value)] as const)
      .filter(([key]) => /^\d+$/.test(key))
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    const normalizedRoom: Record<string, number> = {};
    for (const [, value] of normalizedEntries) {
      if (assignedChildren >= childCount) break;
      normalizedRoom[String(Object.keys(normalizedRoom).length + 1)] = value;
      assignedChildren += 1;
    }

    return normalizedRoom;
  });
}

export function flattenHotelChildAges(
  input: unknown,
  rooms: number,
  totalChildren: number
): number[] {
  return normalizeHotelChildAges(input, rooms, totalChildren)
    .flatMap((room) =>
      Object.entries(room)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, age]) => clampChildAge(age))
    )
    .slice(0, Math.max(0, Math.trunc(Number(totalChildren) || 0)));
}

export function buildHotelChildAgesFromFlat(
  ages: unknown[],
  rooms: number,
  totalChildren: number
): HotelChildAges {
  const roomCount = Math.max(1, Math.trunc(Number(rooms) || 1));
  const childCount = Math.max(0, Math.trunc(Number(totalChildren) || 0));
  const normalizedFlat = Array.from({ length: childCount }, (_, index) => clampChildAge(ages[index]));
  const roomAges: HotelChildAges = Array.from({ length: roomCount }, () => ({}));

  if (childCount === 0) return roomAges;

  const basePerRoom = Math.floor(childCount / roomCount);
  const remainder = childCount % roomCount;
  let cursor = 0;

  for (let roomIndex = 0; roomIndex < roomCount; roomIndex += 1) {
    const roomChildren = basePerRoom + (roomIndex >= roomCount - remainder ? 1 : 0);
    for (let childIndex = 0; childIndex < roomChildren; childIndex += 1) {
      roomAges[roomIndex][String(childIndex + 1)] = normalizedFlat[cursor] ?? DEFAULT_CHILD_AGE;
      cursor += 1;
    }
  }

  return roomAges;
}

export function serializeHotelChildAges(input: unknown, rooms: number, totalChildren: number): string {
  return JSON.stringify(normalizeHotelChildAges(input, rooms, totalChildren));
}

export function parseHotelChildAges(
  raw: string | null | undefined,
  rooms: number,
  totalChildren: number
): HotelChildAges {
  if (!raw) return normalizeHotelChildAges([], rooms, totalChildren);
  try {
    return normalizeHotelChildAges(JSON.parse(raw), rooms, totalChildren);
  } catch {
    return normalizeHotelChildAges([], rooms, totalChildren);
  }
}

