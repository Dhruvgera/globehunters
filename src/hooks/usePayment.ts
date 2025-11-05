/**
 * Custom hook for managing payment flow
 */

import { useState } from 'react';
import { PaymentRequest, PaymentResponse, PaymentConfirmation } from '@/types/payment';
import { paymentService } from '@/services/api/paymentService';
import { bookingService } from '@/services/api/bookingService';

interface UsePaymentReturn {
  processPayment: (request: PaymentRequest) => Promise<PaymentResponse | null>;
  confirmPayment: (paymentId: string) => Promise<PaymentConfirmation | null>;
  confirmBooking: (bookingId: string) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
  clearError: () => void;
}

export function usePayment(): UsePaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const processPayment = async (request: PaymentRequest): Promise<PaymentResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const paymentResponse = await paymentService.processPayment(request);
      return paymentResponse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment processing failed');
      setError(error);
      console.error('Error processing payment:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (paymentId: string): Promise<PaymentConfirmation | null> => {
    setLoading(true);
    setError(null);

    try {
      const confirmation = await paymentService.confirmPayment(paymentId);
      return confirmation;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment confirmation failed');
      setError(error);
      console.error('Error confirming payment:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async (bookingId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await bookingService.confirmBooking(bookingId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Booking confirmation failed');
      setError(error);
      console.error('Error confirming booking:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    processPayment,
    confirmPayment,
    confirmBooking,
    loading,
    error,
    clearError,
  };
}
