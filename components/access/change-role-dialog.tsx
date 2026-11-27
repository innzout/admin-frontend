"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSetLoginRole } from "@/hooks/use-logins";
import { ROLES, roleLabel } from "@/lib/access";
import { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";

/** What a change grants or removes, shown before it is applied. */
export function changeImpact(from: Role, to: Role): string {
  if (to === "admin") return "Admins can do everything, including changing company settings, reading the activity log and changing other people's roles.";
  if (from === "admin") return "They lose company settings, the activity log and role management.";
  const summary = ROLES.find((r) => r.role === to)?.summary ?? "";
  return `${summary} The change applies on their next click; they don't need to sign in again.`;
}

export interface RoleTarget {
  userId: string;
  name: string;
  role: Role;
}

/** Pick a new role for one login and confirm what it changes. Admin only (the API enforces it). */
export function ChangeRoleDialog({ target, onOpenChange }: { target: RoleTarget | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      {/* Keyed so each opening starts from the person's current role. */}
      {target && <ChangeRoleForm key={target.userId} target={target} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ChangeRoleForm({ target, onDone }: { target: RoleTarget; onDone: () => void }) {
  const setRole = useSetLoginRole();
  const [role, setNewRole] = useState<Role>(target.role);
  const changed = role !== target.role;

  const save = () => {
    if (!changed || setRole.isPending) return;
    setRole.mutate(
      { id: target.userId, role },
      {
        onSuccess: () => {
          toast.success(`${target.name} is now ${roleLabel(role)}`);
          onDone();
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not change the role"),
      },
    );
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="break-words">Change role for {target.name}</DialogTitle>
        <DialogDescription>Currently {roleLabel(target.role)}.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="change-role">New role</Label>
        <Select value={role} onValueChange={(v) => v && setNewRole(v as Role)} disabled={setRole.isPending}>
          <SelectTrigger id="change-role" className="w-full">
            <SelectValue>{roleLabel(role)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.role} value={r.role}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {changed && <p className="text-xs text-muted-foreground">{changeImpact(target.role, role)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={setRole.isPending}>
          Cancel
        </Button>
        <Button
          variant={role === "admin" || target.role === "admin" ? "destructive" : "default"}
          onClick={save}
          disabled={!changed || setRole.isPending}
        >
          {setRole.isPending ? "Saving…" : "Change role"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
