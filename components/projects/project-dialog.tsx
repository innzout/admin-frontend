"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { useCreateProject, useUpdateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { ApiError } from "@/lib/api";
import type { Project } from "@/lib/types";
import { requiredText, optionalDate, optionalText, endNotBeforeStart, LIMITS } from "@/lib/validation";

const NO_CLIENT = "none";

const schema = z
  .object({
    name: requiredText("Project name"),
    clientId: z.string(),
    startDate: optionalDate.optional(),
    deadline: optionalDate.optional(),
    budget: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= LIMITS.money), "Enter a valid amount (up to 2 decimals)"),
    description: optionalText(LIMITS.text).optional(),
  })
  .superRefine(endNotBeforeStart("startDate", "deadline", "Deadline can't be before the start date"));
type FormValues = z.infer<typeof schema>;

export function ProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: clientsResult } = useClients({ limit: 100 });
  const clients = clientsResult?.clients ?? [];
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: project?.name ?? "",
      clientId: project?.clientId ?? NO_CLIENT,
      startDate: project?.startDate?.slice(0, 10) ?? "",
      deadline: project?.deadline?.slice(0, 10) ?? "",
      budget: project?.budget != null ? String(project.budget) : "",
      description: project?.description ?? "",
    });
  }, [open, project, reset]);

  const onSubmit = (values: FormValues) => {
    const input = {
      name: values.name,
      clientId: values.clientId === NO_CLIENT ? undefined : values.clientId,
      startDate: values.startDate || undefined,
      deadline: values.deadline || undefined,
      budget: values.budget ? Number(values.budget) : undefined,
      description: values.description || undefined,
    };
    if (isEdit) {
      updateProject.mutate(
        { id: project.id, input },
        {
          onSuccess: () => {
            toast.success(`${values.name} updated`);
            onOpenChange(false);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update project"),
        },
      );
    } else {
      createProject.mutate(input, {
        onSuccess: () => {
          toast.success(`${values.name} created`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create project"),
      });
    }
  };

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>{isEdit ? project.code : "Create a new project."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-name">Project name</Label>
            <Input id="pr-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Client</Label>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT}>No client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-start">Start date</Label>
              <Input id="pr-start" type="date" {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-deadline">Deadline</Label>
              <Input id="pr-deadline" type="date" {...register("deadline")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-budget">Budget</Label>
            <Input id="pr-budget" type="number" step="0.01" {...register("budget")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-description">Description</Label>
            <Textarea id="pr-description" {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
