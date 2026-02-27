const TRUSTYOU_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TrustYouHotelSeed {
  tyId: string;
  name: string;
  location: string;
  aliases?: string[];
}

export const TRUSTYOU_HOTEL_SEEDS: TrustYouHotelSeed[] = [
  {
    tyId: "6585e543-83d5-44c9-a21a-5aeb9b88396d",
    name: "Talayot Apartments",
    location: "Cala n Forcat, Menorca, Balearic Islands, Spain",
    aliases: ["Talayot Apartments"],
  },
  {
    tyId: "730791b4-5d9f-450e-8374-1d23f61c50d5",
    name: "AQI Aqua Mirage Club",
    location: "Marrakech, Morocco",
    aliases: ["AQI Aqua Mirage Club", "Aqua Fun Club Marrakech"],
  },
  {
    tyId: "34b3fc51-95a6-4eec-9414-a0b1f5882abf",
    name: "Hotel Golden Donaire Beach",
    location: "La Pineda, Costa Dorada, Mainland Spain, Spain",
    aliases: ["Hotel Golden Donaire Beach", "Golden Donaire Beach Hotel"],
  },
  {
    tyId: "73a3cb1b-815c-421d-978e-befc639ebb49",
    name: "Hotel Flamingo Oasis",
    location: "Benidorm, Costa Blanca, Mainland Spain, Spain",
    aliases: ["Hotel Flamingo Oasis", "Medplaya Hotel Flamingo Oasis"],
  },
  {
    tyId: "af93bc1f-37c3-4e97-8ca6-3b26360ed8ec",
    name: "Protur Safari Park",
    location: "Sa Coma, Majorca, Balearic Islands, Spain",
    aliases: ["Protur Safari Park", "Protur Safari Park Aparthotel"],
  },
  {
    tyId: "39b1a19e-362b-4d8c-8982-3ee1b2313f63",
    name: "Riu Oliva Beach Resort",
    location: "Corralejo, Fuerteventura, Canary Islands, Spain",
    aliases: ["Riu Oliva Beach Resort", "Hotel Riu Oliva Beach Resort"],
  },
  {
    tyId: "0a201e54-98b3-4dcc-8dd6-fc1f9548f361",
    name: "Melia Sunny Beach",
    location: "Sunny Beach, Bourgas Region, Bulgaria",
    aliases: ["Melia Sunny Beach"],
  },
  {
    tyId: "964c8047-5c46-4798-b95f-8cfc0c3d89fa",
    name: "Marina Suites",
    location: "Puerto Rico, Gran Canaria, Canary Islands, Spain",
    aliases: ["Marina Suites"],
  },
  {
    tyId: "df89d574-ff73-4245-8251-5bdac068c394",
    name: "Hotel Sun Palace",
    location: "Faliraki, Rhodes, Greek Islands, Greece",
    aliases: ["Hotel Sun Palace", "Sun Palace Hotel"],
  },
  {
    tyId: "1d4aa8f0-5e6c-455d-9cd3-94bf455e280a",
    name: "Ideal Prime Beach",
    location: "Marmaris, Dalaman Region, Turkey",
    aliases: ["Ideal Prime Beach"],
  },
  {
    tyId: "7a3cd9fe-e759-444a-9451-7264b14d8fe1",
    name: "Splashworld AQI Venus Beach",
    location: "Hammamet, Tunisia",
    aliases: ["Splashworld AQI Venus Beach", "Splash World Venus Beach"],
  },
  {
    tyId: "0c4d5917-c1c4-495a-84ca-5c4f1c1550b5",
    name: "Holiday Village Atlantica Mikri Poli Kos",
    location: "Kardamena, Kos, Greek Islands, Greece",
    aliases: ["Holiday Village Atlantica Mikri Poli Kos", "Atlantica Mikri Poli Kos"],
  },
  {
    tyId: "91b5e7f7-13d8-4cc7-a140-4eef58d15495",
    name: "AQI Pegasos World",
    location: "Side, Antalya Region, Turkey",
    aliases: ["AQI Pegasos World", "Maya World Hotel"],
  },
  {
    tyId: "032d53ef-5b73-4a99-a2c9-97b14a358758",
    name: "Universals Endless Summer Resort Dockside Inn and Suites",
    location: "Orlando, Florida, USA",
    aliases: [
      "Universals Endless Summer Resort Dockside Inn and Suites",
      "Universal's Endless Summer Resort - Dockside Inn and Suites",
    ],
  },
  {
    tyId: "7ecf3a8d-443d-4770-9e63-baf1448b4cb6",
    name: "Hotel Golden Bahia de Tossa and Spa",
    location: "Tossa De Mar, Costa Brava, Mainland Spain, Spain",
    aliases: ["Hotel Golden Bahia de Tossa and Spa", "Golden Bahia de Tossa & Spa Hotel"],
  },
  {
    tyId: "33236d62-d9a6-4403-b4c8-350c109c4033",
    name: "Holiday Village Aliathon",
    location: "Paphos, Paphos Region, Cyprus",
    aliases: ["Holiday Village Aliathon", "Aliathon Aegean"],
  },
  {
    tyId: "0fcfb83a-70b1-425b-aeac-bac8f8c5e833",
    name: "Leonardo Laura Beach and Splash Resort",
    location: "Paphos, Paphos Region, Cyprus",
    aliases: ["Leonardo Laura Beach and Splash Resort", "Leonardo Laura Beach & Splash Resort"],
  },
  {
    tyId: "07024b29-1bd2-464b-8b9d-19e0d0ae7fa3",
    name: "Hotel Louis Imperial Beach",
    location: "Paphos, Paphos Region, Cyprus",
    aliases: ["Hotel Louis Imperial Beach", "Louis Imperial Beach"],
  },
  {
    tyId: "4c0ef9b5-aa21-47e3-9751-b1f307a90654",
    name: "TUI BLUE Tropical",
    location: "Sarigerme, Dalaman Region, Turkey",
    aliases: ["TUI BLUE Tropical", "TUI BLUE Seno"],
  },
  {
    tyId: "e9e86fac-0137-4c96-b703-dff30d4a4371",
    name: "Blue Lagoon Resort",
    location: "Kos Town, Kos, Greek Islands, Greece",
    aliases: ["Blue Lagoon Resort"],
  },
  {
    tyId: "b03a16a3-718c-47a7-910f-e849c91c6e00",
    name: "Sunrise Diamond Beach Resort Grand Select",
    location: "Sharm El Sheikh, Red Sea, Egypt",
    aliases: ["Sunrise Diamond Beach Resort Grand Select", "SUNRISE Diamond Beach Resort – Grand Select –"],
  },
];

