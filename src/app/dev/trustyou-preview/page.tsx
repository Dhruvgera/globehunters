import { notFound } from "next/navigation";

import { TRUSTYOU_HOTEL_SEEDS } from "@/lib/trustyou/hotelMapping";

import { TrustYouPreviewClient } from "./trustyou-preview-client";

export default function TrustYouPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const seeds = TRUSTYOU_HOTEL_SEEDS.map((seed) => ({
    tyId: seed.tyId,
    name: seed.name,
    location: seed.location,
  }));

  return <TrustYouPreviewClient seeds={seeds} />;
}
