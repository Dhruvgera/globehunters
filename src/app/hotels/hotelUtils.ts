import { HotelFiltersState } from "@/components/hotels/HotelFiltersSidebar";
import { normalizeHotelChildAges } from "@/lib/hotels/childAges";
import { fixStubaImageUrl } from "@/lib/hotels/imageUrl";
import { getHotelProvider, parseHotelProvider, type HotelProvider } from "@/lib/hotels/provider";
import { resolveTrustYouHotelId } from "@/lib/trustyou/hotelMapping";
import { Hotel } from "@/types/hotel";

export const DEFAULT_FILTERS: HotelFiltersState = {
    propertyQuery: "",
    neighborhoods: [],
    amenities: [],
    popular: {
        breakfastIncluded: false,
        reserveWithoutCard: false,
        reserveNowPayLater: false,
        airportShuttle: false,
    },
    priceMode: "nightly",
    priceRange: [20, 250],
    starRatings: [],
    fullyRefundableOnly: false,
    mealPlans: [],
    bedrooms: null,
    accessibility: [],
};

export const SHOW_HYBRID_PROVIDER_IN_RESULTS = ["1", "true", "yes", "on"].includes(
    String(process.env.NEXT_PUBLIC_SHOW_HOTEL_PROVIDER_IN_RESULTS || "").trim().toLowerCase()
);

export const VYSPA_SEARCH_TIMEOUT_SEC = (() => {
    const raw = Number(process.env.NEXT_PUBLIC_VYSPA_HOTELS_TIMEOUT_SEC || 8);
    if (!Number.isFinite(raw) || raw <= 0) return 8;
    return Math.max(5, Math.trunc(raw));
})();

export const HYBRID_POLL_INTERVAL_MS = (() => {
    const raw = Number(process.env.NEXT_PUBLIC_HYBRID_VYSPA_POLL_INTERVAL_MS || 5000);
    if (!Number.isFinite(raw) || raw <= 0) return 5000;
    return Math.max(5000, Math.trunc(raw));
})();

export const HYBRID_MAX_POLLS = (() => {
    const raw = Number(process.env.NEXT_PUBLIC_HYBRID_VYSPA_MAX_POLLS || 5);
    if (!Number.isFinite(raw) || raw <= 0) return 5;
    return Math.max(1, Math.trunc(raw));
})();

export const ENABLE_TRUSTYOU_ENRICHMENT = false;
export const HOTEL_PROVIDER_TOGGLE_ENABLED = ["1", "true", "yes", "on"].includes(
    String(process.env.NEXT_PUBLIC_ENABLE_HOTEL_PROVIDER_TOGGLE || "").trim().toLowerCase()
);
export const HYBRID_SUPPLIER_FILTER_ENABLED =
    SHOW_HYBRID_PROVIDER_IN_RESULTS ||
    ["1", "true", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_DEBUG_HOTEL_DATES || "").trim().toLowerCase());
export const HOTEL_PROVIDER_OVERRIDE_STORAGE_KEY = "gh-hotel-provider-override";



export function normalizeMealPlanLabel(raw: string): string {
    const s = String(raw || "").trim();
    if (!s) return "";
    const upper = s.toUpperCase();
    // Common Vyspa meal plan codes
    if (upper === "RO") return "Room only";
    if (upper === "BB") return "Breakfast";
    if (upper === "HB") return "Half board";
    if (upper === "FB") return "Full board";
    if (upper === "AI") return "All inclusive";
    // Sometimes API returns already-human labels
    if (upper.includes("BREAKFAST")) return "Breakfast";
    const lettersOnly = s.replace(/[^A-Za-z]/g, "");
    const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
    if (!isAllCaps) return s;
    return s
        .toLowerCase()
        .replace(/\b[a-z]/g, (m) => m.toUpperCase())
        .replace(/\bAnd\b/g, "and")
        .replace(/\bOf\b/g, "of");
}

