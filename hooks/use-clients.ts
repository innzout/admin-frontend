"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Activity, Client, CreateClientInput, UpdateClientInput } from "@/lib/types";

export interface ClientFilters {
  status?: string;
  search?: string;
  sort?: string;
  dir?: string;
  page?: number;
  limit?: number;
}

export interface ClientListResult {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
}

export function useClients(filters: ClientFilters = {}, { enabled = true }: { enabled?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: () => api<ClientListResult>(`/api/v1/clients?${params.toString()}`),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", "detail", id],
    queryFn: () => api<{ client: Client }>(`/api/v1/clients/${id}`).then((r) => r.client),
    enabled: !!id,
  });
}

function invalidateClients(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["clients"] });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      api<{ client: Client }>("/api/v1/clients", { method: "POST", body: JSON.stringify(input) }).then((r) => r.client),
    onSuccess: () => invalidateClients(queryClient),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClientInput }) =>
      api<{ client: Client }>(`/api/v1/clients/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.client),
    onSuccess: () => invalidateClients(queryClient),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/v1/clients/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateClients(queryClient),
  });
}

export function useClientActivities(clientId: string | undefined) {
  return useQuery({
    queryKey: ["clients", "activities", clientId],
    queryFn: () => api<{ activities: Activity[] }>(`/api/v1/clients/${clientId}/activities`).then((r) => r.activities),
    enabled: !!clientId,
  });
}

export function useAddClientActivity(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) =>
      api<{ activity: Activity }>(`/api/v1/clients/${clientId}/activities`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }).then((r) => r.activity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", "activities", clientId] }),
  });
}
