"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiFetch } from "@/lib/api";
import type {
  Intern,
  InternEvaluation,
  InternEvaluationInput,
  InternInput,
  InternListResult,
  InternMentor,
  InternSummary,
  InternshipStatus,
} from "@/lib/company-types";

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export function useInterns(f: { status?: InternshipStatus; page?: number; limit?: number } = {}) {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v !== undefined && p.set(k, String(v)));
  return useQuery({
    queryKey: ["interns", "list", f],
    queryFn: () => api<InternListResult>(`/api/v1/interns?${p.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useInternSummary(enabled = true) {
  return useQuery({ queryKey: ["interns", "summary"], queryFn: () => api<InternSummary>("/api/v1/interns/summary"), enabled });
}

/** One intern by employee id, or the signed-in intern when id is "me". */
export function useIntern(id: string | undefined) {
  return useQuery({
    queryKey: ["interns", "detail", id],
    queryFn: () => api<{ intern: Intern }>(`/api/v1/interns/${id}`).then((r) => r.intern),
    enabled: !!id,
  });
}

export function useInternMentors(enabled = true) {
  return useQuery({
    queryKey: ["interns", "mentors"],
    queryFn: () => api<{ mentors: InternMentor[] }>("/api/v1/interns/mentors").then((r) => r.mentors),
    enabled,
  });
}

export function useInternEvaluations(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["interns", "evaluations", employeeId],
    queryFn: () => api<{ evaluations: InternEvaluation[] }>(`/api/v1/interns/${employeeId}/evaluations`).then((r) => r.evaluations),
    enabled: !!employeeId,
  });
}

export function useSaveIntern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, input }: { employeeId: string; input: InternInput }) =>
      api<{ intern: Intern }>(`/api/v1/interns/${employeeId}`, json("PUT", input)).then((r) => r.intern),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interns"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useAddInternEvaluation(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InternEvaluationInput) =>
      api<{ evaluation: InternEvaluation }>(`/api/v1/interns/${employeeId}/evaluations`, json("POST", input)),
    // A final evaluation also changes the intern's score.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interns"] }),
  });
}

export function useIssueCertificate(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ intern: Intern }>(`/api/v1/interns/${employeeId}/certificate`, json("POST")).then((r) => r.intern),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interns"] }),
  });
}

/** Certificate PDF is a plain authenticated file fetch, like payslips. */
export async function downloadCertificate(employeeId: string, filename: string) {
  const res = await apiFetch(`/api/v1/interns/${employeeId}/certificate.pdf`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Could not download the certificate");
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
