import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface KpiTrend {
  direction: "up" | "down" | "neutral";
  text: string;
}

export interface KpiCardProps {
  icon: LucideIcon;
  /** Tailwind classes for the icon tile's background + text color, e.g. "bg-green-100 text-green-600". */
  iconClassName: string;
  label: string;
  /** Pass undefined to render a loading skeleton in place of the value. */
  value: React.ReactNode | undefined;
  trend?: KpiTrend;
  /** Makes the whole card a link to the page behind the number. */
  href?: string;
}

const trendClasses: Record<KpiTrend["direction"], string> = {
  up: "text-green-600 dark:text-green-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
};

export function KpiCard({ icon: Icon, iconClassName, label, value, trend, href }: KpiCardProps) {
  const body = (
    <Card className={cn("flex-col items-start gap-2.5 px-3.5 py-3.5 sm:flex-row sm:items-center sm:gap-3.5 sm:px-4 sm:py-4", href && "transition-colors hover:border-primary/40 hover:bg-accent/40")}>
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10", iconClassName)}>
        <Icon className="size-4.5 sm:size-5" />
      </div>
      <div className="w-full min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 font-heading text-xl leading-tight font-bold tabular-nums">{value ?? <Skeleton className="h-6 w-16" />}</div>
        {trend?.text && (
          <p className={cn("mt-0.5 flex items-center gap-1 truncate text-xs", trendClasses[trend.direction])}>
            {trend.direction === "up" && <ArrowUpRight className="size-3.5 shrink-0" />}
            {trend.direction === "down" && <ArrowDownRight className="size-3.5 shrink-0" />}
            <span className="truncate">{trend.text}</span>
          </p>
        )}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
