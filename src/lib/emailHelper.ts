/**
 * Email Helper Functions
 * Transforms booking data into email format
 */

import { Flight } from '@/types/flight';
import { Passenger } from '@/types/booking';
import { BookingConfirmationEmailData, JourneyEmail, FlightSegmentEmail, StopoverEmail } from '@/types/email';
import { format, parseISO } from 'date-fns';

/**
 * Get currency symbol from currency code
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€',
    'AUD': 'A$',
    'INR': '₹',
    'CAD': 'C$',
  };
  return symbols[currency] || currency;
}

/**
 * Safely format a date string for display in email
 * Handles various date formats including ISO and display formats
 */
function formatEmailDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Try ISO format first
    const date = parseISO(dateString);
    if (!isNaN(date.getTime())) {
      return format(date, 'EEEE, MMM d');
    }
  } catch {
    // Fall through to return original
  }
  
  // Return original string if parsing fails (might already be formatted)
  return dateString;
}

/**
 * Safely format arrival date
 */
function formatArrivalDate(dateString: string | undefined): string | undefined {
  if (!dateString) return undefined;
  
  try {
    const date = parseISO(dateString);
    if (!isNaN(date.getTime())) {
      return format(date, 'MMM d');
    }
  } catch {
    // Fall through
  }
  
  // Return original if already formatted or parsing fails
  return dateString;
}

/**
 * Format DOB for display
 */
function formatDOB(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    if (!isNaN(date.getTime())) {
      return format(date, 'MMM d, yyyy');
    }
  } catch {
    // Fall through
  }
  
  // Return original if already formatted
  return dateString;
}

/**
 * Get passenger full name with title
 */
function getPassengerFullName(passenger: Passenger): string {
  const parts = [passenger.title, passenger.firstName];
  if (passenger.middleName) parts.push(passenger.middleName);
  parts.push(passenger.lastName);
  return parts.join(' ');
}

/**
 * Transform a flight segment to email format
 */
function transformSegmentToEmail(segment: any, cabinClass: string): FlightSegmentEmail[] {
  const segments: FlightSegmentEmail[] = [];

  // Check if segment has individual flights (multi-leg)
  if (segment.individualFlights && segment.individualFlights.length > 0) {
    segment.individualFlights.forEach((flight: any) => {
      segments.push({
        from: flight.departureCity || flight.departureAirport,
        fromCode: flight.departureAirport,
        to: flight.arrivalCity || flight.arrivalAirport,
        toCode: flight.arrivalAirport,
        date: segment.date,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        flightNumber: flight.flightNumber || segment.flightNumber || '',
        airline: flight.airline || segment.airline?.name || 'Airline',
        cabinClass: cabinClass || 'Economy',
        operatedBy: flight.operatedBy,
      });
    });
  } else {
    // Simple segment
    segments.push({
      from: segment.departureAirport?.name || segment.departureAirport?.city || segment.departureAirport?.code || '',
      fromCode: segment.departureAirport?.code || '',
      to: segment.arrivalAirport?.name || segment.arrivalAirport?.city || segment.arrivalAirport?.code || '',
      toCode: segment.arrivalAirport?.code || '',
      date: segment.date,
      departureTime: segment.departureTime,
      arrivalTime: segment.arrivalTime,
      duration: segment.totalJourneyTime || segment.duration || '',
      flightNumber: segment.flightNumber || '',
      airline: segment.airline?.name || 'Airline',
      cabinClass: cabinClass || 'Economy',
    });
  }

  return segments;
}

/**
 * Transform layovers to email format
 */
function transformLayoversToEmail(segment: any): StopoverEmail[] {
  if (!segment.layovers || segment.layovers.length === 0) {
    return [];
  }

  return segment.layovers.map((layover: any) => ({
    airportCode: layover.viaAirport || layover.airport || '',
    airportName: layover.viaAirportName || layover.airportName || layover.viaAirport || '',
    duration: layover.duration || '',
  }));
}

/**
 * Transform booking data to email format
 */
export function transformBookingToEmailData(params: {
  orderNumber: string;
  flight: Flight;
  passengers: Passenger[];
  contactEmail: string;
  contactPhone: string;
  totalAmount: number;
  protectionPlanAmount: number;
  baggageAmount: number;
  currency: string;
  cabinClass?: string;
}): BookingConfirmationEmailData {
  const {
    orderNumber,
    flight,
    passengers,
    contactEmail,
    contactPhone,
    totalAmount,
    protectionPlanAmount,
    baggageAmount,
    currency,
    cabinClass = 'Economy',
  } = params;

  // Get lead passenger
  const leadPassenger = passengers[0];
  const travelerName = leadPassenger ? getPassengerFullName(leadPassenger) : 'Guest';

  // Transform passengers
  const emailPassengers = passengers.map((p, index) => ({
    name: getPassengerFullName(p),
    email: index === 0 ? p.email : undefined,
    dob: formatDOB(p.dateOfBirth),
    isLead: index === 0,
  }));

  // Transform journeys
  const journeys: JourneyEmail[] = [];

  // Outbound journey
  if (flight.outbound) {
    const outboundSegments = transformSegmentToEmail(flight.outbound, cabinClass);
    const outboundStopovers = transformLayoversToEmail(flight.outbound);

    journeys.push({
      type: 'outbound',
      route: `${flight.outbound.departureAirport?.city || flight.outbound.departureAirport?.code} - ${flight.outbound.arrivalAirport?.city || flight.outbound.arrivalAirport?.code}`,
      date: formatEmailDate(flight.outbound.date),
      arrivalDate: formatArrivalDate(flight.outbound.arrivalDate),
      totalDuration: flight.outbound.totalJourneyTime || flight.outbound.duration || '',
      segments: outboundSegments,
      stopovers: outboundStopovers,
    });
  }

  // Inbound journey (if round trip)
  if (flight.inbound) {
    const inboundSegments = transformSegmentToEmail(flight.inbound, cabinClass);
    const inboundStopovers = transformLayoversToEmail(flight.inbound);

    journeys.push({
      type: 'inbound',
      route: `${flight.inbound.departureAirport?.city || flight.inbound.departureAirport?.code} - ${flight.inbound.arrivalAirport?.city || flight.inbound.arrivalAirport?.code}`,
      date: formatEmailDate(flight.inbound.date),
      arrivalDate: formatArrivalDate(flight.inbound.arrivalDate),
      totalDuration: flight.inbound.totalJourneyTime || flight.inbound.duration || '',
      segments: inboundSegments,
      stopovers: inboundStopovers,
    });
  }

  // Calculate payment breakdown
  const creditCardFees = totalAmount * 0.015; // Assuming 1.5% card fee
  const baseFare = totalAmount - protectionPlanAmount - baggageAmount - creditCardFees;

  return {
    orderNumber,
    travelerName,
    travelerEmail: contactEmail,
    travelerPhone: contactPhone,
    passengers: emailPassengers,
    journeys,
    payment: {
      totalFare: baseFare,
      creditCardFees,
      protectionPlan: protectionPlanAmount,
      baggagePlan: baggageAmount,
      totalPaid: totalAmount,
      currency,
      currencySymbol: getCurrencySymbol(currency),
    },
  };
}

/**
 * Send confirmation email via API
 */
export async function sendBookingConfirmationEmail(
  to: string,
  data: BookingConfirmationEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-confirmation-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, data }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}


