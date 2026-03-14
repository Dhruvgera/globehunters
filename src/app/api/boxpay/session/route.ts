/**
 * BoxPay Session Creation API Route
 * POST /api/boxpay/session
 * 
 * Creates a BoxPay checkout session and returns the redirect URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { boxpayService } from '@/services/api/boxpayService';
import { convertLocalTaxesToCurrency, type LocalPayableTaxItem, normalizeCurrencyCode } from '@/lib/currency/serverFx';

interface CreateSessionRequestBody {
  orderId: string;
  amount: number;
  currency: string;
  flow?: 'flight' | 'package' | 'hotel';
  localPayableTaxes?: LocalPayableTaxItem[];
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

    const flow = body.flow || 'flight';
    const qp = flow !== 'flight' ? `&type=${flow}` : '';

    // Build the return URL with order ID for status checking
    const returnUrl = `${origin}/payment-complete?orderId=${encodeURIComponent(body.orderId)}${qp}`;
    const backUrl = `${origin}/payment${flow !== 'flight' ? `?type=${flow}` : ''}`;

    const gatewayCurrency = normalizeCurrencyCode(body.currency) || 'GBP';
    const localTaxesConverted = await convertLocalTaxesToCurrency(body.localPayableTaxes, gatewayCurrency);
    const finalAmount = Number(body.amount || 0) + localTaxesConverted;

    // Build and send the session request
    const sessionRequest = boxpayService.buildSessionRequest({
      orderId: body.orderId,
      amount: finalAmount,
      currency: gatewayCurrency,
      shopper: body.shopper,
      returnUrl,
      backUrl,
    });

    const sessionResponse = await boxpayService.createSession(sessionRequest);

    return NextResponse.json({
      success: true,
      token: sessionResponse.token,
      checkoutUrl: sessionResponse.url,
      finalAmount: Number(finalAmount.toFixed(2)),
      localTaxesAdded: Number(localTaxesConverted.toFixed(2)),
      currency: gatewayCurrency,
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









