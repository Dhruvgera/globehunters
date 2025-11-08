/**
 * Vyspa Error Handling
 * Centralized error handling and user-friendly error messages
 */

import { VyspaErrorType, type VyspaError } from '@/types/vyspa';

/**
 * Error message mappings
 */
const ERROR_MESSAGES: Record<VyspaErrorType, string> = {
  [VyspaErrorType.NETWORK_ERROR]: 
    'Unable to connect to flight search service. Please check your internet connection and try again.',
  
  [VyspaErrorType.TIMEOUT_ERROR]: 
    'The search is taking longer than expected. Please try again.',
  
  [VyspaErrorType.API_ERROR]: 
    'Flight search service is currently unavailable. Please try again later.',
  
  [VyspaErrorType.MODULE_NOT_FOUND]: 
    'No flights available for this route. Please try a different destination.',
  
  [VyspaErrorType.VALIDATION_ERROR]: 
    'Please check your search parameters and try again.',
  
  [VyspaErrorType.NO_RESULTS]: 
    'No flights found for your search. Try adjusting your dates or airports.',
  
  [VyspaErrorType.TRANSFORMATION_ERROR]: 
    'An error occurred while processing flight data. Please try again.',
  
  [VyspaErrorType.UNKNOWN_ERROR]: 
    'An unexpected error occurred. Please try again.',
};

/**
 * Create a standardized Vyspa error
 */
export function createVyspaError(
  type: VyspaErrorType,
  message: string,
  userMessage?: string,
  details?: any
): VyspaError {
  return {
    type,
    message,
    userMessage: userMessage || ERROR_MESSAGES[type],
    details,
  };
}

/**
 * Check if error is a Vyspa error
 */
export function isVyspaError(error: any): error is VyspaError {
  return error && typeof error === 'object' && 'type' in error && 'userMessage' in error;
}

/**
 * Get user-friendly error message from any error
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (isVyspaError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('fetch')) {
      return ERROR_MESSAGES[VyspaErrorType.NETWORK_ERROR];
    }
    
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES[VyspaErrorType.TIMEOUT_ERROR];
    }
    
    if (error.message.includes('Module Not Found')) {
      return ERROR_MESSAGES[VyspaErrorType.MODULE_NOT_FOUND];
    }
    
    if (error.message.includes('Invalid parameter')) {
      return ERROR_MESSAGES[VyspaErrorType.VALIDATION_ERROR];
    }

    // Return the error message if it seems user-friendly
    if (error.message.length < 200 && !error.message.includes('Error:')) {
      return error.message;
    }
  }

  return ERROR_MESSAGES[VyspaErrorType.UNKNOWN_ERROR];
}

/**
 * Log error for debugging
 */
export function logError(error: any, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';
  
  console.error(`❌ ${timestamp} ${contextStr}`, {
    error: isVyspaError(error) ? error : {
      message: error?.message || String(error),
      stack: error?.stack,
    },
  });
}

/**
 * Handle Vyspa API error response
 */
export function handleVyspaApiError(error: string): VyspaError {
  // Check for specific error patterns
  if (error.includes('Module Not Found')) {
    return createVyspaError(
      VyspaErrorType.MODULE_NOT_FOUND,
      error,
      'No flights available for this route. Please try a different destination.'
    );
  }

  if (error.includes('Invalid credentials') || error.includes('Authentication')) {
    return createVyspaError(
      VyspaErrorType.API_ERROR,
      error,
      'Service configuration error. Please contact support.'
    );
  }

  if (error.includes('Rate limit')) {
    return createVyspaError(
      VyspaErrorType.API_ERROR,
      error,
      'Too many requests. Please wait a moment and try again.'
    );
  }

  return createVyspaError(
    VyspaErrorType.API_ERROR,
    error,
    'An error occurred while searching for flights. Please try again.'
  );
}

/**
 * Retry helper for transient errors
 */
export async function retryOnError<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain error types
      if (isVyspaError(error)) {
        if (
          error.type === VyspaErrorType.VALIDATION_ERROR ||
          error.type === VyspaErrorType.MODULE_NOT_FOUND
        ) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      console.log(`⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }

  throw lastError;
}

/**
 * Sanitize error for client-side logging
 * Remove sensitive information before sending to client
 */
export function sanitizeErrorForClient(error: any): {
  message: string;
  type?: string;
  timestamp: string;
} {
  return {
    message: getUserFriendlyErrorMessage(error),
    type: isVyspaError(error) ? error.type : 'UNKNOWN',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create error response for API endpoints
 */
export function createErrorResponse(error: any) {
  const userMessage = getUserFriendlyErrorMessage(error);
  const sanitized = sanitizeErrorForClient(error);

  return {
    success: false,
    error: userMessage,
    details: sanitized,
  };
}
