import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The card shell used by every dashboard panel (charts and lists alike):
 * title + optional subtitle on the left, an optional action (a dropdown, a
 * "View all" link) on the right, and an empty state when there's nothing to show.
 */
export function PanelCard({
  title,
  subtitle,
  action,
  viewAllHref,
  empty,
  className,
  contentClassName,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Shorthand for the common "View all" link action. */
  viewAllHref?: string;
  /** When set, replaces the children with a centred empty-state message. */
  empty?: { icon: LucideIcon; message: string } | false;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}) {
  const headerAction =
    action ??
    (viewAllHref && (
      <Link href={viewAllHref} className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        View all
        <ArrowRight className="size-3" />
      </Link>
    ));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-heading text-base font-semibold">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
        {headerAction && <CardAction>{headerAction}</CardAction>}
      </CardHeader>
      <CardContent className={empty ? "flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center" : contentClassName}>
        {empty ? (
          <>
            <empty.icon className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{empty.message}</p>
          </>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
