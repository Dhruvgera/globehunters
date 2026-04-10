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

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string): Promise<BookingResponse> {
    try {
      const response = await apiClient.get<ApiResponse<BookingResponse>>(
        `${API_CONFIG.endpoints.bookings.get}/${bookingId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  /**
   * Update booking
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<BookingRequest>
  ): Promise<BookingResponse> {
    try {
      const response = await apiClient.patch<ApiResponse<BookingResponse>>(
        `${API_CONFIG.endpoints.bookings.update}/${bookingId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
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

  /**
   * Get available protection plans
   */
  async getProtectionPlans(): Promise<ProtectionPlanDetails[]> {
    try {
      const response = await apiClient.get<ApiResponse<ProtectionPlanDetails[]>>(
        API_CONFIG.endpoints.addOns.protectionPlans
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching protection plans:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService();
