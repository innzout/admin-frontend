"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateExpenseInput, Expense, ExpenseCategory } from "@/lib/types";

export interface ExpenseFilters {
  status?: string;
  employeeId?: string;
  page?: number;
  limit?: number;
}

/** Amount totals over every expense the filter matches, not just one page. */
export interface ExpenseSummary {
  total: number;
  pending: number;
  approved: number;
  reimbursed: number;
}

export interface ExpenseListResult {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  summary: ExpenseSummary;
}

function invalidateExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => api<ExpenseListResult>(`/api/v1/expenses?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: () => api<{ categories: ExpenseCategory[] }>("/api/v1/expenses/categories").then((r) => r.categories),
    staleTime: 5 * 60_000,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; monthlyBudget?: number }) =>
      api<{ category: ExpenseCategory }>("/api/v1/expenses/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", "categories"] }),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      api<{ expense: Expense }>("/api/v1/expenses", { method: "POST", body: JSON.stringify(input) }).then((r) => r.expense),
    onSuccess: () => invalidateExpenses(queryClient),
  });
}

export function useDecideExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) =>
      api<{ expense: Expense; warning?: string }>(`/api/v1/expenses/${id}/${decision}`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => invalidateExpenses(queryClient),
  });
}

export function useReimburseExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ expense: Expense }>(`/api/v1/expenses/${id}/reimburse`, { method: "PATCH" }).then((r) => r.expense),
    onSuccess: () => invalidateExpenses(queryClient),
  });
}
