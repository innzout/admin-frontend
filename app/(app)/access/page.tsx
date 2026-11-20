"use client";

import { Check, Minus, ShieldAlert, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { navForRole } from "@/components/layout/nav-items";
import { useMe } from "@/hooks/use-auth";
import { ACTIONS, ROLES, type Access } from "@/lib/access";
import { LoginRoles } from "@/components/access/login-roles";
import { PendingLogins } from "@/components/access/pending-logins";

const CELL: Record<Access, { icon: typeof Check; label: string; className: string }> = {
  yes: { icon: Check, label: "Allowed", className: "text-green-600 dark:text-green-400" },
  own: { icon: User, label: "Only their own, or people who report to them", className: "text-amber-600 dark:text-amber-400" },
  no: { icon: Minus, label: "Not allowed", className: "text-muted-foreground/50" },
};

export default function AccessPage() {
  const { data: me } = useMe();
  if (!me) return null;
  if (me.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-24 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="font-medium">Admins only</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Roles & Access" subtitle="Change who is an Admin, HR or Manager. New logins start as Employee, or Intern when the employment type is Intern." />

      <LoginRoles myUserId={me.id} />
      <PendingLogins />

      <h2 className="font-heading pt-2 font-semibold">What each role can do</h2>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ROLES.map((r) => {
          const pages = navForRole(r.role).flatMap((s) => s.items);
          return (
            <Card key={r.role} className="gap-2 px-4 py-4">
              <p className="font-heading font-semibold">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.summary}</p>
              <p className="text-xs">
                <b className="tabular-nums">{pages.length}</b> <span className="text-muted-foreground">pages:</span> {pages.map((p) => p.label).join(", ")}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="max-w-full overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-48 bg-card sm:min-w-64">Action</TableHead>
              {ROLES.map((r) => (
                <TableHead key={r.role} className="text-center">
                  {r.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ACTIONS.map((a) => (
              <TableRow key={a.action}>
                <TableCell className="sticky left-0 z-10 bg-card text-sm whitespace-normal">{a.action}</TableCell>
                {ROLES.map((r) => {
                  const c = CELL[a.access[r.role]];
                  return (
                    <TableCell key={r.role} className="text-center">
                      <c.icon className={`mx-auto size-4 ${c.className}`} aria-label={c.label} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.keys(CELL) as Access[]).map((k) => {
          const c = CELL[k];
          return (
            <span key={k} className="flex items-center gap-1.5">
              <c.icon className={`size-3.5 ${c.className}`} /> {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
