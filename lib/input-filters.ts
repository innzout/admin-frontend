import type { FormEvent } from "react";

// Props that stop invalid characters as they are typed or pasted. They run on
// the native input event, before react-hook-form's onChange reads the value.
// The zod schemas in lib/validation.ts still check the final value.

const filterTo = (pattern: RegExp, transform: (v: string) => string = (v) => v) => (e: FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const next = transform(el.value.replace(pattern, ""));
  if (next !== el.value) el.value = next;
};

/** Indian mobile: digits, plus a leading +91 and spaces or dashes. */
export const phoneInput = {
  type: "tel",
  inputMode: "tel",
  autoComplete: "tel",
  maxLength: 16,
  placeholder: "98765 43210",
  onInput: filterTo(/[^\d+\s-]/g),
} as const;

/** GSTIN, PAN, IFSC: uppercase letters and digits only. */
export const upperCodeInput = (maxLength: number) =>
  ({
    maxLength,
    autoCapitalize: "characters",
    autoCorrect: "off",
    spellCheck: false,
    className: "uppercase",
    onInput: filterTo(/[^a-zA-Z0-9]/g, (v) => v.toUpperCase()),
  }) as const;

/** Digits only, e.g. a bank account number. */
export const digitsInput = (maxLength: number) =>
  ({
    inputMode: "numeric",
    maxLength,
    onInput: filterTo(/\D/g),
  }) as const;
