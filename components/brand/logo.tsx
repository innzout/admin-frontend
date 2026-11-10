import { cn } from "@/lib/utils";

/** INNZOUT brand mark + wordmark, same assets as innzout.com. */
export function BrandLogo({ className, showText = true, subtitle }: { className?: string; showText?: boolean; subtitle?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/gradient_logo.svg" alt="INNZOUT" className="size-8 shrink-0" />
      {showText && (
        <div className="min-w-0 leading-tight">
          <p className="font-heading text-base font-extrabold tracking-tight text-brand-gradient">INNZOUT</p>
          {subtitle && <p className="truncate text-xs text-sidebar-foreground/50">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
