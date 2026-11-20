"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiFetch } from "@/lib/api";
import type { CreateInvoiceInput, Invoice, RecordPaymentInput, UpdateInvoiceInput } from "@/lib/types";

export interface InvoiceFilters {
  status?: string;
  clientId?: string;
  sort?: string;
  dir?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceListResult {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
}

function invalidateInvoices(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
}

export function useInvoices(filters: InvoiceFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => api<InvoiceListResult>(`/api/v1/invoices?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: () => api<{ invoice: Invoice }>(`/api/v1/invoices/${id}`).then((r) => r.invoice),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) =>
      api<{ invoice: Invoice }>("/api/v1/invoices", { method: "POST", body: JSON.stringify(input) }).then((r) => r.invoice),
    onSuccess: () => invalidateInvoices(queryClient),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInvoiceInput }) =>
      api<{ invoice: Invoice }>(`/api/v1/invoices/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.invoice),
    onSuccess: () => invalidateInvoices(queryClient),
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ invoice: Invoice }>(`/api/v1/invoices/${id}/send`, { method: "POST" }).then((r) => r.invoice),
    onSuccess: () => invalidateInvoices(queryClient),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecordPaymentInput }) =>
      api<{ invoice: Invoice }>(`/api/v1/invoices/${id}/payments`, { method: "POST", body: JSON.stringify(input) }).then(
        (r) => r.invoice,
      ),
    onSuccess: () => invalidateInvoices(queryClient),
  });
}

/** Invoice PDF download is a plain authenticated file fetch, not JSON. */
export async function downloadInvoicePdf(invoiceId: string, filename: string) {
  const res = await apiFetch(`/api/v1/invoices/${invoiceId}/pdf`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Could not download invoice");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
