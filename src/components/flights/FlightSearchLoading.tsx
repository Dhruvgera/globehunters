"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

type LottieAnimationData = Record<string, unknown>;

type Props = {
  text?: string;
  showText?: boolean;
  /** Tailwind width class etc. (applied to the lottie container) */
  lottieClassName?: string;
};

export function FlightSearchLoading({
  text = "Loading flights…",
  showText = true,
  lottieClassName = "w-[240px] max-w-full",
}: Props) {
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/Airplane.json", { cache: "force-cache" });
        if (!res.ok) return;
        const json = (await res.json()) as LottieAnimationData;
        if (!cancelled) setAnimationData(json);
      } catch {
        // Non-fatal: fall back to blank placeholder.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-2 text-sm text-[#3A478A]">
      <div className={lottieClassName}>
        {animationData ? (
          <Lottie animationData={animationData} loop autoplay aria-label="Loading flights" />
        ) : (
          <div className="h-[120px]" />
        )}
      </div>
      {showText ? <div>{text}</div> : null}
    </div>
  );
}


