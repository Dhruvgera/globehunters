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
        console.error('BoxPay session creation failed:', errorData);
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
        phoneNumber: params.shopper.phone.replace(/[^0-9]/g, ''),
        uniqueReference: params.orderId,
        deliveryAddress: params.shopper.address ? {
          address1: params.shopper.address.address1,
          address2: params.shopper.address.address2 || '',
          address3: null,
          city: params.shopper.address.city,
          state: params.shopper.address.state,
          countryCode: params.shopper.address.countryCode,
          postalCode: params.shopper.address.postalCode,
        } : undefined,
      },
      shopperAuthentication: {
        threeDSAuthentication: BOXPAY_CONFIG.threeDSAuthentication as 'Yes' | 'No',
      },
      frontendBackUrl: params.backUrl,
      frontendReturnUrl: params.returnUrl,
      statusNotifyUrl: BOXPAY_CONFIG.statusNotifyUrl || undefined,
    };
  }

  /**
   * Map BoxPay status to a simplified completion status
   */
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






