"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Same limits as the API: a rejection note is 3 to 2000 characters. */
const NOTE_MIN = 3;
const NOTE_MAX = 2000;

/** Shared reject/approve-with-note confirmation used by Leave and On-Duty approvals. */
export function DecisionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  isPending,
  noteRequired = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  isPending: boolean;
  /** Rejections must say why, so the employee can act on it. */
  noteRequired?: boolean;
  onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClose = (next: boolean) => {
    if (!next) {
      setNote("");
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = () => {
    const trimmed = note.trim();
    if (noteRequired && trimmed.length < NOTE_MIN) {
      setError(trimmed ? `Write at least ${NOTE_MIN} characters` : "A reason is required");
      return;
    }
    onConfirm(trimmed || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decision-note">{noteRequired ? "Reason" : "Note (optional)"}</Label>
          <Textarea
            id="decision-note"
            value={note}
            maxLength={NOTE_MAX}
            aria-invalid={!!error}
            placeholder={noteRequired ? "Tell them why, so they can act on it" : undefined}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={submit}
          >
            {isPending ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
