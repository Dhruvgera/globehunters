/**
 * Send Confirmation Email API Route
 * POST /api/send-confirmation-email
 * 
 * Sends a booking confirmation email to the customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmationEmail } from '@/services/emailService';
import { BookingConfirmationEmailData } from '@/types/email';

interface SendEmailRequestBody {
  to: string;
  data: BookingConfirmationEmailData;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequestBody = await request.json();

    // Validate required fields
    if (!body.to || !body.data) {
      return NextResponse.json(
        { error: 'Missing required fields: to, data' },
        { status: 400 }
      );
    }

    if (!body.data.orderNumber || !body.data.travelerEmail) {
      return NextResponse.json(
        { error: 'Missing required data fields: orderNumber, travelerEmail' },
        { status: 400 }
      );
    }

    // Send the email
    const result = await sendConfirmationEmail(body.to, body.data);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Confirmation email sent successfully',
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send email' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send confirmation email error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send confirmation email';
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}
