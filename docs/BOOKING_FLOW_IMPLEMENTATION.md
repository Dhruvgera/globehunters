# Booking Flow Implementation

## Overview

The booking flow has been implemented with proper state management using Zustand, allowing users to seamlessly navigate from flight selection to booking confirmation.

## Architecture

### State Management: Zustand Store

Location: `src/store/bookingStore.ts`

The booking store uses Zustand with persistence middleware (sessionStorage) to maintain booking state across page navigations.

**Key Features:**
- Persists to sessionStorage (cleared when browser closes)
- Manages selected flight, passengers, add-ons, and booking details
- Automatically updates workflow step when flight is selected

### Store Interface

```typescript
interface BookingState {
  // Selected flight
  selectedFlight: Flight | null;
  selectedFareType: 'Eco Value' | 'Eco Classic' | 'Eco Flex';
  setSelectedFlight: (flight: Flight, fareType?) => void;
  clearSelectedFlight: () => void;
  
  // Search state
  searchParams: SearchParams | null;
  
  // Passengers
  passengers: Passenger[];
  
  // Contact info
  contactEmail: string;
  contactPhone: string;
  
  // Add-ons
  addOns: AddOns;
  
  // Workflow
  currentStep: 'search' | 'booking' | 'payment' | 'confirmation';
}
```

## User Flow

### 1. Flight Selection

**From Search Results (FlightCard.tsx):**

```typescript
const handleSelectFlight = (fareType: "Eco Value" | "Eco Classic" | "Eco Flex") => {
  setSelectedFlight(flight, fareType);
  router.push("/booking");
};
```

- User clicks "Select" on a fare option
- Flight and fare type saved to store
- Navigates to booking page

**From Flight Info Modal (FlightInfoModal.tsx):**

```typescript
const handleBookNow = () => {
  const fareTypeMap = {
    value: 'Eco Value',
    classic: 'Eco Classic',
    flex: 'Eco Flex',
  };
  
  setSelectedFlight(flight, fareTypeMap[selectedFareType]);
  router.push('/booking');
};
```

- User clicks "Book" button in modal
- Selected fare type from tabs is used
- Flight saved to store and navigates to booking page

### 2. Booking Page

**Location:** `src/app/booking/page.tsx`

**Flow:**
1. On mount, checks if `selectedFlight` exists in store
2. If no flight selected, redirects to search page
3. If flight exists, extracts data and displays booking form

**Data Extraction:**

```typescript
// Outbound leg
const outboundLeg = {
  from: flight.outbound.departureAirport.city,
  to: flight.outbound.arrivalAirport.city,
  fromCode: flight.outbound.departureAirport.code,
  toCode: flight.outbound.arrivalAirport.code,
  departureTime: flight.outbound.departureTime,
  arrivalTime: flight.outbound.arrivalTime,
  date: flight.outbound.date,
  duration: flight.outbound.totalJourneyTime || flight.outbound.duration,
  stops: flight.outbound.stopDetails,
  airline: flight.airline.name,
};

// Inbound leg (if exists)
const inboundLeg = flight.inbound ? { ... } : null;
```

**Components Displayed:**
- Flight Summary Cards (outbound + inbound if round trip)
- Passenger Details Form
- Price Summary Card
- Terms & Conditions
- Alert Banners

### 3. Payment Page

**Location:** `src/app/payment/page.tsx`

- Accessed after completing booking form
- Uses flight data from store
- Collects payment details

### 4. Confirmation

- Final step showing booking confirmation
- Flight details displayed from store
- Option to download/email confirmation

## Key Components

### FlightInfoModal
- **Purpose:** Shows detailed flight information
- **Book Button:** Saves flight to store and navigates to booking
- **Fare Type Selection:** User can choose between Value/Classic/Flex
- **Enhanced with:** Individual flight times, total journey time, aircraft names, distance units

