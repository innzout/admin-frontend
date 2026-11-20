"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface TempCredentials {
  name: string;
  username: string;
  password: string;
}

/**
 * Shows a one-time temporary password until the admin closes it. The server
 * never returns it again, and the person must change it at first sign-in.
 */
export function TempPasswordDialog({ credentials, onClose }: { credentials: TempCredentials | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={!!credentials} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login details for {credentials?.name}</DialogTitle>
          <DialogDescription>Share these privately. The password is shown only once, and they must set their own when they first sign in.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-mono break-all">{credentials?.username}</dd>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="font-mono break-all">{credentials?.password}</dd>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
