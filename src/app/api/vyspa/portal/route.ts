/**
 * Vyspa Portal API Route
 * Handles all portal.globehunters.com API calls
 * POST /api/vyspa/portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_PORTAL_CONFIG } from '@/config/vyspaPortal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PortalRequestBody {
    method: 'saveBasketToFolder' | 'api_update_folder_status' | 'save_customer_details' | 'saveBarclaycardPayments';
    params: unknown[];
}

export async function POST(request: NextRequest) {
    try {
        const body: PortalRequestBody = await request.json();

        if (!body.method) {
            return NextResponse.json(
                { error: 'Missing method parameter' },
                { status: 400 }
            );
        }

        if (!body.params || !Array.isArray(body.params)) {
            return NextResponse.json(
                { error: 'Missing or invalid params parameter' },
                { status: 400 }
            );
        }

        console.log(`📨 Portal API request: ${body.method}`, {
            paramsCount: body.params.length,
            params: JSON.stringify(body.params, null, 2),
        });

        const { apiUrl, credentials, timeout } = VYSPA_PORTAL_CONFIG;

        console.log('🔧 Portal API Config', {
            apiUrl,
            username: credentials.username,
            hasPassword: !!credentials.password,
            hasToken: !!credentials.token,
        });

        // Build form data
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        formData.append('token', credentials.token);
        formData.append('method', body.method);
        formData.append('params', JSON.stringify(body.params));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`➡️ Calling Portal API: ${body.method}`);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Get raw response text
        const responseText = await response.text();

        console.log(`📦 Portal API raw response: ${body.method}`, {
            status: response.status,
            statusText: response.statusText,
            rawText: responseText.substring(0, 2000),
        });

        if (!response.ok) {
            console.error(`❌ Portal API ${body.method} failed`, {
                status: response.status,
                statusText: response.statusText,
                response: responseText.substring(0, 1000),
            });
            return NextResponse.json(
                {
                    error: 'PORTAL_API_ERROR',
                    message: `Portal API ${body.method} failed with HTTP ${response.status}`,
                    details: responseText.substring(0, 500),
                },
                { status: response.status }
            );
        }

        // Try to parse as JSON, but return text if it fails
        let data: unknown;

        try {
            data = JSON.parse(responseText);
            console.log(`📋 Portal API ${body.method} parsed response`, JSON.stringify(data, null, 2));
        } catch {
            console.log(`⚠️ Portal API ${body.method} returned non-JSON response`, responseText.substring(0, 500));
            data = { raw: responseText };
        }

        console.log(`✅ Portal API ${body.method} success`);

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('❌ Portal API timeout');
            return NextResponse.json(
                { error: 'TIMEOUT', message: 'Portal API request timed out' },
                { status: 504 }
            );
        }

        console.error('💥 Portal API unhandled error', error);
        return NextResponse.json(
            {
                error: 'UNKNOWN_ERROR',
                message: error?.message || 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}
