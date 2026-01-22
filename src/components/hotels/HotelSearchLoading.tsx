"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

type LottieAnimationData = Record<string, unknown>;

export function HotelSearchLoading() {
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/hotelsearch.json", { cache: "force-cache" });
        if (!res.ok) return;
        const json = (await res.json()) as LottieAnimationData;
        if (!cancelled) setAnimationData(json);
      } catch {
        // Non-fatal: fall back to text-only loading state.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-sm text-[#3A478A]">
      <div className="w-[240px] max-w-full">
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop
            autoplay
            aria-label="Loading hotels"
          />
        ) : (
          <div className="h-[120px]" />
        )}
      </div>
      <div>Loading hotels…</div>
    </div>
  );
}


