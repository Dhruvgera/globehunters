/**
 * Vyspa API Validators
 * Validation functions for search parameters and API responses
 */

import { VYSPA_CONFIG } from '@/config/vyspa';
import { isValidAirportCode, isValidDateFormat } from './utils';
import type { FlightSearchRequest, ValidationResult } from '@/types/vyspa';

/**
 * Validate flight search parameters
 * @param params Flight search request parameters
 * @returns Validation result with errors if any
 */
export function validateSearchParams(
  params: FlightSearchRequest
): ValidationResult {
  // If Request_id is provided, we skip normal validation as we're restoring a search session
  if (params.Request_id) {
    return {
      valid: true,
      errors: [],
    };
  }

  const errors: string[] = [];

  // Required fields
  if (!params.origin1) {
    errors.push('Origin airport is required');
  } else if (!isValidAirportCode(params.origin1)) {
    errors.push('Origin airport code must be 3 letters (e.g., LHR)');
  }

  if (!params.destinationid) {
    errors.push('Destination airport is required');
  } else if (!isValidAirportCode(params.destinationid)) {
    errors.push('Destination airport code must be 3 letters (e.g., JFK)');
  }

  // Check if origin and destination are the same
  if (params.origin1 && params.destinationid && 
      params.origin1.toUpperCase() === params.destinationid.toUpperCase()) {
    errors.push('Origin and destination must be different');
  }

  if (!params.fr) {
    errors.push('Departure date is required');
  } else if (!isValidDateFormat(params.fr)) {
    errors.push('Departure date must be in DD/MM/YYYY format');
  }

  // Return date validation (only for round trips)
  if (params.ow === '0' && params.to) {
    if (!isValidDateFormat(params.to)) {
      errors.push('Return date must be in DD/MM/YYYY format');
    }

    // Check if return date is after departure date
    if (params.fr && isValidDateFormat(params.fr) && isValidDateFormat(params.to)) {
      const [depDay, depMonth, depYear] = params.fr.split('/').map(Number);
      const [retDay, retMonth, retYear] = params.to.split('/').map(Number);
      
      const depDate = new Date(depYear, depMonth - 1, depDay);
      const retDate = new Date(retYear, retMonth - 1, retDay);
      
      if (retDate < depDate) {
        errors.push('Return date must be on or after departure date');
      }
    }
  }

  // Passenger validation
  const adults = parseInt(params.adt1, 10);
  const children = parseInt(params.chd1 || '0', 10);
  const infants = parseInt(params.inf1 || '0', 10);

  if (isNaN(adults) || adults < VYSPA_CONFIG.validation.minAdults) {
    errors.push(`At least ${VYSPA_CONFIG.validation.minAdults} adult is required`);
  }

  if (adults > VYSPA_CONFIG.validation.maxAdults) {
    errors.push(`Maximum ${VYSPA_CONFIG.validation.maxAdults} adults allowed`);
  }

  if (!isNaN(children) && children > VYSPA_CONFIG.validation.maxChildren) {
    errors.push(`Maximum ${VYSPA_CONFIG.validation.maxChildren} children allowed`);
  }

  if (!isNaN(infants) && infants > VYSPA_CONFIG.validation.maxInfants) {
    errors.push(`Maximum ${VYSPA_CONFIG.validation.maxInfants} infants allowed`);
  }

  // Total passengers check
  const totalPassengers = adults + children + infants;
  if (totalPassengers > VYSPA_CONFIG.validation.maxTotalPassengers) {
    errors.push(`Maximum ${VYSPA_CONFIG.validation.maxTotalPassengers} total passengers allowed`);
  }

  // Infants cannot exceed adults
  if (!isNaN(infants) && infants > adults) {
    errors.push('Number of infants cannot exceed number of adults');
  }

  // Trip type validation
  if (params.ow !== '0' && params.ow !== '1') {
    errors.push('Trip type must be 0 (round trip) or 1 (one way)');
  }

  // Direct flight validation
  if (params.dir !== '0' && params.dir !== '1') {
    errors.push('Direct flight option must be 0 (any) or 1 (direct only)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Vyspa API configuration
 * @returns Validation result
 */
export function validateVyspaConfig(): ValidationResult {
  const errors: string[] = [];

  if (!VYSPA_CONFIG.apiUrl) {
    errors.push('VYSPA_API_URL is not configured');
  }

  if (!VYSPA_CONFIG.credentials.username) {
    errors.push('VYSPA_USERNAME is not configured');
  }

  if (!VYSPA_CONFIG.credentials.password) {
    errors.push('VYSPA_PASSWORD is not configured');
  }
  // Token is optional for the Globehunters REST v4 endpoint using Basic auth
  // Keeping it non-mandatory to support both legacy Vyspa and new GH API

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate date is not in the past
 * @param dateStr Date string in DD/MM/YYYY format
 * @returns True if date is today or in the future
 */
export function validateDateNotPast(dateStr: string): boolean {
  try {
    if (!isValidDateFormat(dateStr)) {
      return false;
    }

    const [day, month, year] = dateStr.split('/').map(Number);
    const searchDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    return searchDate >= today;
  } catch (error) {
    return false;
  }
}

/**
 * Validate cabin class
 * @param cabinClass Cabin class code
 * @returns True if valid cabin class
 */
export function validateCabinClass(cabinClass: string): boolean {
  const validClasses = ['1', '2', '3', '4']; // Economy, Premium Economy, Business, First
  return validClasses.includes(cabinClass);
}
