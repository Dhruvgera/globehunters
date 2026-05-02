import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import type { HotelSearchUrlContext } from "@/lib/hotels/searchContextCodec";
import { encodeHotelSearchContext } from "@/lib/hotels/searchContextCodec";

interface SyncPdpUrlOptions {
  router: AppRouterInstance;
  hotelId: string;
  searchParams: URLSearchParams;
  searchCriteriaId: number | string | null | undefined;
  provider: string | null | undefined;
  srId: string | null | undefined;
  prevSearchCriteriaId: string | null;
  prevSrId: string | null;
  hotelSearch?: HotelSearchUrlContext | null;
}

export function syncPdpUrl({
  router,
  hotelId,
  searchParams,
  searchCriteriaId,
  provider,
  srId,
  prevSearchCriteriaId,
  prevSrId,
  hotelSearch,
}: SyncPdpUrlOptions): void {
  const criteriaChanged =
    String(searchCriteriaId ?? "") !== String(prevSearchCriteriaId ?? "");
  const srIdChanged =
    String(srId ?? "") !== String(prevSrId ?? "");

  if (!criteriaChanged && !srIdChanged && !hotelSearch) {
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

  if (hotelSearch) {
    const encoded = encodeHotelSearchContext({
      ...hotelSearch,
      searchCriteriaId: hotelSearch.searchCriteriaId ?? searchCriteriaId ?? undefined,
    });
    if (encoded) params.set("ctx", encoded);
  }

  router.replace(`/hotels/${hotelId}?${params.toString()}`, { scroll: false });
}
