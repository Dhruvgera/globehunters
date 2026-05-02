import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime.js";

interface SyncPdpUrlOptions {
  router: AppRouterInstance;
  hotelId: string;
  searchParams: URLSearchParams;
  searchCriteriaId: number | string | null | undefined;
  provider: string | null | undefined;
  srId: string | null | undefined;
  prevSearchCriteriaId: string | null;
  prevSrId: string | null;
}

/**
 * Conditionally updates the PDP URL with the latest search context
 * (searchCriteriaId, provider, srId) when they differ from the current URL.
 */
export function syncPdpUrl({
  router,
  hotelId,
  searchParams,
  searchCriteriaId,
  provider,
  srId,
  prevSearchCriteriaId,
  prevSrId,
}: SyncPdpUrlOptions): void {
  if (
    String(searchCriteriaId ?? "") === String(prevSearchCriteriaId ?? "") &&
    String(srId ?? "") === String(prevSrId ?? "")
  ) {
    return;
  }

  const params = new URLSearchParams(searchParams.toString());

  if (searchCriteriaId != null) {
    params.set("searchCriteriaId", String(searchCriteriaId));
  } else {
    params.delete("searchCriteriaId");
  }

  if (provider) {
    params.set("provider", provider);
  } else {
    params.delete("provider");
  }

  if (srId) {
    params.set("srId", String(srId));
  } else {
    params.delete("srId");
  }

  router.replace(`/hotels/${hotelId}?${params.toString()}`, { scroll: false });
}
