/**
 * Email Helper Functions
 * Transforms booking data into email format
 */

import { Flight, FlightSegment, IndividualFlight, Layover } from '@/types/flight';
import { Passenger } from '@/types/booking';
import { BookingConfirmationEmailData, JourneyEmail, FlightSegmentEmail, StopoverEmail } from '@/types/email';
import { format, parseISO } from 'date-fns';
import { getCurrencySymbol } from '@/lib/currency/converter';


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
function transformSegmentToEmail(segment: FlightSegment, cabinClass: string, mainAirlineName?: string, mainAirlineCode?: string): FlightSegmentEmail[] {
  const segments: FlightSegmentEmail[] = [];

  if (segment.individualFlights && segment.individualFlights.length > 0) {
    segment.individualFlights.forEach((flight: IndividualFlight) => {
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
        airline: flight.airline || segment.carrierName || mainAirlineName || 'Airline',
        airlineCode: flight.carrierCode || segment.carrierCode || mainAirlineCode || '',
        cabinClass: cabinClass || 'Economy',
        operatedBy: flight.operatedBy,
      });
    });
  } else {
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
      airline: segment.carrierName || mainAirlineName || 'Airline',
      airlineCode: segment.carrierCode || mainAirlineCode || '',
      cabinClass: cabinClass || 'Economy',
    });
  }

  return segments;
}

/**
 * Transform layovers to email format
 */
function transformLayoversToEmail(segment: FlightSegment): StopoverEmail[] {
  if (!segment.layovers || segment.layovers.length === 0) {
    return [];
  }

  return segment.layovers.map((layover: Layover) => ({
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
  creditCardFeesAmount?: number;
  baseFareAmount?: number;
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
    creditCardFeesAmount,
    baseFareAmount,
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
    const outboundSegments = transformSegmentToEmail(flight.outbound, cabinClass, flight.airline?.name, flight.airline?.code);
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
    const inboundSegments = transformSegmentToEmail(flight.inbound, cabinClass, flight.airline?.name, flight.airline?.code);
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

  // Payment breakdown - totalAmount already includes everything
  // baseFare = totalAmount minus add-ons and any fees delta (if provided)
  const fees = Math.max(0, creditCardFeesAmount || 0);
  const baseFare =
    typeof baseFareAmount === 'number'
      ? baseFareAmount
      : totalAmount - protectionPlanAmount - baggageAmount - fees;

  return {
    orderNumber,
    travelerName,
    travelerEmail: contactEmail,
    travelerPhone: contactPhone,
    passengers: emailPassengers,
    journeys,
    payment: {
      totalFare: baseFare,
      creditCardFees: fees, // We treat any delta between fare components and total paid as "fees"
      protectionPlan: protectionPlanAmount,
      baggagePlan: baggageAmount,
      totalPaid: totalAmount,
      currency,
      currencySymbol: getCurrencySymbol(currency),
    },
  };
}

/**
 * Transform hotel booking data to email format
 */
export function transformHotelBookingToEmailData(params: {
  orderNumber: string;
  hotel: any;
  roomSummary: any;
  passengers: Passenger[];
  contactEmail: string;
  contactPhone: string;
  totalAmount: number;
  protectionPlanAmount: number;
  currency: string;
}): BookingConfirmationEmailData {
  const {
    orderNumber,
    hotel,
    roomSummary,
    passengers,
    contactEmail,
    contactPhone,
    totalAmount,
    protectionPlanAmount,
    currency,
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

  // Payment breakdown
  const fees = 0;
  const baseFare = totalAmount - protectionPlanAmount - fees;

  return {
    orderNumber,
    travelerName,
    travelerEmail: contactEmail,
    travelerPhone: contactPhone,
    passengers: emailPassengers,
    hotel: {
      hotelName: hotel.hotelName || hotel.name || 'Hotel',
      address: hotel.address || hotel.distanceLabel || '',
      checkIn: formatEmailDate(hotel.checkIn),
      checkOut: formatEmailDate(hotel.checkOut),
      nights: hotel.nights || 1,
      rooms: hotel.rooms || 1,
      roomType: roomSummary?.roomName || roomSummary?.description || 'Standard Room',
      amenities: hotel.amenities || [],
    },
    payment: {
      totalFare: baseFare,
      creditCardFees: fees,
      protectionPlan: protectionPlanAmount,
      baggagePlan: 0,
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







