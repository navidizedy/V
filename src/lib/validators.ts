/**
 * Shared field validators — the single source of truth for every form in the app.
 *
 * Every validator is a pure function that returns a `FieldResult`:
 *   - `{ value, error: null }`  → the input is valid; `value` is the normalised value to persist
 *   - `{ value: null, error }`  → the input is invalid; `error` is a Persian message for the UI
 *
 * The same functions run in the browser (live feedback) and in the API routes (hard guarantee),
 * so the rules can never drift apart. Nothing here touches the database or React.
 */

import { toEnglishDigits } from "@/lib/phone";
import { IRAN_CITIES } from "@/lib/cities";

export type FieldResult<T> = { value: T; error: null } | { value: null; error: string };

const ok = <T,>(value: T): FieldResult<T> => ({ value, error: null });
const fail = (error: string): FieldResult<never> => ({ value: null, error });

/** Type guard: `true` when the result carries an error (narrows to the error branch). */
export function failed<T>(res: FieldResult<T>): res is { value: null; error: string } {
  return res.error !== null;
}

/* ------------------------------------------------------------------------------------------ */
/* Character classes                                                                          */
/* ------------------------------------------------------------------------------------------ */

// Persian / Arabic letters and combining marks (Arabic block + supplement + presentation forms),
// plus ZWNJ / ZWJ which are needed for correct Persian typography (e.g. "می‌خواهم").
const PERSIAN_LETTER_CLASS = "\\u0621-\\u064A\\u066E-\\u06D5\\u06D6-\\u06ED\\u06EE\\u06EF\\u06FA-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF\\u200C\\u200D";
// Persian punctuation that legitimately appears in names / descriptions.
const PERSIAN_PUNCT_CLASS = "\\u060C\\u061B\\u061F\\u066A\\u066B\\u066C\\u00AB\\u00BB\\u2026";
// Neutral punctuation we allow in longer free-text fields.
const COMMON_PUNCT_CLASS = ".,!?:;()\\-_/'\"%+&*#@~^|=<>\\[\\]{}";
// All digit systems users might type (Persian, Arabic-Indic, ASCII).
const DIGIT_CLASS = "0-9\\u06F0-\\u06F9\\u0660-\\u0669";

const LATIN_LETTER_RE = /[A-Za-z]/;
const ANY_DIGIT_RE = /[0-9\u06F0-\u06F9\u0660-\u0669]/;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function buildRegex(classes: string[], multiline: boolean) {
  const space = multiline ? "\\s" : " ";
  return new RegExp(`^[${classes.join("")}${space}]+$`);
}

const PERSIAN_LETTERS_ONLY_RE = buildRegex([PERSIAN_LETTER_CLASS], false);
const PERSIAN_WITH_DIGITS_RE = buildRegex([PERSIAN_LETTER_CLASS, DIGIT_CLASS, PERSIAN_PUNCT_CLASS, ".\\-_()/&+"], false);
const PERSIAN_FREE_TEXT_RE = buildRegex([PERSIAN_LETTER_CLASS, DIGIT_CLASS, PERSIAN_PUNCT_CLASS, COMMON_PUNCT_CLASS], true);

/** `true` if the string contains at least one Persian/Arabic letter. */
export function hasPersianLetter(input: string): boolean {
  return new RegExp(`[${PERSIAN_LETTER_CLASS}]`).test(input);
}

/** `true` if the string contains any Latin letter (a–z / A–Z). */
export function hasLatinLetter(input: string): boolean {
  return LATIN_LETTER_RE.test(input);
}

/** Collapse whitespace, strip control characters, trim. Keeps newlines when `multiline`. */
export function cleanText(input: unknown, multiline = false): string {
  if (typeof input !== "string") return "";
  let out = input.replace(CONTROL_CHARS_RE, "").replace(/\r\n?/g, "\n");
  out = multiline ? out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : out.replace(/\s+/g, " ");
  return out.trim();
}

/** Keep only ASCII digits (Persian/Arabic digits are converted first). Handy for onChange filters. */
export function digitsOnly(input: string): string {
  return toEnglishDigits(input).replace(/\D/g, "");
}

