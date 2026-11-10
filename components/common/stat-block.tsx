import { cn } from "@/lib/utils";

export type BlockTone = "green" | "blue" | "purple" | "orange" | "yellow" | "red";

const toneClasses: Record<BlockTone, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  purple: "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const barClasses: Record<BlockTone, string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-violet-500",
  orange: "bg-orange-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

/**
 * Solid pastel stat card used for pipeline-stage counts, leave balances, and
 * summary tiles (Leads, Leave Management, Recruitment, Employees headers) —
 * distinct from KpiCard, which is a white card with an icon badge.
 */
export function StatBlock({
  tone,
  value,
  label,
  progress,
  className,
}: {
  tone: BlockTone;
  value: React.ReactNode;
  label: string;
  /** 0-100 — renders a thin progress bar under the label (leave balances). */
  progress?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl p-4", toneClasses[tone], className)}>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className={cn("h-full rounded-full", barClasses[tone])} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