export function mealPlanKey(raw: string): string {
    return normalizeMealPlanLabel(raw).toLowerCase().replace(/\s+/g, " ").trim();
}

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toReadableNeighborhoodCase(value: string): string {
    const text = String(value || "").trim();
    if (!text) return "";
    const lettersOnly = text.replace(/[^A-Za-z]/g, "");
    const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
    if (!isAllCaps) return text;
    return text
        .toLowerCase()
        .replace(/\b[a-z]/g, (m) => m.toUpperCase())
        .replace(/\bUae\b/g, "UAE");
}

export function normalizeNeighborhoodValue(
    raw: string,
    context: { city?: string; country?: string; searchLocation?: string } = {}
): { key: string; label: string } {
    const original = String(raw || "").replace(/\s+/g, " ").trim();
    if (!original) return { key: "", label: "" };

    let normalized = original;
    const suffixes = [
        context.country,
        context.city,
        context.searchLocation,
    ]
        .map((v) => String(v || "").trim())
        .filter(Boolean);

    for (const suffix of suffixes) {
        const escaped = escapeRegExp(suffix);
        normalized = normalized
            .replace(new RegExp(`(?:\\s*[,-]\\s*|\\s+-\\s+)${escaped}$`, "i"), "")
            .replace(new RegExp(`\\s+${escaped}$`, "i"), "")
            .trim();
    }

    const label = toReadableNeighborhoodCase(normalized || original);
    const key = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    return { key, label };
}

export function includesBreakfast(mealPlans: string[]): boolean {
    return mealPlans.some((p) => normalizeMealPlanLabel(p).toLowerCase().includes("breakfast"));
}

export function mealPlanFieldCandidates(rawMealPlan: string): string[] {
    const key = mealPlanKey(rawMealPlan);
    switch (key) {
        case "room only":
        case "ro":
            return ["MinRO"];
        case "bed and breakfast":
        case "bb":
        case "breakfast":
            return ["MinBB"];
        case "half board":
        case "hb":
            return ["MinHB"];
        case "full board":
        case "fb":
            return ["MinFB"];
        case "all inclusive":
        case "ai":
            return ["MinAI"];
        case "self catering":
        case "sc":
            return ["MinSC"];
        default:
            return [];
    }
}

export function parsePositivePriceCandidate(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

export function buildPackageRoomConfigurations(
    adults: number,
    children: number,
    rooms: number,
    childAgesInput: unknown
) {
    const roomCount = Math.max(1, Number(rooms || 1));
    const totalAdults = Math.max(roomCount, Number(adults || 0));
    const totalChildren = Math.max(0, Number(children || 0));
    const normalizedChildAges = normalizeHotelChildAges(childAgesInput, roomCount, totalChildren);
    const baseAdults = Math.floor(totalAdults / roomCount);
    const adultRemainder = totalAdults % roomCount;

    return Array.from({ length: roomCount }, (_, roomIndex) => {
        const roomChildren = normalizedChildAges[roomIndex] || {};
        return {
            adults: Math.max(1, baseAdults + (roomIndex < adultRemainder ? 1 : 0)),
            children: Object.keys(roomChildren).length,
            childAges: Object.entries(roomChildren)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([, age]) => Number(age)),
            infants: 0,
        };
    });
}

export function toPositiveNumericId(value: unknown): string | null {
    const s = String(value ?? "").trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    return s;
}

export function clampStar(n: any): 1 | 2 | 3 | 4 | 5 {
    const v = Math.round(Number(n) || 3);
    if (v <= 1) return 1;
    if (v === 2) return 2;
    if (v === 3) return 3;
    if (v === 4) return 4;
    return 5;
}
export function sanitizeHiddenHotelFilters(filters: HotelFiltersState): HotelFiltersState {
    return {
        ...filters,
        popular: {
            breakfastIncluded: false,
            reserveWithoutCard: false,
            reserveNowPayLater: false,
            airportShuttle: false,
        },
        bedrooms: null,
        accessibility: [],
    };
}

