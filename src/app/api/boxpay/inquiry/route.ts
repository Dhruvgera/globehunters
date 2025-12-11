/**
 * BoxPay Transaction Inquiry API Route
 * POST /api/boxpay/inquiry
 * 
 * Checks the status of a BoxPay transaction using the redirectionResult token
 * Note: The redirectionResult token is only valid for 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { boxpayService } from '@/services/api/boxpayService';

interface InquiryRequestBody {
  token?: string;
  inquiryDetails?: {
    id: string;
    transactionId: string;
    name: 'Authorisation' | 'Capture' | 'Partial_Capture' | 'Cancel' | 'Refund' | 'Partial_Refund' | 'Settlement' | 'PreDebitNotification';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: InquiryRequestBody = await request.json();

    // Validate that at least one inquiry method is provided
    if (!body.token && !body.inquiryDetails) {
      return NextResponse.json(
        { error: 'Either token or inquiryDetails must be provided' },
        { status: 400 }
      );
    }

    // If using inquiryDetails, validate required fields
    if (body.inquiryDetails) {
      if (!body.inquiryDetails.id || !body.inquiryDetails.transactionId || !body.inquiryDetails.name) {
        return NextResponse.json(
          { error: 'inquiryDetails must include id, transactionId, and name' },
          { status: 400 }
        );
      }
    }

    // Call BoxPay inquiry API
    const inquiryResponse = await boxpayService.inquireTransaction({
      token: body.token,
      inquiryDetails: body.inquiryDetails,
    });

    // Parse the response into a simplified format
    const completionInfo = boxpayService.parseCompletionInfo(inquiryResponse);

    return NextResponse.json({
      success: true,
      payment: completionInfo,
      rawResponse: inquiryResponse,
    });
  } catch (error) {
    console.error('BoxPay inquiry error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to inquire payment status';
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}


