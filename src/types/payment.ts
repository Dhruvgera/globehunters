/**
 * Payment-related Types
 */

export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
export type CardType = 'visa' | 'mastercard' | 'amex' | 'maestro' | 'discover' | 'jcb';

export interface BillingAddress {
  firstName: string;
  middleName?: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface CardDetails {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string; // MM
  expiryYear: string; // YY or YYYY
  cvv: string;
  cardType?: CardType;
}

export interface PaymentDetails {
  method: PaymentMethod;
  cardDetails?: CardDetails;
  billingAddress: BillingAddress;
  saveCardForFuture?: boolean;
}

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  paymentDetails: PaymentDetails;
  returnUrl?: string; // For 3D secure redirect
}

export interface PaymentResponse {
  paymentId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'requires_action';
  transactionId?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  // For 3D Secure or additional verification
  requiresAction?: boolean;
  actionUrl?: string;
  clientSecret?: string;
  message?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface PaymentConfirmation {
  paymentId: string;
  bookingId: string;
  status: 'succeeded';
  transactionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  receiptUrl: string;
  receiptNumber: string;
}

/**
 * Payment form validation
 */
export interface PaymentFormErrors {
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface PaymentFormState {
  paymentDetails: PaymentDetails;
  acceptedTerms: boolean;
  errors: PaymentFormErrors;
}

/**
 * Supported payment methods configuration
 */
export interface PaymentMethodInfo {
  type: PaymentMethod;
  name: string;
  icon: string;
  enabled: boolean;
  supportedCardTypes?: CardType[];
}
