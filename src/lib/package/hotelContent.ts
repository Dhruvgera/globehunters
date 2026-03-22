export interface PackageHotelNearbyPlace {
  name: string;
  distanceKm?: number;
  distanceMi?: number;
  kind: "landmark" | "airport";
}

export interface ParsedPackageHotelContent {
  propertyType?: string;
  description: string;
  descriptionParagraphs: string[];
  amenities: string[];
  policies: string[];
  policyText: string;
  nearby: PackageHotelNearbyPlace[];
}

type SectionKey =
  | "propertyType"
  | "surrounding"
  | "rooms"
  | "property"
  | "nearby"
  | "policies"
  | "dining";

const SECTION_PATTERNS: Array<{ key: SectionKey; pattern: RegExp }> = [
  { key: "propertyType", pattern: /Type is:/gi },
  { key: "surrounding", pattern: /Information about the surrounding area:/gi },
  { key: "rooms", pattern: /Details of room types available:/gi },
  { key: "property", pattern: /Information about the hotel property:/gi },
  { key: "nearby", pattern: /Activities available near the hotel:/gi },
  { key: "policies", pattern: /Hotel policies and disclaimer:/gi },
  { key: "dining", pattern: /Meals and restaurants at the hotel:/gi },
];

const AMENITY_RULES: Array<[RegExp, string]> = [
  [/\bwi-?fi\b|\bwireless internet\b|\bwireless internet access\b|\binternet access\b/i, "Free WiFi"],
  [/\brestaurants?\b/i, "Restaurant"],
  [/\bbar\/lounge\b|\bwine bar\b|\bbar\b/i, "Bar"],
  [/\bpoolside bar\b/i, "Poolside bar"],
  [/\bbuffet breakfasts?\b|\bbreakfasts? are served\b|\bbreakfasts? (are )?available\b/i, "Breakfast available"],
  [/\broom service\b/i, "24-hour room service"],
  [/\boutdoor pool\b|\bswimming pool\b/i, "Outdoor pool"],
  [/\bsauna\b/i, "Sauna"],
  [/\bspa\b|\bmassages?\b/i, "Spa"],
  [/\b24-hour fitness center\b|\b24-hour fitness centre\b/i, "24-hour fitness centre"],
  [/\bfitness center\b|\bfitness centre\b|\bgym\b/i, "Fitness centre"],
  [/\bconcierge\b/i, "Concierge service"],
  [/\bwedding services?\b/i, "Wedding services"],
  [/\bair-?conditioned rooms?\b|\bair conditioning\b/i, "Air conditioning"],
  [/\bipod docking stations?\b/i, "iPod docking station"],
  [/\blcd televisions?\b|\blcd tv\b/i, "LCD TV"],
  [/\bsatellite programming\b|\bsatellite tv\b/i, "Satellite TV"],
  [/\bprivate bathrooms?\b/i, "Private bathroom"],
  [/\bseparate bathtubs? and showers?\b/i, "Separate bathtub and shower"],
  [/\bdeep soaking bathtubs?\b/i, "Deep soaking bathtub"],
  [/\brainfall showerheads?\b/i, "Rainfall showerhead"],
  [/\bsafes?\b/i, "In-room safe"],
  [/\bdesks?\b/i, "Desk"],
];

