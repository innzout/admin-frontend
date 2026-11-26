"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";
import type {
  Lead,
  LeadActivity,
  LeadInput,
  LeadSummary,
  LedgerEntry,
  LedgerInput,
  LedgerSummary,
  MilestoneInput,
  TimelineEvent,
} from "@/lib/company-types";

const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
  return p.toString();
};
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

/* ---------- Leads ---------- */

export function useLeads(f: { stage?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["leads", f],
    queryFn: () => api<{ leads: Lead[]; total: number }>(`/api/v1/leads?${qs({ ...f, limit: 200 })}`),
    placeholderData: (prev) => prev,
  });
}
export function useLeadSummary(enabled = true) {
  return useQuery({ queryKey: ["leads", "summary"], queryFn: () => api<LeadSummary>("/api/v1/leads/summary"), enabled });
}
export function useSaveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: LeadInput }) =>
      (id ? api<{ lead: Lead }>(`/api/v1/leads/${id}`, json("PATCH", input)) : api<{ lead: Lead }>("/api/v1/leads", json("POST", input))).then((r) => r.lead),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}
export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/v1/leads/${id}`, json("DELETE")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}
export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ lead: Lead; clientId: string }>(`/api/v1/leads/${id}/convert`, json("POST")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
export function useLeadActivities(id?: string) {
  return useQuery({
    queryKey: ["leads", "activities", id],
    queryFn: () => api<{ activities: LeadActivity[] }>(`/api/v1/leads/${id}/activities`).then((r) => r.activities),
    enabled: !!id,
  });
}
export function useAddLeadActivity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => api<void>(`/api/v1/leads/${id}/activities`, json("POST", { note })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads", "activities", id] }),
  });
}

/* ---------- Payments ledger ---------- */

export function useLedger(f: { direction?: string; category?: string; from?: string; to?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["ledger", f],
    queryFn: () => api<{ entries: LedgerEntry[] }>(`/api/v1/ledger?${qs(f)}`).then((r) => r.entries),
    placeholderData: (prev) => prev,
  });
}
export function useLedgerSummary(enabled = true) {
  return useQuery({ queryKey: ["ledger", "summary"], queryFn: () => api<LedgerSummary>("/api/v1/ledger/summary"), enabled });
}
export function useSaveLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: LedgerInput }) =>
      api<unknown>(id ? `/api/v1/ledger/${id}` : "/api/v1/ledger", json(id ? "PATCH" : "POST", input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ledger"] }),
  });
}
export function useDeleteLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/v1/ledger/${id}`, json("DELETE")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ledger"] }),
  });
}

/* ---------- Timeline ---------- */

export function useTimeline(f: { from?: string; to?: string; projectId?: string } = {}) {
  return useQuery({
    queryKey: ["timeline", f],
    queryFn: () => api<{ events: TimelineEvent[] }>(`/api/v1/timeline?${qs(f)}`).then((r) => r.events),
    placeholderData: (prev) => prev,
  });
}
export function useSaveMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MilestoneInput }) =>
      api<unknown>(id ? `/api/v1/timeline/milestones/${id}` : "/api/v1/timeline/milestones", json(id ? "PATCH" : "POST", input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeline"] }),
  });
}
export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/v1/timeline/milestones/${id}`, json("DELETE")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeline"] }),
  });
}

/* ---------- My tasks (any login) ---------- */

export function useMyTasks(status?: string) {
  return useQuery({
    queryKey: ["tasks", "mine", status],
    queryFn: () => api<{ tasks: Task[] }>(`/api/v1/tasks/mine?${qs({ status })}`).then((r) => r.tasks),
  });
}
