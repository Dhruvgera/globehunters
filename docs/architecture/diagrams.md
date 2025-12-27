# Architecture Diagrams (Mermaid)

These diagrams are intentionally “high signal” and map directly to code entry points.

## System mindmap

```mermaid
mindmap
  root((ghfe))
    Next.js App Router
      src/app/page.tsx
      src/app/search/page.tsx
      src/app/booking/page.tsx
      src/app/payment/page.tsx
      src/app/payment-complete/page.tsx
      src/app/checkout/page.tsx
    Global State (Zustand)
      src/store/bookingStore.ts
        selectedFlight
        passengers/contact
        addOns
        vyspaFolderNumber
        searchRequestId
    Integrations
      Vyspa Search API
        src/actions/flights/searchFlights.ts
        src/lib/vyspa/*
      Vyspa Portal API
        src/app/api/vyspa/init-folder/route.ts
        src/app/api/vyspa/add-to-folder/route.ts
        src/app/api/vyspa/add-extras/route.ts
        src/app/api/vyspa/save-payment/route.ts
      BoxPay
        src/app/api/boxpay/session/route.ts
        src/app/api/boxpay/inquiry/route.ts
      Email
        src/app/api/send-confirmation-email/route.ts
    Affiliate + Tracking
      src/lib/AffiliateContext.tsx
      src/lib/utils/affiliateMapping.ts
      src/lib/utils/domainMapping.ts
```

## Container / module architecture

```mermaid
flowchart TB
  subgraph Browser[Browser (React)]
    Pages[src/app/** pages]
    Components[src/components/**]
    Hooks[src/hooks/**]
    Store[src/store/bookingStore.ts]
  end

  subgraph NextServer[Next.js Server (Node)]
    ServerActions[src/actions/**]
    ApiRoutes[src/app/api/**/route.ts]
    VyspaLib[src/lib/vyspa/**]
    Services[src/services/**]
    Config[src/config/**]
  end

  subgraph External[External Systems]
    VyspaSearch[Vyspa Search API]
    VyspaPortal[Vyspa Portal API]
    BoxPay[BoxPay]
    SMTP[SMTP / Email Provider]
  end

  Pages --> Hooks
  Components --> Hooks
  Hooks --> Store
  Hooks --> Services
  Services --> ServerActions
  Services --> ApiRoutes

  ServerActions --> VyspaLib
  VyspaLib --> VyspaSearch

  ApiRoutes --> VyspaSearch
  ApiRoutes --> VyspaPortal
  ApiRoutes --> BoxPay
  ApiRoutes --> SMTP

  Config --> ApiRoutes
  Config --> VyspaLib
```

## Core booking funnel (page transitions)

```mermaid
flowchart LR
  Home[/ (Landing)/] --> Search[/search/]
  Search --> Booking[/booking/]
  Booking --> Payment[/payment/]
  Payment --> BoxPayRedirect[[BoxPay Checkout Redirect]]
  BoxPayRedirect --> PaymentComplete[/payment-complete/]
```


