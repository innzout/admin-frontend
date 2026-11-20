import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one "nothing here yet" block: what is missing, why it matters and,
 * where the viewer may create one, the button to do it.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-4 py-12 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-medium">{title}</p>
        {hint && <p className="text-sm text-pretty text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
