"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { TrustYouHotelReviewSummary } from "@/types/trustyou";

interface SeedHotel {
  tyId: string;
  name: string;
  location: string;
}

interface TrustYouPreviewClientProps {
  seeds: SeedHotel[];
}

const DUMMY_HOTEL_IMAGE = "/hotel-placeholder.jpg";

function sentimentLabel(sentiment: string): string {
  if (sentiment === "pos") return "Positive";
  if (sentiment === "neg") return "Negative";
  if (sentiment === "neu") return "Neutral";
  return "Mixed";
}

export function TrustYouPreviewClient({ seeds }: TrustYouPreviewClientProps) {
  const [selectedTyId, setSelectedTyId] = useState<string>(seeds[0]?.tyId || "");
  const [review, setReview] = useState<TrustYouHotelReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const selectedSeed = useMemo(
    () => seeds.find((seed) => seed.tyId === selectedTyId) || null,
    [seeds, selectedTyId]
  );

  useEffect(() => {
    if (!selectedSeed?.tyId) return;

    const controller = new AbortController();
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    params.set("tyId", selectedSeed.tyId);
    params.set("hotelName", selectedSeed.name);
    params.set("location", selectedSeed.location);
    params.set("details", "1");

    fetch(`/api/hotels/trustyou?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (!data?.ok || !data?.review) {
          throw new Error(data?.message || "Failed to fetch TrustYou review data.");
        }
        setReview(data.review as TrustYouHotelReviewSummary);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          reason instanceof Error ? reason.message : "Failed to fetch TrustYou review data.";
        setReview(null);
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedSeed]);

  const dummyHotelName = selectedSeed?.name || "Dummy Hotel";
  const dummyHotelLocation = selectedSeed?.location || "Sample destination";

  return (
    <main className="min-h-screen bg-[#F5F7FF] p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[#D7DBF7] bg-white p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#3754ED]">Dev only</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#010D50]">TrustYou Review Preview</h1>
          <p className="mt-1 text-sm text-[#3A478A]">
            Dummy hotel UI with live TrustYou data from your seeded hotel list.
          </p>
          <div className="mt-4 flex flex-col gap-2 md:max-w-xl">
            <label htmlFor="seedHotel" className="text-sm font-medium text-[#010D50]">
              Seed hotel
            </label>
            <select
              id="seedHotel"
              value={selectedTyId}
              onChange={(event) => setSelectedTyId(event.target.value)}
              className="rounded-lg border border-[#C8CEEE] bg-white px-3 py-2 text-sm text-[#010D50] outline-none focus:border-[#3754ED]"
            >
              {seeds.map((seed) => (
                <option key={seed.tyId} value={seed.tyId}>
                  {seed.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#3A478A]">TrustYou ID: {selectedSeed?.tyId}</p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-[#DFE3F7] bg-white p-4 md:p-5">
            <div className="relative h-56 w-full overflow-hidden rounded-xl border border-[#E4E8F9]">
              <Image src={DUMMY_HOTEL_IMAGE} alt={dummyHotelName} fill className="object-cover" />
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-[#010D50]">{dummyHotelName}</h2>
              <p className="mt-1 text-sm text-[#3A478A]">{dummyHotelLocation}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#EEF1FF] px-3 py-1 text-xs text-[#1E2F9A]">4-star (dummy)</span>
                <span className="rounded-full bg-[#EEF9F1] px-3 py-1 text-xs text-[#117A3B]">Breakfast included</span>
                <span className="rounded-full bg-[#FFF5E9] px-3 py-1 text-xs text-[#A15B12]">Free cancellation</span>
              </div>
              <div className="mt-4 rounded-xl border border-[#E3E7FC] bg-[#F8F9FF] p-3 text-sm text-[#283783]">
                Dummy price: GBP 129.14 total for 5 nights
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#DFE3F7] bg-white p-4 md:p-5">
            {loading ? (
              <div className="text-sm text-[#3A478A]">Loading TrustYou review data...</div>
            ) : error ? (
              <div className="rounded-lg border border-[#FFD1D1] bg-[#FFF5F5] p-3 text-sm text-[#8F1D1D]">
                {error}
              </div>
            ) : review ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-content-center rounded-lg bg-[#008234] text-lg font-semibold text-white">
                    {review.score.toFixed(1)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#010D50]">{review.scoreDescription || "Rating"}</div>
                    <div className="text-xs text-[#3A478A]">
                      {review.reviewsCount.toLocaleString()} reviews from {review.sourcesCount.toLocaleString()} sources
                    </div>
                  </div>
                </div>

                {review.summaryText ? (
                  <div className="rounded-lg border border-[#E6EAFE] bg-[#F8FAFF] p-3 text-sm text-[#102174]">
                    {review.summaryText}
                  </div>
                ) : null}

                {review.badges.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-[#010D50]">Badges</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {review.badges.map((badge) => (
                        <span key={badge} className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-xs text-[#2233A0]">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {review.highlights.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-[#010D50]">Highlights</h3>
                    <ul className="mt-2 space-y-1 text-sm text-[#1E2D77]">
                      {review.highlights.slice(0, 6).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {review.snippets.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-[#010D50]">Guest snippets</h3>
                    <ul className="mt-2 space-y-1 text-sm text-[#1E2D77]">
                      {review.snippets.slice(0, 6).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {review.categoryBreakdown.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-[#010D50]">Category breakdown</h3>
                    <div className="mt-2 space-y-2">
                      {review.categoryBreakdown.map((category) => (
                        <div key={category.key} className="rounded-lg border border-[#E6EAFE] p-2.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-[#1B2A7C]">{category.label}</span>
                            <span className="text-[#3A478A]">
                              {category.score.toFixed(1)} · {sentimentLabel(category.sentiment)}
                            </span>
                          </div>
                          {category.text ? (
                            <p className="mt-1 text-xs text-[#3A478A]">{category.text}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-[#3A478A]">Pick a hotel to load TrustYou data.</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
