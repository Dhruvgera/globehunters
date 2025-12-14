/**
 * BoxPay Session Creation API Route
 * POST /api/boxpay/session
 * 
 * Creates a BoxPay checkout session and returns the redirect URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { boxpayService } from '@/services/api/boxpayService';

interface CreateSessionRequestBody {
  orderId: string;
  amount: number;
  currency: string;
  shopper: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: {
      address1: string;
      address2?: string;
      city: string;
      state: string;
      countryCode: string;
      postalCode: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionRequestBody = await request.json();

    // Validate required fields
    if (!body.orderId || !body.amount || !body.currency || !body.shopper) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount, currency, shopper' },
        { status: 400 }
      );
    }

    if (!body.shopper.firstName || !body.shopper.lastName || !body.shopper.email || !body.shopper.phone) {
      return NextResponse.json(
        { error: 'Missing required shopper fields: firstName, lastName, email, phone' },
        { status: 400 }
      );
    }

    // Get the origin for return URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Build the return URL with order ID for status checking
    const returnUrl = `${origin}/payment-complete?orderId=${encodeURIComponent(body.orderId)}`;
    const backUrl = `${origin}/payment`;

    // Build and send the session request
    const sessionRequest = boxpayService.buildSessionRequest({
      orderId: body.orderId,
      amount: body.amount,
      currency: body.currency,
      shopper: body.shopper,
      returnUrl,
      backUrl,
    });

    const sessionResponse = await boxpayService.createSession(sessionRequest);

    return NextResponse.json({
      success: true,
      token: sessionResponse.token,
      checkoutUrl: sessionResponse.url,
    });
  } catch (error) {
    console.error('BoxPay session creation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment session';
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}




