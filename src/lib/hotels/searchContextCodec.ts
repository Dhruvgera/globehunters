import type { HotelChildAges } from "@/lib/hotels/childAges";

export interface HotelSearchUrlContext {
  provider?: "vyspa" | "hotelbeds";
  location: string;
  hidden_id: string;
  hidden_key: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  child_age?: HotelChildAges;
  branches?: string;
  searchCriteriaId?: number | string;
  arrivalPointCode?: string;
}

const URL_SAFE_MAP: Record<string, string> = { "+": "-", "/": "_", "=": "" };
const URL_SAFE_RESTORE: Record<string, string> = { "-": "+", _: "/" };

function toUrlSafe(base64: string): string {
  return base64.replace(/[+/=]/g, (ch) => URL_SAFE_MAP[ch] ?? ch);
}

function fromUrlSafe(safe: string): string {
  const restored = safe.replace(/[-_]/g, (ch) => URL_SAFE_RESTORE[ch] ?? ch);
  const pad = restored.length % 4;
  return pad ? restored + "=".repeat(4 - pad) : restored;
}

export function encodeHotelSearchContext(ctx: HotelSearchUrlContext): string {
  try {
    const json = JSON.stringify({
      p: ctx.provider,
      l: ctx.location,
      hi: ctx.hidden_id,
      hk: ctx.hidden_key,
      ci: ctx.checkIn,
      co: ctx.checkOut,
      r: ctx.rooms,
      a: ctx.adults,
      c: ctx.children,
      ca: ctx.child_age,
      b: ctx.branches,
      sc: ctx.searchCriteriaId,
      ap: ctx.arrivalPointCode,
    });
    const encoded = typeof window !== "undefined"
      ? window.btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf-8").toString("base64");
    return toUrlSafe(encoded);
  } catch {
    return "";
  }
}

export function decodeHotelSearchContext(encoded: string): HotelSearchUrlContext | null {
  if (!encoded) return null;
  try {
    const base64 = fromUrlSafe(encoded);
    const json = typeof window !== "undefined"
      ? decodeURIComponent(escape(window.atob(base64)))
      : Buffer.from(base64, "base64").toString("utf-8");
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object") return null;
    return {
      provider: typeof obj.p === "string" ? obj.p : undefined,
      location: String(obj.l || ""),
      hidden_id: String(obj.hi || ""),
      hidden_key: String(obj.hk || ""),
      checkIn: String(obj.ci || ""),
      checkOut: String(obj.co || ""),
      rooms: Number(obj.r) || 1,
      adults: Number(obj.a) || 2,
      children: Number(obj.c) || 0,
      child_age: Array.isArray(obj.ca) ? obj.ca : undefined,
      branches: typeof obj.b === "string" ? obj.b : undefined,
      searchCriteriaId: obj.sc != null ? obj.sc : undefined,
      arrivalPointCode: typeof obj.ap === "string" ? obj.ap : undefined,
    };
  } catch {
    return null;
  }
}
