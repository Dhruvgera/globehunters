import type { TrustYouBulkResultItem, TrustYouCategoryBreakdownItem, TrustYouHotelReviewSummary, TrustYouSentiment } from "@/types/trustyou";

interface TrustYouTrustScorePayload {
  meta?: { code?: number };
  response?: {
    ty_id?: string;
    name?: string;
    score?: string | number | null;
    score_description?: string | null;
    reviews_count?: number | null;
    sources_count?: number | null;
  };
}

interface TrustYouMetaReviewPayload {
  meta?: { code?: number };
  response?: {
    summary?: {
      text?: string;
      score?: string | number | null;
      score_description?: string | null;
      highlights?: Array<{ text?: string }>;
    };
    reviews_count?: number | null;
    category_list?: Array<{
      category_id?: string;
      category_name?: string;
      score?: number | null;
      sentiment?: string;
      short_text?: string;
      text?: string;
      summary_sentence_list?: Array<{ text?: string }>;
      highlight_list?: Array<{ text?: string }>;
    }>;
    badge_list?: Array<{ text?: string }>;
    ty_id?: string;
  };
}

interface TrustYouBulkPayload {
  meta?: { code?: number };
  response?: {
    response_list?: Array<TrustYouTrustScorePayload>;
  };
}

export interface TrustYouMappedTrustScoreResult {
  partnerId: string;
  partnerHotelId: string;
  trustScore: TrustYouTrustScorePayload;
}

export function toTrustYouTenScale(value: unknown): { scoreRaw: number; score: number } {
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return { scoreRaw: 0, score: 0 };
  const clampedRaw = Math.max(0, Math.min(100, raw));
  const score = Math.round((clampedRaw / 10) * 10) / 10;
  return { scoreRaw: clampedRaw, score };
}

function stripTags(text: string): string {
  return text
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?pos>/gi, "")
    .replace(/<\/?neu>/gi, "")
    .replace(/<\/?neg>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLine(value: unknown): string {
  const text = stripTags(String(value || "").trim());
  if (!text) return "";
  return text.endsWith(".") ? text : `${text}.`;
}

function toSentiment(value: unknown): TrustYouSentiment {
  const sentiment = String(value || "").toLowerCase().trim();
  if (sentiment === "pos" || sentiment === "neu" || sentiment === "neg") return sentiment;
  return "";
}

function pickCategoryBreakdown(payload: TrustYouMetaReviewPayload | null | undefined): TrustYouCategoryBreakdownItem[] {
  const categoryList = payload?.response?.category_list || [];
  const breakdown = categoryList
    .filter((row) => Number(row?.score || 0) > 0 && String(row?.category_name || "").trim().length > 0)
    .slice(0, 6)
    .map((row) => {
      const label = String(row?.category_name || "").trim();
      return {
        key: String(row?.category_id || label).trim(),
        label,
        score: Math.round((Number(row?.score || 0) / 10) * 10) / 10,
        sentiment: toSentiment(row?.sentiment),
        text: cleanLine(row?.short_text || row?.text || ""),
      };
    })
    .filter((row) => row.label.length > 0 && row.score > 0);

  return breakdown;
}

function pickSnippets(payload: TrustYouMetaReviewPayload | null | undefined): string[] {
  const snippets: string[] = [];
  const summaryText = cleanLine(payload?.response?.summary?.text);
  if (summaryText) snippets.push(summaryText);

  const categories = payload?.response?.category_list || [];
  for (const category of categories.slice(0, 4)) {
    const summaryLines = category.summary_sentence_list || [];
    for (const line of summaryLines) {
      const cleaned = cleanLine(line?.text);
      if (cleaned) snippets.push(cleaned);
      if (snippets.length >= 8) break;
    }
    if (snippets.length >= 8) break;
    const fallback = cleanLine(category.short_text || category.text);
    if (fallback) snippets.push(fallback);
    if (snippets.length >= 8) break;
  }

  return Array.from(new Set(snippets)).slice(0, 8);
}

function pickHighlights(payload: TrustYouMetaReviewPayload | null | undefined): string[] {
  const fromSummary = (payload?.response?.summary?.highlights || [])
    .map((row) => cleanLine(row?.text))
    .filter(Boolean);

  const fromCategories = (payload?.response?.category_list || [])
    .flatMap((category) => (category.highlight_list || []).map((item) => cleanLine(item?.text)))
    .filter(Boolean);

  return Array.from(new Set([...fromSummary, ...fromCategories])).slice(0, 8);
}

function pickBadges(payload: TrustYouMetaReviewPayload | null | undefined): string[] {
  const badges = (payload?.response?.badge_list || [])
    .map((badge) => cleanLine(badge?.text))
    .filter(Boolean);
  return Array.from(new Set(badges)).slice(0, 4);
}

export async function fetchTrustYouTrustScore(tyId: string, apiKey: string): Promise<TrustYouTrustScorePayload> {
  const url = `https://api.trustyou.com/hotels/${encodeURIComponent(tyId)}/trust_score.json?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 },
  });

  const data = (await response.json().catch(() => null)) as TrustYouTrustScorePayload | null;
  if (!response.ok || !data) {
    throw new Error(`TrustYou trust_score request failed with HTTP ${response.status}`);
  }
  if (Number(data?.meta?.code || 0) !== 200 || !data.response) {
    throw new Error("TrustYou trust_score response was not successful.");
  }
  return data;
}

export async function fetchTrustYouMetaReview(tyId: string, apiKey: string): Promise<TrustYouMetaReviewPayload> {
  const url = `https://api.trustyou.com/hotels/${encodeURIComponent(tyId)}/meta_review.json?key=${encodeURIComponent(apiKey)}&lang=en`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 30 },
  });
  const data = (await response.json().catch(() => null)) as TrustYouMetaReviewPayload | null;
  if (!response.ok || !data) {
    throw new Error(`TrustYou meta_review request failed with HTTP ${response.status}`);
  }
  if (Number(data?.meta?.code || 0) !== 200 || !data.response) {
    throw new Error("TrustYou meta_review response was not successful.");
  }
  return data;
}

