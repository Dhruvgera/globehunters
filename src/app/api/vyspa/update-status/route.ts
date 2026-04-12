import { NextRequest, NextResponse } from 'next/server';
import { FOLDER_STATUS_CODES } from '@/types/portal';
import { callPortalMethod } from '@/lib/vyspa/portalClient';

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

        const statusParams = [{
            folder_no: body.folderNumber,
            new_folder_status_code: body.statusCode,
            comments: body.comments || [],
        }];

        console.log('➡️ Calling Portal api_update_folder_status', {
            params: statusParams,
        });

        const { ok, status: httpStatus, data: result } = await callPortalMethod('api_update_folder_status', statusParams);

        console.log('📦 api_update_folder_status response', {
            status: httpStatus,
            result,
        });

        return NextResponse.json({
            success: ok,
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
