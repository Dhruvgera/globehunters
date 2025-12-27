# Integration: BoxPay

BoxPay is used as the hosted payment checkout. The flow is:

1. The app creates a **payment session**.
2. The user is redirected to BoxPay’s hosted checkout.
3. BoxPay redirects back with a `redirectionResult` token.
4. The app **inquires** the payment status using that token.

## Config

`src/config/boxpay.ts` (`BOXPAY_CONFIG`) supports env overrides:

- `BOXPAY_MERCHANT_ID`
- `BOXPAY_BEARER_TOKEN`
- `BOXPAY_BASE_URL`
- `BOXPAY_CHECKOUT_URL`
- `BOXPAY_STATUS_NOTIFY_URL`
- `NEXT_PUBLIC_APP_URL` (used to build return/back URLs)

> Note: `src/config/boxpay.ts` includes test defaults. In production you should provide env vars.

## API routes

### Create session: `POST /api/boxpay/session`

- Route: `src/app/api/boxpay/session/route.ts`
- Calls: `boxpayService.createSession(...)` (see below)
- Builds URLs:
  - `returnUrl = ${origin}/payment-complete?orderId=...`
  - `backUrl = ${origin}/payment`

### Inquire transaction: `POST /api/boxpay/inquiry`

- Route: `src/app/api/boxpay/inquiry/route.ts`
- Input: `{ token }` (the `redirectionResult` query param)
- Output: simplified `payment` object: status, orderId, amount, currency, transactionId, etc.

## Client hook usage

The UI uses `src/hooks/useBoxPay.ts`:

- `createSession(...)` → calls `/api/boxpay/session`
- `redirectToCheckout(checkoutUrl)` → sets `window.location.href`
- `inquirePayment(token)` → calls `/api/boxpay/inquiry`

## Service implementation

`src/services/api/boxpayService.ts`:

- `buildSessionRequest(...)` normalizes shopper details (notably `phoneNumber` digit-only).
- `parseCompletionInfo(...)` maps BoxPay status codes to simplified statuses:
  - `success`, `failed`, `pending`, `cancelled`, `unknown`

## Token TTL caveat

The inquiry token (`redirectionResult`) is time-limited (documented in `src/app/api/boxpay/inquiry/route.ts`).
The UI handles reloads/returns using `sessionStorage` keys like:

- `pendingOrderId`
- `paymentCompletedOrderId`


