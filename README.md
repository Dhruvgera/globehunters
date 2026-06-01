# GlobeHunters – Flight, Hotel & Package Booking Platform

A full-stack travel booking platform built with Next.js 16, TypeScript, and Tailwind CSS v4. Integrates with Vyspa (flights, hotels, portal), BoxPay (payments), Hotelbeds (hotels), and TrustYou (reviews).

## Features
 
- **Flight Search & Booking** – Vyspa Search API with filters, sorting, date-price tiles, and multi-city support
- **Deeplinks** – Meta channel entry (Skyscanner etc.) via `?key=` / `?flight=` params
- **Price Check & Upgrades** – Fare verification and upgrade options (V1 + V3 flows)
- **Hotel Search** – Hybrid Vyspa + Hotelbeds results with deduplication and TrustYou review scores
- **Holiday Packages** – Flight + hotel packages with room selection and alternate flights
- **Payment** – BoxPay hosted checkout with redirect flow
- **Booking Portal** – Vyspa Portal integration (folder creation, extras, payment recording)
- **Affiliate Tracking** – UTM params, `cnc` codes, source/subsource mapping
- **Confirmation Emails** – Nodemailer via SMTP (Amazon SES)
- **i18n** – Multi-language support via next-intl
- **Responsive Design** – Modern UI built from Figma specs with Framer Motion animations

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui, Radix UI, Framer Motion
- **State Management**: Zustand (persisted to sessionStorage)
- **i18n**: next-intl
- **Icons**: Lucide React
- **Package Manager**: Bun
- **Testing**: Jest + integration scripts
- **Deployment**: Docker (standalone output)

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                #   Landing page + deeplink entry
│   ├── search/                 #   Flight search results
│   ├── booking/                #   Passenger details + price check
│   ├── payment/                #   Add-ons + BoxPay initiation
│   ├── payment-complete/       #   BoxPay return + confirmation
│   ├── hotels/                 #   Hotel search, details, checkout
│   ├── packages/               #   Package review + checkout
│   ├── offers/                 #   Special offers
│   ├── contact/                #   Contact page
│   ├── checkout/               #   Legacy deeplink handler
│   ├── FlightSearch/           #   Legacy route compat
│   ├── dev/                    #   Dev tools (TrustYou preview)
│   └── api/                    #   API route handlers
│       ├── airports/           #     Airport autocomplete
│       ├── flight-view/        #     Deeplink resolver
│       ├── price-check/        #     Price verification
│       ├── search-flights-batch/ #   Date price tiles
│       ├── hotels/             #     Hotel APIs (10 routes)
│       ├── packages/           #     Package APIs (5 routes)
│       ├── boxpay/             #     Payment session + inquiry
│       ├── vyspa/              #     Portal + hotel routes
│       ├── reviews/            #     Yotpo reviews
│       └── send-confirmation-email/
├── components/                 # React components
│   ├── search/                 #   Search bar, filters, date tiles
│   ├── flights/                #   Flight cards, info modal, upgrades
│   ├── booking/                #   Passenger forms, summary cards
│   ├── payment/                #   Payment form, baggage, protection
│   ├── hotels/                 #   Hotel cards, filters, toolbar
│   ├── packages/               #   Package cards, step progress
│   ├── navigation/             #   Navbar, Footer
│   ├── animations/             #   Framer Motion loaders
│   └── ui/                     #   shadcn/ui primitives
├── hooks/                      # React hooks (15 hooks)
├── services/                   # API service layer (14 services)
├── store/                      # Zustand bookingStore
├── lib/                        # Core libraries
│   ├── vyspa/                  #   Search client, transformers, rules
│   ├── hotels/                 #   Hotel utils (images, dedupe, geocode)
│   ├── hotelbeds/              #   Hotelbeds client + mappers
│   ├── trustyou/               #   TrustYou client + hotel mapping
│   ├── package/                #   Package pricing + flights
│   ├── currency/               #   Currency utilities
│   ├── cache/                  #   In-memory caches
│   └── utils/                  #   GDS mapping, formatting
├── config/                     # App + integration config
├── types/                      # TypeScript interfaces
├── i18n/                       # next-intl configuration
└── data/                       # Static data + affiliate mapping
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Environment variables (see [docs/runbook/setup.md](docs/runbook/setup.md))

### Installation

```bash
bun install
bun run dev
```

Other commands:

```bash
bun run build          # Production build
bun run start          # Start production server
bun run test           # Jest unit tests
bun run test:watch     # Jest in watch mode
bun run test:coverage  # Jest with coverage
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with search bar + deeplink entry (`?key=`) |
| `/search` | Flight search results with filters, sorting, date-price tiles |
| `/booking` | Passenger details, price check prefetch, upgrade options |
| `/payment` | Add-ons (baggage, insurance) + BoxPay session + redirect |
| `/payment-complete` | BoxPay return, portal payment recording, confirmation email |
| `/hotels` | Hotel search (Vyspa + Hotelbeds hybrid), TrustYou scores |
| `/hotels/[id]` | Hotel detail page with rooms and package entry |
| `/hotels/checkout` | Hotel standalone booking checkout |
| `/packages/review` | Package review (baggage, protection, flight changes) |
| `/packages/checkout` | Package booking checkout with passenger forms |
| `/offers` | Special offers and deals |
| `/contact` | Contact information and form |
| `/checkout` | Legacy deeplink handler (`/checkout.htm?flight=...`) |

## Documentation

Full documentation lives in [`docs/`](docs/README.md):

- **Architecture**: [overview](docs/architecture/overview.md), [diagrams](docs/architecture/diagrams.md)
- **User Flows**: [search-to-booking](docs/flows/search-to-booking.md), [payment](docs/flows/payment-and-confirmation.md), [deeplinks](docs/flows/deeplinks.md)
- **API Routes**: [reference](docs/api/routes.md)
- **Integrations**: [Vyspa Search](docs/integrations/vyspa-search.md), [Vyspa Portal](docs/integrations/vyspa-portal.md), [BoxPay](docs/integrations/boxpay.md), [Affiliates](docs/integrations/affiliates.md)
- **Frontend**: [app router](docs/frontend/app-router.md), [state](docs/frontend/state.md), [hooks & services](docs/frontend/hooks-and-services.md), [i18n](docs/frontend/i18n.md)
- **Runbook**: [setup](docs/runbook/setup.md), [testing](docs/runbook/testing.md), [troubleshooting](docs/runbook/troubleshooting.md)

## License

Private - GlobeHunters

## Contact

For support, call: 020 4502 2984 (24/7 Toll-Free)
