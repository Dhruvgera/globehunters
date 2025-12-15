/**
 * Test Email API Route
 * GET /api/test-email - Preview HTML email template
 * POST /api/test-email - Send test email to specified address
 * 
 * Use this endpoint to test and preview confirmation emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  sendConfirmationEmail, 
  generateConfirmationEmailHTML, 
  generateSampleEmailData 
} from '@/services/emailService';
import { BookingConfirmationEmailData } from '@/types/email';

/**
 * GET - Preview the email HTML template
 * Returns the rendered HTML that you can view in browser
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || 'html';
  
  // Generate sample data
  const sampleData = generateSampleEmailData();
  
  // Allow overriding order number for testing
  const orderNumber = searchParams.get('orderNumber');
  if (orderNumber) {
    sampleData.orderNumber = orderNumber;
  }

  // Generate the HTML
  const html = generateConfirmationEmailHTML(sampleData);

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      sampleData,
      htmlLength: html.length,
    });
  }

  // Return as HTML for browser preview
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

/**
 * POST - Send a test email
 * Body: { to: "email@example.com", data?: BookingConfirmationEmailData }
 * If data is not provided, uses sample data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, data } = body as { to?: string; data?: BookingConfirmationEmailData };

    if (!to) {
      return NextResponse.json(
        { error: 'Missing required field: to (email address)' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Use provided data or sample data
    const emailData = data || generateSampleEmailData();

    // Send the test email
    const result = await sendConfirmationEmail(to, emailData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `Test email sent successfully to ${to}`,
        usedSampleData: !data,
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send test email',
          hint: 'Make sure SMTP credentials are configured in .env'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send test email';
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}
