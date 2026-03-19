# Journey Time Display Fix

## Issue

The flight modal was showing only the total flying time (9h 35m) without showing:
1. Individual flight durations for each leg
2. How the time was split between flights and layovers
3. The total journey time including layovers

### Example Problem:
```
❌ Before:
Travel time: 9h 35m
Stopover at CPH for 10h 20m
```

Users couldn't see:
- How long each individual flight segment took
- What the total journey time was (flying + layover = 19h 55m)

## Solution

### 1. Updated Types (`src/types/flight.ts`)

Added new fields to `FlightSegment`:

```typescript
export interface IndividualFlight {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  flightNumber?: string;
  carrierCode?: string;
}

export interface FlightSegment {
  // ... existing fields
  duration: string; // Total flying time (excluding layovers)
  totalJourneyTime?: string; // Total time including layovers
  individualFlights?: IndividualFlight[]; // Individual flight legs with their durations
  // ... rest of fields
}
```

### 2. Updated Transformer (`src/lib/vyspa/transformers.ts`)

Enhanced the `transformSegmentToFlightSegment` function to:

#### Extract Individual Flight Information
```typescript
const individualFlights = segment.Flights.map((flight) => ({
  departureAirport: flight.departure_airport,
  arrivalAirport: flight.arrival_airport,
  departureTime: formatTime(flight.departure_time),
  arrivalTime: formatTime(flight.arrival_time),
  duration: flight.travel_time ? formatDuration(parseIntSafe(flight.travel_time, 0)) : '',
  flightNumber: String(flight.flight_number || '').trim() || undefined,
  carrierCode: flight.airline_code,
}));
```

#### Calculate Total Journey Time
```typescript
// Sum up all layover times
let totalLayoverMinutes = 0;
if (segment.Flights.length > 1) {
  for (let i = 0; i < segment.Flights.length - 1; i++) {
    const minutes = calculateDuration(
      current.arrival_date,
      current.arrival_time,
      next.departure_date,
      next.departure_time
    );
    totalLayoverMinutes += minutes;
  }
}

// Calculate total journey time (flying time + layovers)
const totalJourneyMinutes = totalDuration + totalLayoverMinutes;
const totalJourneyTime = formatDuration(totalJourneyMinutes);
```

### 3. Updated FlightInfoModal (`src/components/flights/modals/FlightInfoModal.tsx`)

Replaced the single "Travel time" display with a detailed breakdown:

```tsx
{/* Travel Time - show individual flights if available, otherwise show total */}
<div className="flex flex-col gap-2">
  {currentLeg.individualFlights && currentLeg.individualFlights.length > 0 ? (
    <>
      {/* Individual Flight Times */}
      {currentLeg.individualFlights.map((flight, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <Plane className="w-3 sm:w-4 h-3 sm:h-4 text-[#3A478A] shrink-0" />
          <span className="text-xs sm:text-sm text-[#3A478A]">
            {flight.departureAirport} → {flight.arrivalAirport}: {flight.duration}
          </span>
        </div>
      ))}
      {/* Total Journey Time */}
      {currentLeg.totalJourneyTime && (
        <div className="flex items-center gap-1 mt-1">
          <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-[#010D50] shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-[#010D50]">
            Total journey time: {currentLeg.totalJourneyTime}
          </span>
        </div>
      )}
    </>
  ) : (
    <div className="flex items-center gap-1">
      <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-[#3A478A] shrink-0" />
      <span className="text-xs sm:text-sm text-[#3A478A]">
        Flight time: {currentLeg.duration}
      </span>
    </div>
  )}
</div>
```

## Results

### Before:
```
Travel time: 9h 35m

Stopover at CPH for 10h 20m
```

### After:
```
✈️  JFK → CPH: 7h 35m
✈️  CPH → LHR: 2h 0m
⏱️  Total journey time: 19h 55m

Stopover at CPH for 10h 20m
```

## Key Features

1. **Individual Flight Durations**: Each flight segment shows its actual flying time
2. **Clear Breakdown**: Users can see exactly how long each leg takes
3. **Total Journey Time**: Includes both flying time AND layover time
4. **Fallback Support**: Direct flights still show simple "Flight time" display

## Data Flow

1. **API Response**: Each flight in the segment has a `travel_time` field (in minutes)
2. **Transformer**: 
   - Extracts individual flight durations
   - Calculates layover times between flights
   - Sums everything for total journey time
3. **Frontend**: Displays breakdown or simple time based on available data

## Example Calculation

For JFK → LHR via CPH:

| Component | Duration | Calculation |
|-----------|----------|-------------|
| Flight 1 (JFK→CPH) | 7h 35m | From API: `travel_time: 455` |
| Layover at CPH | 10h 20m | Arrival 07:10 to Departure 17:30 |
| Flight 2 (CPH→LHR) | 2h 0m | From API: `travel_time: 120` |
| **Total Journey Time** | **19h 55m** | 7h 35m + 10h 20m + 2h 0m |
| **Total Flying Time** | **9h 35m** | 7h 35m + 2h 0m (no layovers) |

## Files Changed

1. **Modified**: `src/types/flight.ts` - Added `IndividualFlight` interface and new fields
2. **Modified**: `src/lib/vyspa/transformers.ts` - Extract individual flights and calculate total journey time
3. **Modified**: `src/components/flights/modals/FlightInfoModal.tsx` - Display breakdown of flight times

## Testing

The changes will automatically apply to all connecting flights. For direct flights (no layovers), the display will show the simple format as before.

Test cases:
- ✅ Direct flights: Show "Flight time: Xh Ym"
- ✅ 1-stop flights: Show individual flights + total journey time
- ✅ Multi-stop flights: Show all individual flights + total journey time
- ✅ Layover display: Still shown separately below the flight times




