function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Flight dates arrive either as ISO ("2027-01-11") or as display text ("MON, 11 JAN 27").
 * Returns ISO (YYYY-MM-DD) so dates can be compared with hotel check-in dates.
 */
export function normalizeFlightDate(value: string | null | undefined): string {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const display = text.toUpperCase().match(/(?:[A-Z]{3},?\s+)?(\d{1,2})\s+([A-Z]{3})\s+(\d{4}|\d{2})(?!\d)/);
  if (display) {
    const months: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };
    const month = months[display[2]];
    if (month) {
      const year = display[3].length === 2 ? `20${display[3]}` : display[3];
      return `${year}-${month}-${display[1].padStart(2, "0")}`;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : isoDate(parsed);
}