const POLICY_SPLIT_MARKERS = [
  "Extra-person charges may apply",
  "Government-issued photo identification",
  "Special requests are subject to availability",
  "The name on the credit card used at check-in",
  "This property accepts credit cards and cash",
  "This property affirms that it follows",
  "Reservations are required for spa treatments",
  "One child 12 years old or younger stays free",
  "Only registered guests are allowed",
  "No pets and no service animals are allowed",
  "Contactless check-in and contactless check-out are available",
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function sanitizePackageHotelText(value: unknown): string {
  const text = decodeHtmlEntities(String(value ?? ""))
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function joinUniqueTextBlocks(blocks: string[], separator = "\n\n"): string {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const block of blocks) {
    const normalized = sanitizePackageHotelText(block);
    if (!normalized) continue;
    const key = normalized.replace(/\s+/g, " ").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out.join(separator);
}

function splitIntoParagraphs(value: string): string[] {
  return sanitizePackageHotelText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function collectSections(input: string): Partial<Record<SectionKey, string>> {
  const matches = SECTION_PATTERNS.flatMap(({ key, pattern }) =>
    Array.from(input.matchAll(pattern)).map((match) => ({
      key,
      index: match.index ?? 0,
      length: match[0].length,
    }))
  ).sort((a, b) => a.index - b.index);

  if (matches.length === 0) return {};

  const sections: Partial<Record<SectionKey, string>> = {};
  matches.forEach((match, index) => {
    const start = match.index + match.length;
    const end = index + 1 < matches.length ? matches[index + 1].index : input.length;
    sections[match.key] = input.slice(start, end).trim();
  });

  return sections;
}

function extractAmenities(...sources: Array<string | undefined>): string[] {
  const labels = new Set<string>();
  for (const source of sources) {
    const text = sanitizePackageHotelText(source).replace(/\n/g, " ");
    if (!text) continue;
    for (const [pattern, label] of AMENITY_RULES) {
      if (pattern.test(text)) labels.add(label);
    }
  }
  return Array.from(labels).slice(0, 24);
}

function splitPolicyLines(policyText: string): string[] {
  if (!policyText) return [];

  let normalized = sanitizePackageHotelText(policyText)
    .replace(/\s+[•●·]\s+/g, "\n")
    .replace(/\s+-\s+/g, "\n- ");

  for (const marker of POLICY_SPLIT_MARKERS) {
    normalized = normalized.replace(new RegExp(`\\s+(?=${escapeRegExp(marker)})`, "g"), "\n");
  }

  return Array.from(
    new Set(
      normalized
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter(Boolean)
    )
  );
}

function parseDistanceMatches(value: string, kind: "landmark" | "airport"): PackageHotelNearbyPlace[] {
  const normalized = sanitizePackageHotelText(value)
    .replace(/Distances are displayed to the nearest[^.]*\./gi, " ");
  const matches = normalized.matchAll(/([A-Za-z0-9'().,&/\- ]+?)\s*-\s*([0-9]+(?:\.[0-9]+)?)\s*km\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*mi/gi);
  const seen = new Set<string>();
  const places: PackageHotelNearbyPlace[] = [];

  for (const match of matches) {
    const name = sanitizePackageHotelText(match[1]).replace(/\.$/, "");
    if (!name) continue;
    const key = `${kind}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      name,
      distanceKm: Number(match[2]),
      distanceMi: Number(match[3]),
      kind,
    });
  }

  return places;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePackageHotelContent(value: unknown): ParsedPackageHotelContent {
  const raw = sanitizePackageHotelText(value);
  if (!raw) {
    return {
      description: "",
      descriptionParagraphs: [],
      amenities: [],
      policies: [],
      policyText: "",
      nearby: [],
    };
  }

  const sections = collectSections(raw);
  const hasStructuredSections = Object.keys(sections).length > 0;
  const propertyType = sanitizePackageHotelText(sections.propertyType);

  const overviewParagraphs = [
    sections.surrounding,
    sections.rooms,
    sections.property,
    sections.dining,
  ]
    .flatMap((section) => splitIntoParagraphs(section || ""))
    .slice(0, 6);

  const description = hasStructuredSections
    ? joinUniqueTextBlocks(overviewParagraphs)
    : joinUniqueTextBlocks(splitIntoParagraphs(raw).slice(0, 6));
  const policyText = joinUniqueTextBlocks(splitPolicyLines(sections.policies || ""), "\n");
  const nearbySection = sanitizePackageHotelText(sections.nearby || "");
  const airportSplit = nearbySection.split(/The nearest airports are:/i);
  const landmarkText = airportSplit[0] || nearbySection;
  const airportText = airportSplit.slice(1).join(" ") || "";
  const nearby = hasStructuredSections
    ? [
        ...parseDistanceMatches(landmarkText, "landmark"),
        ...parseDistanceMatches(airportText, "airport"),
      ]
    : parseDistanceMatches(raw, "landmark");

  return {
    propertyType: propertyType || undefined,
    description,
    descriptionParagraphs: splitIntoParagraphs(description),
    amenities: extractAmenities(
      sections.rooms,
      sections.property,
      sections.dining,
      sections.surrounding,
      hasStructuredSections ? undefined : raw
    ),
    policies: splitPolicyLines(policyText),
    policyText,
    nearby,
  };
}
