"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { useAddTaskComment, useReviewTask, useSubmitTask, useTaskComments, useUpdateTaskStatus } from "@/hooks/use-tasks";
import { ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/lib/status";
import type { Task, TaskHistoryKind } from "@/lib/types";
import { optionalUrl } from "@/lib/validation";
import { cn } from "@/lib/utils";

/** Same limits as the API. */
const NOTE_MAX = 2000;
const LINK_MAX = 500;
const FEEDBACK_MIN = 3;

const historyLabel: Partial<Record<TaskHistoryKind, { text: string; tone: StatusTone }>> = {
  submitted: { text: "Submitted for review", tone: "info" },
  approved: { text: "Approved", tone: "success" },
  changes_requested: { text: "Changes requested", tone: "warning" },
};

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** True when a lead sent the work back and the member hasn't resubmitted. */
export const changesRequested = (t: Task) =>
  t.status === "in_progress" && !!t.reviewedAt && (!t.submittedAt || t.reviewedAt >= t.submittedAt);

/**
 * One task with its history. "member" is the assignee's view (start, submit
 * for review, withdraw); "reviewer" is a lead's view (approve or request
 * changes). The API enforces the same rules.
 */
export function TaskPanel({ task, mode, onClose }: { task: Task | null; mode: "member" | "reviewer"; onClose: () => void }) {
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        {task && <PanelBody key={task.id + task.status} task={task} mode={mode} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({ task, mode, onClose }: { task: Task; mode: "member" | "reviewer"; onClose: () => void }) {
  const { data: history } = useTaskComments(task.id);
  const add = useAddTaskComment(task.id);
  const [text, setText] = useState("");

  return (
    <>
      <SheetHeader>
        <SheetTitle className="break-words">{task.title}</SheetTitle>
        <SheetDescription>
          {task.projectName}
          {task.assigneeName ? ` · ${task.assigneeName}` : ""} · due {task.dueDate?.slice(0, 10) ?? "—"}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-wrap gap-2 px-4">
        <StatusBadge tone={taskStatusTone[task.status]}>{taskStatusLabel[task.status]}</StatusBadge>
        <StatusBadge tone={taskPriorityTone[task.priority]}>{task.priority}</StatusBadge>
        {changesRequested(task) && <StatusBadge tone="warning">Changes requested</StatusBadge>}
      </div>
      {task.description && <p className="px-4 text-sm break-words whitespace-pre-wrap">{task.description}</p>}
      {task.reviewLink && (
        <a
          href={task.reviewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 inline-flex items-center gap-1.5 truncate text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-4 shrink-0" />
          <span className="truncate">Open submitted work</span>
        </a>
      )}

      {mode === "member" ? <MemberActions task={task} /> : <ReviewerActions task={task} onDone={onClose} />}

      <div className="flex flex-col gap-2 border-t px-4 pt-4">
        <p className="text-sm font-semibold">History & updates</p>
        {history?.length === 0 && <p className="text-sm text-muted-foreground">No updates yet. Post progress or blockers here.</p>}
        {history?.map((c) => {
          const label = historyLabel[c.kind];
          return (
            <div key={c.id} className={cn("rounded-lg px-3 py-2 text-sm", label ? "border" : "bg-muted/50")}>
              {label && <StatusBadge tone={label.tone}>{label.text}</StatusBadge>}
              <p className={cn("break-words whitespace-pre-wrap", label && "mt-1")}>{c.comment}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.authorName ?? "—"} · {timeAgo(c.createdAt)}
              </p>
            </div>
          );
        })}
      </div>
      <form
        className="flex gap-2 px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          add.mutate(text.trim(), {
            onSuccess: () => setText(""),
            onError: (err) => toast.error(errorText(err, "Could not post")),
          });
        }}
      >
        <Input
          aria-label="Post an update"
          placeholder="Post an update…"
          maxLength={NOTE_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={add.isPending || !text.trim()} aria-label="Post update">
          <Send className="size-4" />
        </Button>
      </form>
    </>
  );
}

