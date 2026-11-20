"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavSection } from "./nav-items";

export function NavSectionGroup({
  section,
  defaultOpen,
  badges,
}: {
  section: NavSection;
  defaultOpen: boolean;
  badges: Record<string, number | undefined>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase hover:text-sidebar-foreground/80"
      >
        {section.label}
        {section.items.length > 0 && (
          <ChevronDown className={cn("size-3.5 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")} />
        )}
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5 pb-1">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              const badge = badges[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    active && "bg-primary/15 font-medium text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  {!!badge && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                        active ? "bg-primary/20 text-primary" : "bg-sidebar-accent text-sidebar-foreground/60",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