export function isVyspaSearchCriteriaId(value: unknown): value is number | string {
    if (typeof value === "number" && Number.isFinite(value)) return true;
    const normalized = String(value ?? "").trim();
    return /^\d+$/.test(normalized);
}

export function currencySymbol(code?: string) {
    const c = (code || "").toUpperCase();
    if (c === "GBP") return "£";
    if (c === "USD") return "$";
    if (c === "EUR") return "€";
    return c ? `${c} ` : "$";
}

export function parseSearchComplete(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
    }
    return null;
}

function trustYouIdFromRawResult(rawResult: Record<string, unknown> | null | undefined): string | null {
    if (!rawResult) return null;
    const topLevelCandidates = [
        rawResult.ty_id,
        rawResult.tyId,
        rawResult.trustyou_id,
        rawResult.trustyouId,
        rawResult.trust_you_id,
    ];
    const nestedHotelBeds = (rawResult._hotelbeds ?? null) as Record<string, unknown> | null;
    const nestedCandidates = nestedHotelBeds
        ? [
            nestedHotelBeds.ty_id,
            nestedHotelBeds.tyId,
            nestedHotelBeds.trustyou_id,
            nestedHotelBeds.trustyouId,
        ]
        : [];

    return resolveTrustYouHotelId({
        candidateIds: [...topLevelCandidates, ...nestedCandidates].map((v) => String(v || "").trim()),
    });
}


function parsePriceFromResult(r: any): number | null {
    const candidates = [
        Array.isArray(r?.NetPrices) && r.NetPrices.length > 0 ? Math.min(...r.NetPrices.map((x: any) => Number(x) || Infinity)) : null,
        r?.min_price,
        r?.minPrice,
        r?.price,
        r?.total_price,
        r?.totalPrice,
        r?.amount,
        r?.MinPrice,
    ];
    for (const c of candidates) {
        if (c == null) continue;
        const num = typeof c === "string" ? Number(c.replace(/[^\d.]/g, "")) : Number(c);
        if (!Number.isNaN(num) && num > 0) return num;
    }
    return null;
}
//parse availability response
function resolveHotelResultId(r: any, fallbackIdx?: number): string {
    const hotelId = toPositiveNumericId(r?.hotel_id ?? r?.hotelId);
    if (hotelId) return hotelId;

    const srId = toPositiveNumericId(r?.id ?? r?.srId);
    if (srId) return srId;

    return String(fallbackIdx ?? 0);
}



export function shortWebRefFromToken(token: string): string {
    // Small, deterministic hash for display only (avoid leaking long opaque tokens in UI).
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
        h ^= token.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return `HB-${(h >>> 0).toString(16).padStart(8, "0").slice(0, 8).toUpperCase()}`;
}


function extractResultAmenities(result: any): string[] {
    const values = new Set<string>();

    if (Array.isArray(result?.amenities)) {
        for (const amenity of result.amenities) {
            const value = String(amenity || "").trim();
            if (!value) continue;
            values.add(value);
            if (values.size >= 24) return Array.from(values);
        }
    }

    const attributes =
        result?.attributes && typeof result.attributes === "object" && !Array.isArray(result.attributes)
            ? result.attributes
            : null;
    if (attributes) {
        for (const value of Object.values(attributes)) {
            const normalized = String(value || "").trim();
            if (!normalized) continue;
            values.add(normalized);
            if (values.size >= 24) break;
        }
    }

    return Array.from(values);
}

export type ParsedAvailability = {
    mapped: Hotel[];
    meta: Record<string, any>;
    results: any[];
    criteriaId: number | string | null;
    criteriaProvider: HotelProvider;
    isHybridProviderResponse: boolean;
    searchComplete: boolean | null;
};

