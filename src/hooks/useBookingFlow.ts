/**
 * Custom hook for managing booking flow
 */

import { useState } from 'react';
import { BookingRequest, BookingResponse } from '@/types/booking';
import { bookingService } from '@/services/api/bookingService';
import { useBookingStore } from '@/store/bookingStore';

interface UseBookingFlowReturn {
  createBooking: (request: BookingRequest) => Promise<BookingResponse | null>;
  loading: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useBookingFlow(): UseBookingFlowReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const setBooking = useBookingStore((state) => state.setBooking);

  const createBooking = async (request: BookingRequest): Promise<BookingResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const booking = await bookingService.createBooking(request);
      setBooking(booking); // Store in global state
      return booking;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create booking');
      setError(error);
      console.error('Error creating booking:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    createBooking,
    loading,
    error,
    clearError,
  };
}
