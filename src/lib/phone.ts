/**
 * Iranian mobile number helpers (shared by the sign-up form and the register API).
 *
 * Accepts Persian/Arabic-Indic digits and common prefixes (+98, 0098, 98, 0) and
 * normalises everything to the canonical `09XXXXXXXXX` form.
 */

export const PHONE_ERROR = "شماره موبایل معتبر وارد کنید (مثال: 09123456789)";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p !== -1) return String(p);
    const a = ARABIC_DIGITS.indexOf(ch);
    return a !== -1 ? String(a) : ch;
  });
}

/** Returns the normalised `09XXXXXXXXX` number, or `null` if it's not a valid Iranian mobile. */
export function normalizeIranMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = toEnglishDigits(input).replace(/[^\d+]/g, "");

  if (digits.startsWith("+98")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("0098")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("98") && digits.length === 12) digits = "0" + digits.slice(2);
  else if (digits.startsWith("9") && digits.length === 10) digits = "0" + digits;

  return /^09\d{9}$/.test(digits) ? digits : null;
}

export function isValidIranMobile(input: string | null | undefined): boolean {
  return normalizeIranMobile(input) !== null;
}