export const mapAvailability = (availabilityResponse: any, nights: number, rooms: number): ParsedAvailability => {
    const rawResults = availabilityResponse?.Results || [];
    const criteria = availabilityResponse?.Criteria;
    const rawCriteriaId = (criteria as any)?.searchCriteriaId;
    const criteriaId =
        typeof rawCriteriaId === "number" || typeof rawCriteriaId === "string" ? rawCriteriaId : null;
    const criteriaProvider = getHotelProvider((criteria as any)?.provider);
    const isHybridProviderResponse = criteriaProvider === "hybrid";
    const searchComplete = parseSearchComplete((criteria as any)?.searchComplete);

    // Filter out non-object results (e.g. [true, "No hotels found"] becomes empty array)
    const results = rawResults.filter(
        (r: any) => r && typeof r === "object" && !Array.isArray(r) && (r.hotel_id || r.hotelId || r.id)
    );

    // Debug logging - track what we receive from API vs what we render
    console.log('[Hotels Page] Raw API Results Count:', rawResults.length);
    console.log('[Hotels Page] Valid Hotel Objects Count:', results.length);
    console.log('[Hotels Page] Search Criteria ID:', criteriaId);
    console.log('[Hotels Page] Search Complete:', searchComplete);

    const mapped: Hotel[] = results.map((r: any, idx: number) => {
        const hotelId = resolveHotelResultId(r, idx);
        const rowProvider = String(r?.provider || "").trim().toLowerCase() === "hotelbeds" ? "hotelbeds" : "vyspa";
        const rawSearchResult = (r ?? null) as Record<string, unknown> | null;
        const total = parsePriceFromResult(r) ?? 0;
        const sellCur = r?.SellCur || r?.sellCur || r?.currency;
        const rawMealPlans = Array.isArray(r?.MealPlans) ? r.MealPlans.filter(Boolean) : [];
        const mealPlansByKey = new Map<string, string>();
        for (const rawPlan of rawMealPlans) {
            const label = normalizeMealPlanLabel(String(rawPlan));
            const key = mealPlanKey(label);
            if (!label || !key) continue;
            if (!mealPlansByKey.has(key)) mealPlansByKey.set(key, label);
        }
        const mealPlans = Array.from(mealPlansByKey.values());
        const reviewsRating = Number(r?.reviews_rating ?? 0) || 0;
        const reviewsLabelRaw = String(r?.reviews_label || r?.reviews_description || r?.reviews_desc || "").trim();
        const amenitiesSet = new Set<string>();
        const hasBreakfast = includesBreakfast(rawMealPlans) || includesBreakfast(mealPlans);
        if (hasBreakfast) {
            amenitiesSet.add("Breakfast included");
        }
        for (const amenity of extractResultAmenities(r)) {
            amenitiesSet.add(amenity);
            if (amenitiesSet.size >= 24) break;
        }
        const amenities = Array.from(amenitiesSet) as Hotel["amenities"];

        const totalReviews = Number(r?.total_reviews ?? 0) || 0;
        const cityName = r?.cityName || r?.city_name || "";
        const countryName = r?.countryName || r?.country_name || "";
        const quickDesc = r?.quickDescription || "";
        const starRating = clampStar(r?.hotel_rating ?? r?.hotelRating);
        const hbCheapest = (r as any)?._hotelbeds?.cheapest;
        const resolvedTrustYouId =
            trustYouIdFromRawResult(rawSearchResult) ||
            resolveTrustYouHotelId({
                hotelName: r?.hotel_name || r?.hotelName,
                location: [r?.address1, r?.address2, cityName, countryName].filter(Boolean).join(", "),
            });

        return {
            id: hotelId,
            tyId: resolvedTrustYouId || undefined,
            name: r?.hotel_name || r?.hotelName || `Hotel ${hotelId}`,
            distanceLabel:
                r?.address1 || r?.address2
                    ? [r?.address1, r?.address2].filter(Boolean).join(", ")
                    : "",
            neighborhood: cityName && countryName ? `${cityName}, ${countryName}` : cityName || countryName || undefined,
            starRating,
            amenities,
            room: {
                name:
                    hbCheapest?.roomName
                        ? `${hbCheapest.roomName}${hbCheapest.boardName ? ` · ${normalizeMealPlanLabel(String(hbCheapest.boardName))}` : ""}`
                        : mealPlans.length > 0
                            ? `Meal plans: ${mealPlans.slice(0, 2).join(", ")}${mealPlans.length > 2 ? " +" : ""}`
                            : "Room options available",
                highlights: [
                    ...(r?.AvailabilityStatuses ? [`Availability: ${r.AvailabilityStatuses}`] : []),
                    ...(SHOW_HYBRID_PROVIDER_IN_RESULTS && isHybridProviderResponse ? [`Provider: ${rowProvider}`] : []),
                    ...(r?.suppliers?.[0] ? [`Supplier: ${r.suppliers[0]}`] : []),
                    ...(hbCheapest?.refundable === true ? ["Refundable"] : hbCheapest?.refundable === false ? ["Non-refundable"] : []),
                ].slice(0, 2),
            },
            reviews: {
                score: reviewsRating,
                label: reviewsRating > 0 ? reviewsLabelRaw || "Guest rating" : "No guest rating yet",
                count: totalReviews,
            },
            price: {
                currency: currencySymbol(sellCur),
                nightly: nights > 0 ? Math.round((total / nights) * 100) / 100 : total,
                total,
                nights,
                rooms: rooms,
            },
            imageSrc: fixStubaImageUrl(r?.image_name) || "/hotel-placeholder.jpg",
            description: quickDesc,
            cityName,
            countryName,
            mealPlans,
            refundable: hbCheapest?.refundable === true ? true : hbCheapest?.refundable === false ? false : null,
            deepLinkKeys: typeof r?.keys === 'object' && r?.keys !== null && !Array.isArray(r?.keys)
                ? (r?.keys as Record<string, string>)
                : undefined,
            deepLinkUrl: typeof r?.DeepLink === 'string' ? r.DeepLink : undefined,
            rawSearchResult,
        };
    });

    const meta: Record<string, any> = {};
    for (const r of results as any[]) {
        const hid = resolveHotelResultId(r);
        if (!hid) continue;
        const rowProvider = String(r?.provider || "").trim().toLowerCase() === "hotelbeds" ? "hotelbeds" : "vyspa";
        const rowSearchCriteriaAny =
            rowProvider === "hotelbeds"
                ? ((r as any)?.searchCriteriaId ?? (r as any)?._hotelbeds?.searchToken ?? criteriaId)
                : criteriaId;
        const rowSearchCriteriaId =
            typeof rowSearchCriteriaAny === "string" || typeof rowSearchCriteriaAny === "number"
                ? rowSearchCriteriaAny
                : undefined;
        meta[hid] = {
            hotelId: hid,
            hotelName: r?.hotel_name || r?.hotelName,
            provider: rowProvider,
            searchCriteriaId: rowSearchCriteriaId,
            searchResultId: r?.id ? String(r.id) : undefined,
            srId: r?.id ? String(r.id) : undefined,
            vyspaHotelId: toPositiveNumericId(r?.hotel_id ?? r?.hotelId) || undefined,
            vMapId: toPositiveNumericId(r?.VmapId ?? r?.vMapId) || undefined,
            imageName: typeof r?.image_name === "string" ? fixStubaImageUrl(r.image_name) : undefined,
            address1: typeof r?.address1 === "string" ? r.address1 : undefined,
            address2: typeof r?.address2 === "string" ? r.address2 : undefined,
            hotelRating: Number.isFinite(Number(r?.hotel_rating)) ? Number(r.hotel_rating) : undefined,
            trustyouId:
                trustYouIdFromRawResult((r ?? null) as Record<string, unknown> | null) ||
                resolveTrustYouHotelId({
                    hotelName: r?.hotel_name || r?.hotelName,
                    location: [r?.address1, r?.address2, r?.city_name, r?.country_name].filter(Boolean).join(", "),
                }) ||
                undefined,
            rawSearchResult: r,
        };
    }

    return {
        mapped,
        meta,
        results,
        criteriaId,
        isHybridProviderResponse,
        searchComplete,
        criteriaProvider,
    };
};