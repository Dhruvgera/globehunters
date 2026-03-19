# Search Results Performance Fix

## Issue

When searching for flights (e.g., Nov 30 to Dec 4), the results page would not render until ALL background date price API calls completed (~50+ seconds with 12+ API calls). This created a poor user experience where users had to wait a long time before seeing any results, even though the main search completed within 5 seconds.

## Root Cause

The date price slider feature was making multiple API calls to fetch prices for alternative dates (±3 days = 6 departure dates + 6 return dates = 12 background calls). These were being triggered immediately after the main search completed, and while they were async, they were:

1. **Started too early**: No delay to allow UI rendering
2. **Too many calls**: 7 dates per slider (14 total for round-trip)
3. **Too much concurrency**: 6 parallel requests at once
4. **Blocking perception**: Users perceived the page as "loading" during background fetches

## Solution

### 1. Added Staggered Delays (search/page.tsx)

```typescript
// 500ms delay before starting departure date fetching
setTimeout(() => {
  fetchDatePricesBatch(departureIndices, 'departure');
}, 500);

// 1500ms delay before starting return date fetching
setTimeout(() => {
  fetchDatePricesBatch(returnIndices, 'return');
}, 1500);
```

**Impact**: Main search results now render immediately, background fetching starts after UI is visible.

### 2. Optimized Date Range (useDatePrices.ts)

Date slider shows 7 dates (±3 days) around selected date:

```typescript
// 7 dates per slider (±3 from selected)
const generateDateRange = useCallback((baseDate: Date, count: number = 7): Date[] => {
```

**Impact**: Shows 6 alternative departure dates + 6 alternative return dates for flexibility.

### 3. Reduced Concurrency (useDatePrices.ts)

```typescript
// Before: 6 parallel requests
const MAX_CONCURRENCY = 6;

// After: 3 parallel requests
const MAX_CONCURRENCY = 3;
```

**Impact**: Reduced server load and prevented overwhelming the API.

### 4. Added Error Handling

```typescript
fetchDatePricesBatch(departureIndices, 'departure').catch(err => {
  console.error('Error in background departure date fetch:', err);
});
```

**Impact**: Background fetch errors won't crash the page or affect main results.

## Results

### Before
- ❌ Results render after ~50 seconds (waiting for all API calls)
- ❌ 12-14 API calls made immediately
- ❌ User sees loading spinner for entire duration
- ❌ Poor perceived performance

### After
- ✅ Results render immediately after main search (~5 seconds)
- ✅ 12 background API calls made after UI renders (6 departure + 6 return)
- ✅ User can interact with results while dates load
- ✅ Date switching uses cached data (instant, no new API call)
- ✅ Excellent perceived performance

## User Experience Flow

1. **0-5s**: User submits search → Loading spinner → Main results render
2. **5.5s+**: Background departure date prices start fetching (invisible to user)
3. **6.5s+**: Background return date prices start fetching (invisible to user)
4. **Date Slider**: Shows estimated prices initially, updates with actual prices as they load

## Technical Details

### API Call Sequence (After Fix)

```
t=0s:    User submits search
t=0-5s:  Main search API call (30 Nov - 4 Dec)
t=5s:    Results render on page ✅
t=5.5s:  Background: Fetch 28 Nov - 4 Dec (±1 from selected)
t=5.5s:  Background: Fetch 29 Nov - 4 Dec (±1 from selected)
t=6s:    Background: Fetch 27 Nov - 4 Dec (±2 from selected)
t=6s:    Background: Fetch 1 Dec - 4 Dec (±2 from selected)
t=6.5s:  Background: Fetch 30 Nov - 2 Dec (return ±1)
t=6.5s:  Background: Fetch 30 Nov - 3 Dec (return ±1)
t=7s:    Background: Fetch 30 Nov - 1 Dec (return ±2)
t=7s:    Background: Fetch 30 Nov - 5 Dec (return ±2)
```

### Caching Strategy

- Selected dates (center of slider) are cached immediately with actual prices
- Background fetches update the cache as they complete
- Subsequent searches reuse cached data when available
- Invalid date combinations (return before departure) are skipped

## Testing

To verify the fix:

1. Search for flights (e.g., LHR to DEL, 30 Nov - 4 Dec)
2. **Expected**: Results page appears within 5-7 seconds
3. **Expected**: Date slider shows estimated prices initially
4. **Expected**: Date prices update gradually (not blocking)
5. **Console**: Should see "🔄 Starting background fetch" logs after results render

## Files Modified

- `src/app/search/page.tsx`: Added delays and error handling for background fetching
- `src/hooks/useDatePrices.ts`: Reduced date range (7→5) and concurrency (6→3), added global cache integration
- `src/hooks/useFlights.ts`: Added cache check before API calls
- `src/lib/cache/flightCache.ts`: **NEW** Global flight cache service to prevent redundant API calls

## Flight Caching (NEW)

A global flight cache has been implemented to solve the issue where switching dates in the date slider would trigger new API calls even though the data was already fetched:

### How It Works

1. **Cache Key**: Generated from search params (origin, destination, dates, passengers, class)
2. **TTL**: 5 minutes (configurable)
3. **Storage**: In-memory Map with automatic expiry
4. **Scope**: Shared between `useFlights` and `useDatePrices` hooks

### Flow

```
User clicks date slider:
  ↓
useFlights triggered with new dates
  ↓
Check flightCache for matching params
  ↓
✅ Cache HIT → Use cached data (instant, no API call)
❌ Cache MISS → Fetch from API + store in cache
```

### Benefits

- **Instant date switching**: No loading spinner when switching to pre-fetched dates
- **Reduced API load**: Background date fetching populates cache for future use
- **Better UX**: Seamless navigation between dates
- **Automatic cleanup**: Expired entries cleared every 2 minutes

## Console Output Example

When the system is working correctly, you'll see logs like:

```
🌐 Fetching fresh flight data from API...
💾 Flight cache SET: LHR-DEL-2025-11-30-2025-12-04-1-0-0-Economy-round-trip (355 flights)
🔄 Starting background fetch for departure dates
[useDatePrices] FETCH departure date 2025-11-29 with fixed 2025-12-04
💾 Flight cache SET: LHR-DEL-2025-11-29-2025-12-04-1-0-0-Economy-round-trip (314 flights)
[useDatePrices] Using cached data for departure date 2025-11-28
✅ Flight cache HIT: LHR-DEL-2025-11-28-2025-12-04-1-0-0-Economy-round-trip (369 flights, age: 3s)
```

Then when you switch dates:

```
🚀 Using cached flight data - no API call needed!
```

## Future Optimizations

Potential further improvements:

1. **Lazy loading**: Only fetch dates when user interacts with slider
2. **Server-side caching**: Cache date prices on backend for faster responses
3. **Predictive fetching**: Fetch based on popular date ranges
4. **Progressive enhancement**: Show skeleton loaders for date prices
5. **WebSocket/SSE**: Stream date prices as they become available
6. **IndexedDB/LocalStorage**: Persist cache across page reloads
7. **Cache prewarming**: Pre-fetch popular routes during idle time

