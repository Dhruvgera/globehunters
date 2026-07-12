/**
 * Email Types
 */

import { Passenger } from './booking';

export interface FlightSegmentEmail {
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  flightNumber: string;
  airline: string;
  airlineCode?: string;
  cabinClass: string;
  operatedBy?: string;
}

export interface StopoverEmail {
  airportCode: string;
  airportName: string;
  duration: string;
}

export interface JourneyEmail {
  type: 'outbound' | 'inbound';
  route: string;
  date: string;
  arrivalDate?: string;
  totalDuration: string;
  segments: FlightSegmentEmail[];
  stopovers: StopoverEmail[];
}

export interface PaymentDetailsEmail {
  totalFare: number;
  creditCardFees: number;
  protectionPlan: number;
  baggagePlan: number;
  totalPaid: number;
  currency: string;
  currencySymbol: string;
}

export interface HotelEmailData {
  hotelName: string;
  address: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  roomType: string;
  amenities?: string[];
}

export interface ActivityEmailData {
  productCode: string;
  title: string;
  destination?: string;
  date?: string;
  time?: string;
  duration?: string;
  price?: number;
  currency?: string;
}

export interface BookingConfirmationEmailData {
  orderNumber: string;
  travelerName: string;
  travelerEmail: string;
  travelerPhone: string;
  passengers: {
    name: string;
    email?: string;
    dob: string;
    isLead: boolean;
  }[];
  journeys?: JourneyEmail[];
  hotel?: HotelEmailData;
  activities?: ActivityEmailData[];
  payment: PaymentDetailsEmail;
}
