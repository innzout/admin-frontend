"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Flag, Plus, Rocket, Trash2, Users, Video, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Field, NativeSelect } from "@/components/company/native-select";
import { useDeleteMilestone, useSaveMilestone, useTimeline } from "@/hooks/use-company";
import { useProjects } from "@/hooks/use-projects";
import { readSession } from "@/lib/session";
import { isStaffRole } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MilestoneInput, TimelineEvent } from "@/lib/company-types";
import { useConfirm } from "@/components/common/use-confirm";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addMonths = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return iso(d);
};

const sourceLabel: Record<TimelineEvent["source"], string> = {
  milestone: "Milestone",
  project_start: "Project start",
  project_deadline: "Project deadline",
  task: "Task due",
  lead_follow_up: "Lead follow-up",
};
const statusTone: Record<TimelineEvent["status"], StatusTone> = { planned: "info", done: "success", missed: "danger" };
const kindIcon = { milestone: Flag, launch: Rocket, deadline: CalendarDays, meeting: Video, hiring: Users, other: Flag };

export default function TimelinePage() {
  const staff = isStaffRole(readSession().role);
  const [from, setFrom] = useState(addMonths(-1));
  const [to, setTo] = useState(addMonths(3));
  const [projectId, setProjectId] = useState("");
  const [hideTasks, setHideTasks] = useState(false);
  const { data: events, isLoading } = useTimeline({ from, to, projectId: projectId || undefined });
  const { data: projects } = useProjects({ limit: 100 });
  const save = useSaveMilestone();
  const del = useDeleteMilestone();
  const { confirm, confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MilestoneInput>({});

  const grouped = useMemo(() => {
    const m = new Map<string, TimelineEvent[]>();
    (events ?? [])
      .filter((e) => !hideTasks || e.source !== "task")
      .forEach((e) => {
        const key = e.date.slice(0, 7);
        m.set(key, [...(m.get(key) ?? []), e]);
      });
    return [...m.entries()];
  }, [events, hideTasks]);
  const todayIso = iso(new Date());

  const openNew = () => {
    setForm({ title: "", description: "", date: todayIso, kind: "milestone", status: "planned", projectId: projectId });
    setOpen(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) return toast.error("Title is required");
    save.mutate(
      { input: form },
      {
        onSuccess: () => {
          toast.success("Milestone added");
          setOpen(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save"),
      },
    );
  };
  const setStatus = (ev: TimelineEvent, status: TimelineEvent["status"]) =>
    save.mutate({ id: ev.id, input: { status } }, { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update") });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Timeline"
        subtitle={
          staff
            ? "Company milestones, your project deadlines and your task due dates."
            : "Company milestones, project kick-offs and deadlines, task due dates and lead follow-ups — in one view."
        }
        action={
          !staff && (
            <Button className="rounded-full" onClick={openNew}>
              <Plus className="size-4" />
              Add Milestone
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </Field>
        <Field label="Project">
          <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-56">
            <option value="">All projects</option>
            {projects?.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={hideTasks} onChange={(e) => setHideTasks(e.target.checked)} />
          Hide task due dates
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : grouped.length === 0 ? (
        <p className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Nothing scheduled in this range.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-3 font-heading text-sm font-bold tracking-wide text-muted-foreground uppercase">
                {new Date(month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
              </h2>
              <ol className="relative ml-3 border-l-2 border-border">
                {list.map((ev) => {
                  const Icon = kindIcon[ev.kind] ?? Flag;
                  const isToday = ev.date.slice(0, 10) === todayIso;
                  const body = (
                    <div className={cn("rounded-xl border bg-card p-3 transition", ev.link && "hover:border-primary/50", isToday && "border-primary")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{ev.title}</p>
                        <StatusBadge tone={statusTone[ev.status]}>{ev.status}</StatusBadge>
                        <span className="text-xs text-muted-foreground">{sourceLabel[ev.source]}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ev.date.slice(0, 10)}
                        {ev.projectName && ` · ${ev.projectName}`}
                        {ev.description && ` · ${ev.description}`}
                      </p>
                    </div>
                  );
                  return (
                    <li key={ev.source + ev.id} className="mb-3 ml-6">
                      <span
                        className={cn(
                          "absolute -left-[13px] flex size-6 items-center justify-center rounded-full border-2 border-background",
                          ev.status === "done" ? "bg-green-500 text-white" : ev.status === "missed" ? "bg-red-500 text-white" : "bg-primary text-primary-foreground",
                        )}
                      >
                        <Icon className="size-3" />
                      </span>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">{ev.link ? <Link href={ev.link}>{body}</Link> : body}</div>
                        {ev.source === "milestone" && !staff && (
                          <div className="flex shrink-0 gap-0.5">
                            <Button variant="ghost" size="icon" title="Mark done" onClick={() => setStatus(ev, "done")}>
                              <CheckCircle2 className="size-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Mark missed" onClick={() => setStatus(ev, "missed")}>
                              <XCircle className="size-4 text-red-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              aria-label="Delete milestone"
                              disabled={del.isPending}
                              onClick={() =>
                                confirm({
                                  title: "Delete this milestone?",
                                  description: `"${ev.title}" will be removed from the timeline.`,
                                  confirmLabel: "Delete",
                                  destructive: true,
                                  onConfirm: () =>
                                    del.mutate(ev.id, {
                                      onSuccess: () => toast.success("Milestone removed"),
                                      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not delete milestone"),
                                    }),
                                })
                              }
                            >
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New milestone</DialogTitle>
          </DialogHeader>
          <form id="ms-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Title *" className="sm:col-span-2">
              <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Hirezout v1 launch" />
            </Field>
            <Field label="Date *">
              <Input type="date" value={form.date ?? ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Type">
              <NativeSelect value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MilestoneInput["kind"] })}>
                {["milestone", "launch", "deadline", "meeting", "hiring", "other"].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Project (optional)" className="sm:col-span-2">
              <NativeSelect value={form.projectId ?? ""} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Company-wide</option>
                {projects?.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </form>
          <DialogFooter>
            <Button type="submit" form="ms-form" disabled={save.isPending}>
              Add milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
