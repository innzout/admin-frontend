"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { useLogins, useSetLoginRole } from "@/hooks/use-logins";
import { ROLES, roleLabel } from "@/lib/access";
import { changeImpact } from "./change-role-dialog";
import { ApiError } from "@/lib/api";
import type { Login, Role } from "@/lib/types";

const MAX_SEARCH = 60;

function formatLastLogin(iso?: string): string {
  if (!iso) return "Never signed in";
  return `Last sign-in ${new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function LoginRoles({ myUserId }: { myUserId: string }) {
  const { data: logins, isLoading, isError, refetch, isFetching } = useLogins();
  const setRole = useSetLoginRole();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<{ login: Login; role: Role } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!logins || !q) return logins ?? [];
    return logins.filter((l) => [l.name, l.username, l.employeeCode ?? "", l.designation ?? ""].some((v) => v.toLowerCase().includes(q)));
  }, [logins, query]);

  const counts = useMemo(() => {
    const c: Partial<Record<Role, number>> = {};
    for (const l of logins ?? []) if (l.isActive) c[l.role] = (c[l.role] ?? 0) + 1;
    return c;
  }, [logins]);

  const applyChange = () => {
    if (!pending || setRole.isPending) return;
    const { login, role } = pending;
    setRole.mutate(
      { id: login.id, role },
      {
        onSuccess: () => toast.success(`${login.name} is now ${roleLabel(role)}`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not change the role"),
        onSettled: () => setPending(null),
      },
    );
  };

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading font-semibold">Logins</h2>
          <p className="text-xs text-muted-foreground">
            {ROLES.map((r) => `${counts[r.role] ?? 0} ${r.label}`).join(" · ")}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={MAX_SEARCH}
            placeholder="Search name, code or username"
            aria-label="Search logins"
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load logins.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCog} title={query ? "No matching logins" : "No logins yet"} hint={query ? "Try another search." : "Give an employee a login below or from their profile."} />
      ) : (
        <ul className="divide-y">
          {filtered.map((l) => {
            const isMe = l.id === myUserId;
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <AvatarInitials name={l.name} />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-medium">
                    {l.name} {isMe && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[l.employeeCode ?? l.username, l.designation, formatLastLogin(l.lastLoginAt)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {!l.isActive && <StatusBadge tone="neutral">Deactivated</StatusBadge>}
                <Select
                  value={l.role}
                  disabled={isMe || !l.isActive || setRole.isPending}
                  onValueChange={(v) => v && v !== l.role && setPending({ login: l, role: v as Role })}
                >
                  <SelectTrigger className="w-full sm:w-36" aria-label={`Role for ${l.name}`} title={isMe ? "You can't change your own role" : undefined}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.role} value={r.role}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && !setRole.isPending && setPending(null)}
        title={pending ? `Make ${pending.login.name} ${roleLabel(pending.role)}?` : ""}
        description={pending ? `Currently ${roleLabel(pending.login.role)}. ${changeImpact(pending.login.role, pending.role)}` : ""}
        confirmLabel="Change role"
        destructive={pending?.role === "admin" || pending?.login.role === "admin"}
        isPending={setRole.isPending}
        onConfirm={applyChange}
      />
    </Card>
  );
}
