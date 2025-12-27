# Repository Documentation (GlobeHunters `ghfe`)

This `docs/` folder is the **source of truth** for how this repository is structured and how the end-to-end product works.

## Quick navigation

- **Start here**: [`docs/architecture/overview.md`](architecture/overview.md)
- **System diagrams** (architecture + mindmap): [`docs/architecture/diagrams.md`](architecture/diagrams.md)
- **End-to-end user flows**:
  - [`docs/flows/search-to-booking.md`](flows/search-to-booking.md)
  - [`docs/flows/deeplinks.md`](flows/deeplinks.md)
  - [`docs/flows/payment-and-confirmation.md`](flows/payment-and-confirmation.md)
- **API routes** (Next.js route handlers): [`docs/api/routes.md`](api/routes.md)
- **Integrations**:
  - Vyspa Search API + transformers/rules: [`docs/integrations/vyspa-search.md`](integrations/vyspa-search.md)
  - Vyspa Portal (folder, extras, payment recording): [`docs/integrations/vyspa-portal.md`](integrations/vyspa-portal.md)
  - BoxPay: [`docs/integrations/boxpay.md`](integrations/boxpay.md)
  - Affiliates + tracking (utm/cnc): [`docs/integrations/affiliates.md`](integrations/affiliates.md)
- **Frontend architecture**:
  - App routes/pages: [`docs/frontend/app-router.md`](frontend/app-router.md)
  - Global state (Zustand `bookingStore`): [`docs/frontend/state.md`](frontend/state.md)
  - Hooks/services overview: [`docs/frontend/hooks-and-services.md`](frontend/hooks-and-services.md)
  - i18n (next-intl): [`docs/frontend/i18n.md`](frontend/i18n.md)
- **Runbook**:
  - Setup + env + scripts: [`docs/runbook/setup.md`](runbook/setup.md)
  - Debugging + troubleshooting: [`docs/runbook/troubleshooting.md`](runbook/troubleshooting.md)
  - Testing: [`docs/runbook/testing.md`](runbook/testing.md)

## How to read these docs

- The docs are **code-first**: each section links back to the relevant source files in `src/`.
- Diagrams are written in **Mermaid**, so they render in GitHub and most markdown viewers.

## Suggested “new engineer” onboarding path (60–90 minutes)

- Read `architecture/overview.md` then `architecture/diagrams.md`
- Read `flows/search-to-booking.md` and `flows/payment-and-confirmation.md`
- Skim `api/routes.md` to learn the integration surface
- Keep `frontend/state.md` open while reading the pages