const NAME_STOP_WORDS = new Set([
  "hotel",
  "resort",
  "apartments",
  "aparthotel",
  "and",
  "the",
  "inn",
  "suites",
  "beach",
  "club",
  "spa",
  "village",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !NAME_STOP_WORDS.has(token));
}

function diceCoefficient(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) intersection += 1;
  }
  return (2 * intersection) / (aSet.size + bSet.size);
}

export function isTrustYouId(value: unknown): value is string {
  return typeof value === "string" && TRUSTYOU_ID_REGEX.test(value.trim());
}

export function resolveTrustYouHotelId(input: {
  hotelName?: string;
  location?: string;
  candidateIds?: Array<string | null | undefined>;
}): string | null {
  for (const candidate of input.candidateIds || []) {
    if (isTrustYouId(candidate)) return candidate.trim();
  }

  const name = String(input.hotelName || "").trim();
  if (!name) return null;

  const normalizedName = normalizeText(name);
  const normalizedLocation = normalizeText(String(input.location || ""));

  // Fast exact alias lookup first.
  for (const seed of TRUSTYOU_HOTEL_SEEDS) {
    const aliases = [seed.name, ...(seed.aliases || [])];
    for (const alias of aliases) {
      if (normalizeText(alias) === normalizedName) return seed.tyId;
    }
  }

  // Fuzzy fallback for slight provider naming differences.
  const queryTokens = toTokens(name);
  if (queryTokens.length === 0) return null;

  let best: { tyId: string; score: number; overlap: number; locBoost: number } | null = null;

  for (const seed of TRUSTYOU_HOTEL_SEEDS) {
    const aliases = [seed.name, ...(seed.aliases || [])];
    for (const alias of aliases) {
      const aliasTokens = toTokens(alias);
      const score = diceCoefficient(queryTokens, aliasTokens);
      const overlap = queryTokens.filter((token) => aliasTokens.includes(token)).length;
      const locBoost =
        normalizedLocation && normalizeText(seed.location).includes(normalizedLocation.split(" ").slice(0, 2).join(" "))
          ? 0.08
          : 0;
      const totalScore = score + locBoost;

      if (!best || totalScore > best.score) {
        best = { tyId: seed.tyId, score: totalScore, overlap, locBoost };
      }
    }
  }

  if (!best) return null;
  if (best.score >= 0.72) return best.tyId;
  if (best.score >= 0.6 && best.overlap >= 3) return best.tyId;
  if (best.score >= 0.52 && best.overlap >= 4 && best.locBoost > 0) return best.tyId;

  return null;
}
