type LegCodes = { fromCode?: string; toCode?: string };

function code(value: string | undefined) {
  return String(value || "").trim().toUpperCase();
}

/** True when the itinerary ends where it started (or is a simple out-and-back pair). */
function isRoundTrip(legs: LegCodes[]) {
  if (legs.length === 2) return true;
  const origin = code(legs[0]?.fromCode);
  return legs.length > 2 && Boolean(origin) && origin === code(legs[legs.length - 1]?.toCode);
}

/** "Return flights" for round trips (including multi-city loops), "One-way flight" for a single leg. */
export function flightTripLabel(legs: LegCodes[]): string {
  if (legs.length === 0) return "Flights";
  if (legs.length === 1) return "One-way flight";
  return isRoundTrip(legs) ? "Return flights" : "Multi-city flights";
}

/** Airport chain such as "LHR – DPS – SUB – LHR". Empty when any code is missing. */
export function flightRouteCodes(legs: LegCodes[]): string {
  if (legs.length === 0) return "";
  const codes = [code(legs[0].fromCode), ...legs.map((leg) => code(leg.toCode))];
  return codes.every(Boolean) ? codes.join(" – ") : "";
}