export async function fetchTrustYouMappedTrustScore(
  partnerId: string,
  partnerHotelId: string,
  apiKey: string
): Promise<TrustYouTrustScorePayload> {
  const safePartnerId = String(partnerId || "").trim();
  const safePartnerHotelId = String(partnerHotelId || "").trim();
  if (!safePartnerId || !safePartnerHotelId) {
    throw new Error("Partner mapping request requires partnerId and partnerHotelId.");
  }

  const url = `https://api.trustyou.com/hotels/mappings/${encodeURIComponent(
    safePartnerId
  )}/${encodeURIComponent(safePartnerHotelId)}/trust_score.json?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 },
  });
  const data = (await response.json().catch(() => null)) as TrustYouTrustScorePayload | null;
  if (!response.ok || !data) {
    throw new Error(`TrustYou mapped trust_score request failed with HTTP ${response.status}`);
  }
  if (Number(data?.meta?.code || 0) !== 200 || !data.response) {
    throw new Error("TrustYou mapped trust_score response was not successful.");
  }
  return data;
}

export function buildTrustYouSummary(
  trustScorePayload: TrustYouTrustScorePayload,
  metaReviewPayload?: TrustYouMetaReviewPayload | null
): TrustYouHotelReviewSummary {
  const response = trustScorePayload.response || {};
  const { scoreRaw, score } = toTrustYouTenScale(response.score);

  const reviewCount =
    Number(response.reviews_count ?? metaReviewPayload?.response?.reviews_count ?? 0) || 0;
  const sourcesCount = Number(response.sources_count ?? 0) || 0;
  const summaryText = cleanLine(metaReviewPayload?.response?.summary?.text || "");

  return {
    tyId: String(response.ty_id || metaReviewPayload?.response?.ty_id || "").trim(),
    name: String(response.name || "").trim(),
    score,
    scoreRaw,
    scoreDescription: String(response.score_description || metaReviewPayload?.response?.summary?.score_description || "").trim(),
    reviewsCount: reviewCount,
    sourcesCount,
    summaryText: summaryText || undefined,
    highlights: pickHighlights(metaReviewPayload),
    snippets: pickSnippets(metaReviewPayload),
    badges: pickBadges(metaReviewPayload),
    categoryBreakdown: pickCategoryBreakdown(metaReviewPayload),
  };
}

export async function fetchTrustYouBulkTrustScores(
  tyIds: string[],
  apiKey: string
): Promise<TrustYouBulkResultItem[]> {
  const uniqueTyIds = Array.from(new Set(tyIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (uniqueTyIds.length === 0) return [];

  const requestList = uniqueTyIds.map((tyId) => `/hotels/${tyId}/trust_score.json`);
  const bulkUrl = `https://api.trustyou.com/bulk?request_list=${encodeURIComponent(
    JSON.stringify(requestList)
  )}&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(bulkUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 },
  });
  const payload = (await response.json().catch(() => null)) as TrustYouBulkPayload | null;
  if (!response.ok || !payload) {
    throw new Error(`TrustYou bulk request failed with HTTP ${response.status}`);
  }
  if (Number(payload?.meta?.code || 0) !== 200) {
    throw new Error("TrustYou bulk response was not successful.");
  }

  const responseList = payload?.response?.response_list || [];
  return responseList
    .map((item) => {
      const row = item.response;
      if (!row || !row.ty_id) return null;
      const { scoreRaw, score } = toTrustYouTenScale(row.score);
      return {
        hotelId: "",
        tyId: row.ty_id,
        name: String(row.name || "").trim(),
        score,
        scoreRaw,
        scoreDescription: String(row.score_description || "").trim(),
        reviewsCount: Number(row.reviews_count || 0),
        sourcesCount: Number(row.sources_count || 0),
      } as TrustYouBulkResultItem;
    })
    .filter((item): item is TrustYouBulkResultItem => !!item && item.tyId.length > 0);
}

export async function resolveTrustYouByPartnerMappings(params: {
  apiKey: string;
  partnerIds: string[];
  partnerHotelIds: string[];
}): Promise<TrustYouMappedTrustScoreResult | null> {
  const partnerIds = Array.from(new Set((params.partnerIds || []).map((v) => String(v || "").trim()).filter(Boolean)));
  const partnerHotelIds = Array.from(
    new Set((params.partnerHotelIds || []).map((v) => String(v || "").trim()).filter(Boolean))
  );
  if (partnerIds.length === 0 || partnerHotelIds.length === 0) return null;

  for (const partnerId of partnerIds) {
    for (const partnerHotelId of partnerHotelIds) {
      try {
        const trustScore = await fetchTrustYouMappedTrustScore(partnerId, partnerHotelId, params.apiKey);
        return { partnerId, partnerHotelId, trustScore };
      } catch {
        // Try the next partner candidate.
      }
    }
  }

  return null;
}
