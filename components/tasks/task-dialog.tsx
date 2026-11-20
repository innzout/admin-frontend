"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import type { Task } from "@/lib/types";
import { requiredSelect, requiredText, optionalDate, optionalText, LIMITS } from "@/lib/validation";

const NO_ASSIGNEE = "unassigned";

const schema = z.object({
  projectId: requiredSelect("a project"),
  title: requiredText("Task title", 200),
  description: optionalText(LIMITS.text).optional(),
  assigneeId: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: optionalDate.optional(),
});
type FormValues = z.infer<typeof schema>;

export function TaskDialog({
  task,
  defaultProjectId,
  defaultAssigneeId,
  open,
  onOpenChange,
}: {
  task: Task | null;
  defaultProjectId?: string;
  /** Pre-selects who the new task is for, e.g. when assigning from the Team board. */
  defaultAssigneeId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: projectsResult } = useProjects({ limit: 100 });
  const projects = projectsResult?.projects ?? [];
  const { data: employeePage } = useEmployees({ limit: 100 });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEdit = !!task;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { priority: "medium" } });

  const selectedProjectId = useWatch({ control, name: "projectId" });
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const assigneeOptions = selectedProject ? selectedProject.members.map((m) => ({ id: m.employeeId, name: m.employeeName })) : [];

  useEffect(() => {
    if (!open) return;
    reset({
      projectId: task?.projectId ?? defaultProjectId ?? "",
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeId: task?.assigneeId ?? defaultAssigneeId ?? NO_ASSIGNEE,
      priority: task?.priority ?? "medium",
      dueDate: task?.dueDate?.slice(0, 10) ?? "",
    });
  }, [open, task, defaultProjectId, defaultAssigneeId, reset]);

  const onSubmit = (values: FormValues) => {
    const assigneeId = values.assigneeId === NO_ASSIGNEE ? undefined : values.assigneeId;
    if (isEdit) {
      updateTask.mutate(
        {
          id: task.id,
          input: {
            title: values.title,
            description: values.description || undefined,
            assigneeId,
            priority: values.priority,
            dueDate: values.dueDate || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success("Task updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update task"),
        },
      );
    } else {
      createTask.mutate(
        {
          projectId: values.projectId,
          title: values.title,
          description: values.description || undefined,
          assigneeId,
          priority: values.priority,
          dueDate: values.dueDate || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Task created");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create task"),
        },
      );
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription>{isEdit ? task.projectName : "Create a new task."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isEdit}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId && <p className="text-sm text-destructive">{errors.projectId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tk-title">Title</Label>
            <Input id="tk-title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <Controller
                control={control}
                name="assigneeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                      {assigneeOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                      {(employeePage?.employees ?? [])
                        .filter((e) => !assigneeOptions.some((a) => a.id === e.id) && e.status === "active")
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.fullName} (not on team)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tk-due">Due date</Label>
            <Input id="tk-due" type="date" {...register("dueDate")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tk-description">Description</Label>
            <Textarea id="tk-description" {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