function MemberActions({ task }: { task: Task }) {
  const status = useUpdateTaskStatus();
  const submit = useSubmitTask();
  const [link, setLink] = useState(task.reviewLink ?? "");
  const [note, setNote] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const move = (to: "in_progress" | "new", done: string) =>
    status.mutate(
      { id: task.id, status: to },
      {
        onSuccess: () => toast.success(done),
        onError: (err) => toast.error(errorText(err, "Could not update the task")),
      },
    );

  const send = () => {
    const parsed = optionalUrl.safeParse(link);
    if (!parsed.success) {
      setLinkError(parsed.error.issues[0]?.message ?? "Enter a valid link");
      return;
    }
    submit.mutate(
      {
        id: task.id,
        link: parsed.data || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => toast.success("Sent for review"),
        onError: (err) => toast.error(errorText(err, "Could not submit")),
      },
    );
  };

  if (task.status === "new") {
    return (
      <div className="px-4">
        <Button className="w-full" disabled={status.isPending} onClick={() => move("in_progress", "Started")}>
          Start
        </Button>
      </div>
    );
  }
  if (task.status === "in_progress") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-3 mx-4">
        <p className="text-sm font-medium">Ready? Submit it for review</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="submit-link">Link to your work (optional)</Label>
          <Input
            id="submit-link"
            type="url"
            inputMode="url"
            placeholder="https://www.figma.com/…"
            maxLength={LINK_MAX}
            value={link}
            aria-invalid={!!linkError}
            onChange={(e) => {
              setLink(e.target.value);
              setLinkError(null);
            }}
          />
          {linkError && <p className="text-sm text-destructive">{linkError}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="submit-note">Note for your lead (optional)</Label>
          <Textarea
            id="submit-note"
            rows={2}
            maxLength={NOTE_MAX}
            placeholder="What changed, what to look at"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button onClick={send} disabled={submit.isPending}>
          <Send className="size-4" />
          {submit.isPending ? "Sending…" : "Submit for review"}
        </Button>
      </div>
    );
  }
  if (task.status === "in_review") {
    return (
      <div className="flex flex-col gap-2 px-4">
        <p className="text-sm text-muted-foreground">Waiting for your lead to review.</p>
        <Button variant="outline" disabled={status.isPending} onClick={() => move("in_progress", "Submission withdrawn")}>
          <RotateCcw className="size-4" />
          Withdraw to keep working
        </Button>
      </div>
    );
  }
  return null;
}

function ReviewerActions({ task, onDone }: { task: Task; onDone: () => void }) {
  const review = useReviewTask();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (task.status !== "in_review") return null;

  const decide = (decision: "approve" | "changes") => {
    const trimmed = note.trim();
    if (decision === "changes" && trimmed.length < FEEDBACK_MIN) {
      setError("Say what needs to change so they can act on it");
      return;
    }
    review.mutate(
      { id: task.id, decision, note: trimmed || undefined },
      {
        onSuccess: () => {
          toast.success(decision === "approve" ? "Approved and marked done" : "Sent back with your feedback");
          onDone();
        },
        onError: (err) => toast.error(errorText(err, "Could not save the review")),
      },
    );
  };

  return (
    <div className="mx-4 flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">
        Review {task.assigneeName ? `${task.assigneeName}'s` : "this"} work
        {task.submittedAt && <span className="font-normal text-muted-foreground"> · submitted {timeAgo(task.submittedAt)}</span>}
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-note">Feedback</Label>
        <Textarea
          id="review-note"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="Required when requesting changes"
          value={note}
          aria-invalid={!!error}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={review.isPending} onClick={() => decide("changes")}>
          <RotateCcw className="size-4" />
          Request changes
        </Button>
        <Button disabled={review.isPending} onClick={() => decide("approve")}>
          <CheckCircle2 className="size-4" />
          Approve
        </Button>
      </div>
    </div>
  );
}
