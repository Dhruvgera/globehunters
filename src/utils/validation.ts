/**
 * Validation Utility Functions
 */

import { Passenger, PassengerFormErrors } from '@/types/booking';
import { CardDetails, BillingAddress, PaymentFormErrors } from '@/types/payment';

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (international format)
 */
export function validatePhone(phone: string): boolean {
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Check if it's 10-15 digits and optionally starts with +
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate passenger name (alphabetic characters, spaces, hyphens, apostrophes)
 */
export function validateName(name: string): boolean {
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(name) && name.trim().length >= 2;
}

/**
 * Calculate age in years from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate age in months from date of birth (for infants)
 */
export function calculateAgeInMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  return months;
}

/**
 * Validate date of birth (must be in the past, valid date)
 */
export function validateDateOfBirth(dateString: string, minAge: number = 0, maxAge: number = 120): boolean {
  const date = new Date(dateString);
  const now = new Date();

  // Check if valid date
  if (isNaN(date.getTime())) {
    return false;
  }

  // Check if in the past
  if (date >= now) {
    return false;
  }

  // Check age constraints
  const age = Math.floor((now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= minAge && age <= maxAge;
}

/**
 * Parse date string in various formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
 */
function parseDateString(dateString: string): Date | null {
  if (!dateString) return null;
  
  // Try DD/MM/YYYY format first (common in UK)
  const ddmmyyyyMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try YYYY-MM-DD format (ISO)
  const isoMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Fallback to native Date parsing
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Validate date of birth for a specific passenger type
 * ADT (Adult): 12+ years old
 * CHD (Child): 2-11 years old
 * INF (Infant): 0-23 months old
 */
export function validateDateOfBirthForType(
  dateString: string, 
  passengerType: 'adult' | 'child' | 'infant'
): { valid: boolean; error?: string } {
  const date = parseDateString(dateString);
  const now = new Date();

  // Check if valid date
  if (!date) {
    return { valid: false, error: 'Please enter a valid date of birth' };
  }

  // Check if in the past
  if (date >= now) {
    return { valid: false, error: 'Date of birth must be in the past' };
  }

  // Calculate age using the parsed date
  const ageInYears = calculateAgeFromDate(date);
  const ageInMonths = calculateAgeInMonthsFromDate(date);

  switch (passengerType) {
    case 'adult':
      // Adults must be 12+ years old
      if (ageInYears < 12) {
        return { valid: false, error: 'Adult passengers must be 12 years or older' };
      }
      break;
    
    case 'child':
      // Children must be 2-11 years old
      if (ageInYears < 2) {
        return { valid: false, error: 'Child passengers must be at least 2 years old' };
      }
      if (ageInYears >= 12) {
        return { valid: false, error: 'Child passengers must be under 12 years old' };
      }
      break;
    
    case 'infant':
      // Infants must be 0-23 months old
      if (ageInMonths >= 24) {
        return { valid: false, error: 'Infant passengers must be under 24 months old' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Calculate age in years from a Date object
 */
function calculateAgeFromDate(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate age in months from a Date object
 */
function calculateAgeInMonthsFromDate(dob: Date): number {
  const now = new Date();
  return (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
}

/**
 * Validate passport number
 */
export function validatePassport(passportNumber: string): boolean {
  // Most passports are 6-9 alphanumeric characters
  const passportRegex = /^[A-Z0-9]{6,9}$/i;
  return passportRegex.test(passportNumber);
}

/**
 * Validate passport expiry (must be at least 6 months in the future)
 */
export function validatePassportExpiry(expiryDate: string, monthsInFuture: number = 6): boolean {
  const expiry = new Date(expiryDate);
  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() + monthsInFuture);

  return !isNaN(expiry.getTime()) && expiry >= minDate;
}

/**
 * Validate credit card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): boolean {
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s\-]/g, '');

  // Check if only digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  // Check length (13-19 digits for most cards)
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate card expiry date
 */
export function validateCardExpiry(month: string, year: string): boolean {
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (isNaN(monthNum) || isNaN(yearNum)) {
    return false;
  }

  if (monthNum < 1 || monthNum > 12) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear() % 100; // Get last 2 digits
  const currentMonth = now.getMonth() + 1;

  // If year is 2 digits, compare with current year's last 2 digits
  const yearToCompare = yearNum < 100 ? yearNum : yearNum % 100;

  if (yearToCompare < currentYear) {
    return false;
  }

  if (yearToCompare === currentYear && monthNum < currentMonth) {
    return false;
  }

  return true;
}

/**
 * Validate CVV
 */
export function validateCVV(cvv: string, cardType?: string): boolean {
  // Amex uses 4 digits, others use 3
  const expectedLength = cardType === 'amex' ? 4 : 3;
  const cvvRegex = new RegExp(`^\\d{${expectedLength}}$`);
  return cvvRegex.test(cvv);
}

/**
 * Validate postal code (flexible for international)
 */
export function validatePostalCode(postalCode: string, country?: string): boolean {
  // Remove spaces
  const cleaned = postalCode.replace(/\s/g, '');

  if (country === 'US') {
    // US ZIP code: 5 digits or 5+4
    return /^\d{5}(-\d{4})?$/.test(postalCode);
  } else if (country === 'UK' || country === 'GB') {
    // UK postcode
    return /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(postalCode);
  } else if (country === 'CA') {
    // Canadian postal code
    return /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(postalCode);
  }

  // Generic validation - 3-10 alphanumeric characters
  return /^[A-Z0-9]{3,10}$/i.test(cleaned);
}

/**
 * Validate complete passenger form
 * @param passenger - Passenger data to validate
 * @param passengerType - Optional passenger type for age validation (adult, child, infant)
 */
export function validatePassenger(
  passenger: Passenger, 
  passengerType?: 'adult' | 'child' | 'infant'
): PassengerFormErrors {
  const errors: PassengerFormErrors = {};

  if (!validateName(passenger.firstName)) {
    errors.firstName = 'Please enter a valid first name';
  }

  if (!validateName(passenger.lastName)) {
    errors.lastName = 'Please enter a valid last name';
  }

  // Use type-specific validation if passenger type is provided
  const type = passengerType || passenger.type || 'adult';
  const dobValidation = validateDateOfBirthForType(passenger.dateOfBirth, type);
  if (!dobValidation.valid) {
    errors.dateOfBirth = dobValidation.error || 'Please enter a valid date of birth';
  }

  if (!validateEmail(passenger.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!validatePhone(passenger.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (passenger.passportNumber && !validatePassport(passenger.passportNumber)) {
    errors.passportNumber = 'Please enter a valid passport number';
  }

  if (passenger.passportExpiry && !validatePassportExpiry(passenger.passportExpiry)) {
    errors.passportExpiry = 'Passport must be valid for at least 6 months';
  }

  return errors;
}

/**
 * Validate payment card details
 */
export function validatePaymentCard(card: CardDetails): PaymentFormErrors {
  const errors: PaymentFormErrors = {};

  if (!validateCardNumber(card.cardNumber)) {
    errors.cardNumber = 'Please enter a valid card number';
  }

  if (!validateName(card.cardholderName)) {
    errors.cardholderName = 'Please enter the cardholder name';
  }

  if (!validateCardExpiry(card.expiryMonth, card.expiryYear)) {
    errors.expiryMonth = 'Invalid expiry date';
    errors.expiryYear = 'Invalid expiry date';
  }

  if (!validateCVV(card.cvv, card.cardType)) {
    errors.cvv = 'Please enter a valid CVV';
  }

  return errors;
}

/**
 * Validate billing address
 */
export function validateBillingAddress(address: BillingAddress): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};

  // Validate name fields
  if (!address.firstName || address.firstName.trim().length < 2) {
    errors.firstName = 'Please enter your first name';
  }

  if (!address.lastName || address.lastName.trim().length < 2) {
    errors.lastName = 'Please enter your last name';
  }

  if (!address.addressLine1 || address.addressLine1.trim().length < 5) {
    errors.addressLine1 = 'Please enter a valid address';
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.city = 'Please enter a valid city';
  }

  if (!address.postalCode || address.postalCode.trim().length < 2) {
    errors.postalCode = 'Please enter a valid postal code';
  }

  if (!address.country || address.country.trim().length < 2) {
    errors.country = 'Please enter a country';
  }

  return errors;
}

/**
 * Check if form has errors
 */
export function hasErrors(errors: unknown): boolean {
  if (errors && typeof errors === 'object') {
    return Object.values(errors as Record<string, unknown>).some(
      (error) => error !== undefined && error !== ''
    );
  }
  return false;
}
