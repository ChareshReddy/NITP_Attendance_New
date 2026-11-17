/**
 * Application-wide Validation Helpers
 * Provides standardized validation rules for HR, Employee, TL and Auth forms.
 */

// Email regex matching standard format: user@domain.tld
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Indian PAN Number format: 5 letters, 4 digits, 1 letter (case-insensitive)
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;

// Indian IFSC Code format: 4 letters, 0, 6 alphanumeric (case-insensitive)
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

// Indian / International phone number: 10 to 15 digits, allowing optional +91, spaces, hyphens
export const PHONE_REGEX = /^(\+?\d{1,3}[- ]?)?[6-9]\d{9}$|^\+?[0-9\s\-]{10,15}$/;

// Universal Account Number (UAN): 12 digits
export const UAN_REGEX = /^\d{12}$/;

// Bank Account Number: 9 to 18 digits
export const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

/**
 * Validates email string format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || !email.trim()) return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates mobile / contact phone number
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone || !phone.trim()) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  return PHONE_REGEX.test(phone.trim()) || (/^\d{10}$/.test(cleaned));
}

/**
 * Validates Indian PAN number
 */
export function isValidPAN(pan: string | null | undefined): boolean {
  if (!pan || !pan.trim()) return false;
  return PAN_REGEX.test(pan.trim());
}

/**
 * Validates Indian IFSC code
 */
export function isValidIFSC(ifsc: string | null | undefined): boolean {
  if (!ifsc || !ifsc.trim()) return false;
  return IFSC_REGEX.test(ifsc.trim());
}

/**
 * Validates EPFO UAN number (12 digits)
 */
export function isValidUAN(uan: string | null | undefined): boolean {
  if (!uan || !uan.trim()) return false;
  return UAN_REGEX.test(uan.trim());
}

/**
 * Validates bank account number (9-18 digits)
 */
export function isValidAccountNumber(accountNumber: string | null | undefined): boolean {
  if (!accountNumber || !accountNumber.trim()) return false;
  return ACCOUNT_NUMBER_REGEX.test(accountNumber.trim());
}

/**
 * Validates password length (at least minLength characters)
 */
export function isValidPassword(password: string | null | undefined, minLength = 6): boolean {
  if (!password) return false;
  return password.length >= minLength;
}

/**
 * Validates non-empty string with optional minimum character length
 */
export function isValidText(text: string | null | undefined, minLength = 1): boolean {
  if (!text) return false;
  return text.trim().length >= minLength;
}

/**
 * Validates standard date string format (YYYY-MM-DD)
 */
export function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Checks if start date is on or before end date
 */
export function isDateOrderValid(startDate: string, endDate: string): boolean {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  return new Date(startDate).getTime() <= new Date(endDate).getTime();
}

/**
 * Checks if date is not in future
 */
export function isNotFutureDate(dateStr: string): boolean {
  if (!isValidDate(dateStr)) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() <= today.getTime();
}
