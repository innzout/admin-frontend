import { z } from "zod";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

// Field rules shared by every form. They mirror backend/pkg/validation, so a
// value the browser accepts is one the API accepts too. The server still
// validates everything — these only give faster, per-field feedback.

export const LIMITS = {
  name: 150,
  short: 200,
  text: 5000,
  money: 10_000_000_000,
} as const;

const PHONE_RE = /^(\+91[\s-]?|0)?[6-9]\d{9}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const trimmed = () => z.string().trim();

/** Required free text, e.g. a person's or company's name. */
export const requiredText = (label: string, max: number = LIMITS.name, min = 2) =>
  trimmed()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

/** Optional free text; "" is allowed and means "not set". */
export const optionalText = (max: number = LIMITS.short) => trimmed().max(max, `Must be at most ${max} characters`);

export const requiredEmail = trimmed().min(1, "Email is required").email("Enter a valid email address").max(254);
export const optionalEmail = trimmed().max(254).refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address");

/** Indian mobile number; spaces and dashes are stripped before checking. */
export const optionalPhone = trimmed()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || PHONE_RE.test(v), "Enter a valid 10-digit mobile number");
export const requiredPhone = optionalPhone.refine((v) => v !== "", "Phone number is required");

export const optionalGstin = trimmed()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === "" || GSTIN_RE.test(v), "Enter a valid 15-character GSTIN");
export const optionalPan = trimmed()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === "" || PAN_RE.test(v), "Enter a valid PAN (e.g. ABCDE1234F)");
export const optionalIfsc = trimmed()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === "" || IFSC_RE.test(v), "Enter a valid IFSC code");

export const optionalUrl = trimmed().refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), "Enter a full URL starting with https://");

/** Select whose value must be chosen. */
export const requiredSelect = (label: string) => z.string().min(1, `Select ${label}`);

/** YYYY-MM-DD from <input type="date">. */
export const requiredDate = (label: string) => z.string().min(1, `${label} is required`).regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
export const optionalDate = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date");

/**
 * A number input's value. react-hook-form's `valueAsNumber` gives NaN when the
 * box is empty; accepting NaN at the type level keeps the "required" message a
 * normal (non-aborting) issue, so the form's cross-field checks still run and
 * every error shows on the first submit.
 */
const numberInput = (label: string) =>
  z
    .number({ error: `${label} is required` })
    .or(z.nan())
    .refine((n) => !Number.isNaN(n), `${label} is required`);

/** Money from a number input. */
export const amount = (label: string, { allowZero = false } = {}) =>
  numberInput(label)
    .refine((n) => (allowZero ? n >= 0 : n > 0), allowZero ? `${label} can't be negative` : `${label} must be more than 0`)
    .refine((n) => n <= LIMITS.money, `${label} is too large`)
    .refine((n) => Math.round(n * 100) === n * 100 || Math.abs(Math.round(n * 100) - n * 100) < 1e-6, "Use at most 2 decimal places");

export const percent = (label: string) =>
  numberInput(label)
    .refine((n) => n >= 0, `${label} can't be negative`)
    .refine((n) => n <= 100, `${label} can't be more than 100`);

/** Adds an "end must not be before start" check to an object schema. */
export function endNotBeforeStart<T extends Record<string, unknown>>(start: keyof T & string, end: keyof T & string, message: string) {
  return (v: T, ctx: z.RefinementCtx) => {
    const s = v[start] as string | undefined;
    const e = v[end] as string | undefined;
    if (s && e && e < s) ctx.addIssue({ code: "custom", message, path: [end] });
  };
}

/**
 * Shows a failed mutation to the user: per-field server errors go under their
 * inputs (when the form has that field), anything else becomes a toast.
 */
export function showApiError<T extends FieldValues>(err: unknown, fallback: string, setError?: UseFormSetError<T>) {
  if (err instanceof ApiError && err.fields && setError) {
    for (const [field, message] of Object.entries(err.fields)) {
      setError(field as Path<T>, { type: "server", message });
    }
    toast.error(err.message);
    return;
  }
  toast.error(err instanceof ApiError ? err.message : fallback);
}
