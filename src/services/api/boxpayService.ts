/**
 * BoxPay Payment Gateway Service
 * Handles all BoxPay-related API calls for payment processing
 */

import { BOXPAY_CONFIG, getBoxPayEndpoints } from '@/config/boxpay';
import {
  BoxPaySessionRequest,
  BoxPaySessionResponse,
  BoxPayInquiryRequest,
  BoxPayInquiryResponse,
  PaymentCompletionInfo,
  PaymentCompletionStatus,
  BoxPayOperationStatus,
} from '@/types/boxpay';
import { normalizeCountryCode as toIso2CountryCode } from '@/lib/utils/countryUtils';

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[().,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBoxPayPhoneNumber(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const hasPlusPrefix = raw.startsWith('+');
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';

  if (hasPlusPrefix) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;

  return digits.length === 10 ? digits : '';
}

class BoxPayService {
  private endpoints = getBoxPayEndpoints();
  
  /**
   * Create a BoxPay checkout session
   * Returns a token and URL to redirect the user to BoxPay checkout
   */
  async createSession(request: BoxPaySessionRequest): Promise<BoxPaySessionResponse> {
    try {
      const response = await fetch(this.endpoints.createSession, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BOXPAY_CONFIG.bearerToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `[BoxPay] session creation failed ${JSON.stringify({
            errorData,
            requestPayload: request,
            normalizedPhoneNumber: request.shopper?.phoneNumber,
          })}`
        );
        throw new Error(errorData.message || `BoxPay API error: ${response.status}`);
      }

      const data: BoxPaySessionResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating BoxPay session:', error);
      throw error;
    }
  }

  /**
   * Inquire about a transaction status using the redirectionResult token
   * Note: The token is only valid for 5 minutes after redirect
   */
  async inquireTransaction(request: BoxPayInquiryRequest): Promise<BoxPayInquiryResponse> {
    try {
      const response = await fetch(this.endpoints.inquireTransaction, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BOXPAY_CONFIG.bearerToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('BoxPay transaction inquiry failed:', errorData);
        throw new Error(errorData.message || `BoxPay API error: ${response.status}`);
      }

      const data: BoxPayInquiryResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error inquiring BoxPay transaction:', error);
      throw error;
    }
  }

  /**
   * Build the session request from booking data
   */
  buildSessionRequest(params: {
    orderId: string;
    amount: number;
    currency: string;
    shopper: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address?: {
        address1: string;
        address2?: string;
        city: string;
        state: string;
        countryCode: string;
        postalCode: string;
      };
    };
    returnUrl: string;
    backUrl: string;
  }): BoxPaySessionRequest {
    return {
      context: {
        ...BOXPAY_CONFIG.defaultContext,
        orderId: params.orderId,
      },
      paymentType: BOXPAY_CONFIG.paymentType,
      money: {
        amount: params.amount.toFixed(2),
        currencyCode: params.currency,
      },
      shopper: {
        firstName: params.shopper.firstName,
        lastName: params.shopper.lastName,
        email: params.shopper.email,
        phoneNumber: normalizeBoxPayPhoneNumber(params.shopper.phone),
        uniqueReference: params.orderId,
        deliveryAddress: params.shopper.address
          ? (() => {
              const normalizedCountry =
                toIso2CountryCode(params.shopper.address.countryCode) || BOXPAY_CONFIG.defaultContext.countryCode;

              if (normalizeKey(String(params.shopper.address.countryCode || '')) && normalizedCountry === BOXPAY_CONFIG.defaultContext.countryCode) {
                console.warn('[BoxPay] Unrecognized country input; defaulting countryCode', {
                  orderId: params.orderId,
                  input: params.shopper.address.countryCode,
                  used: normalizedCountry,
                });
              }

              return {
                address1: params.shopper.address.address1,
                address2: params.shopper.address.address2 || '',
                address3: null,
                city: params.shopper.address.city,
                state: params.shopper.address.state,
                countryCode: normalizedCountry,
                postalCode: params.shopper.address.postalCode,
              };
            })()
          : undefined,
      },
      shopperAuthentication: {
        threeDSAuthentication: BOXPAY_CONFIG.threeDSAuthentication as 'Yes' | 'No',
      },
      frontendBackUrl: params.backUrl,
      frontendReturnUrl: params.returnUrl,
      statusNotifyUrl: BOXPAY_CONFIG.statusNotifyUrl || undefined,
    };
  }

  // NOT USED externally: This method is only called internally by parseCompletionInfo
  mapToCompletionStatus(status: BoxPayOperationStatus): PaymentCompletionStatus {
    switch (status) {
      case 'Approved':
      case 'Completed':
      case 'Settled':
        return 'success';
      case 'Declined':
      case 'Rejected':
      case 'Failed':
        return 'failed';
      case 'Cancelled':
      case 'Expired':
        return 'cancelled';
      case 'Received':
      case 'Batched':
      case 'RequiresAction':
      case 'PendingReview':
      case 'Reviewed':
      case 'Posted':
      case 'Partial_Approved':
      case 'TimedOut':
        return 'pending';
      default:
        return 'unknown';
    }
  }

  /**
   * Parse the inquiry response into a simplified completion info object
   */
  parseCompletionInfo(inquiry: BoxPayInquiryResponse): PaymentCompletionInfo {
    return {
      status: this.mapToCompletionStatus(inquiry.status.status),
      orderId: inquiry.orderId,
      transactionId: inquiry.transactionId,
      amount: inquiry.money?.amount,
      currency: inquiry.money?.currencyCode,
      message: inquiry.status.reason,
      paymentMethod: inquiry.paymentMethod,
      timestamp: inquiry.timestamp,
    };
  }
}

// Export singleton instance
export const boxpayService = new BoxPayService();








