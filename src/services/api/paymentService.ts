/**
 * Payment Service
 * Handles all payment-related API calls
 */

import { apiClient } from './client';
import { API_CONFIG } from '@/config/api';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentConfirmation,
  PaymentMethodInfo,
} from '@/types/payment';
import { ApiResponse } from '@/types/api';

class PaymentService {
  /**
   * Process payment
   * TODO: Replace mock data with actual API call
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.post<ApiResponse<PaymentResponse>>(
      //   API_CONFIG.endpoints.payments.process,
      //   request
      // );
      // return response.data;

      // Mock implementation - simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate 95% success rate
      const isSuccess = Math.random() > 0.05;

      if (!isSuccess) {
        throw new Error('Payment failed. Please check your card details and try again.');
      }

      const mockResponse: PaymentResponse = {
        paymentId: `PAY-${Date.now()}`,
        status: 'succeeded',
        transactionId: `TXN-${Math.random().toString(36).substring(2, 15)}`,
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentDetails.method,
        receiptUrl: `/receipts/${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      return mockResponse;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Confirm payment after 3D secure or additional verification
   * TODO: Replace mock data with actual API call
   */
  async confirmPayment(paymentId: string): Promise<PaymentConfirmation> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.post<ApiResponse<PaymentConfirmation>>(
      //   `${API_CONFIG.endpoints.payments.validate}/${paymentId}/confirm`
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockConfirmation: PaymentConfirmation = {
        paymentId: paymentId,
        bookingId: `BKG-${Date.now()}`,
        status: 'succeeded',
        transactionId: `TXN-${Math.random().toString(36).substring(2, 15)}`,
        amount: 0, // Would come from backend
        currency: '₹',
        paidAt: new Date().toISOString(),
        receiptUrl: `/receipts/${Date.now()}`,
        receiptNumber: `RCP-${Date.now()}`,
      };

      return mockConfirmation;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Validate payment method (e.g., card validation)
   * TODO: Replace mock data with actual API call
   */
  async validatePaymentMethod(cardNumber: string): Promise<{ valid: boolean; cardType?: string }> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.post<ApiResponse<{ valid: boolean; cardType?: string }>>(
      //   API_CONFIG.endpoints.payments.validate,
      //   { cardNumber }
      // );
      // return response.data;

      // Mock implementation - basic Luhn algorithm check
      await new Promise(resolve => setTimeout(resolve, 200));

      const cleaned = cardNumber.replace(/\s/g, '');

      // Detect card type
      let cardType: string | undefined;
      if (/^4/.test(cleaned)) cardType = 'visa';
      else if (/^5[1-5]/.test(cleaned)) cardType = 'mastercard';
      else if (/^3[47]/.test(cleaned)) cardType = 'amex';
      else if (/^6(?:011|5)/.test(cleaned)) cardType = 'discover';
      else if (/^(?:2131|1800|35)/.test(cleaned)) cardType = 'jcb';

      // Simple validation for mock
      const valid = cleaned.length >= 13 && cleaned.length <= 19;

      return { valid, cardType };
    } catch (error) {
      console.error('Error validating payment method:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods
   * TODO: Replace mock data with actual API call
   */
  async getPaymentMethods(): Promise<PaymentMethodInfo[]> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.get<ApiResponse<PaymentMethodInfo[]>>(
      //   API_CONFIG.endpoints.payments.methods
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 200));

      return [
        {
          type: 'credit_card',
          name: 'Credit Card',
          icon: '/icons/credit-card.svg',
          enabled: true,
          supportedCardTypes: ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'maestro'],
        },
        {
          type: 'debit_card',
          name: 'Debit Card',
          icon: '/icons/debit-card.svg',
          enabled: true,
          supportedCardTypes: ['visa', 'mastercard', 'maestro'],
        },
        {
          type: 'paypal',
          name: 'PayPal',
          icon: '/icons/paypal.svg',
          enabled: false,
        },
        {
          type: 'bank_transfer',
          name: 'Bank Transfer',
          icon: '/icons/bank-transfer.svg',
          enabled: false,
        },
      ];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Get payment receipt
   * TODO: Replace mock data with actual API call
   */
  async getReceipt(paymentId: string): Promise<Blob> {
    try {
      // TODO: Implement actual PDF download
      // const response = await fetch(`${API_CONFIG.baseURL}/receipts/${paymentId}`);
      // return await response.blob();

      throw new Error('Receipt download not implemented in mock');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
