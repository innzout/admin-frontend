"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateProjectInput, Project, ProjectMember, UpdateProjectInput } from "@/lib/types";

export interface ProjectFilters {
  status?: string;
  clientId?: string;
  search?: string;
  sort?: string;
  dir?: string;
  page?: number;
  limit?: number;
}

export interface ProjectListResult {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

function invalidateProjects(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["projects"] });
}

export function useProjects(filters: ProjectFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return useQuery({
    queryKey: ["projects", filters],
    queryFn: () => api<ProjectListResult>(`/api/v1/projects?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: () => api<{ project: Project }>(`/api/v1/projects/${id}`).then((r) => r.project),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api<{ project: Project }>("/api/v1/projects", { method: "POST", body: JSON.stringify(input) }).then((r) => r.project),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      api<{ project: Project }>(`/api/v1/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.project),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/v1/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, employeeId, role }: { projectId: string; employeeId: string; role?: string }) =>
      api<{ member: ProjectMember }>(`/api/v1/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ employeeId, role }),
      }).then((r) => r.member),
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, employeeId }: { projectId: string; employeeId: string }) =>
      api<void>(`/api/v1/projects/${projectId}/members/${employeeId}`, { method: "DELETE" }),
    onSuccess: () => invalidateProjects(queryClient),
  });
}
