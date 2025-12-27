# Frontend: Global State (Zustand)

Global, cross-page state is managed by `src/store/bookingStore.ts`.

## What lives in the store (why it matters)

The booking funnel spans multiple routes and includes redirects (BoxPay). The store is persisted to `sessionStorage`, which allows:

- reloading a page without losing selected flight
- returning from BoxPay to still have booking context

## Key state fields (high level)

- **Search**:
  - `searchParams`
  - `searchRequestId` (Vyspa session id; used as temporary “web ref”)
- **Affiliate/tracking**:
  - `affiliateData` (code, utm fields, cnc)
  - `isFromDeeplink`
- **Flight**:
  - `selectedFlight`
  - `selectedFareType`
  - `selectedUpgradeOption`
  - `priceCheckData`
- **Passengers/contact**:
  - `passengers`
  - `contactEmail`, `contactPhone`
  - `passengersSaved`
- **Add-ons**:
  - `addOns.protectionPlan`
  - `addOns.additionalBaggage`
- **Portal (folder)**:
  - `vyspaFolderNumber`
  - `vyspaCustomerId`
  - `vyspaEmailAddress`
- **Workflow**:
  - `currentStep` (`search | booking | payment | confirmation`)

## Store lifecycle

### Hydration guard

The store tracks hydration (`_hasHydrated`) so pages can avoid redirecting before persisted state is loaded.

This is why pages often do:

- `const hasHydrated = useStoreHydration()`
- only then check `selectedFlight` and redirect if missing

### Reset vs “clear for new search”

- `resetBooking()`: resets the funnel fully.
- `clearForNewSearch()`: clears booking data but preserves affiliate attribution.


