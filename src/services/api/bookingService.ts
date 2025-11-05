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
  ProtectionPlanDetails,
  BookingPricing
} from '@/types/booking';
import { ApiResponse } from '@/types/api';
import { mockFlights } from '@/data/mockFlights';

class BookingService {
  /**
   * Create a new booking
   * TODO: Replace mock data with actual API call
   */
  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.post<ApiResponse<BookingResponse>>(
      //   API_CONFIG.endpoints.bookings.create,
      //   request
      // );
      // return response.data;

      // Mock implementation - simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const flight = mockFlights.find(f => f.id === request.flightId);
      if (!flight) {
        throw new Error('Flight not found');
      }

      // Mock pricing calculation
      const pricing = this.calculateMockPricing(request);

      const mockBooking: BookingResponse = {
        bookingId: `BKG-${Date.now()}`,
        webReference: `IN-${Math.floor(Math.random() * 900000000) + 100000000}`,
        status: 'pending',
        flight: flight,
        passengers: request.passengers,
        pricing: pricing,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      };

      return mockBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Get booking by ID
   * TODO: Replace mock data with actual API call
   */
  async getBooking(bookingId: string): Promise<BookingResponse> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.get<ApiResponse<BookingResponse>>(
      //   `${API_CONFIG.endpoints.bookings.get}/${bookingId}`
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));

      throw new Error('Booking not found in mock data');
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  /**
   * Update booking
   * TODO: Replace mock data with actual API call
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<BookingRequest>
  ): Promise<BookingResponse> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.patch<ApiResponse<BookingResponse>>(
      //   `${API_CONFIG.endpoints.bookings.update}/${bookingId}`,
      //   updates
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));

      throw new Error('Update not implemented in mock');
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  /**
   * Confirm booking after payment
   * TODO: Replace mock data with actual API call
   */
  async confirmBooking(bookingId: string): Promise<BookingConfirmation> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.post<ApiResponse<BookingConfirmation>>(
      //   API_CONFIG.endpoints.bookings.confirm,
      //   { bookingId }
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockConfirmation: BookingConfirmation = {
        bookingId: bookingId,
        webReference: `IN-${Math.floor(Math.random() * 900000000) + 100000000}`,
        confirmationNumber: `CNF-${Date.now()}`,
        status: 'confirmed',
        ticketNumbers: [`TKT-${Date.now()}-1`],
        pnr: `PNR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        eTickets: [
          {
            passengerId: 'passenger-1',
            ticketNumber: `TKT-${Date.now()}-1`,
            downloadUrl: '/api/tickets/download',
          },
        ],
      };

      return mockConfirmation;
    } catch (error) {
      console.error('Error confirming booking:', error);
      throw error;
    }
  }

  /**
   * Get available protection plans
   * TODO: Replace mock data with actual API call
   */
  async getProtectionPlans(): Promise<ProtectionPlanDetails[]> {
    try {
      // TODO: Uncomment when API is ready
      // const response = await apiClient.get<ApiResponse<ProtectionPlanDetails[]>>(
      //   API_CONFIG.endpoints.addOns.protectionPlans
      // );
      // return response.data;

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 300));

      return [
        {
          type: 'basic',
          name: 'Basic Protection',
          price: 8623.68,
          currency: '₹',
          features: [
            'Covered for Covid',
            'Cancel for any reason',
            'Emergency medical',
          ],
          coverage: {
            cancellation: true,
            medicalEmergency: true,
            baggageLoss: false,
            flightDelay: false,
            tripInterruption: false,
            covidCoverage: true,
          },
        },
        {
          type: 'premium',
          name: 'Premium Protection',
          price: 10779.60,
          currency: '₹',
          features: [
            'Covered for Covid',
            'Cancel for any reason',
            'Emergency medical',
            'Baggage loss',
            'Flight delay',
          ],
          coverage: {
            cancellation: true,
            medicalEmergency: true,
            baggageLoss: true,
            flightDelay: true,
            tripInterruption: false,
            covidCoverage: true,
          },
        },
        {
          type: 'all',
          name: 'All Included',
          price: 12935.52,
          currency: '₹',
          features: [
            'Covered for Covid',
            'Cancel for any reason',
            'Emergency medical',
            'Baggage loss',
            'Flight delay',
            'Trip interruption',
          ],
          coverage: {
            cancellation: true,
            medicalEmergency: true,
            baggageLoss: true,
            flightDelay: true,
            tripInterruption: true,
            covidCoverage: true,
          },
        },
      ];
    } catch (error) {
      console.error('Error fetching protection plans:', error);
      throw error;
    }
  }

  /**
   * Helper method to calculate mock pricing
   * TODO: Remove when API is integrated
   */
  private calculateMockPricing(request: BookingRequest): BookingPricing {
    const baseFare = 94353;
    const taxes = baseFare * 0.15;
    const fees = 1500;

    // Protection plan pricing
    const protectionPlanPrices = {
      basic: 8623.68,
      premium: 10779.60,
      all: 12935.52,
    };
    const protectionPlanCost = request.addOns.protectionPlan
      ? protectionPlanPrices[request.addOns.protectionPlan]
      : 0;

    // Baggage pricing
    const baggagePrice = 4500;
    const baggageCost = request.addOns.additionalBaggage * baggagePrice;

    const subtotal = baseFare + taxes + fees + protectionPlanCost + baggageCost;
    const discountPercent = 0.20;
    const discount = subtotal * discountPercent;
    const total = subtotal - discount;

    return {
      baseFare,
      taxes,
      fees,
      protectionPlan: protectionPlanCost,
      baggageFees: baggageCost,
      seatFees: 0,
      mealFees: 0,
      subtotal,
      discount,
      discountPercent,
      total,
      currency: '₹',
      priceBreakdown: [
        { label: 'Base Fare', amount: baseFare },
        { label: 'Taxes & Fees', amount: taxes + fees },
        { label: 'Protection Plan', amount: protectionPlanCost },
        { label: 'Additional Baggage', amount: baggageCost },
        { label: 'Discount (20%)', amount: -discount },
      ],
    };
  }
}

// Export singleton instance
export const bookingService = new BookingService();
