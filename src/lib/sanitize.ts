/**
 * Sanitization utilities for user input
 * Prevents XSS and other injection attacks
 */

/**
 * Sanitize HTML by escaping dangerous characters
 */
export function sanitizeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize string for use in URLs
 */
export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize slug (for business names, etc.)
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '') // Allow Persian, English, numbers, spaces, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sanitize email
 */
export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim();
}

/**
 * Sanitize phone number (Persian/English digits)
 */
export function sanitizePhone(input: string): string {
  // Convert Persian digits to English
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const englishDigits = '0123456789';
  
  let result = input;
  for (let i = 0; i < persianDigits.length; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
  }
  
  // Remove everything except digits, +, and spaces
  return result.replace(/[^\d+\s]/g, '').trim();
}

/**
 * Sanitize general text input
 */
export function sanitizeText(input: string, maxLength?: number): string {
  let result = input.trim();
  
  // Remove control characters
  result = result.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length if specified
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }
  
  return result;
}

/**
 * Validate and sanitize price (must be positive number)
 */
export function sanitizePrice(input: string | number): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  if (isNaN(num) || num < 0) {
    return 0;
  }
  return Math.round(num);
}
