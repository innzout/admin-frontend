import * as React from "react";

import { cn } from "@/lib/utils";

/** Matches LIMITS.text in lib/validation.ts; a call site can pass a smaller one. */
const DEFAULT_TEXTAREA_MAX = 5000;

function Textarea({ className, maxLength, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      maxLength={maxLength ?? DEFAULT_TEXTAREA_MAX}
      className={cn(
        "max-h-60 min-h-16 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base break-words transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
