/**
 * Price Check Server Action
 * Server-side action for checking flight prices via Vyspa API
 */

'use server';

import { VYSPA_CONFIG } from '@/config/vyspa';
import type { PriceCheckRequest, PriceCheckResponse, PriceCheckResult } from '@/types/priceCheck';
import { transformPriceCheckResponse, createPriceCheckError } from '@/services/api/priceCheckService';

/**
 * Check flight price
 * @param segmentResultId - Segment result ID from flight search
 * @returns Price check result with upgrade options
 */
export async function checkPrice(
  segmentResultId: string | number
): Promise<PriceCheckResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VYSPA_CONFIG.defaults.timeout);

  try {
    // Convert to string and validate input
    const segmentIdStr = String(segmentResultId).trim();
    
    if (!segmentResultId || segmentIdStr === '' || segmentIdStr === 'undefined' || segmentIdStr === 'null') {
      throw createPriceCheckError(
        'VALIDATION_ERROR',
        'Invalid segment result ID',
        'Unable to check price. Please try searching again.',
        { segmentResultId, type: typeof segmentResultId }
      );
    }

    // Prepare request
    const request: PriceCheckRequest[] = [{
      segment_psw_result1: parseInt(segmentIdStr, 10)
    }];

    console.log('🔍 Server Action: Price Check Request:', {
      segmentResultId,
      timestamp: new Date().toISOString(),
    });

    // Build API URL and auth header
    const basicAuth = Buffer.from(
      `${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
    ).toString('base64');
    const apiUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const endpoint = `${apiUrl}/rest/v4/price_check/`;

    // Make API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📥 Server Action: Price Check Response Status:', response.status);

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server Action: API Error Response:', errorText);
      
      throw createPriceCheckError(
        'API_ERROR',
        `HTTP ${response.status}: ${response.statusText}`,
        'Unable to check price. Please try again.',
        {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 200),
          segmentId: segmentResultId,
        }
      );
    }

    // Parse response
    const data: PriceCheckResponse = await response.json();

    console.log('📦 Server Action: Price Check Data received:', {
      success: data.success,
      hasPriceCheck: !!data.priceCheck,
      hasPriceData: !!data.priceCheck?.price_data,
      priceDataLength: data.priceCheck?.price_data?.length || 0,
    });

    // Validate response structure
    if (!data.success || !data.priceCheck) {
      throw createPriceCheckError(
        'API_ERROR',
        'Invalid API response: missing success or priceCheck',
        'Unable to verify pricing. Please try again.',
        { response: data }
      );
    }

    if (!data.priceCheck.flight_data || !data.priceCheck.flight_data.result) {
      throw createPriceCheckError(
        'API_ERROR',
        'Invalid API response: missing flight data',
        'Flight information is incomplete. Please search again.',
        { priceCheck: data.priceCheck }
      );
    }

    // Transform response to UI model
    const result = await transformPriceCheckResponse(data);
    
    console.log('✅ Server Action: Price check successful:', {
      priceOptions: result.priceOptions.length,
      sessionId: result.sessionInfo.sessionId,
    });
    
    return result;

  } catch (error: any) {
    console.error('❌ Server Action: Price Check API error:', error);
    
    // Handle timeout
    if (error.name === 'AbortError') {
      throw createPriceCheckError(
        'TIMEOUT_ERROR',
        'Request timed out after 30 seconds',
        'The price check is taking longer than expected. Please try again.',
        { timeout: VYSPA_CONFIG.defaults.timeout, segmentId: segmentResultId }
      );
    }

    // Handle network errors
    if (error.message?.includes('fetch') || error.message?.includes('NetworkError')) {
      throw createPriceCheckError(
        'NETWORK_ERROR',
        `Network error: ${error.message}`,
        'Unable to connect to the booking system. Please check your internet connection.',
        { error: error.toString(), segmentId: segmentResultId }
      );
    }

    // Re-throw if already a PriceCheckError
    if (error.type) {
      throw error;
    }

    // Unknown error - capture as much detail as possible
    console.error('❌ Server Action: Price Check failed with error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      error: error,
    });
    
    throw createPriceCheckError(
      'UNKNOWN_ERROR',
      error.message || error.toString() || 'Unknown error occurred',
      'Unable to verify pricing. The fare may have expired. Please search again.',
      {
        errorName: error.name,
        errorMessage: error.message,
        errorString: error.toString(),
        segmentId: segmentResultId,
        timestamp: new Date().toISOString(),
      }
    );
  }
}


