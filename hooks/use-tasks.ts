"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateTaskInput, Task, TaskComment, TaskStatus, UpdateTaskInput } from "@/lib/types";

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: number;
  limit?: number;
}

export interface TaskListResult {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  // Task status/completion changes can flip a project's derived task counts.
  queryClient.invalidateQueries({ queryKey: ["projects"] });
}

export function useTasks(filters: TaskFilters = {}) {
  const params = new URLSearchParams();
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api<TaskListResult>(`/api/v1/tasks?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api<{ task: Task }>("/api/v1/tasks", { method: "POST", body: JSON.stringify(input) }).then((r) => r.task),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api<{ task: Task }>(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.task),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api<{ task: Task }>(`/api/v1/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }).then((r) => r.task),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/v1/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", "comments", taskId],
    queryFn: () => api<{ comments: TaskComment[] }>(`/api/v1/tasks/${taskId}/comments`).then((r) => r.comments),
    enabled: !!taskId,
  });
}

export function useAddTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) =>
      api<{ comment: TaskComment }>(`/api/v1/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }).then((r) => r.comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", "comments", taskId] }),
  });
}

export interface MemberLoad {
  employeeId: string;
  fullName: string;
  designation: string;
  employmentType: string;
  open: number;
  inProgress: number;
  inReview: number;
  overdue: number;
  doneLast7Days: number;
  lastActivityAt?: string;
}

/** Per-person task workload for the management Team board. */
export function useTeamLoad() {
  return useQuery({
    queryKey: ["tasks", "team"],
    queryFn: () => api<{ members: MemberLoad[] }>("/api/v1/tasks/team").then((r) => r.members),
  });
}
