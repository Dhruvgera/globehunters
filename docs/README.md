# Repository Documentation (GlobeHunters `ghfe`)

This `docs/` folder is the **source of truth** for how this repository is structured and how the end-to-end product works.

## Quick navigation

- **Start here**: [`architecture/overview.md`](architecture/overview.md)
- **System diagrams** (architecture + mindmap): [`architecture/diagrams.md`](architecture/diagrams.md)
- **End-to-end user flows**:
  - Flights: [`flows/search-to-booking.md`](flows/search-to-booking.md)
  - Deeplinks: [`flows/deeplinks.md`](flows/deeplinks.md)
  - Payment: [`flows/payment-and-confirmation.md`](flows/payment-and-confirmation.md)
- **API routes** (Next.js route handlers): [`api/routes.md`](api/routes.md)
- **Integrations**:
  - Vyspa Search API + transformers/rules: [`integrations/vyspa-search.md`](integrations/vyspa-search.md)
  - Vyspa Portal (folder, extras, payment recording): [`integrations/vyspa-portal.md`](integrations/vyspa-portal.md)
  - Vyspa Hotels: [`integrations/vyspa-accommodation-availability-v1.md`](integrations/vyspa-accommodation-availability-v1.md)
  - Hotelbeds + deduplication: [`integrations/hotelbeds-vyspa-deduplication.md`](integrations/hotelbeds-vyspa-deduplication.md)
  - TrustYou (hotel reviews): [`integrations/trustyou.md`](integrations/trustyou.md)
  - BoxPay: [`integrations/boxpay.md`](integrations/boxpay.md)
  - Affiliates + tracking (utm/cnc): [`integrations/affiliates.md`](integrations/affiliates.md)
- **Frontend architecture**:
  - App routes/pages: [`frontend/app-router.md`](frontend/app-router.md)
  - Global state (Zustand `bookingStore`): [`frontend/state.md`](frontend/state.md)
  - Hooks/services overview: [`frontend/hooks-and-services.md`](frontend/hooks-and-services.md)
  - i18n (next-intl): [`frontend/i18n.md`](frontend/i18n.md)
- **Runbook**:
  - Setup + env + scripts: [`runbook/setup.md`](runbook/setup.md)
  - Debugging + troubleshooting: [`runbook/troubleshooting.md`](runbook/troubleshooting.md)
  - Testing: [`runbook/testing.md`](runbook/testing.md)

## How to read these docs

- The docs are **code-first**: each section links back to the relevant source files in `src/`.
- Diagrams are written in **Mermaid**, so they render in GitHub and most markdown viewers.

## Suggested "new engineer" onboarding path (60–90 minutes)

1. Read `architecture/overview.md` then `architecture/diagrams.md`
2. Read `flows/search-to-booking.md` and `flows/payment-and-confirmation.md`
3. Skim `api/routes.md` to learn the integration surface (flights, hotels, packages, payment)
4. Keep `frontend/state.md` open while reading the pages
5. Skim `frontend/hooks-and-services.md` for the hook/service patterns
