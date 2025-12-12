/**
 * BoxPay Payment Gateway Types
 */

// Session Creation Types
export interface BoxPayLegalEntity {
  code: string;
}

export interface BoxPayContext {
  countryCode: string;
  legalEntity: BoxPayLegalEntity;
  orderId: string;
  localCode: string;
}

export interface BoxPayMoney {
  amount: string;
  currencyCode: string;
}

export interface BoxPayAddress {
  address1: string;
  address2?: string;
  address3?: string | null;
  city: string;
  state: string;
  countryCode: string;
  postalCode: string;
}

export interface BoxPayShopper {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  uniqueReference: string;
  deliveryAddress?: BoxPayAddress;
}

export interface BoxPayShopperAuthentication {
  threeDSAuthentication: 'Yes' | 'No';
}

export interface BoxPaySessionRequest {
  context: BoxPayContext;
  paymentType: string;
  money: BoxPayMoney;
  shopper: BoxPayShopper;
  shopperAuthentication: BoxPayShopperAuthentication;
  frontendBackUrl: string;
  frontendReturnUrl: string;
  statusNotifyUrl?: string;
}

export interface BoxPaySessionResponse {
  token: string;
  url: string;
}

// Transaction Inquiry Types
export interface BoxPayInquiryDetails {
  id: string;
  transactionId: string;
  name: 'Authorisation' | 'Capture' | 'Partial_Capture' | 'Cancel' | 'Refund' | 'Partial_Refund' | 'Settlement' | 'PreDebitNotification';
}

export interface BoxPayInquiryRequest {
  token?: string;
  inquiryDetails?: BoxPayInquiryDetails;
}

export type BoxPayOperationStatus = 
  | 'Received'
  | 'Batched'
  | 'RequiresAction'
  | 'PendingReview'
  | 'Declined'
  | 'Reviewed'
  | 'Awaiting_Split_Instructions'
  | 'Posted'
  | 'Approved'
  | 'Partial_Approved'
  | 'Rejected'
  | 'Failed'
  | 'TimedOut'
  | 'Settled'
  | 'Expired'
  | 'Cancelled'
  | 'Completed';

export interface BoxPayStatus {
  operation: string;
  status: BoxPayOperationStatus;
  reason?: string;
  reasonCode?: string;
  riskLevel?: string;
  riskScore?: number;
}

export interface BoxPayPaymentMethod {
  type: 'Card' | 'Wallet' | 'BuyNowPayLater' | 'NetBanking' | 'Upi' | 'Paynow' | 'Crypto' | 'DirectDebit' | 'VirtualAccount' | 'Emi' | 'LocalCard';
  brand?: string;
  classification?: 'Credit' | 'Debit' | 'Charge' | 'Prepaid' | 'DeferredDebit';
  subBrand?: string;
}

export interface BoxPayShopperResponse {
  firstName?: string;
  lastName?: string;
  gender?: string;
  phoneNumber?: string;
  email?: string;
  uniqueReference: string;
  deliveryAddress?: BoxPayAddress;
  dateOfBirth?: string;
  panNumber?: string;
}

export interface BoxPayCaller {
  token: string;
  callerType: 'CHECKOUT' | 'PAYMENT_LINK';
  url: string;
}

export interface BoxPayInquiryResponse {
  merchantId: string;
  operationId: string;
  transactionId: string;
  countryCode: string;
  eventId?: string;
  status: BoxPayStatus;
  legalEntityCode?: string;
  clientPosId?: string;
  orderId: string;
  caller?: BoxPayCaller;
  pspCode?: string;
  pspReference?: string;
  networkReference?: string;
  authCode?: string;
  money?: BoxPayMoney;
  shopper?: BoxPayShopperResponse;
  paymentMethod?: BoxPayPaymentMethod;
  timestamp?: string;
  captureRequired?: boolean;
  additionalData?: Record<string, string>;
  metadata?: Record<string, string>;
}

// API Response wrapper
export interface BoxPayApiError {
  code: string;
  message: string;
  details?: string;
}

// Payment completion status for frontend
export type PaymentCompletionStatus = 'success' | 'failed' | 'pending' | 'cancelled' | 'unknown';

export interface PaymentCompletionInfo {
  status: PaymentCompletionStatus;
  orderId: string;
  transactionId?: string;
  amount?: string;
  currency?: string;
  message?: string;
  paymentMethod?: BoxPayPaymentMethod;
  timestamp?: string;
}



