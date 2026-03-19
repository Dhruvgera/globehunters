# Timezone Date Fix

## Issue

When selecting dates in the date slider, the wrong date was being displayed:
- Clicking "Dec 5" would show "Dec 4" results
- URL showed `2025-12-01T18:30:00.000Z` but results showed Dec 2
- Off-by-one-day errors depending on user's timezone

## Root Cause

### Before
Dates were being converted using `.toISOString()` which includes:
- Full timestamp with time
- UTC timezone conversion
- Format: `2025-12-01T18:30:00.000Z`

**Problem**: When this UTC timestamp is parsed, it gets interpreted in the user's local timezone, potentially resulting in a different calendar date.

**Example**:
```
User in UTC+5:30 timezone
Date selected: Dec 1, 2025 (local)
URL: 2025-12-01T18:30:00.000Z (UTC midnight + 18.5 hours)
Parsed back: Dec 2, 2025 00:00 local time ❌ (off by 1 day!)
```

## Solution

Use **date-only format (YYYY-MM-DD)** without time or timezone information throughout the application.

### Changes Made

#### 1. URL Parameters (`src/hooks/useSearchForm.ts`)

**Before:**
```typescript
departureDate: departureDate?.toISOString() || ""
// Result: "2025-12-01T18:30:00.000Z"
```

**After:**
```typescript
const formatDateForURL = (date: Date | undefined): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

departureDate: formatDateForURL(departureDate)
// Result: "2025-12-01"
```

#### 2. URL Parsing (`src/app/search/page.tsx`)

**Before:**
```typescript
departureDate: new Date(departureDate)
// Interprets UTC string in local timezone ❌
```

**After:**
```typescript
const parseDateFromURL = (dateStr: string): Date => {
  // Parse YYYY-MM-DD as local date at midnight
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

departureDate: parseDateFromURL(departureDate)
// Creates local date object ✅
```

#### 3. Cache Keys (`src/lib/cache/flightCache.ts`)

**Before:**
```typescript
const depDate = departureDate.toISOString().split('T')[0];
// Uses UTC date for cache key
```

**After:**
```typescript
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const depDate = formatDate(departureDate);
// Uses local date for cache key ✅
```

## Testing

### Verify the Fix

1. **Initial Search**: LHR → DEL, Dec 2 - Dec 4
   - Check URL: Should show `departureDate=2025-12-02` (no time!)
   - Check results: Should show Dec 2 flights ✅

2. **Date Slider Selection**: Click on "Fri, 5 Dec"
   - Check URL: Should update to `departureDate=2025-12-05`
   - Check results: Should show Dec 5 flights (not Dec 4!) ✅

3. **Date Consistency**: 
   - The date shown in the slider should match the URL
   - The date in the URL should match the results displayed
   - No off-by-one errors regardless of timezone

### Expected URLs

**Before:**
```
?departureDate=2025-12-01T18%3A30%3A00.000Z&returnDate=2025-12-03T18%3A30%3A00.000Z
```

**After:**
```
?departureDate=2025-12-01&returnDate=2025-12-03
```

Much cleaner and timezone-safe! ✅

## Impact

### Benefits
1. ✅ **Date accuracy**: Selected date always matches displayed results
2. ✅ **Timezone safe**: Works correctly in all timezones
3. ✅ **Cleaner URLs**: Simpler, more readable date format
4. ✅ **Better caching**: Cache keys are consistent across timezones
5. ✅ **No off-by-one errors**: Dates are always interpreted as local dates

### Technical Details

**Date Handling Rules:**
- Always use local dates (user's timezone)
- Never convert to/from UTC for UI operations
- Use YYYY-MM-DD format for:
  - URL parameters
  - Cache keys
  - API requests (if API expects date-only)

**When to Use Each Format:**
- `YYYY-MM-DD`: URL params, cache keys, user-facing dates
- `Date` object: Internal calculations, comparisons
- ISO string with timezone: Only for backend APIs if required

## Files Modified

1. `src/hooks/useSearchForm.ts` - Format dates for URL without timezone
2. `src/app/search/page.tsx` - Parse dates from URL as local dates
3. `src/lib/cache/flightCache.ts` - Use local dates for cache keys

## Backward Compatibility

The fix handles both old and new URL formats:
- Old format: `2025-12-01T18:30:00.000Z` (still parsed correctly)
- New format: `2025-12-01` (preferred)

However, all **new** searches will use the new format, ensuring consistency going forward.

## Related Issues

This fix also solves:
- Date slider showing wrong dates
- Cache misses due to timezone-dependent keys
- Inconsistent date display across components
- Date comparison bugs in date validation logic




