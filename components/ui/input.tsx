import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// Safe defaults for every field in the app; a call site can always override them.
const DEFAULT_TEXT_MAX = 255
const TEXT_TYPES = new Set(["text", "email", "search", "url", "tel", "password"])
const DATE_MIN = "1900-01-01"
const DATE_MAX = "2100-12-31"
// Characters a number box accepts but no amount or count here should contain.
const BLOCKED_NUMBER_KEYS = new Set(["e", "E", "+"])

function Input({ className, type, maxLength, min, max, inputMode, onKeyDown, onWheel, ...props }: React.ComponentProps<"input">) {
  const isText = !type || TEXT_TYPES.has(type)
  const isNumber = type === "number"
  const isDate = type === "date"
  const allowsNegative = isNumber && min !== undefined && Number(min) < 0

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      maxLength={maxLength ?? (isText ? DEFAULT_TEXT_MAX : undefined)}
      min={min ?? (isDate ? DATE_MIN : isNumber ? 0 : undefined)}
      max={max ?? (isDate ? DATE_MAX : undefined)}
      inputMode={inputMode ?? (isNumber ? "decimal" : undefined)}
      onKeyDown={(e) => {
        if (isNumber && (BLOCKED_NUMBER_KEYS.has(e.key) || (e.key === "-" && !allowsNegative))) e.preventDefault()
        onKeyDown?.(e)
      }}
      // A focused number box would otherwise change value when the page is scrolled.
      onWheel={(e) => {
        if (isNumber) e.currentTarget.blur()
        onWheel?.(e)
      }}
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-ellipsis transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
