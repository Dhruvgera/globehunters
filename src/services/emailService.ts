/**
 * Email Service
 * Handles sending booking confirmation emails via Amazon SES SMTP
 */

import nodemailer from 'nodemailer';
import { EMAIL_CONFIG } from '@/config/email';
import { BookingConfirmationEmailData, JourneyEmail, FlightSegmentEmail } from '@/types/email';

// Hosted logo URL - works better across email clients than embedded images
const LOGO_URL = 'https://www.globehunters.com/assets/newimages/gh-logo.png';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: EMAIL_CONFIG.smtp.host,
    port: EMAIL_CONFIG.smtp.port,
    secure: EMAIL_CONFIG.smtp.secure,
    auth: {
      user: EMAIL_CONFIG.smtp.auth.user,
      pass: EMAIL_CONFIG.smtp.auth.pass,
    },
  });
};

/**
 * Generate the HTML email template matching Figma design
 */
export function generateConfirmationEmailHTML(data: BookingConfirmationEmailData): string {
  const { orderNumber, travelerName, travelerEmail, travelerPhone, passengers, journeys, payment } = data;

  // Generate passenger sections using tables for email client compatibility
  const passengerSections = passengers.map((passenger, index) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
      <tr>
        <td colspan="2" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #555555; padding-bottom: 8px;">
          ${passenger.isLead ? 'Lead Passenger' : `Passenger ${index + 1}`}
        </td>
      </tr>
      <tr>
        <td width="120" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #0A0A0A; padding: 4px 0;">Name</td>
        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #0A0A0A; padding: 4px 0;">${passenger.name}</td>
      </tr>
      ${passenger.email ? `
      <tr>
        <td width="120" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #0A0A0A; padding: 4px 0;">Email</td>
        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #0A0A0A; padding: 4px 0;">${passenger.email}</td>
      </tr>
      ` : ''}
      <tr>
        <td width="120" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #0A0A0A; padding: 4px 0;">DOB</td>
        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #0A0A0A; padding: 4px 0;">${passenger.dob}</td>
      </tr>
    </table>
  `).join('');

  // Generate journey sections (outbound/inbound)
  const journeySections = journeys.map((journey) => generateJourneySection(journey)).join('');

  // Format currency
  const formatCurrency = (amount: number) => `${payment.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payment.currency}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Globehunters: Flight Booking Confirmation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f5f5f5; }
  </style>
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 700px; margin: 0 auto;">
    <tr>
      <td>
        <!-- Main Content Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 18px; overflow: hidden;">
          <tr>
            <td style="padding: 32px;">
              <!-- Logo -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <img src="${LOGO_URL}" alt="Globehunters" style="height: 40px; width: auto;" />
                  </td>
                </tr>
              </table>

              <!-- Thank You Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td>
                    <h1 style="font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 24px; color: #0A0A0A; margin: 0;">Thank You For Booking With Globehunters</h1>
                  </td>
                </tr>
              </table>

              <!-- Order Number -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 15px; color: #0A0A0A; margin: 0;">Your booking order number is <strong>${orderNumber}</strong></p>
                  </td>
                </tr>
              </table>

              <!-- Travel Information Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 14px; color: #555555; margin-bottom: 16px;">Travel Information:</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="120" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0; vertical-align: top;">Name</td>
                        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0;">${travelerName}</td>
                      </tr>
                      <tr>
                        <td width="120" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0; vertical-align: top;">Email</td>
                        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0;">${travelerEmail}</td>
                      </tr>
                      <tr>
                        <td width="120" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0; vertical-align: top;">Telephone</td>
                        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0;">${travelerPhone}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Route & Passenger Details Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 16px; color: #0A0A0A; margin-bottom: 16px;">${journeys[0]?.route || 'Flight Route'}</div>
                    <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 14px; color: #555555; margin-bottom: 16px;">Passenger details:</div>
                    ${passengerSections}
                  </td>
                </tr>
              </table>

              <!-- Journey Sections (Outbound/Inbound) -->
              ${journeySections}

              <!-- Payment Details Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size: 14px; color: #3754ED; margin-bottom: 16px;">Payment Details</div>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td width="250" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0;">Total Fare, Taxes, Fees &amp; Charges</td>
                        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0; text-align: right;">${formatCurrency(payment.totalFare)}</td>
                      </tr>
                      <tr>
                        <td width="250" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0;">Credit Card Fees</td>
                        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0; text-align: right;">${formatCurrency(payment.creditCardFees)}</td>
                      </tr>
                      <tr>
                        <td width="250" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0;">iAssure Protection Plan</td>
                        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0; text-align: right;">${formatCurrency(payment.protectionPlan)}</td>
                      </tr>
                      <tr>
                        <td width="250" style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0;">Baggage Plan</td>
                        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; padding: 6px 0; text-align: right;">${formatCurrency(payment.baggagePlan)}</td>
                      </tr>
                    </table>
                    <div style="border-top: 2px solid #3754ED; padding-top: 12px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size: 15px; color: #3754ED;">Total paid:</td>
                          <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size: 15px; color: #3754ED; text-align: right;">${formatCurrency(payment.totalPaid)}</td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Documents Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size: 14px; color: #3754ED; margin-bottom: 12px;">Documents</div>
                    <p style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; margin: 0 0 12px 0; line-height: 1.5;">Once your payment is approved, you will receive a separate email with your attached receipt and e-tickets.</p>
                    <p style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; margin: 0 0 12px 0; line-height: 1.5;">Please don't forget to check your junk/spam folder or email us back on <a href="mailto:documents@globehunters.com" style="color: #3754ED;">documents@globehunters.com</a>.</p>
                    <p style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; margin: 0; line-height: 1.5;">Alternatively, you may contact us at <strong>${EMAIL_CONFIG.supportPhone}</strong></p>
                  </td>
                </tr>
              </table>

              <!-- Terms and Conditions Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size: 14px; color: #3754ED; margin-bottom: 12px;">Terms and Conditions</div>
                    <p style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #0A0A0A; line-height: 1.6; margin: 0;">I acknowledge that passenger information matches the passport or official ID for travel, and that name changes are not allowed. I confirm that I have reviewed the flight itinerary and agree to the Refund &amp; Cancellation Policy. I understand tickets are non-transferable and non-changeable unless stated otherwise. I accept full responsibility for valid travel documentation and understand Globehunters cannot be held responsible for denied boarding due to passport or visa validity. At the time of booking you confirmed that you have read and agreed to our General Terms and Conditions of Carriage. Please <a href="https://www.globehunters.com/terms" style="color: #3754ED; font-weight: 600;">Click Here</a> to review these again if necessary.</p>
                  </td>
                </tr>
              </table>

              <!-- Contact Us Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size: 14px; color: #3754ED; margin-bottom: 12px;">Contact Us</div>
                    <p style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; margin: 0; line-height: 1.5;">For details on how to contact us via phone, fax, letter or via our email contact form, <a href="https://www.globehunters.com/contact" style="color: #3754ED; font-weight: 600;">Click Here</a>.</p>
                    <p style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #0A0A0A; margin: 12px 0 0 0; line-height: 1.5;">Or call us on: <strong style="color: #3754ED;">${EMAIL_CONFIG.supportPhone}</strong></p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate a journey section (outbound or inbound)
 */
function generateJourneySection(journey: JourneyEmail): string {
  const isOutbound = journey.type === 'outbound';
  const label = isOutbound ? 'Outbound' : 'Inbound';

  // Generate flight segments with stopovers
  let segmentsHTML = '';
  journey.segments.forEach((segment, index) => {
    segmentsHTML += generateFlightSegmentHTML(segment);

    // Add stopover if not the last segment
    if (index < journey.stopovers.length) {
      const stopover = journey.stopovers[index];
      segmentsHTML += `
        <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #555555; padding: 16px 0; border-top: 1px dashed #DDD; border-bottom: 1px dashed #DDD; margin: 12px 0;">
          ✈️ Stopover: ${stopover.airportName} (${stopover.airportCode}) - ${stopover.duration}
        </div>
      `;
    }
  });

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <!-- Journey Header -->
          <div style="margin-bottom: 16px;">
            <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 700; font-size: 14px; color: #3754ED; margin-bottom: 12px;">${label}</div>
            <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 15px; color: #0A0A0A; margin-bottom: 8px;">${journey.route}</div>
            <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #555555; margin-bottom: 6px;">${journey.date}${journey.arrivalDate ? ` (Arriving ${journey.arrivalDate})` : ''}</div>
            <div style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 13px; color: #555555;">Total trip time: ${journey.totalDuration}</div>
          </div>

          <!-- Flight Segments -->
          ${segmentsHTML}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate a single flight segment HTML
 */
function generateFlightSegmentHTML(segment: FlightSegmentEmail): string {
  const operatedByText = segment.operatedBy ? ` (Operated by ${segment.operatedBy})` : '';
  const airlineLogoUrl = segment.airlineCode
    ? `https://images.kiwi.com/airlines/64/${segment.airlineCode}.png`
    : '';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 600; font-size: 13px; color: #000000; padding-bottom: 6px;">${segment.from} (${segment.fromCode}) → ${segment.to} (${segment.toCode})</td>
      </tr>
      <tr>
        <td style="padding-bottom: 8px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              ${airlineLogoUrl ? `
              <td style="vertical-align: middle; padding-right: 8px;">
                <img src="${airlineLogoUrl}" alt="${segment.airline}" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.style.display='none'" />
              </td>
              ` : ''}
              <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #333333; vertical-align: middle;">${segment.airline} Flight ${segment.flightNumber}${operatedByText}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #333333; padding-bottom: 4px;">Depart ${segment.departureTime} - Arrive ${segment.arrivalTime}</td>
      </tr>
      <tr>
        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #333333; padding-bottom: 4px;">Duration: ${segment.duration}</td>
      </tr>
      <tr>
        <td style="font-family: 'Inter', Arial, sans-serif; font-weight: 500; font-size: 12px; color: #333333;">Class: ${segment.cabinClass}</td>
      </tr>
    </table>
  `;
}

/**
 * Send booking confirmation email
 */
export async function sendConfirmationEmail(
  to: string,
  data: BookingConfirmationEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createTransporter();
    const html = generateConfirmationEmailHTML(data);

    const mailOptions = {
      from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.email}>`,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Globehunters: Flight Booking Confirmation - Order #${data.orderNumber}`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate sample/test email data for previewing
 */
export function generateSampleEmailData(): BookingConfirmationEmailData {
  return {
    orderNumber: '859517',
    travelerName: 'Miss. Sheryl Carol Jean Nokes',
    travelerEmail: 'sherylnokes@hotmail.co.uk',
    travelerPhone: '0402740055',
    passengers: [
      {
        name: 'Miss. Sheryl Carol Jean Nokes',
        email: 'sherylnokes@hotmail.co.uk',
        dob: 'Mar 29, 1989',
        isLead: true,
      },
      {
        name: 'Miss. Georgia Lee Avery',
        dob: 'Jan 23, 1995',
        isLead: false,
      },
    ],
    journeys: [
      {
        type: 'outbound',
        route: 'Adelaide - London Heathrow',
        date: 'Friday, Dec 19',
        arrivalDate: 'Dec 20',
        totalDuration: '21 h 0 m',
        segments: [
          {
            from: 'Adelaide',
            fromCode: 'ADL',
            to: 'Doha',
            toCode: 'DOH',
            date: 'Dec 19',
            departureTime: '22:00',
            arrivalTime: '04:00',
            duration: '13 h 30 m',
            flightNumber: '915',
            airline: 'Qatar Airways',
            cabinClass: 'Economy',
          },
          {
            from: 'Doha',
            fromCode: 'DOH',
            to: 'London Heathrow',
            toCode: 'LHR',
            date: 'Dec 20',
            departureTime: '07:40',
            arrivalTime: '12:10',
            duration: '7 h 30 m',
            flightNumber: '9709',
            airline: 'Qatar Airways',
            cabinClass: 'Economy',
            operatedBy: 'British Airways',
          },
        ],
        stopovers: [
          {
            airportCode: 'DOH',
            airportName: 'Doha',
            duration: '3h 40m',
          },
        ],
      },
      {
        type: 'inbound',
        route: 'London Heathrow - Adelaide',
        date: 'Saturday Jan 3',
        arrivalDate: 'Jan 4',
        totalDuration: '19 h 55 m',
        segments: [
          {
            from: 'London Heathrow',
            fromCode: 'LHR',
            to: 'Doha',
            toCode: 'DOH',
            date: 'Jan 3',
            departureTime: '08:05',
            arrivalTime: '17:45',
            duration: '6 h 40 m',
            flightNumber: '6',
            airline: 'Qatar Airways',
            cabinClass: 'Economy',
          },
          {
            from: 'Doha',
            fromCode: 'DOH',
            to: 'Adelaide',
            toCode: 'ADL',
            date: 'Jan 3',
            departureTime: '20:20',
            arrivalTime: '17:05',
            duration: '13 h 15 m',
            flightNumber: '914',
            airline: 'Qatar Airways',
            cabinClass: 'Economy',
          },
        ],
        stopovers: [
          {
            airportCode: 'DOH',
            airportName: 'Doha',
            duration: '2h 35m',
          },
        ],
      },
    ],
    payment: {
      totalFare: 8073.04,
      creditCardFees: 121.10,
      protectionPlan: 0.00,
      baggagePlan: 0.00,
      totalPaid: 8194.14,
      currency: 'AUD',
      currencySymbol: 'A$',
    },
  };
}
