import { cloneElement, isValidElement, useId, type ReactElement } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  /** Message from react-hook-form's `errors.<field>?.message`. */
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  /** A single input/select/textarea; it receives id, aria-invalid and aria-describedby. */
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}

/** Label + control + error/hint, with the a11y wiring every form field needs. */
export function FormField({ label, error, required, hint, className, children }: FormFieldProps) {
  const autoId = useId();
  const id = children.props.id ?? autoId;
  const messageId = `${id}-message`;
  const message = error ?? hint;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })
    : children;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>
      {control}
      {message && (
        <p id={messageId} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")} role={error ? "alert" : undefined}>
          {message}
        </p>
      )}
    </div>
  );
}