### FlightCard
- **Purpose:** Displays flight option in search results
- **Select Button:** Opens ticket options panel
- **Ticket Options Panel:** Shows fare types with "Select" buttons
- **Each Select Button:** Saves flight with specific fare type and navigates to booking

### Booking Page
- **Purpose:** Collects passenger information and confirms booking
- **Flight Data:** Extracted from `selectedFlight` in store
- **Protection:** Redirects to search if no flight selected
- **Flight Summary Cards:** Display actual flight data (not mock data)
- **Price Summary:** Shows actual flight price from selected flight

## Data Flow Diagram

```
Search Results Page
    ↓
User clicks "View Details" or "Select"
    ↓
FlightCard or FlightInfoModal
    ↓
User selects fare type (Value/Classic/Flex)
    ↓
Click "Book" or "Select"
    ↓
setSelectedFlight(flight, fareType)
    ├─ Saves to Zustand store
    └─ Persists to sessionStorage
    ↓
router.push('/booking')
    ↓
Booking Page
    ├─ Checks store for selectedFlight
    ├─ If null → redirect to /search
    └─ If exists → display booking form
    ↓
User fills passenger details
    ↓
Click "Continue to Payment"
    ↓
Payment Page
    ↓
Confirmation Page
```

## Session Persistence

The booking store uses sessionStorage for persistence:

```typescript
{
  name: 'globehunters-booking-storage',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({
    searchParams: state.searchParams,
    selectedFlight: state.selectedFlight,
    selectedFareType: state.selectedFareType,
    passengers: state.passengers,
    contactEmail: state.contactEmail,
    contactPhone: state.contactPhone,
    addOns: state.addOns,
    booking: state.booking,
    currentStep: state.currentStep,
  }),
}
```

**Benefits:**
- ✅ Data persists across page refreshes
- ✅ Data cleared when browser closes
- ✅ Secure (payment details NOT persisted)
- ✅ Multiple tabs share same booking state

## Error Handling

### No Flight Selected
```typescript
useEffect(() => {
  if (!flight) {
    router.push("/search");
  }
}, [flight, router]);
```

If user navigates directly to `/booking` without selecting a flight, they're redirected back to search.

### Invalid Flight Data
Each component has fallbacks:
- Missing inbound leg → Only show outbound
- Missing total journey time → Fall back to flight time
- Missing stop details → Generate from stops count

## Testing Checklist

- [ ] Select flight from search results → Should navigate to booking
- [ ] Click "Book" in flight info modal → Should navigate to booking with correct fare
- [ ] Refresh booking page → Flight data should persist
- [ ] Navigate to booking without selecting flight → Should redirect to search
- [ ] One-way flight → Should only show outbound leg
- [ ] Round-trip flight → Should show both legs
- [ ] Price displays correctly on booking page
- [ ] Close browser and reopen → Booking data should be cleared

## Future Enhancements

1. **Multi-passenger Support**
   - Update passenger count based on search params
   - Calculate total price for all passengers

2. **Add-ons Selection**
   - Baggage add-ons
   - Seat selection
   - Travel insurance

3. **Price Breakdown**
   - Separate fare from taxes/fees
   - Show per-passenger breakdown

4. **Booking API Integration**
   - Submit booking to backend
   - Generate booking reference
   - Send confirmation email

## Files Modified

1. **FlightInfoModal.tsx**
   - Added booking store import
   - Added `handleBookNow` function
   - Connected Book button to booking flow

2. **booking/page.tsx**
   - Replaced mock data with actual flight data
   - Extract outbound/inbound leg information
   - Use actual prices
   - Handle one-way flights (conditional inbound display)

3. **bookingStore.ts** (already existed)
   - Used for state management
   - No modifications needed

## Dependencies

- `zustand` - State management
- `zustand/middleware` - Persistence middleware
- `next/navigation` - Router for navigation
- `sessionStorage` - Browser API for persistence

## Notes

- The booking flow is fully client-side currently
- Backend integration needed for actual booking submission
- Payment processing not yet implemented
- Email notifications not yet implemented




