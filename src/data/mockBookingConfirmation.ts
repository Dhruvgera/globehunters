/**
 * Mock data for booking confirmation page testing
 * Enable by setting NEXT_PUBLIC_MOCK_BOOKING_CONFIRMATION=true
 */

import { Flight, FlightSegment } from "@/types/flight";
import { Passenger } from "@/types/booking";

export interface MockBookingConfirmation {
  flight: Flight;
  passengers: Passenger[];
  contactEmail: string;
  contactPhone: string;
  vyspaFolderNumber: string;
  paymentInfo: {
    orderId: string;
    amount: number;
    currency: string;
    status: "success" | "failed" | "pending";
    transactionId: string;
    timestamp: string;
  };
}

// Helper to create individual flight legs
interface IndividualFlightLeg {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  duration: string;
  flightNumber: string;
  carrierCode: string;
  aircraftType: string;
  distance: string;
  cabinClass: string;
}

// Outbound journey: London (LGW) -> Casablanca (CMN) -> Lagos (LOS)
const outboundSegment: FlightSegment = {
  departureTime: "16:40",
  arrivalTime: "05:50",
  departureAirport: {
    code: "LGW",
    name: "London Gatwick Airport",
    city: "London",
  },
  arrivalAirport: {
    code: "LOS",
    name: "Murtala Muhammed International Airport",
    city: "Lagos",
  },
  date: "Sun, Oct 5, 2025",
  arrivalDate: "Mon, Oct 6, 2025",
  duration: "8h 10m",
  totalJourneyTime: "13h 25m",
  stops: 1,
  stopDetails: "1 Stop",
  carrierCode: "AT",
  flightNumber: "AT555",
  cabinClass: "Economy",
  aircraftType: "Airbus A330-200",
  distance: "3123",
  departureTerminal: "Terminal 3",
  arrivalTerminal: "Terminal 3",
  layovers: [
    {
      viaAirport: "CMN",
      duration: "5h 15m",
    },
  ],
  individualFlights: [
    {
      departureAirport: "LGW",
      arrivalAirport: "CMN",
      departureTime: "16:40",
      arrivalTime: "19:55",
      duration: "3h 15m",
      flightNumber: "AT555",
      carrierCode: "AT",
    },
    {
      departureAirport: "CMN",
      arrivalAirport: "LOS",
      departureTime: "01:10",
      arrivalTime: "05:50",
      duration: "4h 40m",
      flightNumber: "AT555",
      carrierCode: "AT",
    },
  ],
};

// Inbound journey: Lagos (LOS) -> Casablanca (CMN) -> London (LGW)
const inboundSegment: FlightSegment = {
  departureTime: "05:50",
  arrivalTime: "16:40",
  departureAirport: {
    code: "LOS",
    name: "Murtala Muhammed International Airport",
    city: "Lagos",
  },
  arrivalAirport: {
    code: "LGW",
    name: "London Gatwick Airport",
    city: "London",
  },
  date: "Wed, Oct 15, 2025",
  arrivalDate: "Wed, Oct 15, 2025",
  duration: "7h 50m",
  totalJourneyTime: "12h 50m",
  stops: 1,
  stopDetails: "1 Stop",
  carrierCode: "AT",
  flightNumber: "AT555",
  cabinClass: "Economy",
  aircraftType: "Airbus A330-200",
  distance: "3123",
  departureTerminal: "Terminal 2",
  arrivalTerminal: "Terminal 2",
  layovers: [
    {
      viaAirport: "CMN",
      duration: "5h 15m",
    },
  ],
  individualFlights: [
    {
      departureAirport: "LOS",
      arrivalAirport: "CMN",
      departureTime: "05:50",
      arrivalTime: "01:10",
      duration: "4h 40m",
      flightNumber: "AT555",
      carrierCode: "AT",
    },
    {
      departureAirport: "CMN",
      arrivalAirport: "LGW",
      departureTime: "19:55",
      arrivalTime: "16:40",
      duration: "3h 15m",
      flightNumber: "AT555",
      carrierCode: "AT",
    },
  ],
};

export const mockBookingConfirmation: MockBookingConfirmation = {
  flight: {
    id: "mock-confirmation-flight",
    airline: {
      name: "Royal Air Maroc",
      logo: "https://images.kiwi.com/airlines/64/AT.png",
      code: "AT",
    },
    outbound: outboundSegment,
    inbound: inboundSegment,
    segments: [outboundSegment, inboundSegment],
    tripType: "round-trip",
    price: 1598,
    pricePerPerson: 799,
    currency: "£",
    webRef: "GH-2847391",
    baggage: "23kg",
    refundable: false,
    hasBaggage: true,
    meals: true,
  },
  passengers: [
    {
      type: "adult",
      title: "Mr",
      firstName: "John",
      lastName: "Smith",
      dateOfBirth: "1985-06-15",
      email: "john.smith@example.com",
      phone: "+44 7700 900123",
      nationality: "GB",
      passportNumber: "AB123456",
      passportExpiry: "2030-06-15",
    },
    {
      type: "adult",
      title: "Mrs",
      firstName: "Jane",
      lastName: "Smith",
      dateOfBirth: "1987-03-22",
      email: "jane.smith@example.com",
      phone: "+44 7700 900124",
      nationality: "GB",
      passportNumber: "CD789012",
      passportExpiry: "2029-03-22",
    },
  ],
  contactEmail: "john.smith@example.com",
  contactPhone: "+44 7700 900123",
  vyspaFolderNumber: "GH-2847391",
  paymentInfo: {
    orderId: "ORD-2847391-X7K9",
    amount: 1598,
    currency: "GBP",
    status: "success",
    transactionId: "TXN-8F4K2L9M3N",
    timestamp: new Date().toISOString(),
  },
};

// Airport code to full name mapping for display
export const airportNames: Record<string, { name: string; city: string }> = {
  LGW: { name: "London Gatwick Airport", city: "London" },
  CMN: { name: "Mohammed V International Airport", city: "Casablanca" },
  LOS: { name: "Murtala Muhammed International Airport", city: "Lagos" },
};

