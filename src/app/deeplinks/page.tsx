"use client";

import { useState, useCallback, Suspense } from "react";
import Image from "next/image";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import SearchBar, { type PackageSearchFormData } from "@/components/search/SearchBar";
import { packageService } from "@/services/api/packageService";
import type { PackageSearchResult } from "@/types/holidayPackage";
import { Loader2, ExternalLink, Star, Hotel as HotelIcon } from "lucide-react";

const MEAL_PLAN_LABELS: Record<string, string> = {
  RO: "Room Only",
  BB: "Bed & Breakfast",
  HB: "Half Board",
  FB: "Full Board",
  AI: "All Inclusive",
  SC: "Self Catering",
};

function DeeplinksPageContent() {
  const [results, setResults] = useState<PackageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [includeFees, setIncludeFees] = useState(true);

  const handleSearch = useCallback(async (data: PackageSearchFormData) => {
    if (!data.destination || !data.checkIn || !data.checkOut || !data.from) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    const [y1, m1, d1] = data.checkIn.split("-").map(Number);
    const [y2, m2, d2] = data.checkOut.split("-").map(Number);
    const checkInDate = new Date(y1, m1 - 1, d1);
    const checkOutDate = new Date(y2, m2 - 1, d2);
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    const baseAdultsPerRoom = Math.floor(data.adults / data.rooms);
    const extraAdults = data.adults % data.rooms;
    const baseChildrenPerRoom = Math.floor(data.children / data.rooms);
    const extraChildren = data.children % data.rooms;
    let ageIndex = 0;
    const rooms = Array.from({ length: data.rooms }, (_, i) => {
      const roomChildren = baseChildrenPerRoom + (i < extraChildren ? 1 : 0);
      const roomChildAges = data.childAges.slice(ageIndex, ageIndex + roomChildren);
      ageIndex += roomChildren;
      return {
        adults: Math.max(1, baseAdultsPerRoom + (i < extraAdults ? 1 : 0)),
        children: roomChildren,
        childAges: roomChildAges,
        infants: 0,
      };
    });

    try {
      const criteria = {
        ...packageService.buildSearchCriteria({
          departureCode: data.from.code,
          departureName: data.from.city || data.from.name || data.from.code,
          destination: data.destination,
          checkIn: data.checkIn,
          nights,
          rooms,
        }),
        includeFeesInTotal: includeFees,
        timeout: 120,
      };

      const response = await packageService.searchPackages(criteria);
      setResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#010D50] mb-2">
            Package Deeplink Generator
          </h1>
          <p className="text-sm text-[#3A478A] mb-6">
            Search for holiday packages and get deeplinks for different room options.
          </p>
          <div className="bg-white rounded-[32px] p-5 border border-[#E8E8EE] shadow-[0px_16px_44px_rgba(0,0,0,0.18)]">
            <SearchBar
              embedded
              defaultProduct="package"
              onPackageSearch={handleSearch}
            />
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFees}
                onChange={(e) => setIncludeFees(e.target.checked)}
                className="w-4 h-4 rounded border-[#3754ED] text-[#3754ED] focus:ring-[#3754ED]"
              />
              <span className="text-sm text-[#010D50]">Include fees in total</span>
            </label>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-[#3754ED] animate-spin" />
            <p className="text-[#3A478A]">Searching packages...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-1">Search Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {searched && !loading && !error && results.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <HotelIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No packages found</h3>
            <p className="text-gray-600">Try adjusting your search criteria.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#010D50]">
              Top {results.length} Results
            </h2>
            {results.map((pkg, index) => (
              <PackageDeeplinkCard key={pkg.id} pkg={pkg} index={index} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

function PackageDeeplinkCard({ pkg, index }: { pkg: PackageSearchResult; index: number }) {
  const baseUrl = pkg.deepLinkUrl || "";
  const keys = pkg.deepLinkKeys || {};
  const raw = pkg.rawSearchResult as Record<string, unknown> | undefined;
  const mainKey = typeof raw?.main === "string" ? raw.main : undefined;

  const allDeeplinks: Array<{ label: string; code: string; url: string, price?: string }> = [];

  if (mainKey && baseUrl) {
    allDeeplinks.push({ label: "Main", code: "main", url: `${baseUrl}${mainKey}` });
  }
  for (const [code, key] of Object.entries(keys)) {
    if (key && baseUrl) {
      allDeeplinks.push({
        label: MEAL_PLAN_LABELS[code] || code,
        code,
        url: `${baseUrl}${key}`,
        price: raw?.['Min' + code] as string | undefined,
      });
    }
  }

  return (
    <div className="border border-[#DFE0E4] rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4 p-5">
        <div className="relative flex-shrink-0 w-full sm:w-48 h-36 rounded-xl overflow-hidden bg-gray-100">
          {pkg.imageUrl ? (
            <Image
              src={pkg.imageUrl}
              alt={pkg.hotelName}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <HotelIcon className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="text-xs font-medium text-[#3754ED] mb-1 block">
                #{index + 1} · ID: {pkg.id}
              </span>
              <h3 className="text-lg font-bold text-[#010D50] leading-tight">
                {pkg.hotelName}
              </h3>
            </div>
            {pkg.startingPrice != null && (
              <div className="text-right flex-shrink-0">
                <span className="text-xs text-[#3A478A]">from</span>
                <p className="text-xl font-bold text-[#010D50]">
                  {pkg.currency === "GBP" ? "£" : pkg.currency || "£"}{pkg.startingPrice}
                </p>
              </div>
            )}
          </div>

          {pkg.starRating != null && pkg.starRating > 0 && (
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < pkg.starRating! ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                />
              ))}
            </div>
          )}

          {(pkg.cityName || pkg.countryName) && (
            <p className="text-sm text-[#3A478A] mb-3">
              {[pkg.cityName, pkg.countryName].filter(Boolean).join(", ")}
            </p>
          )}

          {allDeeplinks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#010D50] uppercase tracking-wide">
                Deeplinks
              </p>
              <div className="flex flex-wrap gap-2">
                {allDeeplinks.map((link) => (
                  <>
                    <a
                      key={link.code}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-[#F5F7FF] border-[#3754ED]/20 text-[#3754ED] hover:bg-[#3754ED] hover:text-white"
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {
                      link.price && (
                        <span className="font-bold font-large">
                          <span className="text-xs font-medium"> From </span>

                          {pkg.currency === "GBP" ? "£" : pkg.currency || "£"}{link.price}
                        </span>
                      )
                    }</>
                ))}
              </div>
            </div>
          )}

          {allDeeplinks.length === 0 && (
            <p className="text-xs text-gray-400 italic">No deeplinks available</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeeplinksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#3754ED] animate-spin" />
        </div>
      }
    >
      <DeeplinksPageContent />
    </Suspense>
  );
}
