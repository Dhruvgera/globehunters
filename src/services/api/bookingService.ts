/**
 * Booking Service
 * Handles all booking-related API calls
 */

import { apiClient } from './client';
import { API_CONFIG } from '@/config/api';
import {
  BookingRequest,
  BookingResponse,
  BookingConfirmation,
  ProtectionPlanDetails
} from '@/types/booking';
import { ApiResponse } from '@/types/api';

class BookingService {
  /**
   * Create a new booking
   */
  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    try {
      const response = await apiClient.post<ApiResponse<BookingResponse>>(
        API_CONFIG.endpoints.bookings.create,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async getBooking(bookingId: string): Promise<BookingResponse> {
    return {} as BookingResponse;
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async updateBooking(
    bookingId: string,
    updates: Partial<BookingRequest>
  ): Promise<BookingResponse> {
    return {} as BookingResponse;
  }

  /**
   * Confirm booking after payment
   */
  async confirmBooking(bookingId: string): Promise<BookingConfirmation> {
    try {
      const response = await apiClient.post<ApiResponse<BookingConfirmation>>(
        API_CONFIG.endpoints.bookings.confirm,
        { bookingId }
      );
      return response.data;
    } catch (error) {
      console.error('Error confirming booking:', error);
      throw error;
    }
  }

  // NOT USED: This method is not called anywhere in the codebase outside of services/
  async getProtectionPlans(): Promise<ProtectionPlanDetails[]> {
    return [];
  }
}

// Export singleton instance
export const bookingService = new BookingService();
