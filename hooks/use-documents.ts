"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateDocumentInput, DocumentContent, DocumentListResult, DocumentRecord } from "@/lib/documents/types";

export interface DocumentFilters {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const BASE = "/api/v1/documents";
const KEY = ["documents"] as const;

function query(f: DocumentFilters): string {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export function useDocuments(filters: DocumentFilters) {
  return useQuery({
    queryKey: [...KEY, "list", filters],
    queryFn: () => api<DocumentListResult>(`${BASE}${query(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "detail", id],
    queryFn: () => api<{ document: DocumentRecord }>(`${BASE}/${id}`).then((r) => r.document),
    enabled: !!id,
  });
}

/** Every mutation returns the updated document; refresh lists and seed the detail cache. */
function useDocumentMutation<V>(fn: (vars: V) => Promise<{ document: DocumentRecord }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: V) => fn(vars).then((r) => r.document),
    onSuccess: (doc) => {
      qc.setQueryData([...KEY, "detail", doc.id], doc);
      qc.invalidateQueries({ queryKey: [...KEY, "list"] });
    },
  });
}

export const useCreateDocument = () => useDocumentMutation((input: CreateDocumentInput) => api(BASE, send("POST", input)));

export const useUpdateDocument = (id: string) =>
  useDocumentMutation((input: { title?: string; content?: DocumentContent }) => api(`${BASE}/${id}`, send("PATCH", input)));

export const useIssueDocument = (id: string) => useDocumentMutation(() => api(`${BASE}/${id}/issue`, send("POST")));

export const useVoidDocument = (id: string) => useDocumentMutation((reason: string) => api(`${BASE}/${id}/void`, send("POST", { reason })));

export const useDuplicateDocument = () => useDocumentMutation((id: string) => api(`${BASE}/${id}/duplicate`, send("POST")));

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`${BASE}/${id}`, send("DELETE")),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, "list"] }),
  });
}
