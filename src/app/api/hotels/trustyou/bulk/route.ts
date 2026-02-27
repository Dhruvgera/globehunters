import { NextRequest, NextResponse } from "next/server";

import {
  fetchTrustYouBulkTrustScores,
  resolveTrustYouByPartnerMappings,
  toTrustYouTenScale,
} from "@/lib/trustyou/client";
import { resolveTrustYouHotelId } from "@/lib/trustyou/hotelMapping";
import type { TrustYouBulkResultItem } from "@/types/trustyou";

interface TrustYouBulkRequestItem {
  hotelId: string;
  tyId?: string;
  hotelName?: string;
  location?: string;
  partnerHotelIds?: string[];
}

interface TrustYouBulkRequestBody {
  items?: TrustYouBulkRequestItem[];
}

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function configuredTrustYouPartnerIds(): string[] {
  const single = String(process.env.TRUSTYOU_PARTNER_ID || "").trim();
  const many = parseCsv(process.env.TRUSTYOU_PARTNER_IDS || null);
  return Array.from(new Set([single, ...many].filter(Boolean)));
}

function toBulkItemFromTrustScorePayload(hotelId: string, payload: { response?: Record<string, unknown> } | null): TrustYouBulkResultItem | null {
  const row = payload?.response || null;
  const tyId = String(row?.ty_id || "").trim();
  if (!tyId) return null;
  const { scoreRaw, score } = toTrustYouTenScale(row?.score);
  return {
    hotelId,
    tyId,
    name: String(row?.name || "").trim(),
    score,
    scoreRaw,
    scoreDescription: String(row?.score_description || "").trim(),
    reviewsCount: Number(row?.reviews_count || 0),
    sourcesCount: Number(row?.sources_count || 0),
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.TRUSTYOU_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "TRUSTYOU_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as TrustYouBulkRequestBody | null;
  const inputItems = Array.isArray(body?.items) ? body.items : [];
  if (inputItems.length === 0) {
    return NextResponse.json({ ok: true, reviewsByHotelId: {}, unresolvedHotelIds: [] });
  }

  const resolvedByHotelId = new Map<string, string>();
  const reviewsByHotelId: Record<string, TrustYouBulkResultItem> = {};
  const unresolvedForMapping: TrustYouBulkRequestItem[] = [];
  for (const item of inputItems) {
    const hotelId = String(item?.hotelId || "").trim();
    if (!hotelId) continue;
    const tyId = resolveTrustYouHotelId({
      hotelName: item.hotelName,
      location: item.location,
      candidateIds: [item.tyId],
    });
    if (tyId) {
      resolvedByHotelId.set(hotelId, tyId);
    } else {
      unresolvedForMapping.push(item);
    }
  }

  const partnerIds = configuredTrustYouPartnerIds();
  if (partnerIds.length > 0 && unresolvedForMapping.length > 0) {
    for (const item of unresolvedForMapping) {
      const hotelId = String(item?.hotelId || "").trim();
      if (!hotelId) continue;
      const partnerHotelIds = Array.from(
        new Set([hotelId, ...(item.partnerHotelIds || [])].map((value) => String(value || "").trim()).filter(Boolean))
      );
      const mapped = await resolveTrustYouByPartnerMappings({
        apiKey,
        partnerIds,
        partnerHotelIds,
      });
      if (!mapped?.trustScore) continue;

      const mappedReview = toBulkItemFromTrustScorePayload(hotelId, mapped.trustScore);
      if (!mappedReview) continue;

      reviewsByHotelId[hotelId] = mappedReview;
      resolvedByHotelId.set(hotelId, mappedReview.tyId);
    }
  }

  try {
    const tyIdsToFetch = Array.from(
      new Set(
        Array.from(resolvedByHotelId.entries())
          .filter(([hotelId]) => !reviewsByHotelId[hotelId])
          .map(([, tyId]) => tyId)
      )
    );

    const trustScores = tyIdsToFetch.length > 0 ? await fetchTrustYouBulkTrustScores(tyIdsToFetch, apiKey) : [];
    const byTyId = new Map<string, TrustYouBulkResultItem>();
    for (const item of trustScores) {
      byTyId.set(item.tyId, item);
    }

    for (const inputItem of inputItems) {
      const hotelId = String(inputItem?.hotelId || "").trim();
      if (!hotelId) continue;
      if (reviewsByHotelId[hotelId]) continue;
      const tyId = resolvedByHotelId.get(hotelId);
      if (!tyId) continue;
      const trustScore = byTyId.get(tyId);
      if (!trustScore) continue;
      reviewsByHotelId[hotelId] = {
        ...trustScore,
        hotelId,
      };
    }

    const unresolvedHotelIds = inputItems
      .map((item) => String(item.hotelId || "").trim())
      .filter((hotelId) => Boolean(hotelId) && !reviewsByHotelId[hotelId]);

    return NextResponse.json({
      ok: true,
      reviewsByHotelId,
      unresolvedHotelIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch TrustYou bulk data.";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
