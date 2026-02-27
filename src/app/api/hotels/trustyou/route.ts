import { NextRequest, NextResponse } from "next/server";

import {
  buildTrustYouSummary,
  fetchTrustYouMetaReview,
  fetchTrustYouTrustScore,
  resolveTrustYouByPartnerMappings,
} from "@/lib/trustyou/client";
import { isTrustYouId, resolveTrustYouHotelId } from "@/lib/trustyou/hotelMapping";

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
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

export async function GET(req: NextRequest) {
  const apiKey = process.env.TRUSTYOU_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "TRUSTYOU_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const params = req.nextUrl.searchParams;
  const tyIdParam = params.get("tyId");
  const hotelIdParam = params.get("hotelId");
  const hotelName = params.get("hotelName") || "";
  const location = params.get("location") || "";
  const withDetails = parseBoolean(params.get("details"));
  const partnerHotelId = params.get("partnerHotelId");
  const partnerHotelIds = parseCsv(params.get("partnerHotelIds"));
  const partnerIdsFromQuery = parseCsv(params.get("partnerIds"));
  const partnerIds = Array.from(new Set([...partnerIdsFromQuery, ...configuredTrustYouPartnerIds()]));
  const partnerHotelCandidates = Array.from(
    new Set([partnerHotelId, hotelIdParam, ...partnerHotelIds].map((value) => String(value || "").trim()).filter(Boolean))
  );

  let tyId = resolveTrustYouHotelId({
    hotelName,
    location,
    candidateIds: [isTrustYouId(tyIdParam) ? tyIdParam : null],
  });

  let trustScorePayload = null as Awaited<ReturnType<typeof fetchTrustYouTrustScore>> | null;
  let mappedByPartner = null as { partnerId: string; partnerHotelId: string } | null;

  if (!tyId && partnerIds.length > 0 && partnerHotelCandidates.length > 0) {
    const mapped = await resolveTrustYouByPartnerMappings({
      apiKey,
      partnerIds,
      partnerHotelIds: partnerHotelCandidates,
    });
    if (mapped) {
      trustScorePayload = mapped.trustScore;
      mappedByPartner = { partnerId: mapped.partnerId, partnerHotelId: mapped.partnerHotelId };
      const mappedTyId = String(mapped.trustScore?.response?.ty_id || "").trim();
      if (mappedTyId) tyId = mappedTyId;
    }
  }

  if (!tyId && !trustScorePayload) {
    return NextResponse.json(
      { ok: false, message: "No TrustYou mapping found for this hotel." },
      { status: 404 }
    );
  }

  try {
    const trustScore = trustScorePayload || (tyId ? await fetchTrustYouTrustScore(tyId, apiKey) : null);
    if (!trustScore) {
      return NextResponse.json(
        { ok: false, message: "No TrustYou mapping found for this hotel." },
        { status: 404 }
      );
    }

    const metaReview = withDetails && tyId ? await fetchTrustYouMetaReview(tyId, apiKey) : null;
    const summary = buildTrustYouSummary(trustScore, metaReview);

    return NextResponse.json({
      ok: true,
      review: summary,
      mapping: mappedByPartner
        ? {
          type: "partner",
          partnerId: mappedByPartner.partnerId,
          partnerHotelId: mappedByPartner.partnerHotelId,
        }
        : { type: "ty_id" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch TrustYou data.";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
