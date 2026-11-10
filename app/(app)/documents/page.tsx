"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SearchInput } from "@/components/common/search-input";
import { Pagination } from "@/components/common/pagination";
import { NativeSelect } from "@/components/company/native-select";
import { useConfirm } from "@/components/common/use-confirm";
import { NewDocumentDialog } from "@/components/documents/new-document-dialog";
import { useDeleteDocument, useDocuments, useDuplicateDocument } from "@/hooks/use-documents";
import { TEMPLATES, TEMPLATE_BY_TYPE } from "@/lib/documents/templates";
import type { DocumentRecord } from "@/lib/documents/types";
import { docStatusTone } from "@/lib/status";
import { showApiError } from "@/lib/validation";
import { timeAgo } from "@/lib/format";

const PAGE_SIZE = 20;

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, refetch } = useDocuments({ search, type, status, page, limit: PAGE_SIZE });
  const duplicate = useDuplicateDocument();
  const remove = useDeleteDocument();
  const { confirm, confirmDialog } = useConfirm();

  const filter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const askDelete = (d: DocumentRecord) =>
    confirm({
      title: "Delete this draft?",
      description: `"${d.title}" will be permanently removed. Issued documents can't be deleted — only voided.`,
      confirmLabel: "Delete draft",
      destructive: true,
      onConfirm: () => remove.mutate(d.id, { onSuccess: () => toast.success("Draft deleted"), onError: (e) => showApiError(e, "Could not delete draft") }),
    });

  const docs = data?.documents ?? [];
  const filtered = !!(search || type || status);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Documents"
        subtitle="Offer letters, certificates, quotations, agreements and invoices on the INNZOUT letterhead."
        action={
          <Button className="rounded-full" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New document
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={filter(setSearch)} placeholder="Search title or number…" className="w-full sm:w-72" />
        <NativeSelect aria-label="Type" className="w-full sm:w-56" value={type} onChange={(e) => filter(setType)(e.target.value)}>
          <option value="">All types</option>
          {TEMPLATES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Status" className="w-full sm:w-40" value={status} onChange={(e) => filter(setStatus)(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="void">Void</option>
        </NativeSelect>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load documents.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <FileText className="size-9 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{filtered ? "No documents match these filters." : "No documents yet. Start from one of your 15 letterhead templates."}</p>
            {!filtered && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> New document
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Updated</TableHead>
                <TableHead className="w-20 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-0 w-full">
                    <Link href={`/documents/${d.id}`} className="block truncate font-medium hover:text-primary hover:underline">
                      {d.title}
                    </Link>
                    {d.clientName && <p className="truncate text-xs text-muted-foreground">{d.clientName}</p>}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">{TEMPLATE_BY_TYPE[d.type]?.label ?? d.type}</TableCell>
                  <TableCell className="hidden font-mono text-xs whitespace-nowrap lg:table-cell">{d.number ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={docStatusTone[d.status]} className="capitalize">
                      {d.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground sm:table-cell">{timeAgo(d.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Duplicate as new draft"
                        title="Duplicate as new draft"
                        disabled={duplicate.isPending}
                        onClick={() => duplicate.mutate(d.id, { onSuccess: () => toast.success("Copied to a new draft"), onError: (e) => showApiError(e, "Could not duplicate") })}
                      >
                        <Copy className="size-4" />
                      </Button>
                      {d.status === "draft" && (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Delete draft" title="Delete draft" disabled={remove.isPending} onClick={() => askDelete(d)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}

      <NewDocumentDialog open={creating} onOpenChange={setCreating} />
      {confirmDialog}
    </div>
  );
}
