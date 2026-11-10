import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "accent" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  accent: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * Generic status pill. Domains map their own status vocabulary to a `tone`
 * (see e.g. `employeeStatusTone` in lib/status.ts) rather than this
 * component knowing about every domain's specific status strings.
 */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
