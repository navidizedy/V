import { z } from "zod";
import { MAX_BUSINESS_CATEGORIES } from "@/lib/plans";
import {
  validateAddress,
  validateBusinessName,
  validateBusinessPhone,
  validateDescription,
  validateEmail,
  validateExistingPassword,
  validateInstagram,
  validateMapLink,
  validateMenuItemDescription,
  validateMenuItemName,
  validateMenuCategoryName,
  validateMobile,
  validateNewPassword,
  validatePersonName,
  validatePrice,
  validateRating,
  validateReviewComment,
  validateWebsite,
  type FieldResult,
} from "@/lib/validators";

/**
 * Zod adapters around the shared validators in `@/lib/validators`, for code that prefers a
 * schema object. The rules themselves live in one place so the two never disagree.
 */
function field<T>(fn: (input: unknown) => FieldResult<T>) {
  return z.unknown().transform((input, ctx) => {
    const res = fn(input);
    if (res.error) {
      ctx.addIssue({ code: "custom", message: res.error });
      return z.NEVER;
    }
    return res.value as T;
  });
}

export const loginSchema = z.object({
  email: field((v) => validateEmail(v)),
  password: field((v) => validateExistingPassword(v)),
});

export const registerSchema = z.object({
  name: field(validatePersonName),
  email: field((v) => validateEmail(v)),
  password: field((v) => validateNewPassword(v)),
  phone: field((v) => validateMobile(v, true)),
});

export const businessSchema = z.object({
  name: field(validateBusinessName),
  description: field(validateDescription),
  categoryIds: z
    .array(z.string().or(z.number()))
    .min(1, "حداقل یک دسته‌بندی غذایی را انتخاب کنید")
    .max(MAX_BUSINESS_CATEGORIES, `حداکثر ${MAX_BUSINESS_CATEGORIES} دسته‌بندی می‌توانید انتخاب کنید`),
  locationText: field(validateAddress),
  locationLink: field((v) => validateMapLink(v, false)),
  phone: field((v) => validateBusinessPhone(v, false)),
  instagram: field((v) => validateInstagram(v, false)),
  website: field((v) => validateWebsite(v, false)),
});

export const menuItemSchema = z.object({
  name: field(validateMenuItemName),
  description: field(validateMenuItemDescription),
  price: field(validatePrice),
  category: field((v) => (v ? validateMenuCategoryName(v) : { value: "", error: null })),
  isAvailable: z.boolean().default(true),
});

export const reviewSchema = z.object({
  rating: field(validateRating),
  comment: field(validateReviewComment),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
