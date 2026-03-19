# Currency Conversion Disabled

## Summary
Currency conversion logic has been commented out across the application. The app now displays prices in whatever currency is returned by the API.

## API Behavior
The Vyspa API returns prices based on the username credential used:
- `FlightsUK` → Returns prices in **GBP (£)**
- `FlightsUS` → Returns prices in **USD ($)**

The username is automatically determined based on the domain:
- `globehunters.co.uk` → Uses `FlightsUK` (returns GBP)
- `globehunters.com` → Uses `FlightsUS` (returns USD)
- **Default** (localhost, unknown domains) → Uses `FlightsUK` (returns GBP)

## Changes Made

### 1. Flight Search Rules (`src/lib/vyspa/rules.ts`)
- **Line 9-10**: Commented out currency conversion imports
- **Line 29-30**: Commented out target currency determination
- **Line 40-41**: Commented out call to `convertFlightCurrencies()`
- **Line 112-170**: Commented out entire `convertFlightCurrencies()` function

### 2. Price Check Service (`src/services/api/priceCheckService.ts`)
- **Line 7-8**: Commented out currency conversion imports
- **Line 182-183**: Commented out target currency determination
- **Line 276-310**: Commented out currency conversion for price options

### 3. Domain Mapping (`src/lib/utils/domainMapping.ts`)
- **NEW FILE**: Created domain-based configuration mapping
- Maps domains to appropriate API usernames and currencies
- Provides helper functions: `getApiUsername()`, `getExpectedCurrency()`, `getRegion()`, `getDomainConfig()`

### 4. Vyspa Config (`src/config/vyspa.ts`)
- **Line 6**: Added import for `getApiUsername` from domain mapping
- **Line 14-17**: Changed `username` to a getter function that uses domain mapping
- Falls back to `VYSPA_USERNAME` env var if domain mapping returns empty

### 5. Currency Converter (`src/lib/currency/converter.ts`)
- No changes needed - functions kept for future use

## How It Works Now

1. **Flight Search**: 
   - API returns flights with prices in the currency based on the username
   - Prices are displayed as-is without conversion
   - Currency symbol matches the returned currency code

2. **Price Check**:
   - Price check returns upgrade options in the same currency
   - All price breakdowns (base fare, taxes, markup) use API currency
   - No conversion happens between search and booking

## Domain Mapping Configuration

The username is automatically selected based on the domain:

| Domain | Username | Currency | Region |
|--------|----------|----------|--------|
| `globehunters.co.uk` | `FlightsUK` | GBP | UK |
| `globehunters.com` | `FlightsUS` | USD | US |
| **Default** (localhost, etc.) | `FlightsUK` | GBP | UK |

### How Domain Mapping Works

1. The `getApiUsername()` function checks `window.location.hostname`
2. It matches against the configured domains in `DOMAIN_CONFIG_MAP`
3. Returns the appropriate username (`FlightsUK` or `FlightsUS`)
4. Defaults to `FlightsUK` for localhost and unknown domains

### Environment Variables (Optional Fallback)

You can still override the domain mapping by setting:

```bash
VYSPA_USERNAME=FlightsUK  # or FlightsUS
```

This will be used if domain mapping returns empty (e.g., during SSR).

## Future Considerations

If currency conversion needs to be re-enabled:
1. Uncomment all the commented sections marked with "COMMENTED OUT"
2. Ensure the currency conversion API is working
3. Test thoroughly with different currency combinations