/** Keep only characters that can appear in a phone number while typing (digits and a leading +). */
export function phoneCharsOnly(input: string): string {
  const converted = toEnglishDigits(input).replace(/[^\d+]/g, "");
  return converted.startsWith("+") ? "+" + converted.slice(1).replace(/\+/g, "") : converted.replace(/\+/g, "");
}

/** Keep only characters that are valid in an Instagram username while typing. */
export function instagramCharsOnly(input: string): string {
  return input.replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
}

/** Keep only characters that are valid in an e-mail address while typing. */
export function emailCharsOnly(input: string): string {
  return input.replace(/\s+/g, "").replace(/[^A-Za-z0-9@._%+\-]/g, "");
}

/* ------------------------------------------------------------------------------------------ */
/* Persian text                                                                               */
/* ------------------------------------------------------------------------------------------ */

type PersianTextOptions = {
  /** Field label used in error messages, e.g. "نام". */
  label: string;
  required?: boolean;
  min?: number;
  max: number;
  /** "letters" = Persian letters + spaces only; "name" = letters + digits + light punctuation; "text" = free text. */
  mode?: "letters" | "name" | "text";
};

/**
 * Generic Persian text rule. Rejects any Latin letter outright (the product is Persian-only),
 * enforces length bounds and — in "letters" mode — also rejects digits.
 */
export function validatePersianText(input: unknown, opts: PersianTextOptions): FieldResult<string> {
  const { label, required = true, min = 1, max, mode = "text" } = opts;
  const value = cleanText(input, mode === "text");

  if (!value) return required ? fail(`${label} الزامی است`) : ok("");
  if (hasLatinLetter(value)) return fail(`${label} باید فقط با حروف فارسی نوشته شود`);
  if (!hasPersianLetter(value)) return fail(`${label} باید شامل حروف فارسی باشد`);

  const re = mode === "letters" ? PERSIAN_LETTERS_ONLY_RE : mode === "name" ? PERSIAN_WITH_DIGITS_RE : PERSIAN_FREE_TEXT_RE;
  if (mode === "letters" && ANY_DIGIT_RE.test(value)) return fail(`${label} نمی‌تواند شامل عدد باشد`);
  if (!re.test(value)) return fail(`${label} شامل کاراکتر غیرمجاز است؛ فقط حروف فارسی مجاز است`);

  const length = Array.from(value).length;
  if (length < min) return fail(`${label} باید حداقل ${toPersianNumber(min)} کاراکتر باشد`);
  if (length > max) return fail(`${label} نمی‌تواند بیشتر از ${toPersianNumber(max)} کاراکتر باشد`);

  return ok(value);
}

export const LIMITS = {
  personName: { min: 3, max: 50 },
  businessName: { min: 2, max: 60 },
  description: { max: 1000 },
  address: { min: 5, max: 300 },
  menuItemName: { min: 2, max: 80 },
  menuItemDescription: { max: 200 },
  menuCategoryName: { min: 2, max: 40 },
  foodCategoryName: { min: 2, max: 40 },
  reviewComment: { min: 3, max: 500 },
  photoCaption: { max: 100 },
  password: { min: 8, max: 72 },
  email: { max: 254 },
} as const;

/** Full name of a person — Persian letters only, no digits. */
export function validatePersonName(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "نام و نام خانوادگی", mode: "letters", ...LIMITS.personName });
}

/** Food truck display name — Persian, digits allowed (e.g. «برگر ۱۱۰»). */
export function validateBusinessName(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "نام فودتراک", mode: "name", ...LIMITS.businessName });
}

/** Long-form business description — optional Persian free text. */
export function validateDescription(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "توضیحات", mode: "text", required: false, ...LIMITS.description });
}

/** Today's street address of the truck. */
export function validateAddress(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "آدرس", mode: "text", ...LIMITS.address });
}

export function validateMenuItemName(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "نام محصول", mode: "name", ...LIMITS.menuItemName });
}

export function validateMenuItemDescription(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "توضیحات محصول", mode: "text", required: false, ...LIMITS.menuItemDescription });
}

