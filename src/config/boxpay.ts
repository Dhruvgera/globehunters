/**
 * BoxPay Payment Gateway Configuration
 */

export const BOXPAY_CONFIG = {
  // API Configuration
  merchantId: process.env.BOXPAY_MERCHANT_ID || 'zxV7XIkdEs',
  bearerToken: process.env.BOXPAY_BEARER_TOKEN || '2m6tTRPyzn0ANSe8Y9qkT63SAsX5W1QVRZSWos62kSdsOb614VFMLaJVUTfnzOumLORgevSslutpBXJ9VbhfT',
  
  // API Endpoints
  baseUrl: process.env.BOXPAY_BASE_URL || 'https://apis.boxpay.in/v0/',
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

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const buildMerchantApiBaseUrl = (baseUrl: string): string => {
  const normalized = normalizeBaseUrl(baseUrl);
  return /\/v0$/i.test(normalized) ? normalized : `${normalized}/v0`;
};

// Generate endpoints based on merchant ID
export const getBoxPayEndpoints = (merchantId: string = BOXPAY_CONFIG.merchantId) => ({
  createSession: `${buildMerchantApiBaseUrl(BOXPAY_CONFIG.baseUrl)}/merchants/${merchantId}/sessions`,
  inquireTransaction: `${buildMerchantApiBaseUrl(BOXPAY_CONFIG.baseUrl)}/merchants/${merchantId}/transactions/inquiries`,
});











