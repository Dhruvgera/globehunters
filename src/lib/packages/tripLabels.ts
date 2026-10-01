/** "Return flights" for an out-and-back pair, "One-way flight" for a single leg, otherwise "N flights". */
export function flightTripLabel(legCount: number): string {
  if (legCount === 1) return "One-way flight";
  if (legCount === 2) return "Return flights";
  return `${legCount} flights`;
}