export function validateMenuCategoryName(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "نام دسته منو", mode: "name", ...LIMITS.menuCategoryName });
}

/** Global food category (managed by admins) — Persian letters only. */
export function validateFoodCategoryName(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "نام دسته‌بندی", mode: "letters", ...LIMITS.foodCategoryName });
}

// Review comments are mandatory — a rating alone (or a whitespace-only message) is rejected.
export function validateReviewComment(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "متن نظر", mode: "text", required: true, ...LIMITS.reviewComment });
}

export function validatePhotoCaption(input: unknown): FieldResult<string> {
  return validatePersianText(input, { label: "توضیح عکس", mode: "text", required: false, ...LIMITS.photoCaption });
}

/* ------------------------------------------------------------------------------------------ */
/* Contact details                                                                            */
/* ------------------------------------------------------------------------------------------ */

// Practical RFC-5322 subset: ASCII local part, dotted domain with a 2+ letter TLD.
const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

export function validateEmail(input: unknown, required = true): FieldResult<string> {
  const value = cleanText(input).toLowerCase();
  if (!value) return required ? fail("ایمیل الزامی است") : ok("");
  if (/[^\x21-\x7E]/.test(value)) return fail("ایمیل باید فقط شامل حروف انگلیسی، اعداد و علائم مجاز باشد");
  if (value.length > LIMITS.email.max) return fail("ایمیل بیش از حد طولانی است");
  if (value.includes("..")) return fail("فرمت ایمیل نامعتبر است");
  if (!EMAIL_RE.test(value)) return fail("فرمت ایمیل نامعتبر است (مثال: name@example.com)");
  return ok(value);
}

export const MOBILE_ERROR = "شماره موبایل معتبر وارد کنید (مثال: 09123456789)";
export const PHONE_ERROR = "شماره تلفن معتبر وارد کنید (مثال: 09123456789 یا 02112345678)";

/** Normalise any Iranian phone spelling to 11 digits starting with 0, or `null`. */
function normalizeIranNumber(input: string): string | null {
  let digits = toEnglishDigits(input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+98")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("0098")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("98") && digits.length === 12) digits = "0" + digits.slice(2);
  else if (/^[1-9]\d{9}$/.test(digits)) digits = "0" + digits;
  return /^0\d{10}$/.test(digits) ? digits : null;
}

/** Iranian mobile number → canonical `09XXXXXXXXX`. */
export function validateMobile(input: unknown, required = true): FieldResult<string> {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return required ? fail("شماره موبایل الزامی است") : ok("");
  if (/[A-Za-z]/.test(raw)) return fail("شماره موبایل فقط می‌تواند شامل عدد باشد");
  const normalized = normalizeIranNumber(raw);
  if (!normalized || !/^09\d{9}$/.test(normalized)) return fail(MOBILE_ERROR);
  return ok(normalized);
}

/** Business contact number — Iranian mobile *or* landline (0 + 2-digit area code + 8 digits). */
export function validateBusinessPhone(input: unknown, required = false): FieldResult<string> {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return required ? fail("شماره تماس الزامی است") : ok("");
  if (/[A-Za-z]/.test(raw)) return fail("شماره تماس فقط می‌تواند شامل عدد باشد");
  const normalized = normalizeIranNumber(raw);
  if (!normalized) return fail(PHONE_ERROR);
  const isMobile = /^09\d{9}$/.test(normalized);
  const isLandline = /^0[1-8]\d{9}$/.test(normalized);
  if (!isMobile && !isLandline) return fail(PHONE_ERROR);
  return ok(normalized);
}

const INSTAGRAM_RE = /^(?!.*\.\.)(?!.*\.$)(?!^\.)[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?$/;

/** Instagram handle. Accepts "@user", "instagram.com/user" or plain "user" → stores "user". */
export function validateInstagram(input: unknown, required = false): FieldResult<string> {
  let value = cleanText(input);
  if (!value) return required ? fail("آیدی اینستاگرام الزامی است") : ok("");
  value = value
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "");
  if (hasPersianLetter(value)) return fail("آیدی اینستاگرام باید با حروف انگلیسی نوشته شود");
  if (!INSTAGRAM_RE.test(value) || value.length > 30) {
    return fail("آیدی اینستاگرام نامعتبر است (فقط حروف انگلیسی، عدد، نقطه و زیرخط)");
  }
  return ok(value.toLowerCase());
}

/** Generic http(s) URL. Adds the scheme when the user typed a bare domain. */
export function validateWebsite(input: unknown, required = false): FieldResult<string> {
  const raw = cleanText(input);
  if (!raw) return required ? fail("آدرس وب‌سایت الزامی است") : ok("");
  if (/\s/.test(raw) || hasPersianLetter(raw)) return fail("آدرس وب‌سایت نامعتبر است");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!["http:", "https:"].includes(url.protocol)) return fail("آدرس وب‌سایت باید با http یا https شروع شود");
    if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(url.hostname)) return fail("آدرس وب‌سایت نامعتبر است");
    if (url.href.length > 255) return fail("آدرس وب‌سایت بیش از حد طولانی است");
    return ok(url.href);
  } catch {
    return fail("آدرس وب‌سایت نامعتبر است (مثال: https://example.com)");
  }
}

