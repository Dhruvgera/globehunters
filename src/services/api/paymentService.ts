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
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await apiClient.post<ApiResponse<PaymentResponse>>(
        API_CONFIG.endpoints.payments.process,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Confirm payment after 3D secure or additional verification
   */
  async confirmPayment(paymentId: string): Promise<PaymentConfirmation> {
    try {
      const response = await apiClient.post<ApiResponse<PaymentConfirmation>>(
        `${API_CONFIG.endpoints.payments.validate}/${paymentId}/confirm`
      );
      return response.data;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Validate payment method (e.g., card validation)
   */
  async validatePaymentMethod(cardNumber: string): Promise<{ valid: boolean; cardType?: string }> {
    try {
      const response = await apiClient.post<ApiResponse<{ valid: boolean; cardType?: string }>>(
        API_CONFIG.endpoints.payments.validate,
        { cardNumber }
      );
      return response.data;
    } catch (error) {
      console.error('Error validating payment method:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethodInfo[]> {
    try {
      const response = await apiClient.get<ApiResponse<PaymentMethodInfo[]>>(
        API_CONFIG.endpoints.payments.methods
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Get payment receipt
   */
  async getReceipt(paymentId: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/receipts/${paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }
      return await response.blob();
    } catch (error) {
      console.error('Error downloading receipt:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
