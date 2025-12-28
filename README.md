# GlobeHunters - Flight Search Platform

A modern flight search and booking platform built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

- **Landing Page**: Clean hero section with search functionality
- **Advanced Search**: Comprehensive flight search with multiple filters
- **Flight Results**: Detailed flight cards with expandable ticket options
- **Responsive Design**: Modern UI based on Figma design specifications
- **Type-Safe**: Full TypeScript implementation with proper interfaces

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Package Manager**: Bun

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with Inter font
│   ├── page.tsx            # Landing page
│   ├── search/
│   │   └── page.tsx        # Search results page
│   └── globals.css         # Global styles with CSS variables
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Navbar.tsx          # Navigation bar component
│   ├── SearchBar.tsx       # Flight search form
│   └── FlightCard.tsx      # Flight result card
├── types/
│   └── flight.ts           # TypeScript interfaces for flights
├── data/
│   └── mockFlights.ts      # Dummy data for development
└── lib/
    └── utils.ts            # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Modern web browser

### Installation

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Pages

### Landing Page (`/`)
- Hero section with tagline
- Integrated search bar
- Feature highlights (Best Price, Secure Booking, 24/7 Support)

### Search Results (`/search`)
- Comprehensive filter sidebar:
  - Number of stops
  - Price range
  - Departure/arrival times
  - Journey duration
  - Airports
  - Airlines
- Date selector with price comparison
- Flight result cards with:
  - Airline information
  - Flight times and airports
  - Duration and stops
  - Expandable ticket options (Eco Value, Classic, Flex)
- Contact information card

## Components

### Navbar
- Logo
- Navigation links (Home, Contact Us, Special Offer)
- 24/7 toll-free phone number

### SearchBar
- Trip type selector (Round Trip / One Way)
- Passenger selector with classes
- From/To location inputs
- Date pickers (departure and return)
- Search button

### FlightCard
- Airline branding
- Outbound and inbound flight details
- Flight duration and stops indicator
- Price per person
- Expandable ticket options
- View Flight Info button

## Data Structure

The application is structured to easily integrate with a real API. Key interfaces:

- `Flight`: Complete flight information
- `Airport`: Airport details (code, name, city)
- `FlightSegment`: Individual flight leg information
- `Airline`: Airline details
- `TicketOption`: Different fare classes
- `SearchParams`: Search criteria
- `FilterState`: Active filters

## Styling

The design follows the Figma specifications with:
- Primary color: `#3754ED` (Blue)
- Text colors: `#010D50` (Primary), `#3A478A` (Secondary)
- Rounded corners: 12px, 18px, 24px, 40px
- Inter font family
- Consistent spacing and shadows

## Future Enhancements

- [ ] Connect to real flight API
- [ ] User authentication
- [ ] Booking flow
- [ ] Payment integration
- [ ] Saved searches
- [ ] Price alerts
- [ ] Multi-city search
- [ ] Mobile responsive optimizations
- [ ] Accessibility improvements
- [ ] Performance optimizations

## Development Notes

- All components use TypeScript for type safety
- Mock data is provided in `src/data/mockFlights.ts`
- Ready for API integration - just replace mock data with API calls
- Uses Next.js App Router with client components where needed
- Implements shadcn/ui for consistent, accessible components

## License

Private - GlobeHunters

## Contact

For support, call: 020 4502 2984 (24/7 Toll-Free)