const MAP_HOSTS = [
  /(^|\.)google\.[a-z.]+$/i, // google.com/maps, maps.google.com, google.co.uk …
  /^goo\.gl$/i,
  /^maps\.app\.goo\.gl$/i,
  /(^|\.)neshan\.org$/i,
  /(^|\.)balad\.ir$/i,
  /(^|\.)openstreetmap\.org$/i,
  /(^|\.)waze\.com$/i,
];

/** Link to the truck's location on a map service (Google Maps, Neshan, Balad, …). */
export function validateMapLink(input: unknown, required = false): FieldResult<string> {
  const raw = cleanText(input);
  if (!raw) return required ? fail("لینک نقشه الزامی است") : ok("");
  if (/\s/.test(raw) || hasPersianLetter(raw)) return fail("لینک نقشه نامعتبر است");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return fail("لینک نقشه نامعتبر است؛ لینک را مستقیماً از گوگل‌مپ کپی کنید");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return fail("لینک نقشه باید با https شروع شود");
  const host = url.hostname.replace(/^www\./, "");
  const isMapHost = MAP_HOSTS.some((re) => re.test(host));
  const isGoogleMapsPath = /(^|\.)google\.[a-z.]+$/i.test(host) ? /^\/maps|^\/search|^\/url|^\/local/i.test(url.pathname) || host.startsWith("maps.") : true;
  if (!isMapHost || !isGoogleMapsPath) {
    return fail("لینک باید از گوگل‌مپ، نشان یا بلد باشد (مثال: https://maps.app.goo.gl/…)");
  }
  if (url.href.length > 1000) return fail("لینک نقشه بیش از حد طولانی است");
  return ok(url.href);
}

/* ------------------------------------------------------------------------------------------ */
/* Credentials                                                                                */
/* ------------------------------------------------------------------------------------------ */

/**
 * Password policy for *new* passwords (sign-up, change password, admin creation):
 * 8–72 chars (bcrypt limit), at least one letter and one digit, no whitespace.
 */
export function validateNewPassword(input: unknown, required = true, label = "رمز عبور"): FieldResult<string> {
  const value = typeof input === "string" ? input : "";
  if (!value) return required ? fail(`${label} الزامی است`) : ok("");
  if (/\s/.test(value)) return fail(`${label} نمی‌تواند شامل فاصله باشد`);
  if (hasPersianLetter(value)) return fail(`${label} باید با حروف انگلیسی نوشته شود`);
  if (value.length < LIMITS.password.min) return fail(`${label} باید حداقل ${toPersianNumber(LIMITS.password.min)} کاراکتر باشد`);
  if (value.length > LIMITS.password.max) return fail(`${label} نمی‌تواند بیشتر از ${toPersianNumber(LIMITS.password.max)} کاراکتر باشد`);
  if (!/[A-Za-z]/.test(value)) return fail(`${label} باید حداقل یک حرف انگلیسی داشته باشد`);
  if (!/\d/.test(value)) return fail(`${label} باید حداقل یک عدد داشته باشد`);
  return ok(value);
}

