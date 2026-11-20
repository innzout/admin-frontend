"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { navForRole } from "@/components/layout/nav-items";
import { useMe } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const MAX_QUERY = 40;
const MAX_RESULTS = 6;

/** Topbar box that jumps to any page the signed-in role can open. */
export function PageJump() {
  const router = useRouter();
  const { data: me } = useMe();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const pages = useMemo(() => navForRole(me?.role ?? "").flatMap((s) => s.items), [me?.role]);
  const q = query.trim().toLowerCase();
  const results = q ? pages.filter((p) => p.label.toLowerCase().includes(q)).slice(0, MAX_RESULTS) : [];

  const go = (href: string) => {
    setQuery("");
    setActive(0);
    router.push(href);
  };

  return (
    <div className="relative mx-auto max-w-md min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={query}
        maxLength={MAX_QUERY}
        placeholder="Go to page…"
        aria-label="Go to page"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="page-jump-results"
        className="rounded-full bg-muted/60 pl-9"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
          if (!results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[active].href);
          }
        }}
        onBlur={() => setTimeout(() => setQuery(""), 150)}
      />
      {q && (
        <ul id="page-jump-results" role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover p-1 shadow-md">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No page matches “{query.trim()}”</li>
          ) : (
            results.map((p, i) => (
              <li key={p.href} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(p.href)}
                  className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm", i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60")}
                >
                  <p.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{p.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
