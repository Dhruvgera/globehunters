import { Flight } from "@/types/flight";

export const mockFlights: Flight[] = [
  {
    id: "1",
    airline: {
      name: "Air India",
      logo: "/airlines/air-india.png",
      code: "AI",
    },
    outbound: {
      departureTime: "05:55",
      arrivalTime: "08:05",
      departureAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      arrivalAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 10M",
      stops: 0,
      stopDetails: "Direct",
    },
    inbound: {
      departureTime: "08:05",
      arrivalTime: "05:55",
      departureAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      arrivalAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 10M",
      stops: 0,
      stopDetails: "Direct",
    },
    price: 899,
    pricePerPerson: 899,
    currency: "£",
    ticketOptions: [
      { type: "Eco Value", price: 799 },
      { type: "Eco Classic", price: 899 },
      { type: "Eco Flex", price: 999 },
    ],
    webRef: "IN-649707636",
  },
  {
    id: "2",
    airline: {
      name: "Air India Express",
      logo: "/airlines/air-india-express.png",
      code: "IX",
    },
    outbound: {
      departureTime: "06:30",
      arrivalTime: "09:00",
      departureAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      arrivalAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 30M",
      stops: 0,
      stopDetails: "Direct",
    },
    inbound: {
      departureTime: "10:15",
      arrivalTime: "12:45",
      departureAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      arrivalAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 30M",
      stops: 0,
      stopDetails: "Direct",
    },
    price: 749,
    pricePerPerson: 749,
    currency: "£",
    ticketOptions: [
      { type: "Eco Value", price: 649 },
      { type: "Eco Classic", price: 749 },
      { type: "Eco Flex", price: 849 },
    ],
    webRef: "IN-649707637",
  },
  {
    id: "3",
    airline: {
      name: "Akasa Air",
      logo: "/airlines/akasa.png",
      code: "QP",
    },
    outbound: {
      departureTime: "07:15",
      arrivalTime: "09:50",
      departureAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      arrivalAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 35M",
      stops: 0,
      stopDetails: "Direct",
    },
    inbound: {
      departureTime: "14:20",
      arrivalTime: "16:55",
      departureAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      arrivalAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 35M",
      stops: 0,
      stopDetails: "Direct",
    },
    price: 829,
    pricePerPerson: 829,
    currency: "£",
    ticketOptions: [
      { type: "Eco Value", price: 729 },
      { type: "Eco Classic", price: 829 },
      { type: "Eco Flex", price: 929 },
    ],
    webRef: "IN-649707638",
  },
  {
    id: "4",
    airline: {
      name: "Indigo",
      logo: "/airlines/indigo.png",
      code: "6E",
    },
    outbound: {
      departureTime: "08:45",
      arrivalTime: "11:15",
      departureAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      arrivalAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 30M",
      stops: 0,
      stopDetails: "Direct",
    },
    inbound: {
      departureTime: "16:30",
      arrivalTime: "19:00",
      departureAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      arrivalAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 30M",
      stops: 0,
      stopDetails: "Direct",
    },
    price: 769,
    pricePerPerson: 769,
    currency: "£",
    ticketOptions: [
      { type: "Eco Value", price: 669 },
      { type: "Eco Classic", price: 769 },
      { type: "Eco Flex", price: 869 },
    ],
    webRef: "IN-649707639",
  },
  {
    id: "5",
    airline: {
      name: "SpiceJet",
      logo: "/airlines/spicejet.png",
      code: "SG",
    },
    outbound: {
      departureTime: "10:00",
      arrivalTime: "14:15",
      departureAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      arrivalAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      date: "SUN, 11 MAY 25",
      duration: "4H 15M",
      stops: 1,
      stopDetails: "1 Stop",
    },
    inbound: {
      departureTime: "18:00",
      arrivalTime: "22:15",
      departureAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      arrivalAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      date: "SUN, 11 MAY 25",
      duration: "4H 15M",
      stops: 1,
      stopDetails: "1 Stop",
    },
    price: 649,
    pricePerPerson: 649,
    currency: "£",
    ticketOptions: [
      { type: "Eco Value", price: 549 },
      { type: "Eco Classic", price: 649 },
      { type: "Eco Flex", price: 749 },
    ],
    webRef: "IN-649707640",
  },
  {
    id: "6",
    airline: {
      name: "Air India",
      logo: "/airlines/air-india.png",
      code: "AI",
    },
    outbound: {
      departureTime: "12:30",
      arrivalTime: "15:00",
      departureAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      arrivalAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 30M",
      stops: 0,
      stopDetails: "Direct",
    },
    inbound: {
      departureTime: "20:00",
      arrivalTime: "22:30",
      departureAirport: {
        code: "DEL",
        name: "Indira Gandhi International Airport",
        city: "Delhi",
      },
      arrivalAirport: {
        code: "BOM",
        name: "Chhatrapati Shivaji Maharaj International Airport",
        city: "Mumbai",
      },
      date: "SUN, 11 MAY 25",
      duration: "2H 30M",
      stops: 0,
      stopDetails: "Direct",
    },
    price: 949,
    pricePerPerson: 949,
    currency: "£",
    ticketOptions: [
      { type: "Eco Value", price: 849 },
      { type: "Eco Classic", price: 949 },
      { type: "Eco Flex", price: 1049 },
    ],
    webRef: "IN-649707641",
  },
];

export const mockDatePrices = [
  { date: "Thu, 08 May", price: 649 },
  { date: "Fri, 09 May", price: 699 },
  { date: "Sat, 10 May", price: 749 },
  { date: "Sun, 11 May", price: 769 },
  { date: "Mon, 12 May", price: 729 },
  { date: "Tue, 13 May", price: 689 },
  { date: "Wed, 14 May", price: 649 },
];

export const mockAirlines = [
  { name: "Air India", code: "AI", count: 45, minPrice: 799 },
  { name: "Air India Express", code: "IX", count: 32, minPrice: 649 },
  { name: "Akasa Air", code: "QP", count: 28, minPrice: 729 },
  { name: "Indigo", code: "6E", count: 52, minPrice: 669 },
  { name: "SpiceJet", code: "SG", count: 38, minPrice: 549 },
];

export const mockAirports = {
  departure: [
    { code: "BOM", name: "Mumbai Airport", count: 85, minPrice: 649 },
    { code: "CCU", name: "Kolkata Airport", count: 42, minPrice: 729 },
    { code: "MAA", name: "Chennai Airport", count: 38, minPrice: 789 },
  ],
  arrival: [
    { code: "DEL", name: "Delhi Airport", count: 95, minPrice: 649 },
    { code: "AMD", name: "Ahmedabad Airport", count: 35, minPrice: 699 },
    { code: "HYD", name: "Hyderabad Airport", count: 28, minPrice: 749 },
  ],
};

