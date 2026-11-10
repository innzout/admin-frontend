"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Ban, Copy, Download, Eye, Pencil, Save, Stamp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { FormField } from "@/components/common/form-field";
import { useConfirm } from "@/components/common/use-confirm";
import { BlockEditor, contentProblems } from "@/components/documents/block-editor";
import { Letterhead } from "@/components/documents/letterhead";
import { FitToWidth } from "@/components/documents/fit-to-width";
import { useCompany } from "@/hooks/use-settings";
import { useDocument, useDuplicateDocument, useIssueDocument, useUpdateDocument, useVoidDocument } from "@/hooks/use-documents";
import { TEMPLATE_BY_TYPE } from "@/lib/documents/templates";
import type { DocumentContent } from "@/lib/documents/types";
import { docStatusTone } from "@/lib/status";
import { showApiError } from "@/lib/validation";
import { cn } from "@/lib/utils";

const TITLE_MAX = 200;
const VOID_REASON_MIN = 3;

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: doc, isLoading, isError, refetch } = useDocument(id);
  const { data: company } = useCompany();
  const update = useUpdateDocument(id);
  const issue = useIssueDocument(id);
  const voidDoc = useVoidDocument(id);
  const duplicate = useDuplicateDocument();
  const { confirm, confirmDialog } = useConfirm();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  // Re-seed local state whenever the server copy changes (load, save, issue).
  const serverKey = doc ? `${doc.id}:${doc.updatedAt}` : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (doc && serverKey !== seededKey) {
    setSeededKey(serverKey);
    setTitle(doc.title);
    setContent(doc.content ?? { heading: "", blocks: [] });
    setDirty(false);
  }

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">This document couldn&apos;t be loaded.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button variant="ghost" render={<Link href="/documents" />}>
            Back to documents
          </Button>
        </div>
      </div>
    );
  }
  if (isLoading || !doc || !content) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  const editable = doc.status === "draft";
  const titleError = !title.trim() ? "Title is required" : title.length > TITLE_MAX ? `At most ${TITLE_MAX} characters` : undefined;
  const problems = contentProblems(content);
  const busy = update.isPending || issue.isPending || voidDoc.isPending;
  const template = TEMPLATE_BY_TYPE[doc.type];

  const edit = (next: DocumentContent) => {
    setContent(next);
    setDirty(true);
  };

  const save = (onSaved?: () => void) => {
    if (titleError) return toast.error(titleError);
    update.mutate(
      { title: title.trim(), content },
      {
        onSuccess: () => {
          toast.success("Draft saved");
          onSaved?.();
        },
        onError: (e) => showApiError(e, "Could not save the draft"),
      },
    );
  };

  const askIssue = () => {
    if (problems.length) return toast.error(problems[0]);
    const doIssue = () =>
      issue.mutate(undefined, {
        onSuccess: (d) => toast.success(`Issued as ${d.number}`),
        onError: (e) => showApiError(e, "Could not issue the document"),
      });
    confirm({
      title: "Issue this document?",
      description: "It gets the next document number and can no longer be edited. To change it later you'd void it and issue a corrected copy.",
      confirmLabel: dirty ? "Save & issue" : "Issue",
      onConfirm: () => (dirty ? save(doIssue) : doIssue()),
    });
  };

  const submitVoid = () => {
    if (voidReason.trim().length < VOID_REASON_MIN) return;
    voidDoc.mutate(voidReason.trim(), {
      onSuccess: () => {
        toast.success("Document voided");
        setVoidOpen(false);
        setVoidReason("");
      },
      onError: (e) => showApiError(e, "Could not void the document"),
    });
  };

  const copy = () =>
    duplicate.mutate(doc.id, {
      onSuccess: (d) => {
        toast.success("Copied to a new draft");
        router.push(`/documents/${d.id}`);
      },
      onError: (e) => showApiError(e, "Could not duplicate"),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/documents" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> Documents
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold">{doc.title}</h1>
            <StatusBadge tone={docStatusTone[doc.status]} className="capitalize">
              {doc.status}
            </StatusBadge>
            {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            {template?.label}
            {doc.number && ` · ${doc.number}`}
            {doc.voidReason && ` · Voided: ${doc.voidReason}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <>
              <Button variant="outline" onClick={() => save()} disabled={!dirty || busy || !!titleError}>
                <Save className="size-4" /> {update.isPending ? "Saving…" : "Save draft"}
              </Button>
              <Button onClick={askIssue} disabled={busy}>
                <Stamp className="size-4" /> {issue.isPending ? "Issuing…" : "Issue"}
              </Button>
            </>
          )}
          {doc.status === "issued" && (
            <Button variant="outline" className="text-destructive" onClick={() => setVoidOpen(true)} disabled={busy}>
              <Ban className="size-4" /> Void
            </Button>
          )}
          <Button variant="outline" onClick={copy} disabled={duplicate.isPending}>
            <Copy className="size-4" /> Duplicate
          </Button>
          <Button variant="outline" onClick={() => window.print()} title={doc.status === "issued" ? undefined : "Prints with a watermark — issue it for the final copy"}>
            <Download className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {editable && problems.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Fix before issuing:</p>
            <ul className="list-disc pl-4">
              {problems.slice(0, 5).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {problems.length > 5 && <li>…and {problems.length - 5} more</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-muted p-1 lg:hidden" role="tablist">
        {(["edit", "preview"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={mobileView === v}
            onClick={() => setMobileView(v)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium", mobileView === v ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            {v === "edit" ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
            {v === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(340px,440px)_1fr]">
        <aside className={cn("flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1", mobileView === "preview" && "hidden lg:flex")}>
          {!editable && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {doc.status === "issued" ? "Issued documents are final. Duplicate it to make a corrected copy." : "This document was voided."}
            </p>
          )}
          <FormField label="Title" required error={editable ? titleError : undefined} hint="Only shown in this admin panel.">
            <Input
              maxLength={TITLE_MAX}
              disabled={!editable}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
            />
          </FormField>
          <BlockEditor content={content} onChange={edit} disabled={!editable} />
        </aside>

        <section aria-label="Preview" className={cn("min-w-0 rounded-xl bg-muted/60 p-3 sm:p-6", mobileView === "edit" && "hidden lg:block print:block")}>
          <FitToWidth>
            <Letterhead content={content} company={company} number={doc.number} status={doc.status} />
          </FitToWidth>
        </section>
      </div>

      <Dialog open={voidOpen} onOpenChange={(o) => !voidDoc.isPending && setVoidOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void {doc.number}?</DialogTitle>
            <DialogDescription>The number stays used and the document is marked VOID. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <FormField label="Reason" required error={voidReason && voidReason.trim().length < VOID_REASON_MIN ? "Give a short reason" : undefined}>
            <Textarea rows={3} maxLength={500} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Wrong CTC — reissued as a new letter" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)} disabled={voidDoc.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitVoid} disabled={voidDoc.isPending || voidReason.trim().length < VOID_REASON_MIN}>
              {voidDoc.isPending ? "Voiding…" : "Void document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
