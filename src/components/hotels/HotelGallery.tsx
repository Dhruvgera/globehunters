"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Grid3X3, X } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { filterReachableImageUrls } from "@/lib/hotels/imageUrl";

interface HotelGalleryProps {
  images: string[];
  mainImage?: string;
  hotelName: string;
}

function filenameFromUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const segments = parsed.pathname.replace(/\/+$/, "").split("/");
    return (segments[segments.length - 1] || "").toLowerCase();
  } catch {
    const withoutQuery = raw.replace(/[?#].*$/, "").replace(/\/+$/, "");
    const segments = withoutQuery.split("/");
    return (segments[segments.length - 1] || "").toLowerCase();
  }
}

function deduplicateImages(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed) continue;
    const key = filenameFromUrl(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export default function HotelGallery({ images, mainImage, hotelName }: HotelGalleryProps) {
  const deduplicated = useMemo(() => {
    const all = mainImage ? [mainImage, ...images] : [...images];
    return deduplicateImages(all);
  }, [images, mainImage]);

  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const [initialValidationDone, setInitialValidationDone] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const brokenRef = useRef<Set<string>>(new Set());
  const validatedRef = useRef<Set<string>>(new Set());

  const markBroken = useCallback((url: string) => {
    if (!url || brokenRef.current.has(url)) return;
    brokenRef.current.add(url);
    setBrokenUrls((prev) => new Set(prev).add(url));
  }, []);

  const markLoaded = useCallback((url: string) => {
    if (!url) return;
    setLoadedUrls((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  const validImages = useMemo(
    () => deduplicated.filter((url) => !brokenUrls.has(url)),
    [deduplicated, brokenUrls]
  );

  const resolvedMainImage = useMemo(() => {
    if (!mainImage) return validImages[0] || "";
    return brokenUrls.has(mainImage) ? validImages[0] || "" : mainImage;
  }, [mainImage, brokenUrls, validImages]);

  useEffect(() => {
    if (currentPhotoIndex >= validImages.length && validImages.length > 0) {
      setCurrentPhotoIndex(validImages.length - 1);
    }
  }, [validImages.length, currentPhotoIndex]);

  const thumbImages = useMemo(() => {
    const mainKey = resolvedMainImage ? filenameFromUrl(resolvedMainImage) : "";
    return validImages.filter((url) => filenameFromUrl(url) !== mainKey).slice(0, 3);
  }, [validImages, resolvedMainImage]);

  useEffect(() => {
    const toCheck = deduplicated.filter((url) => !validatedRef.current.has(url));
    if (toCheck.length === 0) {
      setInitialValidationDone(true);
      return;
    }

    let cancelled = false;

    filterReachableImageUrls(toCheck, { maxValid: 5 }).then(({ valid, checked }) => {
      if (cancelled) return;
      for (const url of checked) {
        validatedRef.current.add(url);
      }
      const broken = checked.filter((url) => !valid.includes(url));
      if (broken.length > 0) {
        for (const url of broken) markBroken(url);
      }
      setInitialValidationDone(true);
    });

    return () => {
      cancelled = true;
    };
  }, [deduplicated, markBroken]);

  useEffect(() => {
    if (!galleryOpen) return;
    const toCheck = deduplicated.filter((url) => !validatedRef.current.has(url));
    if (toCheck.length === 0) return;

    let cancelled = false;

    filterReachableImageUrls(toCheck).then(({ valid, checked }) => {
      if (cancelled) return;
      for (const url of checked) {
        validatedRef.current.add(url);
      }
      const broken = checked.filter((url) => !valid.includes(url));
      if (broken.length > 0) {
        for (const url of broken) markBroken(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [galleryOpen, deduplicated, markBroken]);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-3">
        <div
          className="relative min-h-[300px] lg:min-h-[450px] flex-[2] rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => {
            if (validImages.length > 0) {
              setCurrentPhotoIndex(0);
              setGalleryOpen(true);
            }
          }}
        >
          {resolvedMainImage ? (
            <Image
              src={resolvedMainImage}
              alt={hotelName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
              onError={() => markBroken(resolvedMainImage)}
            />
          ) : (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#EEEEF2] to-[#E2E2E8]" />
          )}
          {validImages.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGalleryOpen(true);
              }}
              className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-all shadow-sm hover-shadow-md"
            >
              <Grid3X3 className="w-4 h-4 text-[#010D50]" />
              <span className="text-sm font-medium text-[#010D50]">Show All Photos</span>
            </button>
          )}
        </div>

        <div className="flex flex-row lg:flex-col gap-3 lg:w-[220px]">
          {[0, 1, 2].map((idx) => {
            const img = thumbImages[idx];
            if (!img) {
              if (!initialValidationDone) {
                return (
                  <div
                    key={`skeleton-${idx}`}
                    className="relative flex-1 lg:flex-none lg:h-[140px] min-h-[100px] rounded-xl overflow-hidden animate-pulse bg-gradient-to-br from-[#EEEEF2] to-[#E2E2E8]"
                  />
                );
              }
              return (
                <div
                  key={`empty-${idx}`}
                  className="relative flex-1 lg:flex-none lg:h-[140px] min-h-[100px] rounded-xl overflow-hidden bg-[#F6F6F6]"
                />
              );
            }
            const isLoaded = loadedUrls.has(img);
            return (
              <div
                key={`${img}-${idx}`}
                className="relative flex-1 lg:flex-none lg:h-[140px] min-h-[100px] rounded-xl overflow-hidden bg-[#F6F6F6] cursor-pointer group"
                onClick={() => {
                  const mainKey = resolvedMainImage ? filenameFromUrl(resolvedMainImage) : "";
                  let visualIndex = 0;
                  for (let i = 0; i < validImages.length; i++) {
                    if (filenameFromUrl(validImages[i]) === mainKey) continue;
                    if (filenameFromUrl(validImages[i]) === filenameFromUrl(img)) {
                      visualIndex = i;
                      break;
                    }
                  }
                  setCurrentPhotoIndex(visualIndex);
                  setGalleryOpen(true);
                }}
              >
                {!isLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#EEEEF2] to-[#E2E2E8]" />
                )}
                <Image
                  src={img}
                  alt={`${hotelName} - ${idx + 1}`}
                  fill
                  className={`object-cover transition-all duration-500 group-hover:scale-110 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => markLoaded(img)}
                  onError={() => markBroken(img)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-none rounded-none overflow-hidden z-[9999]">
          <div className="relative w-full h-full flex flex-col pt-12 pb-24">
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group"
            >
              <X className="w-6 h-6 transition-transform group-hover:scale-110" />
            </button>

            <div className="flex-1 relative flex items-center justify-center px-4 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhotoIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative w-full h-full max-w-6xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl"
                >
                  {validImages[currentPhotoIndex] && (
                    <Image
                      src={validImages[currentPhotoIndex]}
                      alt={`Photo ${currentPhotoIndex + 1}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      onError={() => markBroken(validImages[currentPhotoIndex])}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {validImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : validImages.length - 1));
                    }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group hidden md:block"
                  >
                    <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex((prev) => (prev < validImages.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group hidden md:block"
                  >
                    <ChevronRight className="w-8 h-8 transition-transform group-hover:translate-x-1" />
                  </button>
                </>
              )}

              <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-sm font-medium">
                {currentPhotoIndex + 1} / {validImages.length}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
              <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 h-full scrollbar-hide">
                {validImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`relative h-20 aspect-[4/3] rounded-lg overflow-hidden flex-shrink-0 transition-all duration-300 ${
                      currentPhotoIndex === idx
                        ? "ring-2 ring-[#3754ED] scale-110 translate-y-[-4px] opacity-100"
                        : "opacity-40 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      onError={() => markBroken(img)}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
