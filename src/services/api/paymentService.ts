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

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async validatePaymentMethod(cardNumber: string): Promise<{ valid: boolean; cardType?: string }> {
    return { valid: false };
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async getPaymentMethods(): Promise<PaymentMethodInfo[]> {
    return [];
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async getReceipt(paymentId: string): Promise<Blob> {
    return new Blob();
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
