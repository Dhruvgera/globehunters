/**
 * Save Payment Transaction API Route
 * Records payment transaction ID to Vyspa Portal
 * POST /api/vyspa/save-payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_PORTAL_CONFIG } from '@/config/vyspaPortal';
import { FOLDER_STATUS_CODES } from '@/types/portal';

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

        const { apiUrl, credentials, timeout } = VYSPA_PORTAL_CONFIG;

        console.log('🔧 Portal API Config', {
            apiUrl,
            username: credentials.username,
            hasPassword: !!credentials.password,
            hasToken: !!credentials.token,
        });

        // 1. Save payment transaction
        const paymentParams = [{
            transaction_id: body.transactionId,
            folder_no: body.folderNumber,
            itinerary_id: '1',
        }];

        const paymentFormData = new URLSearchParams();
        paymentFormData.append('username', credentials.username);
        paymentFormData.append('password', credentials.password);
        paymentFormData.append('token', credentials.token);
        paymentFormData.append('method', 'saveBarclaycardPayments');
        paymentFormData.append('params', JSON.stringify(paymentParams));

        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), timeout);

        console.log('➡️ Calling Portal saveBarclaycardPayments', {
            params: paymentParams,
        });

        const paymentResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: paymentFormData.toString(),
            signal: controller1.signal,
        });

        clearTimeout(timeoutId1);

        let paymentResult: unknown = null;
        let paymentRawText = '';

        paymentRawText = await paymentResponse.text();
        console.log('📦 saveBarclaycardPayments raw response', {
            status: paymentResponse.status,
            statusText: paymentResponse.statusText,
            rawText: paymentRawText.substring(0, 1000),
        });

        if (paymentResponse.ok) {
            try {
                paymentResult = JSON.parse(paymentRawText);
                console.log('✅ saveBarclaycardPayments parsed response', JSON.stringify(paymentResult, null, 2));
            } catch {
                paymentResult = { raw: paymentRawText };
                console.log('⚠️ saveBarclaycardPayments response is not JSON', paymentRawText.substring(0, 500));
            }
        } else {
            console.error('❌ saveBarclaycardPayments failed', {
                status: paymentResponse.status,
                statusText: paymentResponse.statusText,
                response: paymentRawText.substring(0, 500),
            });
        }

        // 2. Update folder status to "Paid"
        const statusParams = [{
            folder_no: body.folderNumber,
            new_folder_status_code: FOLDER_STATUS_CODES.PAID,
            comments: [`${body.currency} ${body.amount.toFixed(2)}`],
        }];

        const statusFormData = new URLSearchParams();
        statusFormData.append('username', credentials.username);
        statusFormData.append('password', credentials.password);
        statusFormData.append('token', credentials.token);
        statusFormData.append('method', 'api_update_folder_status');
        statusFormData.append('params', JSON.stringify(statusParams));

        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), timeout);

        console.log('➡️ Calling Portal api_update_folder_status', {
            params: statusParams,
        });

        const statusResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: statusFormData.toString(),
            signal: controller2.signal,
        });

        clearTimeout(timeoutId2);

        let statusResult: unknown = null;
        let statusRawText = '';

        statusRawText = await statusResponse.text();
        console.log('📦 api_update_folder_status raw response', {
            status: statusResponse.status,
            statusText: statusResponse.statusText,
            rawText: statusRawText.substring(0, 1000),
        });

        if (statusResponse.ok) {
            try {
                statusResult = JSON.parse(statusRawText);
                console.log('✅ api_update_folder_status parsed response', JSON.stringify(statusResult, null, 2));
            } catch {
                statusResult = { raw: statusRawText };
                console.log('⚠️ api_update_folder_status response is not JSON', statusRawText.substring(0, 500));
            }
        } else {
            console.error('❌ api_update_folder_status failed', {
                status: statusResponse.status,
                statusText: statusResponse.statusText,
                response: statusRawText.substring(0, 500),
            });
        }

        console.log('🏁 Save Payment complete', {
            folderNumber: body.folderNumber,
            paymentRecorded: paymentResponse.ok,
            statusUpdated: statusResponse.ok,
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
            const folderDetailsPayload = [{
                fold_no: body.folderNumber,
            }];

            console.log('➡️ Fetching folder details to verify payment was recorded');

            const fdFormData = new URLSearchParams();
            fdFormData.append('username', credentials.username);
            fdFormData.append('password', credentials.password);
            fdFormData.append('token', credentials.token);
            fdFormData.append('method', 'getFolderDetails');
            fdFormData.append('params', JSON.stringify(folderDetailsPayload));

            const folderDetailsResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: fdFormData.toString(),
            });

            const fdRawText = await folderDetailsResponse.text();
            console.log('📁 getFolderDetails raw response', {
                status: folderDetailsResponse.status,
                rawText: fdRawText.substring(0, 3000),
            });

            try {
                folderDetails = JSON.parse(fdRawText);
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
            } catch {
                folderDetails = { raw: fdRawText };
            }
        } catch (fdError) {
            console.error('❌ getFolderDetails error:', fdError);
        }

        return NextResponse.json({
            success: true,
            folderNumber: body.folderNumber,
            paymentRecorded: paymentResponse.ok,
            statusUpdated: statusResponse.ok,
            paymentResult,
            statusResult,
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
