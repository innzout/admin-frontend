"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TempPasswordDialog, type TempCredentials } from "@/components/employees/temp-password-dialog";
import { useCreateEmployeeLogin, useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import type { Employee } from "@/lib/types";

// The employee list endpoint caps a page at 100; a company this size fits.
const EMPLOYEE_PAGE = 100;

/** Current employees who cannot sign in yet, each with a "Give login" action. */
export function PendingLogins() {
  const { data } = useEmployees({ limit: EMPLOYEE_PAGE });
  const createLogin = useCreateEmployeeLogin();
  const [target, setTarget] = useState<Employee | null>(null);
  const [credentials, setCredentials] = useState<TempCredentials | null>(null);

  const pending = (data?.employees ?? []).filter((e) => !e.hasLogin && e.status !== "exited");
  if (pending.length === 0) return null;

  const confirm = () => {
    if (!target || createLogin.isPending) return;
    const e = target;
    createLogin.mutate(e.id, {
      onSuccess: (res) => setCredentials({ name: e.fullName, username: e.employeeCode.toLowerCase(), password: res.tempPassword }),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create the login"),
      onSettled: () => setTarget(null),
    });
  };

  return (
    <Card className="gap-0 py-0">
      <div className="border-b p-4">
        <h2 className="font-heading font-semibold">Employees without a login</h2>
        <p className="text-xs text-muted-foreground">They can&apos;t sign in until you give them one. Their role can be changed once they have a login.</p>
      </div>
      <ul className="divide-y">
        {pending.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <AvatarInitials name={e.fullName} />
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate text-sm font-medium">{e.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {e.employeeCode} · {e.designation}
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={createLogin.isPending} onClick={() => setTarget(e)}>
              <KeyRound className="size-4" /> Give login
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => !open && !createLogin.isPending && setTarget(null)}
        title={`Give ${target?.fullName ?? ""} a portal login?`}
        description={`Username will be ${target?.employeeCode.toLowerCase() ?? ""}. A one-time password is shown next. They start as ${target?.employmentType === "intern" ? "Intern" : "Employee"}; you can change the role afterwards.`}
        confirmLabel="Create login"
        destructive={false}
        isPending={createLogin.isPending}
        onConfirm={confirm}
      />
      <TempPasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Card>
  );
}
