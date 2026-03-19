# Currency Conversion Bug Fix

## Problem Summary

The currency conversion was failing with the error:
```
⚠️  Missing exchange rate for ₹ or GBP, returning original amount
```

Despite the exchange rate API returning valid data with currency codes like:
```json
{
  "GBP": 0.761,
  "INR": 88.71,
  "USD": 1.0
}
```

## Root Cause

The bug was in **`src/lib/vyspa/transformers.ts`** at **line 151**:

```typescript
// ❌ BEFORE (incorrect)
currency: getCurrencySymbol(result.currency_code),
```

This converted currency **codes** (like "INR", "GBP") to currency **symbols** (like "₹", "£") when creating Flight objects.

When the converter tried to look up exchange rates, it was searching for:
- `rates["₹"]` - doesn't exist ❌
- `rates["£"]` - doesn't exist ❌

Instead of:
- `rates["INR"]` - exists ✅
- `rates["GBP"]` - exists ✅

## Solution

Changed the Flight object to store currency **codes** instead of **symbols**:

```typescript
// ✅ AFTER (correct)
currency: result.currency_code.toUpperCase(), // Store code, not symbol
```

### Files Modified

1. **`src/lib/vyspa/transformers.ts`** (line 151)
   - Store currency code instead of symbol in Flight object
   - Changed: `currency: getCurrencySymbol(result.currency_code)` → `currency: result.currency_code.toUpperCase()`

2. **`src/components/flights/modals/FlightInfoModal.tsx`**
   - Added import: `import { formatPrice } from "@/lib/currency";`
   - Changed line 456-457 to use `formatPrice(flight.pricePerPerson, flight.currency)`
   - This displays the correct symbol to users

3. **`src/lib/vyspa/rules.ts`** (lines 131-147, 158)
   - Added conversion for `pricePerPerson` field (was missing!)
   - Added conversion for `ticketOptions` prices
   - Without this, UI showed £55,178 (INR amount with GBP symbol) instead of £473.35

## How It Works Now

1. **Data Storage**: Flight objects store currency codes
   ```typescript
   {
     price: 1000,
     currency: "INR"  // Code, not symbol
   }
   ```

2. **Currency Conversion**: Works correctly because it can look up rates
   ```typescript
   rates["INR"]  // ✅ Found: 88.71
   rates["GBP"]  // ✅ Found: 0.761
   ```

3. **Display to Users**: Components use `formatPrice()` to show symbols
   ```typescript
   formatPrice(1000, "INR")  // Returns "₹1,000.00"
   formatPrice(100, "GBP")   // Returns "£100.00"
   ```

## Testing

Run the test script to verify:
```bash
node scripts/test-currency-converter.mjs
```

Expected output shows successful conversions:
- ✅ INR to GBP: 100 INR → 0.86 GBP
- ✅ GBP to INR: 100 GBP → 11,657.03 INR
- ✅ USD to GBP: 100 USD → 76.10 GBP
- ❌ Symbol fails: 100 ₹ → 100 GBP (as expected)

## Components Already Using formatPrice()

These components were already correctly using `formatPrice()`:
- ✅ `src/components/flights/flight-card/FlightActions.tsx`
- ✅ `src/components/flights/flight-card/TicketOptionsPanel.tsx`
- ✅ `src/components/search/DatePriceSelector.tsx`
- ✅ `src/components/search/filters/AirlineFilter.tsx`

## API Integration

The exchange rate API response format is correctly handled:
```json
{
  "base": "USD",
  "rates": {
    "USD": 1,
    "GBP": 0.761,
    "INR": 88.71,
    "EUR": 0.865,
    "AED": 3.67
  }
}
```

The converter:
1. Fetches rates from `https://api.exchangerate-api.com/v4/latest/USD`
2. Caches for 24 hours
3. Falls back to static rates if API fails
4. Converts through USD as base currency

## Summary

**The Fixes**: 
1. Store currency **codes** instead of **symbols** in Flight objects (`transformers.ts`)
2. Convert **all price fields** including `pricePerPerson` and `ticketOptions` (`rules.ts`)
3. Use `formatPrice()` to display symbols in UI components

**Impact**: Currency conversion now works correctly across the entire application, with all prices properly converted.

**User Experience**: Users still see currency symbols (£, ₹, $) in the UI, but the data layer uses standardized currency codes (GBP, INR, USD).

## The Bugs That Almost Got Away

### Bug #2: Missing Price Field Conversions

The initial fix solved the conversion lookup issue, but revealed a second bug:
- ❌ **Before**: £55,178.00 (INR amount with GBP symbol)
- ✅ **After**: £473.35 (properly converted GBP amount)

The `convertFlightCurrencies()` function was only converting `flight.price` but not `flight.pricePerPerson` or `ticketOptions[].price`, causing the UI to show unconverted amounts with converted currency symbols!

### Bug #3: Date Slider Price Inconsistency

The date price selector was showing different prices than the actual flight results:
- **Date slider**: £600 (mock/estimated price)
- **Flight card**: £473 (actual converted price)

**Root Cause**: The `useDatePrices` hook was generating random mock prices instead of fetching actual flight data for each date.

**Fix**: Completely rewrote the date price fetching to use **real flight searches**:

1. **Show actual minimum price for selected date**:
   ```typescript
   // src/app/search/page.tsx
   const actualMinPrice = flights.reduce((min, flight) => 
     flight.pricePerPerson < min.pricePerPerson ? flight : min
   ).pricePerPerson;
   ```

2. **Fetch real prices when dates scroll into view**:
   ```typescript
   // src/hooks/useDatePrices.ts
   const fetchDatePrice = async (index, type) => {
     // Create search params for this specific date
     const modifiedParams = {
       ...searchParams,
       [type === 'departure' ? 'departureDate' : 'returnDate']: dateObj
     };
     
     // Fetch actual flights for this date
     const response = await flightService.searchFlights(modifiedParams);
     
     // Find minimum price from real results
     const minPrice = response.flights.reduce((min, flight) => 
       flight.pricePerPerson < min.pricePerPerson ? flight : min
     ).pricePerPerson;
     
     // Update date price with real data
     updateDatePrice(minPrice);
   };
   ```

**Result**: Date prices now show **real minimum fares** from actual flight searches, with lazy loading as dates scroll into view. No more fake variations!

