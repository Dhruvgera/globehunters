# Integration: Vyspa Portal (Folder lifecycle)

This repo integrates with a separate “Portal API” (`portal.globehunters.com`) to:

- create / initialize folders (booking containers)
- store customer/passenger details
- store manual itinerary segments
- add paid extras (insurance/baggage)
- record payment transaction IDs and update folder status

## Config

Config lives in `src/config/vyspaPortal.ts` (`VYSPA_PORTAL_CONFIG`):

- `VYSPA_PORTAL_URL` (defaults to `https://portal.globehunters.com/jsonserver.php`)
- `VYSPA_PORTAL_USERNAME`
- `VYSPA_PORTAL_PASSWORD`
- `VYSPA_PORTAL_TOKEN`
- `timeout` defaults to 60s

Region-specific behavior:

- `getPortalRegionConfig()` maps region → `{ websiteName, brand, branchCode, currency }`
- Region is derived from host via `src/lib/utils/domainMapping.ts`

## Key routes

### 1) Init folder: `POST /api/vyspa/init-folder`

- Implementation: `src/app/api/vyspa/init-folder/route.ts`

Responsibilities:

- Accepts passenger/contact and pricing metadata from the client.
- Computes affiliate market source + subsource IDs using:
  - `getRegionFromHost()` (`src/lib/utils/domainMapping.ts`)
  - `getMarketSourceMapping()` (`src/lib/utils/affiliateMapping.ts`)
- Builds **manual itinerary segments**:
  - AIR segments for each flight leg
  - TKT segment for ticket/pricing summary (with `FolderPricings`)
- Sends Portal methods such as:
  - `save_customer_details`
  - `saveBasketToFolder`

Outputs:

- `folderNumber` (stored in Zustand `vyspaFolderNumber`)
- sometimes `customerId` / `emailAddress` (stored in Zustand, used as email fallback)

### 2) Add extras: `POST /api/vyspa/add-extras`

- Implementation: `src/app/api/vyspa/add-extras/route.ts`

Responsibilities:

- Adds iAssure insurance (vendorId configured) and/or baggage products into the folder.
- Expects `startDate` and `endDate` (formatted for Portal as `DD/MM/YYYY`).

### 3) Save payment: `POST /api/vyspa/save-payment`

- Implementation: `src/app/api/vyspa/save-payment/route.ts`

Responsibilities:

- Calls Portal method `saveBarclaycardPayments` to store `transaction_id` against `folder_no`.
- Also updates folder status (`api_update_folder_status`) using `FOLDER_STATUS_CODES` from `src/types/portal.ts`.

### 4) Generic portal wrapper: `POST /api/vyspa/portal`

- Implementation: `src/app/api/vyspa/portal/route.ts`

This is a low-level method wrapper that posts `method` + `params[]` as `application/x-www-form-urlencoded`.

## Folder identity in the UI

The UI treats “reference number / order id” as:

- **prefer**: `vyspaFolderNumber` (once init-folder succeeds)
- fallback: `searchRequestId` (Vyspa search session id)

This is why you’ll see both referenced across booking/payment screens.


