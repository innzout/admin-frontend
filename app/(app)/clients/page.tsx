"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SearchInput } from "@/components/common/search-input";
import { Pagination } from "@/components/common/pagination";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ClientDialog } from "@/components/clients/client-dialog";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { clientStatusTone } from "@/lib/status";
import { ApiError } from "@/lib/api";
import type { Client } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { QueryError } from "@/components/common/query-error";

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError: dataFailed, refetch: dataRetry, isFetching: dataRetrying } = useClients({ search: search || undefined, page, limit: PAGE_SIZE });
  const deleteClient = useDeleteClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteClient.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`"${deleteTarget.companyName}" removed`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not remove client");
        setDeleteTarget(null);
      },
    });
  };

  const clients = data?.clients ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        subtitle="Manage client relationships and account details."
        action={
          <Button className="rounded-full" onClick={openCreate}>
            <Plus className="size-4" />
            Add Client
          </Button>
        }
      />

      <SearchInput
        placeholder="Search clients…"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <div className="flex flex-col gap-3">
        {dataFailed && !data && <QueryError what="clients" onRetry={() => dataRetry()} retrying={dataRetrying} />}
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        {data && clients.length === 0 && (
          <EmptyState className="rounded-xl border bg-card" title="No clients yet" hint="Add a client, or convert a won lead, to start tracking projects and invoices for them." />
        )}
        {clients.map((c) => (
          <div key={c.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400">
                <Building2 className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{c.companyName}</p>
                  <StatusBadge tone={clientStatusTone[c.status]}>{c.status}</StatusBadge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  {c.email}
                </p>
                {c.phone && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="size-3.5" />
                    {c.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-8 sm:gap-10">
              <Link
                href={`/projects?clientId=${c.id}&clientName=${encodeURIComponent(c.companyName)}`}
                className="text-right hover:underline"
              >
                <p className="text-xs text-muted-foreground">Projects</p>
                <p className="font-semibold">{c.projectCount}</p>
              </Link>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => openEdit(c)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(c)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}

      <ClientDialog client={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove client?"
        description={
          deleteTarget
            ? `"${deleteTarget.companyName}" will be removed. Clients with linked projects can't be deleted — deactivate them instead.`
            : ""
        }
        confirmLabel="Remove"
        isPending={deleteClient.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
