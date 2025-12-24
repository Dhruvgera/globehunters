/**
 * Add Extras (Insurance/Baggage) API Route
 * Adds iAssure insurance or baggage to an existing folder
 * POST /api/vyspa/add-extras
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_PORTAL_CONFIG } from '@/config/vyspaPortal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface InsuranceExtra {
    type: 'insurance';
    planType: 'basic' | 'premium' | 'all';
    price: number;
}

interface BaggageExtra {
    type: 'baggage';
    quantity: number;
    pricePerBag: number;
}

interface AddExtrasRequestBody {
    folderNumber: number;
    currency: string;
    startDate: string; // Flight departure date
    endDate: string; // Flight return/arrival date
    extras: (InsuranceExtra | BaggageExtra)[];
}

/**
 * Format date to DD/MM/YYYY
 */
function formatDateForPortal(dateStr: string): string {
    if (!dateStr) return '';

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    return dateStr;
}

function getIAssurePlanDescription(planType: string): string {
    const descriptions: Record<string, string> = {
        basic: 'Basic',
        premium: 'Premium',
        all: 'All Included',
    };
    return descriptions[planType] || 'Basic';
}

export async function POST(request: NextRequest) {
    try {
        const body: AddExtrasRequestBody = await request.json();

        if (!body.folderNumber) {
            return NextResponse.json(
                { error: 'Missing folderNumber' },
                { status: 400 }
            );
        }

        if (!body.extras || body.extras.length === 0) {
            return NextResponse.json(
                { error: 'No extras to add' },
                { status: 400 }
            );
        }

        console.log('📨 Add Extras request', {
            folderNumber: body.folderNumber,
            currency: body.currency,
            startDate: body.startDate,
            endDate: body.endDate,
            extrasCount: body.extras.length,
            extras: body.extras,
        });

        const { apiUrl, credentials, timeout, iAssureVendorId } = VYSPA_PORTAL_CONFIG;

        console.log('🔧 Portal API Config', {
            apiUrl,
            username: credentials.username,
            hasPassword: !!credentials.password,
            hasToken: !!credentials.token,
            iAssureVendorId,
        });

        const results: { type: string; success: boolean; error?: string; response?: unknown }[] = [];

        for (const extra of body.extras) {
            let manualItem: unknown;

            if (extra.type === 'insurance') {
                manualItem = {
                    Segment: {
                        fi_type: 'OTH',
                        start_date_time_dt: formatDateForPortal(body.startDate),
                        end_date_time_dt: formatDateForPortal(body.endDate),
                        status: 'OK',
                        finan_vend_id: iAssureVendorId,
                        itin_vend_id: iAssureVendorId,
                        num_bum: '1',
                        pax_no: '1',
                        desc: getIAssurePlanDescription(extra.planType),
                        printing_note: 'OTH',
                    },
                    FolderPricings: [{
                        tot_net_amt: String(extra.price.toFixed(2)),
                        tot_sell_amt: String(extra.price.toFixed(2)),
                        desc: 'iAssure Insurance',
                        cu_curr_code: body.currency,
                    }],
                };
            } else if (extra.type === 'baggage') {
                const totalPrice = extra.quantity * extra.pricePerBag;
                manualItem = {
                    Segment: {
                        fi_type: 'OTH',
                        start_date_time_dt: formatDateForPortal(body.startDate),
                        end_date_time_dt: formatDateForPortal(body.endDate),
                        status: 'OK',
                        finan_vend_id: 0,
                        itin_vend_id: 0,
                        num_bum: String(extra.quantity),
                        pax_no: '1',
                        desc: `Extra Baggage x${extra.quantity}`,
                        printing_note: 'OTH',
                    },
                    FolderPricings: [{
                        tot_net_amt: String(totalPrice.toFixed(2)),
                        tot_sell_amt: String(totalPrice.toFixed(2)),
                        desc: 'Additional Baggage',
                        cu_curr_code: body.currency,
                    }],
                };
            } else {
                continue;
            }

            const params = [{
                SaveBasketToFolder: true,
                fromApi: true,
                folderNumber: body.folderNumber,
                itineraryNumber: '1',
                customer_type: 'C',
                manual_items: [manualItem],
            }];

            const formData = new URLSearchParams();
            formData.append('username', credentials.username);
            formData.append('password', credentials.password);
            formData.append('token', credentials.token);
            formData.append('method', 'saveBasketToFolder');
            formData.append('params', JSON.stringify(params));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            console.log(`➡️ Adding ${extra.type} to folder ${body.folderNumber}`, {
                params: JSON.stringify(params, null, 2),
            });

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString(),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                const rawText = await response.text();
                console.log(`📦 saveBasketToFolder (${extra.type}) raw response`, {
                    status: response.status,
                    statusText: response.statusText,
                    rawText: rawText.substring(0, 1000),
                });

                let parsedResponse: unknown = null;
                try {
                    parsedResponse = JSON.parse(rawText);
                    console.log(`📋 saveBasketToFolder (${extra.type}) parsed response`, JSON.stringify(parsedResponse, null, 2));
                } catch {
                    parsedResponse = { raw: rawText };
                    console.log(`⚠️ saveBasketToFolder (${extra.type}) response is not JSON`, rawText.substring(0, 500));
                }

                if (response.ok) {
                    console.log(`✅ ${extra.type} added successfully`);
                    results.push({ type: extra.type, success: true, response: parsedResponse });
                } else {
                    console.error(`❌ Failed to add ${extra.type}`, {
                        status: response.status,
                        statusText: response.statusText,
                        response: rawText.substring(0, 500),
                    });
                    results.push({ type: extra.type, success: false, error: `HTTP ${response.status}`, response: parsedResponse });
                }
            } catch (err: any) {
                clearTimeout(timeoutId);
                console.error(`❌ Error adding ${extra.type}`, err);
                results.push({ type: extra.type, success: false, error: err.message });
            }
        }

        const allSuccess = results.every(r => r.success);

        console.log('🏁 Add Extras complete', {
            folderNumber: body.folderNumber,
            allSuccess,
            results,
        });

        // Fetch folder details to verify the extras were added
        let folderDetails = null;
        let verificationResult = {
            extrasFound: false,
            iAssureFound: false,
            baggageFound: false,
            itemsInFolder: [] as string[],
        };

        try {
            const folderDetailsPayload = [{
                fold_no: String(body.folderNumber),
            }];

            console.log('➡️ Fetching folder details to verify extras were added');

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
                rawText: fdRawText.substring(0, 2000),
            });

            try {
                folderDetails = JSON.parse(fdRawText);
                console.log('📁 getFolderDetails parsed response', JSON.stringify(folderDetails, null, 2));

                // Verify extras are in the folder
                const items = folderDetails?.items || folderDetails?.folderItems || [];
                const itemsArray = Array.isArray(items) ? items : [];

                for (const item of itemsArray) {
                    const fiType = item?.FolderItem?.fi_type || item?.Segment?.fi_type || item?.fi_type || '';
                    const description = item?.FolderItem?.description || item?.description || '';

                    verificationResult.itemsInFolder.push(`${fiType}: ${description}`);

                    // Check for iAssure (OTH type with iAssure in description)
                    if (fiType === 'OTH' && description.toLowerCase().includes('iassure')) {
                        verificationResult.iAssureFound = true;
                        verificationResult.extrasFound = true;
                    }

                    // Check for baggage
                    if (fiType === 'OTH' && (description.toLowerCase().includes('baggage') || description.toLowerCase().includes('bag'))) {
                        verificationResult.baggageFound = true;
                        verificationResult.extrasFound = true;
                    }
                }

                console.log('✅ EXTRAS VERIFICATION RESULT:', {
                    folderNumber: body.folderNumber,
                    ...verificationResult,
                });
            } catch {
                folderDetails = { raw: fdRawText };
            }
        } catch (fdError) {
            console.error('❌ getFolderDetails error:', fdError);
        }

        return NextResponse.json({
            success: allSuccess,
            folderNumber: body.folderNumber,
            results,
            folderDetails,
            verification: verificationResult,
        });
    } catch (error: any) {
        console.error('💥 Add Extras unhandled error', error);
        return NextResponse.json(
            {
                error: 'UNKNOWN_ERROR',
                message: error?.message || 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}
