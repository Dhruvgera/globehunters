/**
 * Custom hook for BoxPay payment integration
 */

import { useState, useCallback } from 'react';
import { PaymentCompletionInfo } from '@/types/boxpay';

interface BoxPaySessionParams {
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
}

interface CreateSessionResponse {
  success: boolean;
  token?: string;
  checkoutUrl?: string;
  error?: string;
}

interface InquiryResponse {
  success: boolean;
  payment?: PaymentCompletionInfo;
  error?: string;
}

interface UseBoxPayReturn {
  createSession: (params: BoxPaySessionParams) => Promise<CreateSessionResponse>;
  inquirePayment: (token: string) => Promise<InquiryResponse>;
  redirectToCheckout: (checkoutUrl: string) => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useBoxPay(): UseBoxPayReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a BoxPay checkout session
   */
  const createSession = useCallback(async (params: BoxPaySessionParams): Promise<CreateSessionResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/boxpay/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to create payment session';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        token: data.token,
        checkoutUrl: data.checkoutUrl,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create payment session';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Inquire about a payment status using the redirectionResult token
   */
  const inquirePayment = useCallback(async (token: string): Promise<InquiryResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/boxpay/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to get payment status';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        payment: data.payment,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get payment status';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Redirect the user to BoxPay checkout
   */
  const redirectToCheckout = useCallback((checkoutUrl: string) => {
    window.location.href = checkoutUrl;
  }, []);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createSession,
    inquirePayment,
    redirectToCheckout,
    loading,
    error,
    clearError,
  };
}



