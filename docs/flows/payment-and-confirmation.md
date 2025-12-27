# Flow: Payment → Confirmation

This doc describes the “post-passenger-details” lifecycle:

- optionally syncing add-ons to the Vyspa folder
- creating a BoxPay session and redirecting
- returning to `/payment-complete`
- recording payment in Vyspa Portal
- sending confirmation email

## Key code entry points

- UI: `src/app/payment/page.tsx`
- BoxPay hook: `src/hooks/useBoxPay.ts`
- BoxPay API routes:
  - `POST /api/boxpay/session` → `src/app/api/boxpay/session/route.ts`
  - `POST /api/boxpay/inquiry` → `src/app/api/boxpay/inquiry/route.ts`
- Vyspa Portal routes:
  - `POST /api/vyspa/init-folder` → `src/app/api/vyspa/init-folder/route.ts`
  - `POST /api/vyspa/add-extras` → `src/app/api/vyspa/add-extras/route.ts`
  - `POST /api/vyspa/save-payment` → `src/app/api/vyspa/save-payment/route.ts`
- Payment complete UI: `src/app/payment-complete/page.tsx`
- Email route:
  - `POST /api/send-confirmation-email` → `src/app/api/send-confirmation-email/route.ts`

## Sequence diagram

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant Pay as /payment (client)
  participant Z as bookingStore
  participant IF as /api/vyspa/init-folder
  participant AE as /api/vyspa/add-extras
  participant BP as /api/boxpay/session
  participant Box as BoxPay Hosted Checkout
  participant PC as /payment-complete (client)
  participant INQ as /api/boxpay/inquiry
  participant SP as /api/vyspa/save-payment
  participant Mail as /api/send-confirmation-email

  U->>Pay: Arrive on payment page
  Pay->>Z: read selectedFlight, passengers, addOns, folderNumber/requestId

  alt Folder not yet created
    Pay->>IF: POST passenger + pricing + affiliate context
    IF-->>Pay: { folderNumber, customerId?, emailAddress? }
    Pay->>Z: setVyspaFolderInfo(...)
  end

  opt Extras selected (insurance/baggage)
    Pay->>AE: POST { folderNumber, currency, start/end dates, extras[] }
    AE-->>Pay: success/failure (non-blocking)
  end

  Pay->>BP: POST { orderId=folderNumber|requestId, amount, currency, shopper }
  BP-->>Pay: { checkoutUrl }
  Pay->>Box: redirect to checkoutUrl

  Box-->>PC: Redirect back with redirectionResult (+ orderId)
  PC->>INQ: POST { token=redirectionResult }
  INQ-->>PC: { payment: status, transactionId, amount, currency }

  alt payment failed
    PC-->>Pay: redirect to /payment?error=payment_failed
  else payment success
    PC->>SP: POST { folderNumber, transactionId, amount, currency } (non-blocking)
    PC->>Mail: POST { to, data } (confirmation email)
    PC->>Z: resetBooking()
  end
```

## Important implementation notes

### “Order ID” identity

The repo treats the “order id” as:

- **prefer**: `vyspaFolderNumber` (once a folder exists)
- fallback: `searchRequestId` (Vyspa request/session id used as a temporary “web ref”)

This shows up throughout the funnel as the **reference number**.

### BoxPay inquiry token TTL

`/api/boxpay/inquiry` notes that `redirectionResult` is only valid for ~5 minutes. The UI has fallbacks using `sessionStorage` (`pendingOrderId`, `paymentCompletedOrderId`) to handle returning/reloading.