/** For login / confirmation prompts we only require the field to be present. */
export function validateExistingPassword(input: unknown, label = "رمز عبور"): FieldResult<string> {
  const value = typeof input === "string" ? input : "";
  if (!value) return fail(`${label} الزامی است`);
  if (value.length > LIMITS.password.max) return fail(`${label} نامعتبر است`);
  return ok(value);
}

/* ------------------------------------------------------------------------------------------ */
/* Numbers, times, misc                                                                       */
/* ------------------------------------------------------------------------------------------ */

export const PRICE_LIMITS = { min: 1000, max: 999_999_999 } as const;

/** Menu price in Toman — positive whole number (Persian digits accepted, separators stripped). */
export function validatePrice(input: unknown): FieldResult<number> {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return fail("قیمت نامعتبر است");
    return validatePrice(String(Math.trunc(input)));
  }
  const raw = typeof input === "string" ? toEnglishDigits(input).replace(/[,\s\u066C٬]/g, "") : "";
  if (!raw) return fail("قیمت الزامی است");
  if (!/^\d+$/.test(raw)) return fail("قیمت فقط می‌تواند عدد باشد");
  const num = Number(raw);
  if (num < PRICE_LIMITS.min) return fail(`قیمت باید حداقل ${toPersianNumber(PRICE_LIMITS.min)} تومان باشد`);
  if (num > PRICE_LIMITS.max) return fail("قیمت بیش از حد مجاز است");
  return ok(num);
}

/** Star rating 1–5 (integer). */
export function validateRating(input: unknown): FieldResult<number> {
  const num = typeof input === "string" ? Number(toEnglishDigits(input)) : input;
  if (typeof num !== "number" || !Number.isInteger(num) || num < 1 || num > 5) return fail("امتیاز باید بین ۱ تا ۵ باشد");
  return ok(num);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" 24-hour clock. */
export function validateTime(input: unknown, label = "ساعت"): FieldResult<string> {
  const value = typeof input === "string" ? toEnglishDigits(input).trim() : "";
  if (!value) return fail(`${label} الزامی است`);
  if (!TIME_RE.test(value)) return fail(`${label} باید در قالب HH:MM باشد`);
  return ok(value);
}

export const WEEK_DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export type HoursInput = { id?: unknown; day: unknown; openTime?: unknown; closeTime?: unknown; isClosed?: unknown };
export type HoursValue = { id?: number; day: WeekDay; openTime: string | null; closeTime: string | null; isClosed: boolean };

/** Weekly schedule — each open day needs a valid, non-identical open/close pair. */
export function validateHours(input: unknown): FieldResult<HoursValue[]> {
  if (!Array.isArray(input)) return fail("ساعات کاری نامعتبر است");
  const out: HoursValue[] = [];
  const seen = new Set<string>();
  for (const raw of input as HoursInput[]) {
    const day = typeof raw?.day === "string" ? (raw.day as WeekDay) : null;
    if (!day || !WEEK_DAYS.includes(day)) return fail("روز هفته نامعتبر است");
    if (seen.has(day)) return fail("هر روز هفته فقط یک‌بار می‌تواند ثبت شود");
    seen.add(day);
    const isClosed = Boolean(raw.isClosed);
    const id = Number.isInteger(Number(raw.id)) && Number(raw.id) > 0 ? Number(raw.id) : undefined;
    if (isClosed) {
      out.push({ id, day, openTime: null, closeTime: null, isClosed: true });
      continue;
    }
    const open = validateTime(raw.openTime, `ساعت شروع ${dayLabel(day)}`);
    if (open.error) return fail(open.error);
    const close = validateTime(raw.closeTime, `ساعت پایان ${dayLabel(day)}`);
    if (close.error) return fail(close.error);
    if (open.value === close.value) return fail(`ساعت شروع و پایان ${dayLabel(day)} نمی‌تواند یکسان باشد`);
    out.push({ id, day, openTime: open.value, closeTime: close.value, isClosed: false });
  }
  return ok(out);
}

function dayLabel(day: WeekDay) {
  const map: Record<WeekDay, string> = {
    saturday: "شنبه",
    sunday: "یکشنبه",
    monday: "دوشنبه",
    tuesday: "سه‌شنبه",
    wednesday: "چهارشنبه",
    thursday: "پنجشنبه",
    friday: "جمعه",
  };
  return map[day];
}

/** `#RRGGBB` hex colour (also accepts `#RGB`, expanded). */
export function validateHexColor(input: unknown, required = true): FieldResult<string> {
  const value = cleanText(input);
  if (!value) return required ? fail("رنگ الزامی است") : ok("");
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value);
  if (!m) return fail("رنگ باید در قالب هگز باشد (مثال: #F97316)");
  const hex = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return ok(`#${hex.toUpperCase()}`);
}

