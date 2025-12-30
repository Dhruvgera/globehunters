import { NextRequest, NextResponse } from 'next/server';
import { VYSPA_PORTAL_CONFIG } from '@/config/vyspaPortal';
import { FOLDER_STATUS_CODES } from '@/types/portal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UpdateStatusRequestBody {
    folderNumber: string;
    statusCode: string;
    comments?: string[];
}

export async function POST(request: NextRequest) {
    try {
        const body: UpdateStatusRequestBody = await request.json();

        if (!body.folderNumber || !body.statusCode) {
            return NextResponse.json(
                { error: 'Missing folderNumber or statusCode' },
                { status: 400 }
            );
        }

        console.log('📨 Update Status request', {
            folderNumber: body.folderNumber,
            statusCode: body.statusCode,
            comments: body.comments
        });

        const { apiUrl, credentials, timeout } = VYSPA_PORTAL_CONFIG;

        const statusParams = [{
            folder_no: body.folderNumber,
            new_folder_status_code: body.statusCode,
            comments: body.comments || [],
        }];

        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        formData.append('token', credentials.token);
        formData.append('method', 'api_update_folder_status');
        formData.append('params', JSON.stringify(statusParams));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log('➡️ Calling Portal api_update_folder_status', {
            params: statusParams,
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const rawText = await response.text();
        console.log('📦 api_update_folder_status raw response', {
            status: response.status,
            rawText: rawText.substring(0, 500),
        });

        let result: unknown;
        try {
            result = JSON.parse(rawText);
        } catch {
            result = { raw: rawText };
        }

        return NextResponse.json({
            success: response.ok,
            result,
        });

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json(
                { error: 'TIMEOUT', message: 'Request timed out' },
                { status: 504 }
            );
        }
        console.error('💥 Update Status unhandled error', error);
        return NextResponse.json(
            { error: 'UNKNOWN_ERROR', message: error?.message || 'Unknown error' },
            { status: 500 }
        );
    }
}

