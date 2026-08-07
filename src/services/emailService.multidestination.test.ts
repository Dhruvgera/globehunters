import { generateConfirmationEmailHTML } from "@/services/emailService";
import type { BookingConfirmationEmailData } from "@/types/email";

describe("package confirmation email", () => {
  it("renders every destination hotel in journey order", () => {
    const data: BookingConfirmationEmailData = {
      bookingType: "package",
      orderNumber: "GH-123",
      travelerName: "Test Traveller",
      travelerEmail: "traveller@example.com",
      travelerPhone: "02000000000",
      passengers: [{ name: "Test Traveller", dob: "1990-01-01", isLead: true }],
      hotel: {
        destination: "Dubai",
        hotelName: "Dubai Hotel",
        address: "Dubai address",
        checkIn: "30 Aug 2026",
        checkOut: "3 Sep 2026",
        nights: 4,
        rooms: 1,
        roomType: "Deluxe room",
      },
      hotels: [
        {
          destination: "Dubai",
          hotelName: "Dubai Hotel",
          address: "Dubai address",
          checkIn: "30 Aug 2026",
          checkOut: "3 Sep 2026",
          nights: 4,
          rooms: 1,
          roomType: "Deluxe room",
        },
        {
          destination: "Bangkok",
          hotelName: "Bangkok Hotel",
          address: "Bangkok address",
          checkIn: "3 Sep 2026",
          checkOut: "8 Sep 2026",
          nights: 5,
          rooms: 1,
          roomType: "King room",
        },
      ],
      payment: {
        totalFare: 1000,
        creditCardFees: 0,
        protectionPlan: 0,
        baggagePlan: 0,
        totalPaid: 1000,
        currency: "GBP",
        currencySymbol: "£",
      },
    };

    const html = generateConfirmationEmailHTML(data);

    expect(html).toContain("Dubai Hotel");
    expect(html).toContain("Bangkok Hotel");
    expect(html.indexOf("Dubai Hotel")).toBeLessThan(html.indexOf("Bangkok Hotel"));
    expect(html).toContain("Bangkok Hotel</div>");
  });
});

