/**
 * Save Payment Transaction API Route
 * Records payment transaction ID to Vyspa Portal
 * POST /api/vyspa/save-payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { FOLDER_STATUS_CODES } from '@/types/portal';
import { callPortalMethod, getFolderDetails } from '@/lib/vyspa/portalClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SavePaymentRequestBody {
    folderNumber: string;
    transactionId: string;
    amount: number;
    currency: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: SavePaymentRequestBody = await request.json();

        if (!body.folderNumber || !body.transactionId) {
            return NextResponse.json(
                { error: 'Missing folderNumber or transactionId' },
                { status: 400 }
            );
        }

        console.log('📨 Save Payment request', {
            folderNumber: body.folderNumber,
            transactionId: body.transactionId,
            amount: body.amount,
            currency: body.currency,
        });

        const paymentParams = [{
            transaction_id: body.transactionId,
            folder_no: body.folderNumber,
            itinerary_id: '1',
        }];

        console.log('➡️ Calling Portal saveBarclaycardPayments', {
            params: paymentParams,
        });

        const paymentResult = await callPortalMethod('saveBarclaycardPayments', paymentParams);

        console.log('📦 saveBarclaycardPayments response', {
            ok: paymentResult.ok,
            status: paymentResult.status,
            data: paymentResult.data,
        });

        if (paymentResult.ok) {
            console.log('✅ saveBarclaycardPayments parsed response', JSON.stringify(paymentResult.data, null, 2));
        } else {
            console.error('❌ saveBarclaycardPayments failed', {
                status: paymentResult.status,
                response: paymentResult.data,
            });
        }

        // 2. Update folder status to "Payment Received"
        const statusParams = [{
            folder_no: body.folderNumber,
            new_folder_status_code: FOLDER_STATUS_CODES.PAYMENT_RECEIVED,
            comments: [`${body.currency} ${body.amount.toFixed(2)}`],
        }];

        console.log('➡️ Calling Portal api_update_folder_status', {
            params: statusParams,
        });

        const statusResult = await callPortalMethod('api_update_folder_status', statusParams);

        console.log('📦 api_update_folder_status response', {
            ok: statusResult.ok,
            status: statusResult.status,
            data: statusResult.data,
        });

        if (statusResult.ok) {
            console.log('✅ api_update_folder_status parsed response', JSON.stringify(statusResult.data, null, 2));
        } else {
            console.error('❌ api_update_folder_status failed', {
                status: statusResult.status,
                response: statusResult.data,
            });
        }

        console.log('🏁 Save Payment complete', {
            folderNumber: body.folderNumber,
            paymentRecorded: paymentResult.ok,
            statusUpdated: statusResult.ok,
        });

        // Fetch folder details to verify payment was recorded
        let folderDetails = null;
        let verificationResult = {
            paymentFound: false,
            statusIsPaid: false,
            folderStatus: '',
            paymentsInFolder: [] as any[],
            commentsInFolder: [] as string[],
        };

        try {
            console.log('➡️ Fetching folder details to verify payment was recorded');

            folderDetails = await getFolderDetails(body.folderNumber) as any;

            console.log('📁 getFolderDetails parsed response', JSON.stringify(folderDetails, null, 2));

            // Check folder status
            const folderStatus = folderDetails?.folderDetails?.FolderStatus?.folder_status_name ||
                folderDetails?.FolderStatus?.folder_status_name || '';
            verificationResult.folderStatus = folderStatus;
            verificationResult.statusIsPaid = folderStatus.toLowerCase().includes('paid') ||
                folderStatus.toLowerCase().includes('confirmed');

            // Check for payments
            const payments = folderDetails?.payments || folderDetails?.folderPayments || [];
            const paymentsArray = Array.isArray(payments) ? payments : [];
            for (const payment of paymentsArray) {
                const paymentInfo = {
                    amount: payment?.Payment?.amount || payment?.amount || '',
                    type: payment?.Payment?.payment_type || payment?.payment_type || '',
                    transactionId: payment?.Payment?.transaction_id || payment?.transaction_id || '',
                };
                verificationResult.paymentsInFolder.push(paymentInfo);
                if (paymentInfo.transactionId === body.transactionId) {
                    verificationResult.paymentFound = true;
                }
            }

            // Check for payment comments
            const comments = folderDetails?.comments || folderDetails?.folderComments || [];
            const commentsArray = Array.isArray(comments) ? comments : [];
            for (const comment of commentsArray) {
                const commentText = comment?.Comment?.comment || comment?.comment || '';
                verificationResult.commentsInFolder.push(commentText);
            }

            console.log('✅ PAYMENT VERIFICATION RESULT:', {
                folderNumber: body.folderNumber,
                transactionId: body.transactionId,
                ...verificationResult,
            });
        } catch (fdError) {
            console.error('❌ getFolderDetails error:', fdError);
        }

        return NextResponse.json({
            success: true,
            folderNumber: body.folderNumber,
            paymentRecorded: paymentResult.ok,
            statusUpdated: statusResult.ok,
            paymentResult: paymentResult.data,
            statusResult: statusResult.data,
            folderDetails,
            verification: verificationResult,
        });
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('❌ Save Payment API timeout');
            return NextResponse.json(
                { error: 'TIMEOUT', message: 'Request timed out' },
                { status: 504 }
            );
        }

        console.error('💥 Save Payment unhandled error', error);
        return NextResponse.json(
            {
                error: 'UNKNOWN_ERROR',
                message: error?.message || 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}
