/**
 * BoxPay Payment Gateway Configuration
 */

export const BOXPAY_CONFIG = {
  // API Configuration
  merchantId: process.env.BOXPAY_MERCHANT_ID || 'zxVrRVIYGk',
  bearerToken: process.env.BOXPAY_BEARER_TOKEN || 'HXByjxPP5UCdmqRqN0r43tBTVda9toNZqpXUaIQhSg9GG7fyCQEgpR0J68zNz7czbj0DwexvwF7rR4c0ROsZb4',
  
  // API Endpoints
  baseUrl: process.env.BOXPAY_BASE_URL || 'https://test-apis.boxpay.tech',
  checkoutUrl: process.env.BOXPAY_CHECKOUT_URL || 'https://test-checkout.boxpay.tech',
  
  // Context defaults
  defaultContext: {
    countryCode: 'GB',
    legalEntity: {
      code: 'a1_traveldeals_ltd',
    },
    localCode: 'en-GB',
  },
  
  // Payment type - 'A' for Authorization
  paymentType: 'A',
  
  // 3DS Authentication
  threeDSAuthentication: 'Yes',
  
  // Return URLs (will be overridden with actual app URLs)
  frontendBackUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  frontendReturnUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  statusNotifyUrl: process.env.BOXPAY_STATUS_NOTIFY_URL || '',
} as const;

// Generate endpoints based on merchant ID
export const getBoxPayEndpoints = (merchantId: string = BOXPAY_CONFIG.merchantId) => ({
  createSession: `${BOXPAY_CONFIG.baseUrl}/v0/merchants/${merchantId}/sessions`,
  inquireTransaction: `${BOXPAY_CONFIG.baseUrl}/v0/merchants/${merchantId}/transactions/inquiries`,
});