/** One of a fixed set of allowed keys (e.g. category icons). */
export function validateEnum<T extends string>(input: unknown, allowed: readonly T[], label: string): FieldResult<T> {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return fail(`${label} الزامی است`);
  if (!allowed.includes(value as T)) return fail(`${label} نامعتبر است`);
  return ok(value as T);
}

export function validateCity(input: unknown): FieldResult<string> {
  return validateEnum(input, IRAN_CITIES, "شهر");
}

/** List of positive integer IDs with size bounds (e.g. food categories of a business). */
export function validateIdList(input: unknown, opts: { min: number; max: number; label: string }): FieldResult<number[]> {
  if (!Array.isArray(input)) return fail(`${opts.label} نامعتبر است`);
  const ids = Array.from(
    new Set(input.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))
  );
  if (ids.length < opts.min) return fail(opts.min === 1 ? `حداقل یک ${opts.label} را انتخاب کنید` : `حداقل ${toPersianNumber(opts.min)} ${opts.label} انتخاب کنید`);
  if (ids.length > opts.max) return fail(`حداکثر ${toPersianNumber(opts.max)} ${opts.label} می‌توانید انتخاب کنید`);
  return ok(ids);
}

/** Positive integer ID (route params, foreign keys in bodies). */
export function validateId(input: unknown, label = "شناسه"): FieldResult<number> {
  const n = typeof input === "string" ? Number(toEnglishDigits(input)) : input;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) return fail(`${label} نامعتبر است`);
  return ok(n);
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * Base64 data-URL image (what <ImageUpload> produces). Accepts `""`/`null` when `required` is
 * false. Proxied `/api/images/...` URLs are passed through untouched (they mean "unchanged").
 */
export function validateImageData(input: unknown, opts: { required?: boolean; label?: string } = {}): FieldResult<string | null> {
  const { required = false, label = "تصویر" } = opts;
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return required ? fail(`${label} الزامی است`) : ok(null);
  if (value.startsWith("/api/images/")) return ok(value);
  if (!/^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(value)) return fail(`${label} نامعتبر است؛ فقط فایل تصویری مجاز است`);
  if (value.length > MAX_IMAGE_BYTES) return fail(`حجم ${label} بیش از حد مجاز است`);
  return ok(value);
}

/* ------------------------------------------------------------------------------------------ */
/* Form helpers                                                                               */
/* ------------------------------------------------------------------------------------------ */

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/**
 * Run a map of validators at once.
 *   const { values, errors, valid } = runValidators({ name: validatePersonName(name), email: validateEmail(email) });
 */
export function runValidators<T extends Record<string, FieldResult<unknown>>>(results: T) {
  const errors: FieldErrors<Extract<keyof T, string>> = {};
  const values = {} as { [K in keyof T]: T[K] extends FieldResult<infer V> ? V : never };
  let valid = true;
  for (const key of Object.keys(results) as Extract<keyof T, string>[]) {
    const res = results[key];
    if (res.error) {
      errors[key] = res.error;
      valid = false;
    } else {
      (values as Record<string, unknown>)[key] = res.value;
    }
  }
  return { values, errors, valid, firstError: Object.values(errors)[0] as string | undefined };
}

export function toPersianNumber(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
